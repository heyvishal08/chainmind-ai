import React, { useEffect, useState } from 'react';
import { 
  DollarSign, 
  AlertTriangle, 
  Truck, 
  ShieldAlert, 
  Layers, 
  ArrowUpRight, 
  Sparkles, 
  TrendingUp, 
  Warehouse,
  ChevronRight,
  Bot
} from 'lucide-react';
import { fetchOverview } from '../services/api';

export default function OverviewView({ onOpenCopilot, onNavigateTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="view-loading-container">
        <div className="spinner"></div>
        <p>Loading real-time executive supply chain telemetry...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="view-error">Unable to connect to ChainMind backend service.</div>;
  }

  const kpis = [
    {
      id: 'kpi-inventory-val',
      title: 'Total Inventory Value',
      value: `INR ${(data.total_inventory_value_inr / 10000000).toFixed(2)} Cr`,
      subtitle: 'Across 4 Fulfillment Hubs',
      icon: DollarSign,
      color: 'cyan',
      trend: '+4.2% vs last month'
    },
    {
      id: 'kpi-at-risk',
      title: 'At-Risk Products',
      value: data.at_risk_products_count,
      subtitle: 'Stockout in < 7 days',
      icon: AlertTriangle,
      color: 'rose',
      trend: 'Requires immediate action'
    },
    {
      id: 'kpi-late-shipments',
      title: 'Late Shipments',
      value: data.late_shipments_count,
      subtitle: 'Critical transit delays',
      icon: Truck,
      color: 'amber',
      trend: 'Jaipur corridor bottleneck'
    },
    {
      id: 'kpi-risk-suppliers',
      title: 'High-Risk Suppliers',
      value: data.high_risk_suppliers_count,
      subtitle: 'OTD < 80% or high variance',
      icon: ShieldAlert,
      color: 'rose',
      trend: 'Zenith Battery flagged'
    },
    {
      id: 'kpi-fill-rate',
      title: 'Service Fill Rate',
      value: `${data.average_fill_rate}%`,
      subtitle: 'Target: 95.0%',
      icon: Layers,
      color: 'emerald',
      trend: 'Compliant with enterprise SLA'
    },
    {
      id: 'kpi-open-pos',
      title: 'Active Purchase Orders',
      value: data.open_pos_count,
      subtitle: 'In production / transit',
      icon: TrendingUp,
      color: 'blue',
      trend: 'Total PO commitment tracked'
    }
  ];

  return (
    <div className="view-page" id="overview-dashboard-view">
      {/* Page Title & Controls */}
      <div className="view-header">
        <div>
          <h1 className="view-title text-gradient">Executive Overview & Daily Priorities</h1>
          <p className="view-description">
            Holistic situational awareness across inventory coverage, inbound transit, and supplier vulnerabilities.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-purple" onClick={onOpenCopilot}>
            <Bot size={16} />
            <span>Consult AI Copilot</span>
          </button>
        </div>
      </div>

      {/* AI Daily Briefing Card */}
      <div className="glass-panel daily-briefing-banner">
        <div className="briefing-header">
          <div className="briefing-badge">
            <Sparkles size={14} color="#A855F7" />
            <span>Autonomous Daily Briefing</span>
          </div>
          <span className="timestamp mono">Telemetry Synced Today</span>
        </div>
        <p className="briefing-text">{data.ai_morning_briefing}</p>
        <div className="briefing-actions">
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateTab('optimization')}
          >
            <span>Open Optimization Lab</span>
            <ChevronRight size={14} />
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateTab('actions')}
          >
            <span>Review Pending Actions</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} id={kpi.id} className={`glass-panel kpi-card kpi-${kpi.color}`}>
              <div className="kpi-card-header">
                <span className="kpi-title">{kpi.title}</span>
                <div className={`kpi-icon-badge ${kpi.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="kpi-value mono">{kpi.value}</div>
              <div className="kpi-footer">
                <span className="kpi-subtitle">{kpi.subtitle}</span>
                <span className="kpi-trend">{kpi.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Section: Priority Queue & Warehouse Health */}
      <div className="dashboard-columns-grid">
        {/* Column 1: Priority Operational Queue */}
        <div className="glass-panel queue-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <AlertTriangle size={18} color="#F43F5E" />
              <h3>Priority Disruption Queue</h3>
            </div>
            <span className="badge badge-critical">{data.critical_risks.length} Critical Events</span>
          </div>

          <div className="risk-events-list">
            {data.critical_risks.map((risk) => (
              <div key={risk.id} className="risk-event-item">
                <div className="risk-item-top">
                  <div className="risk-title-badge">
                    <span className={`badge ${risk.severity === 'Critical' ? 'badge-critical' : 'badge-warning'}`}>
                      {risk.severity}
                    </span>
                    <h4 className="risk-item-title">{risk.title}</h4>
                  </div>
                  <span className="risk-impact mono text-rose">
                    Impact: INR {risk.estimated_financial_impact.toLocaleString()}
                  </span>
                </div>
                <p className="risk-item-desc">{risk.description}</p>
                <div className="risk-item-footer">
                  <span className="risk-action-rec">
                    <strong>Recommended:</strong> {risk.recommended_action}
                  </span>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigateTab('optimization')}
                  >
                    Solve Disruption
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Warehouse Volumetric Utilization */}
        <div className="glass-panel warehouse-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <Warehouse size={18} color="#06B6D4" />
              <h3>Regional Warehouse Capacity</h3>
            </div>
            <span className="badge badge-info">4 Hubs</span>
          </div>

          <div className="warehouses-list">
            {data.warehouse_utilization.map((wh) => {
              const isConstrained = wh.utilization_pct > 80;
              return (
                <div key={wh.warehouse_id} className="warehouse-item">
                  <div className="wh-header">
                    <div>
                      <span className="wh-name">{wh.name}</span>
                      <span className="wh-city mono"> ({wh.city})</span>
                    </div>
                    <span className={`badge ${isConstrained ? 'badge-warning' : 'badge-success'}`}>
                      {wh.utilization_pct}% {isConstrained ? 'Constrained' : 'Optimal'}
                    </span>
                  </div>

                  <div className="progress-bar-container">
                    <div 
                      className={`progress-bar-fill ${isConstrained ? 'fill-warning' : 'fill-cyan'}`}
                      style={{ width: `${Math.min(100, wh.utilization_pct)}%` }}
                    />
                  </div>

                  <div className="wh-meta mono">
                    <span>Used: {wh.used_m3.toLocaleString()} m³</span>
                    <span>Cap: {wh.capacity_m3.toLocaleString()} m³</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Category Distribution Breakdown */}
          <div className="category-distribution-box mt-4">
            <h4 className="sub-header">Inventory Value by Product Category</h4>
            <div className="category-bars">
              {Object.entries(data.category_stock_distribution).map(([cat, val]) => (
                <div key={cat} className="category-row">
                  <div className="cat-label">
                    <span>{cat}</span>
                    <span className="mono text-muted">INR {(val / 10000000).toFixed(2)} Cr</span>
                  </div>
                  <div className="cat-bar-bg">
                    <div 
                      className="cat-bar-fill"
                      style={{ width: `${(val / data.total_inventory_value_inr) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
