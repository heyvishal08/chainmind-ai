import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Search, 
  TrendingUp, 
  Zap, 
  X,
  Bot,
  AlertTriangle,
  ArrowRight,
  Info,
  Layers,
  Factory
} from 'lucide-react';
import { fetchInventory, fetchWarehouses } from '../services/api';

export default function InventoryView({ onNavigateTab, onOpenCopilot }) {
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWh, setSelectedWh] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarehouses().then(setWarehouses).catch(console.error);
    loadData('', '');
  }, []);

  const loadData = (wh, cat) => {
    setLoading(true);
    fetchInventory(wh, cat)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleFilterChange = (wh, cat) => {
    setSelectedWh(wh);
    setSelectedCat(cat);
    loadData(wh, cat);
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.product_name.toLowerCase().includes(q) ||
      item.product_id.toLowerCase().includes(q) ||
      item.warehouse_city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="view-page" id="inventory-intelligence-view">
      <div className="view-header">
        <div>
          <h1 className="view-title">Inventory Intelligence & Replenishment</h1>
          <p className="view-description">
            Multi-echelon stock health monitoring, Safety Stock ($SS$), Reorder Point ($ROP$), and days-of-supply telemetry.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="clean-card inventory-filters-bar mb-3">
        <div className="search-box">
          <Search size={15} color="#6B7280" />
          <input
            id="inventory-search-input"
            type="text"
            placeholder="Search by SKU ID, Product Name, or City..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-dropdowns">
          <select 
            id="inv-warehouse-filter"
            value={selectedWh} 
            onChange={(e) => handleFilterChange(e.target.value, selectedCat)}
            className="select-field"
          >
            <option value="">All Fulfillment Hubs</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.city} ({w.name})</option>
            ))}
          </select>

          <select 
            id="inv-category-filter"
            value={selectedCat} 
            onChange={(e) => handleFilterChange(selectedWh, e.target.value)}
            className="select-field"
          >
            <option value="">All Categories</option>
            <option value="Smart Audio">Smart Audio</option>
            <option value="Smart Wearables">Smart Wearables</option>
            <option value="Power & Charging">Power & Charging</option>
            <option value="Smart Home & IoT">Smart Home & IoT</option>
          </select>
        </div>

        <div className="filter-stats mono text-muted text-xs">
          Tracking {filteredItems.length} Node Positions
        </div>
      </div>

      {/* Inventory Nodes Table */}
      <div className="clean-card table-panel">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product / SKU</th>
                <th>Fulfillment Center</th>
                <th>Current Stock</th>
                <th>Safety Stock (SS)</th>
                <th>Reorder Point (ROP)</th>
                <th>In-Transit PO</th>
                <th>Days of Supply</th>
                <th>Stockout Risk</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isCritical = item.days_of_supply < 7.0;
                const isWarning = item.days_of_supply < 14.0 && !isCritical;
                const isExcess = item.days_of_supply > 60.0;

                return (
                  <tr 
                    key={`${item.product_id}-${item.warehouse_id}`} 
                    className={`table-row-hoverable ${isCritical ? 'row-critical' : ''}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <td>
                      <div className="sku-cell">
                        <span className="sku-title font-bold">{item.product_name}</span>
                        <span className="sku-code mono text-muted">{item.product_id} • {item.product_category}</span>
                      </div>
                    </td>
                    <td>
                      <div className="wh-cell">
                        <span>{item.warehouse_name}</span>
                        <span className="wh-sub mono text-muted">{item.warehouse_city}</span>
                      </div>
                    </td>
                    <td className="mono font-bold text-primary">{item.current_stock.toLocaleString()}</td>
                    <td className="mono text-muted">{item.safety_stock.toLocaleString()}</td>
                    <td className="mono text-primary font-bold">{item.reorder_point.toLocaleString()}</td>
                    <td className="mono text-muted">+{item.in_transit_stock.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${isCritical ? 'badge-critical' : isWarning ? 'badge-warning' : isExcess ? 'badge-neutral' : 'badge-success'}`}>
                        {item.days_of_supply.toFixed(1)} Days {isCritical ? '(Critical)' : isExcess ? '(Excess)' : ''}
                      </span>
                    </td>
                    <td>
                      <div className="risk-score-pill">
                        <div 
                          className={`risk-score-bar ${item.stockout_risk_score > 70 ? 'bg-rose' : item.stockout_risk_score > 40 ? 'bg-amber' : 'bg-emerald'}`}
                          style={{ width: `${Math.min(100, item.stockout_risk_score)}%` }}
                        />
                        <span className="risk-score-num mono">{item.stockout_risk_score.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SKU Deep-Dive Operational Drawer */}
      {selectedItem && (
        <div className="sku-inspector-backdrop" onClick={() => setSelectedItem(null)}>
          <div className="sku-inspector-drawer clean-card" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="inspector-header">
              <div>
                <span className="mono text-muted text-xs uppercase">{selectedItem.product_id} • {selectedItem.product_category}</span>
                <h3 className="inspector-title">{selectedItem.product_name}</h3>
                <span className="text-secondary text-xs">{selectedItem.warehouse_name} ({selectedItem.warehouse_city})</span>
              </div>
              <button className="btn-icon-close" onClick={() => setSelectedItem(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div className="inspector-metrics-grid mt-3">
              <div className="clean-card insp-metric-card">
                <span className="insp-label">Current On-Hand</span>
                <span className="insp-val mono">{selectedItem.current_stock.toLocaleString()} Units</span>
              </div>
              <div className="clean-card insp-metric-card">
                <span className="insp-label">Days of Supply (DOS)</span>
                <span className={`insp-val mono ${selectedItem.days_of_supply < 7 ? 'text-rose' : 'text-emerald'}`}>
                  {selectedItem.days_of_supply.toFixed(1)} Days
                </span>
              </div>
              <div className="clean-card insp-metric-card">
                <span className="insp-label">Safety Stock (SS)</span>
                <span className="insp-val mono">{selectedItem.safety_stock.toLocaleString()} Units</span>
              </div>
              <div className="clean-card insp-metric-card">
                <span className="insp-label">Reorder Point (ROP)</span>
                <span className="insp-val mono text-primary">{selectedItem.reorder_point.toLocaleString()} Units</span>
              </div>
            </div>

            {/* Scientific Formulas & Parameters Breakdown */}
            <div className="clean-card inspector-formula-section mt-3">
              <div className="formula-sec-header">
                <Info size={14} color="#3B82F6" />
                <span className="font-bold text-xs uppercase text-primary">Multi-Echelon Replenishment Math</span>
              </div>

              <div className="formula-row mt-2">
                <div className="formula-text-block">
                  <strong>Safety Stock Formula:</strong>
                  <code>SS = Z × σ_d × √L</code>
                  <p className="formula-desc text-muted">
                    At 95% service level (Z = 1.65), with demand standard deviation σ_d = {(selectedItem.safety_stock / (1.65 * Math.sqrt(14))).toFixed(1)} units/day over a 14-day vendor lead time (L), requiring <strong>{selectedItem.safety_stock} buffer units</strong>.
                  </p>
                </div>
              </div>

              <div className="formula-row mt-3">
                <div className="formula-text-block">
                  <strong>Reorder Point Formula:</strong>
                  <code>ROP = (Daily Demand × Lead Time) + Safety Stock</code>
                  <p className="formula-desc text-muted">
                    When on-hand + in-transit stock falls below <strong>{selectedItem.reorder_point} units</strong>, an autonomous purchase order triggers immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Operational Actions */}
            <div className="inspector-actions-row mt-4">
              <button 
                className="btn btn-primary btn-full"
                onClick={() => onNavigateTab('optimization')}
              >
                <Zap size={14} />
                <span>Simulate Disruption in Lab</span>
              </button>
              <button 
                className="btn btn-secondary btn-full"
                onClick={() => {
                  setSelectedItem(null);
                  if (onOpenCopilot) onOpenCopilot();
                }}
              >
                <Bot size={14} />
                <span>Consult Copilot on SKU</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
