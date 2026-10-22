import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Sliders, 
  CheckCircle2, 
  AlertOctagon, 
  DollarSign, 
  TrendingUp, 
  ArrowRight,
  ShieldAlert,
  Zap,
  Building
} from 'lucide-react';
import { fetchOptimization, fetchProducts, fetchWarehouses } from '../services/api';

export default function OptimizationView({ onNavigateTab }) {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [sku, setSku] = useState('SKU-AUD-101');
  const [destinationWh, setDestinationWh] = useState('WH-DEL-01');
  const [delayDays, setDelayDays] = useState(5);
  const [budget, setBudget] = useState(50000);
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
    runSimulation(sku, destinationWh, delayDays, budget);
  };

  return (
    <div className="view-page" id="optimization-lab-view">
      <div className="view-header">
        <div>
          <h1 className="view-title text-gradient">Optimization Lab & What-If Simulator</h1>
          <p className="view-description">
            Google OR-Tools Mixed-Integer Linear Programming (MILP) solver comparing supply delay alternatives against explicit operational constraints.
          </p>
        </div>
      </div>

      {/* Simulator Parameters Control Card */}
      <form onSubmit={handleSimulate} className="glass-panel simulator-controls-card">
        <div className="controls-row">
          <div className="control-group">
            <label>Disrupted Product SKU:</label>
            <select 
              id="opt-sku-select"
              value={sku} 
              onChange={(e) => setSku(e.target.value)} 
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
              onChange={(e) => setDestinationWh(e.target.value)} 
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
              onChange={(e) => setDelayDays(Number(e.target.value))}
              className="range-slider"
            />
          </div>

          <div className="control-group slider-group">
            <div className="slider-header">
              <label>Emergency Budget Cap:</label>
              <span className="mono font-bold text-cyan">INR {budget.toLocaleString()}</span>
            </div>
            <input 
              id="opt-budget-slider"
              type="range" 
              min="10000" 
              max="200000" 
              step="5000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="range-slider"
            />
          </div>

          <button 
            id="run-optimization-btn"
            type="submit" 
            className="btn btn-primary btn-run-sim"
            disabled={loading}
          >
            <Zap size={16} />
            <span>{loading ? 'Solving...' : 'Run OR-Tools Solver'}</span>
          </button>
        </div>
      </form>

      {/* Simulator Output */}
      {simData && (
        <div className="optimization-output-area">
          {/* Problem Statement Banner */}
          <div className="glass-panel disruption-summary-banner">
            <div className="banner-left">
              <div className="banner-icon-box">
                <AlertOctagon size={24} color="#F43F5E" />
              </div>
              <div>
                <h3>Simulated Disruption Assessment</h3>
                <p>{simData.problem_description}</p>
              </div>
            </div>
            <div className="banner-right mono">
              <span className="loss-label">Baseline Shortage Exposure:</span>
              <span className="loss-val text-rose">INR {simData.baseline_stockout_cost.toLocaleString()}</span>
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
                  className={`glass-panel scenario-card ${isWinner ? 'scenario-winner' : ''}`}
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
                      <span className="stat-val mono text-cyan">INR {sc.estimated_total_cost.toLocaleString()}</span>
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
                          <ShieldAlert size={13} color="#F59E0B" />
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
