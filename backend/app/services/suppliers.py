from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import Supplier, Product, PurchaseOrder

class SupplierIntelligenceService:
    def __init__(self, db: Session):
        self.db = db

    def get_supplier_scorecards(self) -> List[Dict]:
        """Calculates multi-dimensional performance scorecards for all registered vendors."""
        suppliers = self.db.query(Supplier).all()
        scorecards = []

        for sup in suppliers:
            # Multi-factor transparent risk scoring formula:
            # Risk = (1 - OTD) * 45 + (LeadTimeVar / 5.0) * 25 + (DefectRate / 0.03) * 20 + (10 if Tier == 2 else 0)
            otd_penalty = (1.0 - sup.on_time_delivery_rate) * 45.0
            var_penalty = min(25.0, (sup.lead_time_variance_days / 5.0) * 25.0)
            defect_penalty = min(20.0, (sup.defect_rate / 0.03) * 20.0)
            tier_penalty = 10.0 if sup.tier == 2 else 0.0

            computed_risk = round(otd_penalty + var_penalty + defect_penalty + tier_penalty, 1)
            
            if computed_risk >= 70.0:
                risk_lvl = "Critical"
            elif computed_risk >= 45.0:
                risk_lvl = "High"
            elif computed_risk >= 25.0:
                risk_lvl = "Medium"
            else:
                risk_lvl = "Low"

            open_pos = (
                self.db.query(PurchaseOrder)
                .filter(
                    PurchaseOrder.supplier_id == sup.id,
                    PurchaseOrder.status.in_(["Placed", "In Transit", "Delayed"])
                )
                .all()
            )

            scorecards.append({
                "id": sup.id,
                "name": sup.name,
                "tier": sup.tier,
                "country": sup.country,
                "city": sup.city,
                "contract_ref": sup.contract_ref,
                "base_lead_time_days": sup.base_lead_time_days,
                "lead_time_variance_days": sup.lead_time_variance_days,
                "on_time_delivery_rate": sup.on_time_delivery_rate,
                "defect_rate": sup.defect_rate,
                "min_order_qty": sup.min_order_qty,
                "daily_capacity": sup.daily_production_capacity,
                "risk_score": computed_risk,
                "risk_level": risk_lvl,
                "open_pos_count": len(open_pos),
                "total_open_commitment_inr": sum(p.total_cost for p in open_pos)
            })

        return sorted(scorecards, key=lambda x: x["risk_score"], reverse=True)

    def draft_purchase_order(
        self,
        product_id: str,
        destination_wh: str,
        target_quantity: Optional[int] = None
    ) -> Dict:
        """Drafts an optimized purchase order applying contract volume discounts and MOQ constraints."""
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError(f"Product {product_id} not found")

        supplier = self.db.query(Supplier).filter(Supplier.id == product.default_supplier_id).first()
        if not supplier:
            raise ValueError(f"Default supplier for {product_id} not configured")

        order_qty = max(supplier.min_order_qty, target_quantity or supplier.min_order_qty * 2)

        # Apply contract volume discount rules
        unit_cost = product.unit_cost
        discount_applied = 0.0
        if order_qty >= 1500:
            discount_applied = 0.08  # 8% discount (MSA Section 3.2)
        elif order_qty >= 500:
            discount_applied = 0.045 # 4.5% discount

        effective_unit_cost = round(unit_cost * (1.0 - discount_applied), 2)
        total_cost = round(effective_unit_cost * order_qty, 2)

        return {
            "draft_po_id": f"DRAFT-PO-{product_id[-3:]}-AUTO",
            "product_id": product.id,
            "product_name": product.name,
            "supplier_id": supplier.id,
            "supplier_name": supplier.name,
            "destination_warehouse": destination_wh,
            "order_quantity": order_qty,
            "base_unit_cost": unit_cost,
            "discount_percentage": discount_applied * 100.0,
            "effective_unit_cost": effective_unit_cost,
            "total_commitment_inr": total_cost,
            "expected_lead_time_days": supplier.base_lead_time_days,
            "contract_reference": supplier.contract_ref,
            "requires_approval_by": "Supply Chain Operations Manager" if total_cost < 750000 else "Head of Procurement",
            "policy_rule": "SOP-PROC-2025-V3.2 Section 2 (Financial DOA Matrix)"
        }
