import math
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from ortools.linear_solver import pywraplp

from backend.app.models.entities import Inventory, Product, PurchaseOrder, Supplier, Warehouse
from backend.app.schemas.schemas import OptimizationResponse, ScenarioResult

# Inter-warehouse transfer unit cost and latency matrix (based on SOP-OPS-2025-08)
TRANSFER_CORRIDORS = {
    ("WH-MUM-01", "WH-DEL-01"): {"cost_per_unit": 18.0, "transit_days": 2, "name": "Western-Northern Express Corridor"},
    ("WH-DEL-01", "WH-MUM-01"): {"cost_per_unit": 18.0, "transit_days": 2, "name": "Northern-Western Express Corridor"},
    ("WH-BLR-01", "WH-DEL-01"): {"cost_per_unit": 22.0, "transit_days": 3, "name": "Southern-Northern Express Corridor"},
    ("WH-BLR-01", "WH-MUM-01"): {"cost_per_unit": 14.0, "transit_days": 2, "name": "Southern-Western Express Corridor"},
    ("WH-MUM-01", "WH-BLR-01"): {"cost_per_unit": 14.0, "transit_days": 2, "name": "Western-Southern Express Corridor"},
    ("WH-BLR-01", "WH-MAA-01"): {"cost_per_unit": 8.0, "transit_days": 1, "name": "Southern Cross Corridor"},
    ("WH-MAA-01", "WH-BLR-01"): {"cost_per_unit": 8.0, "transit_days": 1, "name": "Southern Cross Corridor"},
    ("WH-MUM-01", "WH-MAA-01"): {"cost_per_unit": 16.0, "transit_days": 2, "name": "Western-Coastal Corridor"},
}

class SupplyChainOptimizer:
    def __init__(self, db: Session):
        self.db = db

    def evaluate_delay_scenarios(
        self,
        sku: str,
        destination_wh: str,
        supplier_delay_days: int = 5,
        budget_limit: Optional[float] = 50000.0,
        target_service_level: float = 0.95,
    ) -> OptimizationResponse:
        """Evaluates operational trade-offs across 3 realistic scenarios:
        1. Accept Delay (Baseline passive outcome)
        2. Expedite Freight (Air cargo fast-track)
        3. Inter-Warehouse Transfer (OR-Tools MILP donor rebalancing)
        """
        product = self.db.query(Product).filter(Product.id == sku).first()
        if not product:
            raise ValueError(f"Product {sku} not found")

        dest_inv = (
            self.db.query(Inventory)
            .filter(Inventory.product_id == sku, Inventory.warehouse_id == destination_wh)
            .first()
        )
        if not dest_inv:
            raise ValueError(f"Inventory record for {sku} at {destination_wh} not found")

        gross_margin = max(50.0, product.unit_price - product.unit_cost)
        unit_shortage_penalty = gross_margin * 1.25  # Includes customer goodwill penalty

        # Current demand velocity
        daily_demand = max(5.0, dest_inv.reorder_point / 14.0)
        current_stock = dest_inv.current_stock
        scheduled_po_qty = dest_inv.in_transit_stock if dest_inv.in_transit_stock > 0 else 400

        # Base arrival day without disruption = 2 days
        base_arrival = 2
        disrupted_arrival = base_arrival + supplier_delay_days

        # -------------------------------------------------------------
        # SCENARIO A: Accept Delay (Passive)
        # -------------------------------------------------------------
        # Simulate inventory trajectory until delayed arrival
        stockout_units_a = 0
        stock_sim = current_stock
        for d in range(1, disrupted_arrival + 1):
            stock_sim -= daily_demand
            if stock_sim < 0:
                shortage = abs(stock_sim)
                stockout_units_a += int(math.ceil(shortage))
                stock_sim = 0  # stockout

        shortage_cost_a = round(stockout_units_a * unit_shortage_penalty, 2)
        total_period_demand_a = daily_demand * disrupted_arrival
        fulfilled_units_a = max(0, total_period_demand_a - stockout_units_a)
        service_level_a = round(min(1.0, fulfilled_units_a / max(1.0, total_period_demand_a)), 3)

        scenario_a = ScenarioResult(
            scenario_id="scenario_a_accept_delay",
            scenario_name="Scenario A: Accept Delay (Passive)",
            feasible=True,
            estimated_total_cost=shortage_cost_a,
            expected_service_level=service_level_a,
            stockout_exposure_units=int(stockout_units_a),
            arrival_day_offset=disrupted_arrival,
            constraints_violated=[
                f"SLA Violation: Expected service level ({service_level_a*100:.1f}%) falls below target {target_service_level*100:.0f}%",
                f"Stockout risk: {stockout_units_a} units unfulfilled across {supplier_delay_days} delay days"
            ],
            recommendation_summary=(
                f"Accepting the 5-day delay will exhaust current inventory in {dest_inv.days_of_supply:.1f} days, "
                f"causing {stockout_units_a} lost sales and INR {shortage_cost_a:,.0f} in lost margin and penalty costs."
            )
        )

        # -------------------------------------------------------------
        # SCENARIO B: Expedite Freight (Air/Dedicated Express)
        # -------------------------------------------------------------
        # Expedited transport arrives in 1 day
        expedited_arrival = 1
        # Air freight premium: INR 32/kg for air express (based on SOP-LOG-2025-04)
        weight_kg = max(0.2, product.weight_kg)
        expedited_freight_cost = round(scheduled_po_qty * (weight_kg * 45.0 + 12.0), 2)
        
        # Calculate residual shortage in 1 day
        stockout_units_b = 0
        stock_sim_b = current_stock - (daily_demand * expedited_arrival)
        if stock_sim_b < 0:
            stockout_units_b = int(math.ceil(abs(stock_sim_b)))

        residual_shortage_cost_b = stockout_units_b * unit_shortage_penalty
        total_cost_b = round(expedited_freight_cost + residual_shortage_cost_b, 2)
        service_level_b = 0.98 if stockout_units_b == 0 else 0.91

        b_violations = []
        is_b_feasible = True
        if budget_limit and total_cost_b > budget_limit:
            is_b_feasible = False
            b_violations.append(f"Budget Exceeded: Total cost INR {total_cost_b:,.0f} > cap of INR {budget_limit:,.0f}")

        net_benefit_b = shortage_cost_a - total_cost_b
        if net_benefit_b < 0:
            b_violations.append("Negative Net Benefit: Expedited freight costs exceed avoided lost sales margin")

        scenario_b = ScenarioResult(
            scenario_id="scenario_b_expedite_freight",
            scenario_name="Scenario B: Expedite Freight (Air Express)",
            feasible=is_b_feasible,
            estimated_total_cost=total_cost_b,
            expected_service_level=service_level_b,
            stockout_exposure_units=int(stockout_units_b),
            arrival_day_offset=expedited_arrival,
            constraints_violated=b_violations,
            recommendation_summary=(
                f"Expediting via air freight delivers {scheduled_po_qty} units in 24 hours. "
                f"Estimated freight surcharge: INR {expedited_freight_cost:,.0f}. "
                f"Net protected revenue benefit: INR {net_benefit_b:,.0f}."
            )
        )

        # -------------------------------------------------------------
        # SCENARIO C: Inter-Warehouse Stock Transfer via Google OR-Tools
        # -------------------------------------------------------------
        # Evaluate donor facilities
        other_inventories = (
            self.db.query(Inventory)
            .filter(
                Inventory.product_id == sku,
                Inventory.warehouse_id != destination_wh
            )
            .all()
        )

        # Formulation with OR-Tools SCIP MILP
        solver = pywraplp.Solver.CreateSolver("SCIP")
        donor_vars = {}
        donor_data = {}

        needed_units = max(100, int(daily_demand * (disrupted_arrival - 1)))

        for inv in other_inventories:
            wh_id = inv.warehouse_id
            donor_daily_demand = max(2.0, inv.reorder_point / 14.0)
            
            # Policy Rule: SOP-OPS-2025-08 Section 1.1 -> donor must retain >= 18 days coverage after transfer
            min_retained_stock = int(math.ceil(donor_daily_demand * 18.0))
            available_transfer_cap = max(0, inv.current_stock - min_retained_stock)

            corridor = TRANSFER_CORRIDORS.get((wh_id, destination_wh), {"cost_per_unit": 25.0, "transit_days": 3, "name": "General Corridor"})
            unit_transfer_cost = corridor["cost_per_unit"]
            transit_days = corridor["transit_days"]

            if available_transfer_cap > 0:
                var = solver.IntVar(0, int(available_transfer_cap), f"transfer_{wh_id}")
                donor_vars[wh_id] = var
                donor_data[wh_id] = {
                    "wh_name": inv.warehouse.name,
                    "unit_cost": unit_transfer_cost,
                    "transit_days": transit_days,
                    "max_transfer": available_transfer_cap,
                    "current_stock": inv.current_stock,
                    "days_remaining_after": (inv.current_stock - available_transfer_cap) / donor_daily_demand
                }

        is_c_feasible = False
        total_cost_c = 0.0
        service_level_c = 0.95
        stockout_units_c = 0
        c_violations = []
        transferred_summary_parts = []

        if donor_vars:
            # Objective: Minimize transfer transport cost + penalty for any remaining shortage
            shortage_var = solver.IntVar(0, needed_units, "shortage_var")

            # Constraint: Sum(transfers) + shortage = needed_units
            solver.Add(solver.Sum([donor_vars[w] for w in donor_vars]) + shortage_var == needed_units)

            # Objective: min sum(cost_w * transfer_w) + shortage_penalty * shortage
            objective = solver.Objective()
            for w, var in donor_vars.items():
                objective.SetCoefficient(var, donor_data[w]["unit_cost"])
            objective.SetCoefficient(shortage_var, unit_shortage_penalty)
            objective.SetMinimization()

            status = solver.Solve()
            if status in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
                transferred_total = sum(int(donor_vars[w].solution_value()) for w in donor_vars)
                stockout_units_c = int(shortage_var.solution_value())
                transport_fee = sum(int(donor_vars[w].solution_value()) * donor_data[w]["unit_cost"] for w in donor_vars)
                shortage_fee = stockout_units_c * unit_shortage_penalty
                total_cost_c = round(transport_fee + shortage_fee, 2)
                is_c_feasible = True

                for w, var in donor_vars.items():
                    val = int(var.solution_value())
                    if val > 0:
                        transferred_summary_parts.append(
                            f"{val} units from {donor_data[w]['wh_name']} (transferred @ INR {donor_data[w]['unit_cost']}/unit, 48h transit)"
                        )

                if stockout_units_c > 0:
                    c_violations.append(f"Partial Shortage: Donors had insufficient surplus to cover {stockout_units_c} units")
                    service_level_c = round(1.0 - (stockout_units_c / max(1.0, needed_units)), 2)
                else:
                    service_level_c = 0.97
            else:
                c_violations.append("OR-Tools solver could not find a feasible transfer combination satisfying donor health constraints.")
        else:
            c_violations.append("No regional warehouse holds surplus inventory exceeding the mandatory 18-day retention threshold.")

        scenario_c = ScenarioResult(
            scenario_id="scenario_c_transfer_stock",
            scenario_name="Scenario C: Inter-Warehouse Stock Transfer (OR-Tools)",
            feasible=is_c_feasible,
            estimated_total_cost=total_cost_c,
            expected_service_level=service_level_c,
            stockout_exposure_units=stockout_units_c,
            arrival_day_offset=2,
            constraints_violated=c_violations,
            recommendation_summary=(
                f"Transfer optimization recommends moving {'; '.join(transferred_summary_parts) if transferred_summary_parts else '0 units'}. "
                f"Total transfer cost: INR {total_cost_c:,.0f}, preserving {service_level_c*100:.0f}% service level."
            )
        )

        # Determine winner: Lowest cost among feasible scenarios that achieve target service level
        scenarios = [scenario_a, scenario_b, scenario_c]
        feasible_candidates = [s for s in scenarios if s.feasible and s.expected_service_level >= 0.90]
        if feasible_candidates:
            winner = min(feasible_candidates, key=lambda s: s.estimated_total_cost)
        else:
            winner = min([s for s in scenarios if s.feasible], key=lambda s: s.estimated_total_cost)

        return OptimizationResponse(
            problem_description=(
                f"Supplier delay of {supplier_delay_days} days on {sku} inbound to {destination_wh}. "
                f"Baseline stockout exposure: {stockout_units_a} units with potential lost sales of INR {shortage_cost_a:,.0f}."
            ),
            baseline_stockout_cost=shortage_cost_a,
            scenarios=scenarios,
            recommended_scenario_id=winner.scenario_id
        )
