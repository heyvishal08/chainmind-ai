import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Plus, 
  ExternalLink,
  Percent,
  X
} from 'lucide-react';
import { fetchSuppliers, createDraftPO, fetchProducts, fetchWarehouses } from '../services/api';

export default function SuppliersView({ onNavigateTab }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Draft PO Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState('SKU-AUD-101');
  const [selectedWh, setSelectedWh] = useState('WH-DEL-01');
  const [orderQty, setOrderQty] = useState(600);
  const [draftResult, setDraftResult] = useState(null);
  const [poLoading, setPoLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchSuppliers(), fetchProducts(), fetchWarehouses()])
      .then(([sups, prods, whs]) => {
        setSuppliers(sups);
        setProducts(prods);
        setWarehouses(whs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateDraft = async (e) => {
    e.preventDefault();
    setPoLoading(true);
    try {
      const res = await createDraftPO(selectedSku, selectedWh, orderQty);
      setDraftResult(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setPoLoading(false);
    }
  };

  return (
    <div className="view-page" id="supplier-intelligence-view">
      <div className="view-header">
        <div>
          <h1 className="view-title text-gradient">Supplier Intelligence & Procurement</h1>
          <p className="view-description">
            Vendor scorecards, lead-time standard deviations, defect rates, and contractual purchase order generation.
          </p>
        </div>
        <button 
          id="open-draft-po-modal-btn"
          className="btn btn-primary"
          onClick={() => {
            setDraftResult(null);
            setModalOpen(true);
          }}
        >
          <Plus size={16} />
          <span>Generate Draft PO</span>
        </button>
      </div>

      {/* Supplier Scorecards Grid */}
      <div className="suppliers-grid">
        {suppliers.map((sup) => {
          const isCritical = sup.risk_level === 'Critical';
          const isHigh = sup.risk_level === 'High';

          return (
            <div 
              key={sup.id} 
              id={`sup-card-${sup.id}`}
              className={`glass-panel supplier-card ${isCritical ? 'border-rose' : isHigh ? 'border-amber' : ''}`}
            >
              <div className="supplier-card-header">
                <div>
                  <div className="sup-tier-badge">
                    <span className="badge badge-info">Tier {sup.tier} Vendor</span>
                    <span className="sup-country text-muted">{sup.city}, {sup.country}</span>
                  </div>
                  <h3 className="supplier-name">{sup.name}</h3>
                </div>

                <div className="sup-risk-pill">
                  <span className={`badge ${isCritical ? 'badge-critical' : isHigh ? 'badge-warning' : 'badge-success'}`}>
                    {sup.risk_score} Risk ({sup.risk_level})
                  </span>
                </div>
              </div>

              <div className="supplier-metrics-grid">
                <div className="metric-cell">
                  <span className="cell-label">On-Time Delivery</span>
                  <span className={`cell-val mono ${sup.on_time_delivery_rate >= 0.9 ? 'text-emerald' : 'text-rose'}`}>
                    {(sup.on_time_delivery_rate * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="metric-cell">
                  <span className="cell-label">Lead Time SLA</span>
                  <span className="cell-val mono">{sup.base_lead_time_days}d ± {sup.lead_time_variance_days}d</span>
                </div>

                <div className="metric-cell">
                  <span className="cell-label">Inbound Defect Rate</span>
                  <span className={`cell-val mono ${sup.defect_rate > 0.02 ? 'text-rose' : 'text-muted'}`}>
                    {(sup.defect_rate * 100).toFixed(2)}%
                  </span>
                </div>

                <div className="metric-cell">
                  <span className="cell-label">Contractual MOQ</span>
                  <span className="cell-val mono">{sup.min_order_qty} Units</span>
                </div>
              </div>

              <div className="supplier-footer">
                <div className="contract-ref-box">
                  <FileText size={13} color="#64748B" />
                  <span className="mono text-muted">{sup.contract_ref || 'Standard Terms'}</span>
                </div>
                <div className="open-po-count mono">
                  <span>{sup.open_pos_count} Open POs</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Draft PO Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-container glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Factory size={20} color="#06B6D4" />
                <div>
                  <h3>Automated Purchase Order Generator</h3>
                  <p className="modal-subtitle">Calculates volume discounts and DOA approval routing</p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {!draftResult ? (
                <form onSubmit={handleGenerateDraft} className="draft-po-form">
                  <div className="form-group">
                    <label>Select Product:</label>
                    <select 
                      value={selectedSku} 
                      onChange={(e) => setSelectedSku(e.target.value)}
                      className="select-field"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Destination Fulfillment Center:</label>
                    <select 
                      value={selectedWh} 
                      onChange={(e) => setSelectedWh(e.target.value)}
                      className="select-field"
                    >
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Order Quantity (Units):</label>
                    <input 
                      type="number" 
                      min="100" 
                      step="50"
                      value={orderQty} 
                      onChange={(e) => setOrderQty(Number(e.target.value))}
                      className="input-field mono"
                    />
                    <span className="helper-text">Discounts: 4.5% at 500+ units, 8.0% at 1,500+ units</span>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-full mt-3"
                    disabled={poLoading}
                  >
                    <span>{poLoading ? 'Calculating Terms...' : 'Draft PO with Contractual Rebates'}</span>
                  </button>
                </form>
              ) : (
                <div className="draft-result-box">
                  <div className="po-header-badge">
                    <span className="badge badge-success">DRAFT GENERATED</span>
                    <span className="po-code mono">{draftResult.draft_po_id}</span>
                  </div>

                  <div className="draft-details-table">
                    <div className="detail-row">
                      <span>Supplier:</span>
                      <strong>{draftResult.supplier_name}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Product:</span>
                      <strong>{draftResult.product_name}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Order Quantity:</span>
                      <strong className="mono">{draftResult.order_quantity} Units</strong>
                    </div>
                    <div className="detail-row">
                      <span>Base Unit Cost:</span>
                      <span className="mono">INR {draftResult.base_unit_cost}</span>
                    </div>
                    <div className="detail-row">
                      <span>Volume Rebate Applied:</span>
                      <strong className="mono text-emerald">-{draftResult.discount_percentage}%</strong>
                    </div>
                    <div className="detail-row highlight-row">
                      <span>Total Commitment:</span>
                      <strong className="mono text-cyan font-bold">INR {draftResult.total_commitment_inr.toLocaleString()}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Required DOA Approval:</span>
                      <span className="badge badge-purple">{draftResult.requires_approval_by}</span>
                    </div>
                    <div className="detail-row">
                      <span>Policy Authority Ref:</span>
                      <span className="mono text-muted">{draftResult.policy_rule}</span>
                    </div>
                  </div>

                  <button 
                    className="btn btn-success btn-full mt-4"
                    onClick={() => {
                      setModalOpen(false);
                      onNavigateTab('actions');
                    }}
                  >
                    <span>Submit to Action Center for Approval</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
