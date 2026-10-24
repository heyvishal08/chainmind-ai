import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertOctagon, 
  ArrowRight,
  ShieldAlert,
  Zap,
  Radio
} from 'lucide-react';
import { fetchOptimization, fetchProducts, fetchWarehouses } from '../services/api';

const INCIDENT_PRESETS = [
  {
    id: 'red-sea',
    label: '🚢 Red Sea Maritime Canal Delay',
    desc: 'Container vessel carrying Aura Pro Earbuds rerouted via Cape of Good Hope, adding +8 days transit into Delhi NCR Mega Hub.',
    sku: 'SKU-AUD-101',
    wh: 'WH-DEL-01',
    delay: 8,
    budget: 65000
  },
  {
    id: 'pune-factory',
    label: '🏭 Tier-1 Pune Factory Power Outage',
    desc: 'Substation transformer fire at supplier facility halted GaN fast charger assembly lines (+5 days delay into Mumbai Western Hub).',
    sku: 'SKU-PWR-301',
    wh: 'WH-MUM-01',
    delay: 5,
    budget: 45000
  },
  {
    id: 'highway-truck',
    label: '🚛 Jaipur Highway Freight Corridor Strike',
    desc: 'State border logistics union blockade halted interstate express vans (+3 days delay into Delhi NCR Mega Hub).',
    sku: 'SKU-WRB-201',
    wh: 'WH-DEL-01',
    delay: 3,
    budget: 25000
  }
];

export default function OptimizationView({ onNavigateTab }) {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [sku, setSku] = useState('SKU-AUD-101');
  const [destinationWh, setDestinationWh] = useState('WH-DEL-01');
  const [delayDays, setDelayDays] = useState(5);
  const [budget, setBudget] = useState(50000);
  const [activePreset, setActivePreset] = useState(null);
  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchProducts(), fetchWarehouses()])
      .then(([prods, whs]) => {
        setProducts(prods);
        setWarehouses(whs);
      })
      .catch(console.error);

    // Initial run
    runSimulation('SKU-AUD-101', 'WH-DEL-01', 5, 50000);
  }, []);

  const runSimulation = (selectedSku, destWh, delay, maxBudget) => {
    setLoading(true);
    fetchOptimization(selectedSku, destWh, delay, maxBudget)
      .then(setSimData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleSimulate = (e) => {
    e.preventDefault();
    setActivePreset(null);
    runSimulation(sku, destinationWh, delayDays, budget);
  };

  const handleSelectPreset = (p) => {
    setSku(p.sku);
    setDestinationWh(p.wh);
    setDelayDays(p.delay);
    setBudget(p.budget);
    setActivePreset(p);
    runSimulation(p.sku, p.wh, p.delay, p.budget);
  };

  return (
    <div className="view-page" id="optimization-lab-view">
      <div className="view-header">
        <div>
          <h1 className="view-title">Optimization Lab & What-If Simulator</h1>
          <p className="view-description">
            Google OR-Tools Mixed-Integer Linear Programming (MILP) solver comparing supply delay alternatives against explicit operational constraints.
          </p>
        </div>
      </div>

      {/* Preset Incident Scenarios Bar */}
      <div className="clean-card incident-presets-bar mb-3">
        <div className="presets-label-row">
          <span className="mono text-muted text-xs uppercase font-bold">Simulate Real-World Incident Presets:</span>
        </div>
        <div className="presets-buttons-row">
          {INCIDENT_PRESETS.map((p) => {
            const isSelected = activePreset?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'} preset-btn`}
                onClick={() => handleSelectPreset(p)}
              >
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {activePreset && (
          <div className="preset-callout-box mt-2">
            <Radio size={14} color="#3B82F6" className="spin-slow" />
            <span><strong>Active Disruption Narrative:</strong> {activePreset.desc}</span>
          </div>
        )}
      </div>

      {/* Simulator Parameters Control Card */}
      <form onSubmit={handleSimulate} className="clean-card simulator-controls-card">
        <div className="controls-row">
          <div className="control-group">
            <label>Disrupted Product SKU:</label>
            <select 
              id="opt-sku-select"
              value={sku} 
              onChange={(e) => {
                setSku(e.target.value);
                setActivePreset(null);
              }} 
              className="select-field"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Destination Hub:</label>
            <select 
              id="opt-wh-select"
              value={destinationWh} 
              onChange={(e) => {
                setDestinationWh(e.target.value);
                setActivePreset(null);
              }} 
              className="select-field"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
              ))}
            </select>
          </div>

          <div className="control-group slider-group">
            <div className="slider-header">
              <label>Supplier Delay (Days):</label>
              <span className="mono font-bold text-amber">+{delayDays} Days</span>
            </div>
            <input 
              id="opt-delay-slider"
              type="range" 
              min="1" 
              max="14" 
              value={delayDays}
              onChange={(e) => {
                setDelayDays(Number(e.target.value));
                setActivePreset(null);
              }}
              className="range-slider"
            />
          </div>

          <div className="control-group slider-group">
            <div className="slider-header">
              <label>Emergency Budget Cap:</label>
              <span className="mono font-bold text-primary">INR {budget.toLocaleString()}</span>
            </div>
            <input 
              id="opt-budget-slider"
              type="range" 
              min="10000" 
              max="200000" 
              step="5000"
              value={budget}
              onChange={(e) => {
                setBudget(Number(e.target.value));
                setActivePreset(null);
              }}
              className="range-slider"
            />
          </div>

          <button 
            id="run-optimization-btn"
            type="submit" 
            className="btn btn-primary btn-run-sim"
            disabled={loading}
          >
            <Zap size={15} />
            <span>{loading ? 'Solving...' : 'Run OR-Tools Solver'}</span>
          </button>
        </div>
      </form>

      {/* Simulator Output */}
      {simData && (
        <div className="optimization-output-area mt-4">
          {/* Problem Statement Banner */}
          <div className="clean-card disruption-summary-banner">
            <div className="banner-left">
              <div className="banner-icon-box">
                <AlertOctagon size={22} color="#E11D48" />
              </div>
              <div>
                <h3 className="banner-heading">Simulated Disruption Assessment</h3>
                <p className="banner-text">{simData.problem_description}</p>
              </div>
            </div>
            <div className="banner-right mono">
              <span className="loss-label">Baseline Shortage Exposure:</span>
              <span className="loss-val text-rose font-bold">INR {simData.baseline_stockout_cost.toLocaleString()}</span>
            </div>
          </div>

          {/* 3 Scenario Cards Comparison */}
          <div className="scenarios-grid">
            {simData.scenarios.map((sc) => {
              const isWinner = sc.scenario_id === simData.recommended_scenario_id;
              return (
                <div 
                  key={sc.scenario_id} 
                  id={sc.scenario_id}
                  className={`clean-card scenario-card ${isWinner ? 'scenario-winner' : ''}`}
                >
                  {isWinner && (
                    <div className="winner-badge">
                      <CheckCircle2 size={13} color="#FFFFFF" />
                      <span>OPTIMAL SOLUTION RECOMMENDED</span>
                    </div>
                  )}

                  <div className="scenario-card-header">
                    <h4>{sc.scenario_name}</h4>
                    <span className={`badge ${sc.feasible ? 'badge-success' : 'badge-critical'}`}>
                      {sc.feasible ? 'Feasible' : 'Infeasible'}
                    </span>
                  </div>

                  <div className="scenario-stats-grid">
                    <div className="stat-box">
                      <span className="stat-label">Estimated Total Cost</span>
                      <span className="stat-val mono text-primary">INR {sc.estimated_total_cost.toLocaleString()}</span>
                    </div>

                    <div className="stat-box">
                      <span className="stat-label">Expected Service Level</span>
                      <span className={`stat-val mono ${sc.expected_service_level >= 0.9 ? 'text-emerald' : 'text-amber'}`}>
                        {(sc.expected_service_level * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="stat-box">
                      <span className="stat-label">Stockout Exposure</span>
                      <span className="stat-val mono text-rose">{sc.stockout_exposure_units} Units</span>
                    </div>

                    <div className="stat-box">
                      <span className="stat-label">Effective Lead Time</span>
                      <span className="stat-val mono">+{sc.arrival_day_offset} Days</span>
                    </div>
                  </div>

                  <p className="scenario-summary-text">{sc.recommendation_summary}</p>

                  {sc.constraints_violated.length > 0 && (
                    <div className="violations-container">
                      <span className="viol-title">Constraint Warnings:</span>
                      {sc.constraints_violated.map((v, i) => (
                        <div key={i} className="viol-item">
                          <ShieldAlert size={13} color="#D97706" />
                          <span>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isWinner && (
                    <button 
                      className="btn btn-success btn-full mt-3"
                      onClick={() => onNavigateTab('actions')}
                    >
                      <span>Authorize Recommended Action in Action Center</span>
                      <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
