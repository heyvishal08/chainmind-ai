from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import date, datetime

# Base Config for ORM mode in Pydantic v2
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# Product Schemas
class ProductBase(BaseSchema):
    id: str
    name: str
    category: str
    unit_price: float
    unit_cost: float
    weight_kg: float
    volume_m3: float
    default_supplier_id: Optional[str] = None

class ProductOut(ProductBase):
    pass

# Warehouse Schemas
class WarehouseOut(BaseSchema):
    id: str
    name: str
    city: str
    region: str
    latitude: float
    longitude: float
    capacity_m3: float
    monthly_holding_cost_rate: float
    status: str

# Supplier Schemas
class SupplierOut(BaseSchema):
    id: str
    name: str
    tier: int
    country: str
    city: str
    contact_email: Optional[str]
    contract_ref: Optional[str]
    base_lead_time_days: int
    lead_time_variance_days: float
    on_time_delivery_rate: float
    defect_rate: float
    min_order_qty: int
    daily_production_capacity: int
    risk_score: float
    risk_level: str
    status: str

# Inventory Schemas
class InventoryOut(BaseSchema):
    id: int
    product_id: str
    warehouse_id: str
    current_stock: int
    allocated_stock: int
    in_transit_stock: int
    safety_stock: int
    reorder_point: int
    stockout_risk_score: float
    days_of_supply: float
    last_updated: datetime

class InventoryDetailOut(InventoryOut):
    product_name: str
    product_category: str
    unit_price: float
    unit_cost: float
    warehouse_name: str
    warehouse_city: str
    supplier_name: Optional[str] = None
    supplier_lead_time: Optional[int] = None

# Sales & Demand Schemas
class DailySalePoint(BaseSchema):
    date: date
    units_sold: int
    revenue: float
    stockout_occurred: bool
    unfulfilled_demand: int
    is_promo_day: bool

class DemandHistoryOut(BaseSchema):
    product_id: str
    warehouse_id: Optional[str]
    history: List[DailySalePoint]

# Orders & Logistics
class PurchaseOrderOut(BaseSchema):
    id: str
    product_id: str
    supplier_id: str
    destination_warehouse_id: str
    quantity: int
    unit_price: float
    total_cost: float
    status: str
    order_date: date
    expected_delivery_date: date
    revised_delivery_date: Optional[date]
    actual_delivery_date: Optional[date]
    is_expedited: bool

class ShipmentOut(BaseSchema):
    id: str
    purchase_order_id: str
    carrier_name: str
    origin_location: str
    destination_warehouse_id: str
    current_location: str
    status: str
    dispatch_date: datetime
    estimated_arrival: datetime
    predicted_delay_hours: float
    delay_probability: float
    priority_level: str
    transport_mode: str

# Risk Management
class RiskEventOut(BaseSchema):
    id: str
    risk_type: str
    title: str
    description: str
    affected_product_id: Optional[str]
    affected_warehouse_id: Optional[str]
    affected_supplier_id: Optional[str]
    affected_shipment_id: Optional[str]
    severity: str
    probability: float
    estimated_financial_impact: float
    urgency_days: int
    status: str
    recommended_action: Optional[str]
    created_at: datetime

# Action Center
class RecommendationOut(BaseSchema):
    id: str
    title: str
    category: str
    problem_statement: str
    proposed_action: str
    target_sku: str
    source_location: Optional[str]
    destination_location: Optional[str]
    quantity: int
    estimated_cost: float
    expected_savings_or_revenue_protected: float
    net_roi: float
    status: str
    policy_citation: Optional[str]
    created_by: str
    created_at: datetime
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    approval_notes: Optional[str]
    execution_result: Optional[str]

class ActionDecisionIn(BaseModel):
    decision: str  # "Approve", "Reject", "Execute"
    reviewer: str = "Supply Chain Manager"
    notes: Optional[str] = None

# Forecasting
class ForecastRequest(BaseModel):
    product_id: str
    warehouse_id: str
    horizon_days: int = 14

class ForecastPoint(BaseModel):
    date: str
    p10: float
    p50: float
    p90: float

class ForecastResponse(BaseModel):
    product_id: str
    product_name: str
    warehouse_id: str
    model_name: str
    horizon_days: int
    wape: float
    mae: float
    forecast: List[ForecastPoint]
    historical_last_30_days: List[DailySalePoint]

# Optimization & What-If
class ScenarioParam(BaseModel):
    scenario_type: str  # "accept_delay", "expedite_flight", "inter_wh_transfer"
    sku: str
    destination_wh: str
    supplier_delay_days: int = 5
    budget_limit: Optional[float] = None
    target_service_level: float = 0.95

class ScenarioResult(BaseModel):
    scenario_id: str
    scenario_name: str
    feasible: bool
    estimated_total_cost: float
    expected_service_level: float
    stockout_exposure_units: int
    arrival_day_offset: int
    constraints_violated: List[str]
    recommendation_summary: str

class OptimizationResponse(BaseModel):
    problem_description: str
    baseline_stockout_cost: float
    scenarios: List[ScenarioResult]
    recommended_scenario_id: str

# RAG & Knowledge Hub
class KnowledgeDocOut(BaseSchema):
    id: str
    title: str
    document_type: str
    filename: str
    version: str
    effective_date: Optional[str]
    file_path: str
    content_summary: Optional[str]

class RAGQueryIn(BaseModel):
    query: str
    top_k: int = 3

class RAGCitations(BaseModel):
    document_id: str
    document_title: str
    section: str
    snippet: str
    confidence_score: float

class RAGQueryOut(BaseModel):
    query: str
    answer: str
    citations: List[RAGCitations]
    abstention_triggered: bool

# Executive Dashboard Overview
class DemandTrendPoint(BaseModel):
    date: str
    actual_sales: Optional[int] = None
    forecasted_demand: Optional[int] = None

class InventoryHealthBreakdown(BaseModel):
    critical_stockout: int  # < 7 days
    low_stock: int          # 7 - 14 days
    healthy: int            # 14 - 60 days
    excess_stock: int       # > 60 days

class CarrierPerformanceSummary(BaseModel):
    carrier: str
    on_time_rate: float
    delayed_count: int
    total_count: int

class ExecutiveOverviewKPIs(BaseModel):
    total_inventory_value_inr: float
    at_risk_products_count: int
    late_shipments_count: int
    high_risk_suppliers_count: int
    average_fill_rate: float
    open_pos_count: int
    critical_risks: List[RiskEventOut]
    ai_morning_briefing: str
    category_stock_distribution: Dict[str, float]
    warehouse_utilization: List[Dict[str, Any]]
    demand_trend: List[DemandTrendPoint] = []
    inventory_health_breakdown: Optional[InventoryHealthBreakdown] = None
    carrier_performance: List[CarrierPerformanceSummary] = []
