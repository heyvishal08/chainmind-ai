import math
import os
import random
from datetime import date, datetime, timedelta
from pathlib import Path
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import Base, SessionLocal, engine
from backend.app.data.generator import (
    CATEGORIES,
    PRODUCTS_DEF,
    SUPPLIERS_DEF,
    WAREHOUSES_DEF,
    generate_daily_sales_series,
)
from backend.app.models.entities import (
    DailySale,
    ForecastRun,
    Inventory,
    KnowledgeDocument,
    Product,
    PurchaseOrder,
    Recommendation,
    RiskEvent,
    Shipment,
    Supplier,
    Warehouse,
)

def run_seed():
    print("[INIT] Initializing ChainMind AI Database Schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Insert Warehouses
        print("[WAREHOUSES] Seeding Warehouses...")
        warehouses_map = {}
        for w_data in WAREHOUSES_DEF:
            wh = Warehouse(
                id=w_data["id"],
                name=w_data["name"],
                city=w_data["city"],
                region=w_data["region"],
                latitude=w_data["latitude"],
                longitude=w_data["longitude"],
                capacity_m3=w_data["capacity_m3"],
                monthly_holding_cost_rate=w_data["holding_cost_rate"],
                status=w_data["status"]
            )
            db.add(wh)
            warehouses_map[wh.id] = wh
        db.commit()

        # 2. Insert Suppliers
        print("[SUPPLIERS] Seeding Suppliers...")
        suppliers_map = {}
        for s_data in SUPPLIERS_DEF:
            sup = Supplier(
                id=s_data["id"],
                name=s_data["name"],
                tier=s_data["tier"],
                country=s_data["country"],
                city=s_data["city"],
                contact_email=s_data["contact_email"],
                contract_ref=s_data["contract_ref"],
                base_lead_time_days=s_data["base_lead_time_days"],
                lead_time_variance_days=s_data["lead_time_variance_days"],
                on_time_delivery_rate=s_data["on_time_delivery_rate"],
                defect_rate=s_data["defect_rate"],
                min_order_qty=s_data["min_order_qty"],
                daily_production_capacity=s_data["daily_production_capacity"],
                risk_score=s_data["risk_score"],
                risk_level=s_data["risk_level"],
                status="Active"
            )
            db.add(sup)
            suppliers_map[sup.id] = sup
        db.commit()

        # 3. Insert Products
        print("[PRODUCTS] Seeding 30 Products...")
        products_map = {}
        for p_id, name, cat, price, cost, wt, vol, sup_id in PRODUCTS_DEF:
            prod = Product(
                id=p_id,
                name=name,
                category=cat,
                unit_price=price,
                unit_cost=cost,
                weight_kg=wt,
                volume_m3=vol,
                default_supplier_id=sup_id,
                created_at=datetime.utcnow() - timedelta(days=730)
            )
            db.add(prod)
            products_map[prod.id] = prod
        db.commit()

        # 4. Generate Daily Sales (Last 365 Days)
        print("[SALES] Generating 365 days of historical sales transactions...")
        end_date = date.today()
        start_date = end_date - timedelta(days=365)
        
        # Product daily sales cache for inventory calculations
        product_wh_demand_stats = {}

        sales_batch = []
        for p_id, name, cat, price, cost, wt, vol, sup_id in PRODUCTS_DEF:
            # Base daily demand by category
            if cat == "Smart Audio":
                base_demand = random.uniform(15.0, 32.0)
            elif cat == "Smart Wearables":
                base_demand = random.uniform(12.0, 26.0)
            elif cat == "Power & Charging":
                base_demand = random.uniform(22.0, 48.0)
            else: # Smart Home
                base_demand = random.uniform(8.0, 18.0)

            for wh_id in warehouses_map.keys():
                series = generate_daily_sales_series(start_date, end_date, p_id, wh_id, base_demand)
                units_list = [s["units_sold"] for s in series]
                mean_d = sum(units_list) / len(units_list)
                variance_d = sum((u - mean_d) ** 2 for u in units_list) / len(units_list)
                std_d = math.sqrt(variance_d)
                
                product_wh_demand_stats[(p_id, wh_id)] = {
                    "mean": mean_d,
                    "std": std_d
                }

                for item in series:
                    sale = DailySale(
                        date=item["date"],
                        product_id=item["product_id"],
                        warehouse_id=item["warehouse_id"],
                        units_sold=item["units_sold"],
                        revenue=round(item["units_sold"] * price, 2),
                        stockout_occurred=item["stockout_occurred"],
                        unfulfilled_demand=item["unfulfilled_demand"],
                        is_promo_day=item["is_promo_day"]
                    )
                    sales_batch.append(sale)

        db.bulk_save_objects(sales_batch)
        db.commit()
        print(f"[SUCCESS] Generated {len(sales_batch)} daily sales records.")

        # 5. Calculate and Seed Inventory
        print("[INVENTORY] Calculating Safety Stock, ROP, and Current Stock per facility...")
        z = settings.DEFAULT_SERVICE_LEVEL_Z # 1.65 for 95% service level

        inventories = []
        for (p_id, wh_id), stats in product_wh_demand_stats.items():
            prod = products_map[p_id]
            sup = suppliers_map[prod.default_supplier_id]

            lt = sup.base_lead_time_days
            sigma_lt = sup.lead_time_variance_days
            mu_d = stats["mean"]
            sigma_d = stats["std"]

            # Rigorous operations research formula:
            # SS = z * sqrt( (LT * sigma_d^2) + (mu_d^2 * sigma_lt^2) )
            term1 = lt * (sigma_d ** 2)
            term2 = (mu_d ** 2) * (sigma_lt ** 2)
            safety_stock = int(math.ceil(z * math.sqrt(term1 + term2)))
            reorder_point = int(math.ceil((mu_d * lt) + safety_stock))

            # Simulate stock health distribution:
            # Target specific SKUs for dramatic scenarios:
            if p_id == "SKU-AUD-101" and wh_id == "WH-DEL-01":
                # Critical stockout scenario
                current_stock = int(mu_d * 2.8) # Only 2.8 days of supply!
                allocated = int(current_stock * 0.4)
                in_transit = 600
                risk_score = 92.5
            elif p_id == "SKU-PWR-301" and wh_id == "WH-DEL-01":
                # High risk due to Zenith supplier failure
                current_stock = int(mu_d * 4.2)
                allocated = int(current_stock * 0.3)
                in_transit = 0
                risk_score = 86.0
            elif p_id == "SKU-WRB-201" and wh_id == "WH-BLR-01":
                # Low stock alert
                current_stock = int(reorder_point * 0.75)
                allocated = int(current_stock * 0.2)
                in_transit = 400
                risk_score = 74.0
            elif p_id == "SKU-AUD-102" and wh_id == "WH-MUM-01":
                # Excess inventory scenario
                current_stock = int(reorder_point * 3.8) # 110 days of supply
                allocated = 40
                in_transit = 0
                risk_score = 12.0
            else:
                # Standard distribution
                ratio = random.choice([1.1, 1.4, 1.8, 2.2, 0.85, 2.6])
                current_stock = max(20, int(reorder_point * ratio))
                allocated = int(current_stock * random.uniform(0.1, 0.25))
                in_transit = random.choice([0, 0, 200, 350, 500])
                
                dos = current_stock / max(1.0, mu_d)
                if dos < 7:
                    risk_score = 75.0 + random.uniform(0, 20)
                elif dos < 14:
                    risk_score = 45.0 + random.uniform(0, 25)
                else:
                    risk_score = random.uniform(5, 25)

            dos = round(current_stock / max(0.1, mu_d), 1)

            inv = Inventory(
                product_id=p_id,
                warehouse_id=wh_id,
                current_stock=current_stock,
                allocated_stock=allocated,
                in_transit_stock=in_transit,
                safety_stock=safety_stock,
                reorder_point=reorder_point,
                stockout_risk_score=round(risk_score, 1),
                days_of_supply=dos,
                last_updated=datetime.utcnow()
            )
            inventories.append(inv)

        db.bulk_save_objects(inventories)
        db.commit()
        print(f"[SUCCESS] Seeded {len(inventories)} inventory location nodes.")

        # 6. Purchase Orders & Shipments
        print("[ORDERS] Seeding Purchase Orders and Shipments...")
        orders_data = [
            ("PO-2026-101", "SKU-AUD-101", "SUP-001", "WH-DEL-01", 600, 2100.0, "In Transit", -6, 6, 8, True),
            ("PO-2026-102", "SKU-PWR-301", "SUP-003", "WH-DEL-01", 500, 1850.0, "Delayed", -14, 0, 7, False),
            ("PO-2026-103", "SKU-WRB-201", "SUP-007", "WH-BLR-01", 400, 3200.0, "In Transit", -18, 4, 4, False),
            ("PO-2026-104", "SKU-AUD-103", "SUP-004", "WH-MUM-01", 350, 1350.0, "Placed", -2, 7, 7, False),
            ("PO-2026-105", "SKU-IOT-402", "SUP-008", "WH-MAA-01", 200, 2050.0, "Delivered", -12, -2, -2, False),
            ("PO-2026-106", "SKU-PWR-302", "SUP-003", "WH-MUM-01", 450, 1150.0, "Delayed", -16, -2, 5, False),
            ("PO-2026-107", "SKU-AUD-105", "SUP-001", "WH-BLR-01", 300, 890.0, "In Transit", -5, 7, 7, False),
            ("PO-2026-108", "SKU-WRB-202", "SUP-002", "WH-DEL-01", 600, 1050.0, "In Transit", -12, 6, 6, False),
            ("PO-2026-109", "SKU-IOT-403", "SUP-008", "WH-BLR-01", 250, 3100.0, "Delivered", -15, -5, -5, False),
            ("PO-2026-110", "SKU-AUD-101", "SUP-001", "WH-MUM-01", 500, 2100.0, "Delivered", -20, -8, -8, False),
        ]

        pos = []
        for po_id, p_id, s_id, wh_id, qty, cost, status, ord_offset, exp_offset, rev_offset, exp in orders_data:
            ord_date = date.today() + timedelta(days=ord_offset)
            exp_date = date.today() + timedelta(days=exp_offset)
            rev_date = date.today() + timedelta(days=rev_offset)
            act_date = exp_date if status == "Delivered" else None

            po = PurchaseOrder(
                id=po_id,
                product_id=p_id,
                supplier_id=s_id,
                destination_warehouse_id=wh_id,
                quantity=qty,
                unit_price=cost,
                total_cost=round(qty * cost, 2),
                status=status,
                order_date=ord_date,
                expected_delivery_date=exp_date,
                revised_delivery_date=rev_date,
                actual_delivery_date=act_date,
                is_expedited=exp
            )
            pos.append(po)
            db.add(po)
        db.commit()

        # Seed Shipments
        shipments_data = [
            ("SHP-8921", "PO-2026-101", "BlueDart Express", "Chakan Plant, Pune", "WH-DEL-01", "Jaipur Transit Hub", "Delayed", -3, 2, 48.0, 0.88, "Critical", "Road Express"),
            ("SHP-8922", "PO-2026-102", "Gati KWE", "Noida Phase II", "WH-DEL-01", "Noida Depot", "Delayed", -5, 7, 72.0, 0.94, "Critical", "Road Freight"),
            ("SHP-8923", "PO-2026-103", "Maersk Intermodal", "Port of Taipei", "WH-BLR-01", "Chennai Sea Port Customs", "In Transit", -12, 4, 18.0, 0.42, "Standard", "Ocean Intermodal"),
            ("SHP-8924", "PO-2026-107", "Delhivery Prime", "Chakan Plant, Pune", "WH-BLR-01", "Hubli Toll Plaza", "In Transit", -2, 3, 4.0, 0.15, "Standard", "Road Express"),
            ("SHP-8925", "PO-2026-108", "BlueDart Express", "Penang Transit Hub", "WH-DEL-01", "Delhi Air Cargo Terminal", "In Transit", -4, 2, 6.0, 0.22, "High", "Air Freight"),
        ]

        for shp_id, po_id, carrier, origin, dest, curr_loc, status, disp_off, arr_off, delay_h, prob, prio, mode in shipments_data:
            disp_dt = datetime.utcnow() + timedelta(days=disp_off)
            arr_dt = datetime.utcnow() + timedelta(days=arr_off)
            shp = Shipment(
                id=shp_id,
                purchase_order_id=po_id,
                carrier_name=carrier,
                origin_location=origin,
                destination_warehouse_id=dest,
                current_location=curr_loc,
                status=status,
                dispatch_date=disp_dt,
                estimated_arrival=arr_dt,
                predicted_delay_hours=delay_h,
                delay_probability=prob,
                priority_level=prio,
                transport_mode=mode
            )
            db.add(shp)
        db.commit()

        # 7. Seed Cross-Domain Risk Events
        print("[RISKS] Seeding Risk Events Registry...")
        risks_data = [
            (
                "RSK-2026-001",
                "Stockout Risk",
                "Imminent Stockout on Aura Pro Earbuds in Delhi Hub",
                "Aura Pro Wireless ANC Earbuds (SKU-AUD-101) has only 2.8 days of supply remaining at Delhi NCR Hub. Scheduled replenishment PO-2026-101 via BlueDart is delayed 48 hours at Jaipur hub due to highway corridor disruption.",
                "SKU-AUD-101",
                "WH-DEL-01",
                "SUP-001",
                "SHP-8921",
                "Critical",
                0.92,
                485000.0,
                3,
                "Open",
                "Evaluate immediate inter-warehouse stock transfer of 250 units from Mumbai Western Hub (holds 42 days coverage) or authorize expedited express van shuttle."
            ),
            (
                "RSK-2026-002",
                "Supplier Disruption",
                "Zenith Battery Technologies Delivery Breakdown",
                "Tier-1 Supplier Zenith Battery Technologies on-time delivery dropped to 74% with lead-time standard deviation surging to 5.2 days. 2 open purchase orders are currently backordered.",
                "SKU-PWR-301",
                "WH-DEL-01",
                "SUP-003",
                "SHP-8922",
                "Critical",
                0.86,
                320000.0,
                5,
                "Investigating",
                "Activate secondary battery supplier agreement or split replenishment allocation to mitigate single-point dependency."
            ),
            (
                "RSK-2026-003",
                "Warehouse Capacity",
                "Delhi NCR Mega Logistics Center Storage Constrained (84.2%)",
                "Delhi NCR Hub has reached 84.2% volumetric capacity, approaching the critical 85% restriction limit defined in Corporate Procurement Policy §4.2.",
                None,
                "WH-DEL-01",
                None,
                None,
                "High",
                0.80,
                115000.0,
                7,
                "Open",
                "Restrict non-essential incoming purchase orders and initiate promotional rebalancing transfers to Chennai facility."
            ),
            (
                "RSK-2026-004",
                "Shipment Delay",
                "Maersk Intermodal Ocean Container Delayed at Chennai Port",
                "Shipment SHP-8923 carrying 400 units of Titan Chrono Smartwatches delayed due to customs inspection backlog at Chennai port terminal.",
                "SKU-WRB-201",
                "WH-BLR-01",
                "SUP-007",
                "SHP-8923",
                "Medium",
                0.45,
                180000.0,
                6,
                "Open",
                "Monitor clearance progress. Bengaluru Hub retains 14 days of buffer stock; escalate if delay exceeds 96 hours."
            ),
            (
                "RSK-2026-005",
                "Excess Inventory",
                "Working Capital Trapped in SonicBass 120W Soundbars",
                "Mumbai Western Hub holds 118 days of supply for SKU-AUD-102 (₹24.8 Lakh inventory value), exceeding optimal holding thresholds by 240%.",
                "SKU-AUD-102",
                "WH-MUM-01",
                "SUP-004",
                None,
                "Medium",
                0.60,
                85000.0,
                30,
                "Open",
                "Pause next scheduled procurement cycle and allocate promotional bundle campaigns to accelerate inventory turn."
            )
        ]

        for r_id, r_type, title, desc, p_id, wh_id, s_id, shp_id, sev, prob, impact, urg, stat, act in risks_data:
            risk = RiskEvent(
                id=r_id,
                risk_type=r_type,
                title=title,
                description=desc,
                affected_product_id=p_id,
                affected_warehouse_id=wh_id,
                affected_supplier_id=s_id,
                affected_shipment_id=shp_id,
                severity=sev,
                probability=prob,
                estimated_financial_impact=impact,
                urgency_days=urg,
                status=stat,
                recommended_action=act,
                created_at=datetime.utcnow() - timedelta(hours=random.randint(2, 24))
            )
            db.add(risk)
        db.commit()

        # 8. Action Center Recommendations
        print("[RECOMMENDATIONS] Seeding Action Center Recommendations...")
        recs_data = [
            (
                "REC-2026-001",
                "Execute Inter-Warehouse Stock Transfer: Mumbai ➔ Delhi",
                "Inter-Warehouse Transfer",
                "Aura Pro Earbuds (SKU-AUD-101) facing stockout in Delhi within 3 days. Mumbai Hub has 42 days of stock.",
                "Transfer 250 units via dedicated Delhivery Prime road express corridor (48hr transit). Source warehouse will retain 29 days coverage, satisfying SOP-OPS-2025-08 §1.1.",
                "SKU-AUD-101",
                "WH-MUM-01",
                "WH-DEL-01",
                250,
                4500.0,  # Transfer freight cost
                485000.0, # Revenue protected
                106.7,
                "Pending Approval",
                "SOP-OPS-2025-08 §1.1 (Inter-Warehouse Stock Transfer Protocol)",
                "ChainMind Optimization Solver (OR-Tools)"
            ),
            (
                "REC-2026-002",
                "Authorize Expedited Air Freight for PO-2026-101",
                "Expedited Order",
                "Scheduled road shipment SHP-8921 delayed at Jaipur hub; stockout imminent before standard arrival.",
                "Split remaining 300 units from supplier plant in Pune via BlueDart Apex Air Cargo direct to IGI Airport.",
                "SKU-AUD-101",
                "Apex Pune Plant",
                "WH-DEL-01",
                300,
                14200.0,
                380000.0,
                25.8,
                "Draft",
                "SOP-LOG-2025-04 §2 (Expedited Freight Cost-Benefit Formula)",
                "ChainMind Logistics Agent"
            ),
            (
                "REC-2026-003",
                "Emergency Secondary Sourcing: 400 GaN Chargers from Apex",
                "Emergency Sourcing",
                "Primary vendor Zenith Battery Technologies experiencing chronic supply bottleneck with 5-day delivery slippage.",
                "Place emergency purchase order with secondary qualified supplier Apex Microtronics at approved 4.5% volume rebate under MSA-2024-APEX-001 §3.2.",
                "SKU-PWR-301",
                "Apex Microtronics",
                "WH-DEL-01",
                400,
                740000.0,
                260000.0,
                3.5,
                "Approved",
                "SOP-PROC-2025-V3.2 §3.2 (Emergency Secondary Sourcing DOA)",
                "ChainMind Procurement Agent"
            )
        ]

        for rec_id, title, cat, prob_stmt, prop_act, sku, src, dest, qty, cost, savings, roi, stat, cit, creator in recs_data:
            rec = Recommendation(
                id=rec_id,
                title=title,
                category=cat,
                problem_statement=prob_stmt,
                proposed_action=prop_act,
                target_sku=sku,
                source_location=src,
                destination_location=dest,
                quantity=qty,
                estimated_cost=cost,
                expected_savings_or_revenue_protected=savings,
                net_roi=roi,
                status=stat,
                policy_citation=cit,
                created_by=creator,
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 12))
            )
            db.add(rec)
        db.commit()

        # 9. Knowledge Documents
        print("[DOCUMENTS] Registering Knowledge Documents in Hub...")
        docs_dir = settings.DATA_DIR / "documents"
        doc_files = [
            ("DOC-001", "Apex Microtronics Master Supply Agreement", "Supplier Contract", "SUP_001_apex_contract.md", "2.4", "January 2024"),
            ("DOC-002", "Velox Semiconductor Master Supply Agreement", "Supplier Contract", "SUP_002_velox_contract.md", "1.8", "March 2024"),
            ("DOC-003", "Corporate Procurement Policy & Delegation of Authority", "Procurement Policy", "procurement_policy_sop_v3.md", "3.2", "November 2025"),
            ("DOC-004", "Expedited Freight & Logistics SLA Guidelines", "Logistics SLA", "expedited_freight_guidelines.md", "1.0", "January 2025"),
            ("DOC-005", "Supply Chain Disruption & Inventory Rebalancing Playbook", "Disruption SOP", "disruption_contingency_playbook.md", "2.0", "February 2025"),
        ]

        for d_id, title, d_type, fname, ver, eff_date in doc_files:
            fpath = docs_dir / fname
            summary = ""
            if fpath.exists():
                with open(fpath, "r", encoding="utf-8") as f:
                    summary = f.read()[:300] + "..."
            
            kdoc = KnowledgeDocument(
                id=d_id,
                title=title,
                document_type=d_type,
                filename=fname,
                version=ver,
                effective_date=eff_date,
                file_path=str(fpath),
                content_summary=summary,
                created_at=datetime.utcnow()
            )
            db.add(kdoc)
        db.commit()

        print("[SUCCESS] Database successfully seeded with 100% realistic operational data!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error during seed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
