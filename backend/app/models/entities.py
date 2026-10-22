from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    category = Column(String(80), nullable=False, index=True)
    unit_price = Column(Float, nullable=False)  # Selling price
    unit_cost = Column(Float, nullable=False)   # Procurement COGS
    weight_kg = Column(Float, default=0.5)
    volume_m3 = Column(Float, default=0.005)
    default_supplier_id = Column(String(50), ForeignKey("suppliers.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    inventories = relationship("Inventory", back_populates="product", cascade="all, delete-orphan")
    sales = relationship("DailySale", back_populates="product", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="product")
    default_supplier = relationship("Supplier", foreign_keys=[default_supplier_id])


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    city = Column(String(100), nullable=False)
    region = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity_m3 = Column(Float, nullable=False)
    monthly_holding_cost_rate = Column(Float, default=0.018)  # 1.8% of inventory value / month
    status = Column(String(50), default="Operational")

    # Relationships
    inventories = relationship("Inventory", back_populates="warehouse", cascade="all, delete-orphan")
    sales = relationship("DailySale", back_populates="warehouse", cascade="all, delete-orphan")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    tier = Column(Integer, default=1)
    country = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    contact_email = Column(String(120), nullable=True)
    contract_ref = Column(String(100), nullable=True)  # References Knowledge Hub document
    base_lead_time_days = Column(Integer, nullable=False)
    lead_time_variance_days = Column(Float, nullable=False)  # Standard deviation
    on_time_delivery_rate = Column(Float, nullable=False)    # e.g. 0.94
    defect_rate = Column(Float, default=0.012)              # Rejection %
    min_order_qty = Column(Integer, default=100)
    daily_production_capacity = Column(Integer, default=2500)
    risk_score = Column(Float, default=15.0)                # 0 - 100
    risk_level = Column(String(30), default="Low")          # Low, Medium, High, Critical
    status = Column(String(50), default="Active")

    # Relationships
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(String(50), ForeignKey("warehouses.id"), nullable=False, index=True)
    current_stock = Column(Integer, default=0)
    allocated_stock = Column(Integer, default=0)
    in_transit_stock = Column(Integer, default=0)
    safety_stock = Column(Integer, default=0)
    reorder_point = Column(Integer, default=0)
    stockout_risk_score = Column(Float, default=0.0)  # 0 to 100%
    days_of_supply = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="inventories")
    warehouse = relationship("Warehouse", back_populates="inventories")


class DailySale(Base):
    __tablename__ = "daily_sales"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(String(50), ForeignKey("warehouses.id"), nullable=False, index=True)
    units_sold = Column(Integer, default=0)
    revenue = Column(Float, default=0.0)
    stockout_occurred = Column(Boolean, default=False)
    unfulfilled_demand = Column(Integer, default=0)
    is_promo_day = Column(Boolean, default=False)

    # Relationships
    product = relationship("Product", back_populates="sales")
    warehouse = relationship("Warehouse", back_populates="sales")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(String(50), primary_key=True, index=True)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=False)
    supplier_id = Column(String(50), ForeignKey("suppliers.id"), nullable=False)
    destination_warehouse_id = Column(String(50), ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)
    status = Column(String(40), default="Placed")  # Draft, Placed, In Transit, Delivered, Cancelled
    order_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date, nullable=False)
    revised_delivery_date = Column(Date, nullable=True)
    actual_delivery_date = Column(Date, nullable=True)
    is_expedited = Column(Boolean, default=False)

    # Relationships
    product = relationship("Product", back_populates="purchase_orders")
    supplier = relationship("Supplier", back_populates="purchase_orders")
    destination_warehouse = relationship("Warehouse")
    shipment = relationship("Shipment", back_populates="purchase_order", uselist=False)


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(String(50), primary_key=True, index=True)
    purchase_order_id = Column(String(50), ForeignKey("purchase_orders.id"), nullable=False, unique=True)
    carrier_name = Column(String(100), nullable=False)
    origin_location = Column(String(120), nullable=False)
    destination_warehouse_id = Column(String(50), ForeignKey("warehouses.id"), nullable=False)
    current_location = Column(String(120), nullable=False)
    status = Column(String(50), default="In Transit")  # Dispatched, In Transit, Delayed, Delivered
    dispatch_date = Column(DateTime, nullable=False)
    estimated_arrival = Column(DateTime, nullable=False)
    predicted_delay_hours = Column(Float, default=0.0)
    delay_probability = Column(Float, default=0.0)  # 0.0 to 1.0
    priority_level = Column(String(30), default="Standard")  # Standard, High, Critical
    transport_mode = Column(String(50), default="Road Express")  # Road Express, Air Freight, Ocean Intermodal

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="shipment")
    destination_warehouse = relationship("Warehouse")


class RiskEvent(Base):
    __tablename__ = "risk_events"

    id = Column(String(50), primary_key=True, index=True)
    risk_type = Column(String(60), nullable=False, index=True)  # Stockout Risk, Supplier Disruption, Shipment Delay, Excess Inventory
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    affected_product_id = Column(String(50), ForeignKey("products.id"), nullable=True)
    affected_warehouse_id = Column(String(50), ForeignKey("warehouses.id"), nullable=True)
    affected_supplier_id = Column(String(50), ForeignKey("suppliers.id"), nullable=True)
    affected_shipment_id = Column(String(50), ForeignKey("shipments.id"), nullable=True)
    severity = Column(String(30), nullable=False, default="Medium")  # Critical, High, Medium, Low
    probability = Column(Float, default=0.5)
    estimated_financial_impact = Column(Float, default=0.0)  # Currency impact (₹)
    urgency_days = Column(Integer, default=7)
    status = Column(String(40), default="Open")  # Open, Investigating, Mitigated, Dismissed
    recommended_action = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product")
    warehouse = relationship("Warehouse")
    supplier = relationship("Supplier")
    shipment = relationship("Shipment")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    category = Column(String(80), nullable=False)  # Expedited Order, Inter-Warehouse Transfer, Emergency Sourcing, Safety Stock Adjustment
    problem_statement = Column(Text, nullable=False)
    proposed_action = Column(Text, nullable=False)
    target_sku = Column(String(50), ForeignKey("products.id"), nullable=False)
    source_location = Column(String(100), nullable=True)
    destination_location = Column(String(100), nullable=True)
    quantity = Column(Integer, default=0)
    estimated_cost = Column(Float, default=0.0)
    expected_savings_or_revenue_protected = Column(Float, default=0.0)
    net_roi = Column(Float, default=0.0)
    status = Column(String(40), default="Pending Approval")  # Draft, Pending Approval, Approved, Rejected, Executed, Failed
    policy_citation = Column(String(255), nullable=True)
    created_by = Column(String(100), default="ChainMind Supervisor Agent")
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approval_notes = Column(Text, nullable=True)
    execution_result = Column(Text, nullable=True)

    # Relationship
    product = relationship("Product")


class ForecastRun(Base):
    __tablename__ = "forecast_runs"

    id = Column(String(50), primary_key=True, index=True)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(String(50), ForeignKey("warehouses.id"), nullable=False)
    model_name = Column(String(80), nullable=False)
    horizon_days = Column(Integer, nullable=False)
    forecast_values = Column(Text, nullable=False)  # JSON string with dates, p10, p50, p90
    wape = Column(Float, default=0.0)
    mae = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    product = relationship("Product")
    warehouse = relationship("Warehouse")


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    document_type = Column(String(80), nullable=False)  # Supplier Contract, Procurement Policy, Logistics SLA, Disruption SOP
    filename = Column(String(150), nullable=False)
    version = Column(String(30), default="1.0")
    effective_date = Column(String(50), nullable=True)
    file_path = Column(String(255), nullable=False)
    content_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
