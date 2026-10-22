import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.core.database import SessionLocal
from backend.app.services.forecasting import DemandForecastingEngine
from backend.app.services.optimization import SupplyChainOptimizer
from backend.app.services.rag import RAGKnowledgeHub
from backend.app.services.suppliers import SupplierIntelligenceService
from backend.app.services.logistics import LogisticsIntelligenceService
from backend.app.models.entities import Recommendation

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------------------------------------------------------------
# 1. Demand Forecasting Machine Learning Tests
# -------------------------------------------------------------------------
def test_forecasting_pipeline(db_session):
    engine = DemandForecastingEngine(db_session)
    res = engine.generate_forecast("SKU-AUD-101", "WH-DEL-01", horizon_days=14)

    assert res.product_id == "SKU-AUD-101"
    assert res.warehouse_id == "WH-DEL-01"
    assert len(res.forecast) == 14
    assert res.wape > 0.0
    assert res.mae > 0.0

    # Verify uncertainty interval ordering: P10 <= P50 <= P90
    for pt in res.forecast:
        assert pt.p10 <= pt.p50, f"P10 ({pt.p10}) should be <= P50 ({pt.p50})"
        assert pt.p50 <= pt.p90, f"P50 ({pt.p50}) should be <= P90 ({pt.p90})"

# -------------------------------------------------------------------------
# 2. Google OR-Tools Mathematical Optimization Solver Tests
# -------------------------------------------------------------------------
def test_ortools_optimization(db_session):
    optimizer = SupplyChainOptimizer(db_session)
    res = optimizer.evaluate_delay_scenarios(
        sku="SKU-AUD-101",
        destination_wh="WH-DEL-01",
        supplier_delay_days=5,
        budget_limit=50000.0,
        target_service_level=0.95
    )

    assert len(res.scenarios) == 3
    scenario_a = next(s for s in res.scenarios if s.scenario_id == "scenario_a_accept_delay")
    scenario_b = next(s for s in res.scenarios if s.scenario_id == "scenario_b_expedite_freight")
    scenario_c = next(s for s in res.scenarios if s.scenario_id == "scenario_c_transfer_stock")

    # Scenario A should result in substantial shortage costs
    assert scenario_a.estimated_total_cost > 100000.0
    assert scenario_a.expected_service_level < 0.80

    # Scenario C (OR-Tools Inter-Warehouse Transfer) should be feasible and highly cost-effective
    assert scenario_c.feasible is True
    assert scenario_c.estimated_total_cost < scenario_a.estimated_total_cost
    assert scenario_c.expected_service_level >= 0.90

    # The recommended scenario must be cost-optimal among high-service-level alternatives
    assert res.recommended_scenario_id in ["scenario_b_expedite_freight", "scenario_c_transfer_stock"]

# -------------------------------------------------------------------------
# 3. Grounded RAG & Anti-Hallucination Guardrail Tests
# -------------------------------------------------------------------------
def test_rag_grounding_and_abstention():
    hub = RAGKnowledgeHub()

    # Test In-Scope Policy Query
    res_in_scope = hub.query("What is the penalty if Apex delivers late?")
    assert res_in_scope.abstention_triggered is False
    assert len(res_in_scope.citations) > 0
    assert "Section 4" in res_in_scope.citations[0].section or "Late Delivery" in res_in_scope.citations[0].section
    assert "1.5%" in res_in_scope.answer or "grace period" in res_in_scope.answer.lower()

    # Test Out-of-Scope Query (Verifying Abstention Guardrail)
    res_out_of_scope = hub.query("What is the company policy on employee vacation in Hawaii?")
    assert res_out_of_scope.abstention_triggered is True
    assert len(res_out_of_scope.citations) == 0
    assert "governance guidelines" in res_out_of_scope.answer.lower()

# -------------------------------------------------------------------------
# 4. Supplier Intelligence & Scorecard Tests
# -------------------------------------------------------------------------
def test_supplier_intelligence(db_session):
    svc = SupplierIntelligenceService(db_session)
    scorecards = svc.get_supplier_scorecards()

    assert len(scorecards) == 8
    # Scorecards must be sorted by risk score descending
    for i in range(len(scorecards) - 1):
        assert scorecards[i]["risk_score"] >= scorecards[i + 1]["risk_score"]

    # Test Draft PO with volume rebate
    po_draft = svc.draft_purchase_order("SKU-AUD-101", "WH-DEL-01", target_quantity=600)
    assert po_draft["order_quantity"] == 600
    assert po_draft["discount_percentage"] == 4.5  # 4.5% volume discount for 500+ units
    assert po_draft["total_commitment_inr"] > 0

# -------------------------------------------------------------------------
# 5. Action Center Governance & Approval State Machine Tests
# -------------------------------------------------------------------------
def test_action_center_lifecycle(db_session):
    # Fetch pending action
    actions = client.get("/api/v1/actions/").json()
    assert len(actions) > 0

    target_action = actions[0]
    action_id = target_action["id"]

    # Approve action
    resp_approve = client.post(
        f"/api/v1/actions/{action_id}/decision",
        json={"decision": "Approve", "reviewer": "VP of Operations", "notes": "Approved for testing."}
    )
    assert resp_approve.status_code == 200
    assert resp_approve.json()["new_status"] == "Approved"

    # Execute action
    resp_execute = client.post(
        f"/api/v1/actions/{action_id}/decision",
        json={"decision": "Execute", "reviewer": "Automated Dispatch System"}
    )
    assert resp_execute.status_code == 200
    assert resp_execute.json()["new_status"] == "Executed"
    assert "Successfully executed" in resp_execute.json()["execution_result"]

# -------------------------------------------------------------------------
# 6. Full FastAPI Endpoints Health & Schema Tests
# -------------------------------------------------------------------------
def test_api_endpoints_health():
    # Overview
    r_overview = client.get("/api/v1/dashboard/overview")
    assert r_overview.status_code == 200
    assert r_overview.json()["total_inventory_value_inr"] > 0
    assert len(r_overview.json()["critical_risks"]) > 0

    # Inventory
    r_inv = client.get("/api/v1/inventory/")
    assert r_inv.status_code == 200
    assert len(r_inv.json()) == 120

    # Logistics
    r_shipments = client.get("/api/v1/logistics/shipments")
    assert r_shipments.status_code == 200
    assert len(r_shipments.json()) > 0

    # Copilot Chat
    r_chat = client.post(
        "/api/v1/copilot/chat",
        json={"prompt": "Which products are facing stockout risks?"}
    )
    assert r_chat.status_code == 200
    assert "response_markdown" in r_chat.json()
    assert len(r_chat.json()["response_markdown"]) > 50
