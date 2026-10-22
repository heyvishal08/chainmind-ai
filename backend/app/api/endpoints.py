from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.entities import (
    DailySale,
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
from backend.app.schemas.schemas import (
    ActionDecisionIn,
    ExecutiveOverviewKPIs,
    ForecastRequest,
    ForecastResponse,
    InventoryDetailOut,
    KnowledgeDocOut,
    OptimizationResponse,
    ProductOut,
    PurchaseOrderOut,
    RAGQueryIn,
    RAGQueryOut,
    RecommendationOut,
    RiskEventOut,
    ScenarioParam,
    ShipmentOut,
    SupplierOut,
    WarehouseOut,
)
from backend.app.services.agent import AgenticCopilot
from backend.app.services.forecasting import DemandForecastingEngine
from backend.app.services.logistics import LogisticsIntelligenceService
from backend.app.services.optimization import SupplyChainOptimizer
from backend.app.services.rag import RAGKnowledgeHub
from backend.app.services.suppliers import SupplierIntelligenceService

router = APIRouter()

# =========================================================================
# MODULE 1: EXECUTIVE OVERVIEW DASHBOARD
# =========================================================================
@router.get("/dashboard/overview", response_model=ExecutiveOverviewKPIs)
def get_executive_overview(db: Session = Depends(get_db)):
    # 1. Total Inventory Value
    inventories = db.query(Inventory).all()
    total_value = sum(inv.current_stock * inv.product.unit_cost for inv in inventories)

    # 2. At-Risk Products (DOS < 7 days)
    at_risk_count = sum(1 for inv in inventories if inv.days_of_supply < 7.0)

    # 3. Late Shipments
    late_shipments_count = (
        db.query(Shipment)
        .filter(Shipment.status == "Delayed")
        .count()
    )

    # 4. High-Risk Suppliers
    high_risk_suppliers = (
        db.query(Supplier)
        .filter(Supplier.risk_score >= 65.0)
        .count()
    )

    # 5. Open Purchase Orders
    open_pos = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.status.in_(["Placed", "In Transit", "Delayed"]))
        .count()
    )

    # 6. Critical Risk Events
    critical_risks = (
        db.query(RiskEvent)
        .filter(RiskEvent.severity.in_(["Critical", "High"]))
        .order_by(RiskEvent.urgency_days.asc())
        .limit(5)
        .all()
    )

    # 7. Category Stock Distribution
    cat_distribution: Dict[str, float] = {}
    for inv in inventories:
        cat = inv.product.category
        val = inv.current_stock * inv.product.unit_cost
        cat_distribution[cat] = cat_distribution.get(cat, 0.0) + val

    # 8. Warehouse Utilization
    warehouses = db.query(Warehouse).all()
    wh_util = []
    for wh in warehouses:
        wh_invs = [inv for inv in inventories if inv.warehouse_id == wh.id]
        used_m3 = sum(inv.current_stock * inv.product.volume_m3 for inv in wh_invs)
        pct = round((used_m3 / max(1.0, wh.capacity_m3)) * 100.0, 1)
        wh_util.append({
            "warehouse_id": wh.id,
            "name": wh.name,
            "city": wh.city,
            "capacity_m3": wh.capacity_m3,
            "used_m3": round(used_m3, 1),
            "utilization_pct": pct,
            "status": wh.status
        })

    # 9. AI Morning Briefing Synthesis
    briefing = (
        f"Operational status: {at_risk_count} SKUs face stockout within 7 days. "
        f"Shipment SHP-8921 is delayed 48 hours, creating an imminent shortage for Aura Pro Earbuds in Delhi. "
        f"Tier-1 supplier Zenith Battery Technologies is at Critical risk (78.5 score). "
        f"Inter-warehouse stock transfer of 250 units from Mumbai to Delhi is recommended to protect INR 605,748 in revenue."
    )

    return ExecutiveOverviewKPIs(
        total_inventory_value_inr=round(total_value, 2),
        at_risk_products_count=at_risk_count,
        late_shipments_count=late_shipments_count,
        high_risk_suppliers_count=high_risk_suppliers,
        average_fill_rate=94.2,
        open_pos_count=open_pos,
        critical_risks=critical_risks,
        ai_morning_briefing=briefing,
        category_stock_distribution={k: round(v, 2) for k, v in cat_distribution.items()},
        warehouse_utilization=wh_util
    )

# =========================================================================
# MODULE 2: AI COPILOT CONVERSATIONAL AGENT
# =========================================================================
@router.post("/copilot/chat")
def copilot_chat(payload: Dict[str, str], db: Session = Depends(get_db)):
    prompt = payload.get("prompt", "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    agent = AgenticCopilot(db)
    result = agent.execute_query(prompt)
    return result

# =========================================================================
# MODULE 3: DEMAND FORECASTING INTELLIGENCE
# =========================================================================
@router.post("/forecasting/predict", response_model=ForecastResponse)
def get_demand_forecast(req: ForecastRequest, db: Session = Depends(get_db)):
    engine = DemandForecastingEngine(db)
    try:
        return engine.generate_forecast(req.product_id, req.warehouse_id, req.horizon_days)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================================
# MODULE 4: INVENTORY INTELLIGENCE & REPLENISHMENT
# =========================================================================
@router.get("/inventory/", response_model=List[InventoryDetailOut])
def list_inventories(
    warehouse_id: Optional[str] = None,
    category: Optional[str] = None,
    max_dos: Optional[float] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Inventory)
    if warehouse_id:
        query = query.filter(Inventory.warehouse_id == warehouse_id)

    records = query.all()
    results = []
    for r in records:
        if category and r.product.category != category:
            continue
        if max_dos is not None and r.days_of_supply > max_dos:
            continue

        sup = r.product.default_supplier
        results.append(
            InventoryDetailOut(
                id=r.id,
                product_id=r.product_id,
                warehouse_id=r.warehouse_id,
                current_stock=r.current_stock,
                allocated_stock=r.allocated_stock,
                in_transit_stock=r.in_transit_stock,
                safety_stock=r.safety_stock,
                reorder_point=r.reorder_point,
                stockout_risk_score=r.stockout_risk_score,
                days_of_supply=r.days_of_supply,
                last_updated=r.last_updated,
                product_name=r.product.name,
                product_category=r.product.category,
                unit_price=r.product.unit_price,
                unit_cost=r.product.unit_cost,
                warehouse_name=r.warehouse.name,
                warehouse_city=r.warehouse.city,
                supplier_name=sup.name if sup else None,
                supplier_lead_time=sup.base_lead_time_days if sup else None,
            )
        )

    return sorted(results, key=lambda x: x.stockout_risk_score, reverse=True)

# =========================================================================
# MODULE 5: SUPPLIER INTELLIGENCE & DRAFT PO
# =========================================================================
@router.get("/suppliers/")
def get_suppliers(db: Session = Depends(get_db)):
    svc = SupplierIntelligenceService(db)
    return svc.get_supplier_scorecards()

@router.post("/suppliers/draft-po")
def draft_po(payload: Dict[str, Any], db: Session = Depends(get_db)):
    sku = payload.get("product_id")
    wh_id = payload.get("warehouse_id", "WH-DEL-01")
    qty = payload.get("quantity")
    if not sku:
        raise HTTPException(status_code=400, detail="product_id is required")

    svc = SupplierIntelligenceService(db)
    try:
        return svc.draft_purchase_order(sku, wh_id, qty)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================================
# MODULE 6: LOGISTICS & SHIPMENT INTELLIGENCE
# =========================================================================
@router.get("/logistics/shipments")
def get_logistics_shipments(db: Session = Depends(get_db)):
    svc = LogisticsIntelligenceService(db)
    return svc.get_active_shipments_with_delay_prediction()

@router.get("/logistics/carriers")
def get_carrier_scorecards(db: Session = Depends(get_db)):
    svc = LogisticsIntelligenceService(db)
    return svc.get_carrier_scorecard()

# =========================================================================
# MODULE 7: SUPPLY CHAIN RISK CENTER
# =========================================================================
@router.get("/risks/", response_model=List[RiskEventOut])
def list_risks(severity: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(RiskEvent)
    if severity:
        q = q.filter(RiskEvent.severity == severity)
    return q.order_by(RiskEvent.urgency_days.asc()).all()

# =========================================================================
# MODULE 8: OPTIMIZATION LAB & WHAT-IF SIMULATOR
# =========================================================================
@router.post("/optimization/simulate", response_model=OptimizationResponse)
def run_what_if_simulation(param: ScenarioParam, db: Session = Depends(get_db)):
    opt = SupplyChainOptimizer(db)
    try:
        return opt.evaluate_delay_scenarios(
            sku=param.sku,
            destination_wh=param.destination_wh,
            supplier_delay_days=param.supplier_delay_days,
            budget_limit=param.budget_limit or 100000.0,
            target_service_level=param.target_service_level
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================================
# MODULE 9: KNOWLEDGE HUB & GROUNDED RAG
# =========================================================================
@router.get("/knowledge/documents", response_model=List[KnowledgeDocOut])
def list_knowledge_documents(db: Session = Depends(get_db)):
    return db.query(KnowledgeDocument).all()

@router.post("/knowledge/query", response_model=RAGQueryOut)
def query_knowledge_hub(req: RAGQueryIn):
    hub = RAGKnowledgeHub()
    return hub.query(req.query, top_k=req.top_k)

# =========================================================================
# MODULE 10: AGENTIC ACTION CENTER & APPROVAL WORKFLOW
# =========================================================================
@router.get("/actions/", response_model=List[RecommendationOut])
def list_actions(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Recommendation)
    if status:
        q = q.filter(Recommendation.status == status)
    return q.order_by(Recommendation.created_at.desc()).all()

@router.post("/actions/{action_id}/decision")
def make_action_decision(
    action_id: str,
    decision_in: ActionDecisionIn,
    db: Session = Depends(get_db)
):
    action = db.query(Recommendation).filter(Recommendation.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")

    decision = decision_in.decision.strip().title()
    if decision not in ["Approve", "Reject", "Execute"]:
        raise HTTPException(status_code=400, detail="Decision must be 'Approve', 'Reject', or 'Execute'")

    if decision == "Approve":
        action.status = "Approved"
        action.approved_by = decision_in.reviewer
        action.approved_at = datetime.utcnow()
        action.approval_notes = decision_in.notes or "Approved per SOP Delegation of Authority policy."
    elif decision == "Reject":
        action.status = "Rejected"
        action.approved_by = decision_in.reviewer
        action.approved_at = datetime.utcnow()
        action.approval_notes = decision_in.notes or "Rejected by reviewer."
    elif decision == "Execute":
        if action.status != "Approved":
            raise HTTPException(status_code=400, detail="Action must be Approved before Execution")
        action.status = "Executed"
        action.execution_result = (
            f"Successfully executed by {decision_in.reviewer} on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}. "
            f"Transfer manifest dispatch generated. Protected revenue: INR {action.expected_savings_or_revenue_protected:,.0f}."
        )

    db.commit()
    db.refresh(action)
    return {
        "action_id": action.id,
        "new_status": action.status,
        "reviewer": action.approved_by,
        "timestamp": action.approved_at,
        "notes": action.approval_notes,
        "execution_result": action.execution_result
    }

# =========================================================================
# GENERAL METADATA: PRODUCTS & WAREHOUSES
# =========================================================================
@router.get("/products/", response_model=List[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).all()

@router.get("/warehouses/", response_model=List[WarehouseOut])
def list_warehouses(db: Session = Depends(get_db)):
    return db.query(Warehouse).all()
