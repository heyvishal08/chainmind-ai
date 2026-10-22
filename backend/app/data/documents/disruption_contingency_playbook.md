# SUPPLY CHAIN DISRUPTION & INVENTORY REBALANCING PLAYBOOK
**Document Ref:** SOP-OPS-2025-08  
**Department:** Integrated Business Planning (IBP) & Fulfillment  
**Effective Date:** February 01, 2025  

---

### 1. Inter-Warehouse Stock Transfer Protocol
When a regional warehouse faces imminent stockout ($Stock < 4 \text{ days of forecasted demand}$), the AI Copilot and Planning team must evaluate stock transfer from an adjacent fulfillment center prior to issuing emergency supplier purchase orders.

#### 1.1 Criteria for Feasible Transfer:
1. **Source Warehouse Health:** The donor warehouse must maintain at least **18 days of forward inventory coverage** *after* deducting the proposed transfer quantity.
2. **Transfer Distance & Latency:**
   - **Western to Northern Corridor (Mumbai ◄► Delhi):** 48-60 hours transit time via road express. Transfer cost: ₹18 per unit.
   - **Southern to Western Corridor (Bengaluru ◄► Mumbai):** 36-48 hours transit time. Transfer cost: ₹14 per unit.
   - **Southern Cross Corridor (Bengaluru ◄► Chennai):** 12-18 hours transit time. Transfer cost: ₹8 per unit.
3. **Capacity Check:** The receiving warehouse must have available bin and pallet storage capacity.

### 2. Triaging Stock Allocations during Systemic Shortages
When aggregate inventory across all 4 fulfillment centers is insufficient to meet 100% of demand:
1. **Priority 1: Key Retail Partners & Direct-to-Consumer (D2C) Guaranteed 1-Day SLA:** 60% of available stock reserved.
2. **Priority 2: Regional E-Commerce Marketplaces:** 30% of available stock allocated pro-rata based on last 30-day velocity.
3. **Priority 3: Wholesale & Secondary Channels:** 10% or backordered until primary supplier replenishment docks.
