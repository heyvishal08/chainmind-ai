import React, { useEffect, useState } from 'react';
import { 
  DollarSign, 
  AlertTriangle, 
  Truck, 
  ShieldAlert, 
  Layers, 
  ArrowUpRight, 
  TrendingUp, 
  Warehouse,
  ChevronRight,
  Bot,
  Activity,
  Package,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { fetchOverview } from '../services/api';

export default function OverviewView({ onOpenCopilot, onNavigateTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);

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
        <p>Loading supply chain operational telemetry...</p>
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
      subtitle: 'Across 4 Distribution Hubs',
      color: 'primary'
    },
    {
      id: 'kpi-at-risk',
      title: 'At-Risk Products',
      value: data.at_risk_products_count,
      subtitle: 'Stockout projected < 7 days',
      color: 'rose'
    },
    {
      id: 'kpi-late-shipments',
      title: 'Late Shipments',
      value: data.late_shipments_count,
      subtitle: 'Active transit delays',
      color: 'amber'
    },
    {
      id: 'kpi-risk-suppliers',
      title: 'High-Risk Suppliers',
      value: data.high_risk_suppliers_count,
      subtitle: 'OTD < 80% or high variance',
      color: 'rose'
    },
    {
      id: 'kpi-fill-rate',
      title: 'Service Fill Rate',
      value: `${data.average_fill_rate}%`,
      subtitle: 'SLA Benchmark: 95.0%',
      color: 'emerald'
    },
    {
      id: 'kpi-open-pos',
      title: 'Open Purchase Orders',
      value: data.open_pos_count,
      subtitle: 'In production / transit',
      color: 'primary'
    }
  ];

  // Render Demand & Forecast Area/Line Chart
  const renderDemandTrendChart = () => {
    const points = data.demand_trend || [];
    if (points.length === 0) return null;

    const chartW = 760;
    const chartH = 220;
    const padX = 45;
    const padY = 30;

    const values = points.map(p => p.actual_sales || p.forecasted_demand || 0);
    const maxVal = Math.max(...values, 3500);
    const minVal = Math.min(...values, 1200);

    const getY = (val) => chartH - padY - ((val - minVal) / (maxVal - minVal)) * (chartH - padY * 2);
    const stepX = (chartW - padX * 2) / (points.length - 1);

    const histPoints = [];
    const forecastPoints = [];
    let splitIndex = -1;

    points.forEach((p, i) => {
      const x = padX + i * stepX;
      if (p.actual_sales !== null) {
        histPoints.push({ x, y: getY(p.actual_sales), val: p.actual_sales, date: p.date });
        splitIndex = i;
      } else {
        if (forecastPoints.length === 0 && histPoints.length > 0) {
          const last = histPoints[histPoints.length - 1];
          forecastPoints.push({ x: last.x, y: last.y, val: last.val, date: last.date });
        }
        forecastPoints.push({ x, y: getY(p.forecasted_demand), val: p.forecasted_demand, date: p.date });
      }
    });

    const histPath = histPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
    const forecastPath = forecastPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

    const splitX = padX + splitIndex * stepX;

    // Gradient fill polygon for history
    const firstH = histPoints[0];
    const lastH = histPoints[histPoints.length - 1];
    const histFill = `${histPath} L ${lastH.x} ${chartH - padY} L ${firstH.x} ${chartH - padY} Z`;

    return (
      <div className="demand-chart-box">
        <div className="chart-header-row">
          <div>
            <h3 className="chart-title">Aggregate Demand & Forecast Run-Rate</h3>
            <p className="chart-subtitle">Daily sales actuals (past 21 days) vs. forecasted replenishment requirements (next 14 days)</p>
          </div>
          <div className="chart-legend-row">
            <span className="legend-chip"><span className="legend-dot bg-blue"></span> Historical Sales</span>
            <span className="legend-chip"><span className="legend-dot bg-cyan border-dash"></span> Projected Forecast</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="chart-svg">
          <defs>
            <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padX} y1={padY} x2={chartW - padX} y2={padY} stroke="#1E293B" strokeDasharray="3 3" />
          <line x1={padX} y1={chartH / 2} x2={chartW - padX} y2={chartH / 2} stroke="#1E293B" strokeDasharray="3 3" />
          <line x1={padX} y1={chartH - padY} x2={chartW - padX} y2={chartH - padY} stroke="#334155" />

          {/* Today Separator Line */}
          <line x1={splitX} y1={padY} x2={splitX} y2={chartH - padY} stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={splitX - 6} y={padY - 8} fill="#38BDF8" fontSize="11" textAnchor="end" className="mono">Today</text>

          {/* Actuals Area & Line */}
          <path d={histFill} fill="url(#histGrad)" />
          <path d={histPath} fill="none" stroke="#0284C7" strokeWidth="2.5" />

          {/* Forecast Line */}
          <path d={forecastPath} fill="none" stroke="#38BDF8" strokeWidth="2" strokeDasharray="4 4" />

          {/* Points */}
          {histPoints.map((pt, i) => (
            <circle 
              key={`h-${i}`} 
              cx={pt.x} 
              cy={pt.y} 
              r="3" 
              fill="#0284C7"
              className="chart-dot"
            />
          ))}

          {forecastPoints.map((pt, i) => (
            <circle 
              key={`f-${i}`} 
              cx={pt.x} 
              cy={pt.y} 
              r="3" 
              fill="#38BDF8" 
              className="chart-dot"
            />
          ))}

          {/* Axis Labels */}
          <text x={padX} y={chartH - 10} fill="#64748B" fontSize="11" className="mono">21 Days Ago</text>
          <text x={chartW - padX} y={chartH - 10} fill="#64748B" fontSize="11" textAnchor="end" className="mono">+14 Days Out</text>
        </svg>

        <div className="chart-metrics-bar">
          <div className="c-metric">
            <span className="c-label">Daily Average Velocity</span>
            <span className="c-val mono">~2,420 Units/Day</span>
          </div>
          <div className="c-metric">
            <span className="c-label">14-Day Forward Pipeline Demand</span>
            <span className="c-val mono text-cyan">33,880 Units</span>
          </div>
          <div className="c-metric">
            <span className="c-label">Model Architecture</span>
            <span className="c-val mono">GradientBoosted_LagEngine</span>
          </div>
        </div>
      </div>
    );
  };

  const health = data.inventory_health_breakdown || {
    critical_stockout: 2,
    low_stock: 12,
    healthy: 102,
    excess_stock: 4
  };
  const totalSKUs = health.critical_stockout + health.low_stock + health.healthy + health.excess_stock;

  return (
    <div className="view-page" id="overview-dashboard-view">
      {/* Top Header */}
      <div className="view-header">
        <div>
          <h1 className="view-title">Executive Supply Chain Overview</h1>
          <p className="view-description">
            Operational dashboard tracking multi-facility inventory coverage, live carrier logistics, and vendor reliability.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-secondary" onClick={() => onNavigateTab('optimization')}>
            <span>Optimization Lab</span>
          </button>
          <button className="btn btn-primary" onClick={onOpenCopilot}>
            <Bot size={15} />
            <span>Consult Copilot</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.id} id={kpi.id} className="clean-card kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">{kpi.title}</span>
              <span className={`status-indicator ${kpi.color}`}></span>
            </div>
            <div className="kpi-value mono">{kpi.value}</div>
            <span className="kpi-subtitle">{kpi.subtitle}</span>
          </div>
        ))}
      </div>

      {/* Main Analytical Section: Demand Chart & Inventory Health Breakdown */}
      <div className="dashboard-charts-grid">
        {/* Chart 1: Demand & Forecast Run Rate */}
        <div className="clean-card chart-panel">
          {renderDemandTrendChart()}
        </div>

        {/* Chart 2: Inventory Health Segmentation */}
        <div className="clean-card health-breakdown-panel">
          <div className="panel-header-clean">
            <h3 className="chart-title">Multi-Echelon Inventory Health</h3>
            <span className="badge badge-neutral">{totalSKUs} SKUs Tracked</span>
          </div>

          <p className="panel-desc">Distribution of inventory positions across 4 fulfillment hubs categorized by days of remaining supply (DOS).</p>

          {/* Segmented Bar */}
          <div className="segmented-bar-container">
            <div 
              className="segment seg-critical" 
              style={{ width: `${(health.critical_stockout / totalSKUs) * 100}%` }}
              title={`Critical (< 7d): ${health.critical_stockout} SKUs`}
            />
            <div 
              className="segment seg-warning" 
              style={{ width: `${(health.low_stock / totalSKUs) * 100}%` }}
              title={`Low Stock (7-14d): ${health.low_stock} SKUs`}
            />
            <div 
              className="segment seg-healthy" 
              style={{ width: `${(health.healthy / totalSKUs) * 100}%` }}
              title={`Healthy (14-60d): ${health.healthy} SKUs`}
            />
            <div 
              className="segment seg-excess" 
              style={{ width: `${(health.excess_stock / totalSKUs) * 100}%` }}
              title={`Excess (> 60d): ${health.excess_stock} SKUs`}
            />
          </div>

          {/* Breakdown Rows */}
          <div className="health-metrics-list">
            <div className="health-row">
              <div className="h-left">
                <span className="h-dot bg-rose"></span>
                <span>Critical Stockout Risk (&lt; 7 Days)</span>
              </div>
              <div className="h-right mono">
                <strong>{health.critical_stockout} SKUs</strong>
                <span className="text-muted">({((health.critical_stockout / totalSKUs) * 100).toFixed(1)}%)</span>
              </div>
            </div>

            <div className="health-row">
              <div className="h-left">
                <span className="h-dot bg-amber"></span>
                <span>Low Buffer Stock (7 – 14 Days)</span>
              </div>
              <div className="h-right mono">
                <strong>{health.low_stock} SKUs</strong>
                <span className="text-muted">({((health.low_stock / totalSKUs) * 100).toFixed(1)}%)</span>
              </div>
            </div>

            <div className="health-row">
              <div className="h-left">
                <span className="h-dot bg-emerald"></span>
                <span>Healthy Equilibrium (14 – 60 Days)</span>
              </div>
              <div className="h-right mono">
                <strong>{health.healthy} SKUs</strong>
                <span className="text-muted">({((health.healthy / totalSKUs) * 100).toFixed(1)}%)</span>
              </div>
            </div>

            <div className="health-row">
              <div className="h-left">
                <span className="h-dot bg-purple"></span>
                <span>Excess Working Capital (&gt; 60 Days)</span>
              </div>
              <div className="h-right mono">
                <strong>{health.excess_stock} SKUs</strong>
                <span className="text-muted">({((health.excess_stock / totalSKUs) * 100).toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          <div className="panel-footer-btn">
            <button className="btn btn-secondary btn-full btn-sm" onClick={() => onNavigateTab('inventory')}>
              <span>View All 120 Inventory Nodes</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Section: Priority Operational Queue & Carrier Performance */}
      <div className="dashboard-lower-grid mt-4">
        {/* Priority Disruption Queue */}
        <div className="clean-card queue-card">
          <div className="panel-header-clean">
            <div className="title-with-count">
              <h3 className="chart-title">Priority Operational Queue</h3>
              <span className="badge badge-critical">{data.critical_risks.length} Action Items</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab('actions')}>
              <span>Action Center</span>
            </button>
          </div>

          <div className="queue-items-list">
            {data.critical_risks.map((risk) => (
              <div key={risk.id} className="queue-item">
                <div className="queue-item-header">
                  <div className="q-title-group">
                    <span className={`badge ${risk.severity === 'Critical' ? 'badge-critical' : 'badge-warning'}`}>
                      {risk.severity}
                    </span>
                    <h4 className="q-title">{risk.title}</h4>
                  </div>
                  <span className="q-cost mono text-rose">
                    Impact: INR {risk.estimated_financial_impact.toLocaleString()}
                  </span>
                </div>
                <p className="q-desc">{risk.description}</p>
                <div className="q-footer">
                  <span className="q-rec"><strong>Next Step:</strong> {risk.recommended_action}</span>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => onNavigateTab('optimization')}
                  >
                    Simulate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carrier SLA & Warehouse Capacity */}
        <div className="clean-card logistics-capacity-card">
          <div className="panel-header-clean">
            <h3 className="chart-title">Carrier Performance & Warehouse Capacity</h3>
            <span className="badge badge-neutral">SLA Benchmarks</span>
          </div>

          {/* Carrier Table */}
          <div className="carrier-mini-table">
            <div className="mini-table-head">
              <span>Carrier</span>
              <span>On-Time Rate</span>
              <span>Active Delays</span>
            </div>
            {(data.carrier_performance || []).map((c) => (
              <div key={c.carrier} className="mini-table-row">
                <span className="carrier-label font-bold">{c.carrier}</span>
                <div className="carrier-bar-cell">
                  <div className="mini-bar-bg">
                    <div 
                      className={`mini-bar-fill ${c.on_time_rate >= 90 ? 'fill-emerald' : 'fill-amber'}`}
                      style={{ width: `${c.on_time_rate}%` }}
                    />
                  </div>
                  <span className="mono text-muted">{c.on_time_rate}%</span>
                </div>
                <span className={`mono ${c.delayed_count > 0 ? 'text-rose font-bold' : 'text-muted'}`}>
                  {c.delayed_count} Delayed
                </span>
              </div>
            ))}
          </div>

          {/* Warehouse Capacity Bars */}
          <div className="warehouse-mini-section mt-4">
            <h4 className="mini-section-title">Regional Storage Utilization</h4>
            <div className="wh-bars-list">
              {data.warehouse_utilization.map((wh) => (
                <div key={wh.warehouse_id} className="wh-mini-row">
                  <div className="wh-mini-info">
                    <span>{wh.city} ({wh.name})</span>
                    <span className="mono text-muted">{wh.utilization_pct}% ({wh.used_m3.toLocaleString()} / {wh.capacity_m3.toLocaleString()} m³)</span>
                  </div>
                  <div className="wh-mini-bar-bg">
                    <div 
                      className={`wh-mini-bar-fill ${wh.utilization_pct > 80 ? 'fill-warning' : 'fill-primary'}`}
                      style={{ width: `${wh.utilization_pct}%` }}
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
