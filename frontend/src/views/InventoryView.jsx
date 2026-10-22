import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Filter, 
  AlertTriangle, 
  Search, 
  TrendingUp, 
  Zap, 
  ChevronRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { fetchInventory, fetchWarehouses } from '../services/api';

export default function InventoryView({ onNavigateTab }) {
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWh, setSelectedWh] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
          <h1 className="view-title text-gradient">Inventory Intelligence & Replenishment</h1>
          <p className="view-description">
            Multi-echelon stock health monitoring, Safety Stock ($SS$), Reorder Point ($ROP$), and days-of-supply telemetry.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel inventory-filters-bar">
        <div className="search-box">
          <Search size={16} color="#64748B" />
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

        <div className="filter-stats mono text-muted">
          Showing {filteredItems.length} nodes
        </div>
      </div>

      {/* Inventory Nodes Table */}
      <div className="glass-panel table-panel">
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
                <th>Risk Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isCritical = item.days_of_supply < 7.0;
                const isWarning = item.days_of_supply < 14.0 && !isCritical;
                const isExcess = item.days_of_supply > 90.0;

                return (
                  <tr key={`${item.product_id}-${item.warehouse_id}`} className={isCritical ? 'row-critical' : ''}>
                    <td>
                      <div className="sku-cell">
                        <span className="sku-title">{item.product_name}</span>
                        <span className="sku-code mono">{item.product_id} | {item.product_category}</span>
                      </div>
                    </td>
                    <td>
                      <div className="wh-cell">
                        <span>{item.warehouse_name}</span>
                        <span className="wh-sub mono text-muted">{item.warehouse_city}</span>
                      </div>
                    </td>
                    <td className="mono font-bold">{item.current_stock.toLocaleString()}</td>
                    <td className="mono text-muted">{item.safety_stock.toLocaleString()}</td>
                    <td className="mono text-cyan">{item.reorder_point.toLocaleString()}</td>
                    <td className="mono text-purple">+{item.in_transit_stock.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${isCritical ? 'badge-critical' : isWarning ? 'badge-warning' : isExcess ? 'badge-purple' : 'badge-success'}`}>
                        {item.days_of_supply.toFixed(1)} Days {isCritical ? '(Imminent Stockout)' : isExcess ? '(Excess Stock)' : ''}
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
                      <div className="table-action-btns">
                        <button 
                          className="btn-icon" 
                          title="Simulate Disruption Resolution"
                          onClick={() => onNavigateTab('optimization')}
                        >
                          <Zap size={14} color="#06B6D4" />
                        </button>
                        <button 
                          className="btn-icon" 
                          title="View Demand Forecast"
                          onClick={() => onNavigateTab('forecasting')}
                        >
                          <TrendingUp size={14} color="#A855F7" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
