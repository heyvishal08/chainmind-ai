import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Layers, 
  Info, 
  CheckCircle, 
  AlertCircle,
  Play
} from 'lucide-react';
import { fetchForecast, fetchProducts, fetchWarehouses } from '../services/api';

export default function ForecastingView() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedSku, setSelectedSku] = useState('SKU-AUD-101');
  const [selectedWh, setSelectedWh] = useState('WH-DEL-01');
  const [horizon, setHorizon] = useState(14);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchProducts(), fetchWarehouses()])
      .then(([prods, whs]) => {
        setProducts(prods);
        setWarehouses(whs);
      })
      .catch(console.error);

    // Initial load for default SKU
    runForecast('SKU-AUD-101', 'WH-DEL-01', 14);
  }, []);

  const runForecast = (sku, wh, days) => {
    setLoading(true);
    fetchForecast(sku, wh, days)
      .then(setForecastData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleRun = (e) => {
    e.preventDefault();
    runForecast(selectedSku, selectedWh, horizon);
  };

  // Render SVG Chart for Historical vs Forecast + P10/P90 bands
  const renderChart = () => {
    if (!forecastData) return null;

    const hist = forecastData.historical_last_30_days.slice(-20);
    const future = forecastData.forecast;

    const allValues = [
      ...hist.map(h => h.units_sold),
      ...future.map(f => f.p90)
    ];
    const maxVal = Math.max(...allValues, 100);
    const minVal = 0;

    const chartWidth = 720;
    const chartHeight = 260;
    const padding = 40;

    const totalPoints = hist.length + future.length;
    const stepX = (chartWidth - padding * 2) / (totalPoints - 1);

    // Coordinate conversion
    const getY = (val) => chartHeight - padding - ((val - minVal) / (maxVal - minVal)) * (chartHeight - padding * 2);

    // Historical points
    const histCoords = hist.map((item, idx) => ({
      x: padding + idx * stepX,
      y: getY(item.units_sold),
      date: item.date,
      val: item.units_sold
    }));

    // Future points
    const futureCoords = future.map((item, idx) => ({
      x: padding + (hist.length + idx) * stepX,
      yP50: getY(item.p50),
      yP10: getY(item.p10),
      yP90: getY(item.p90),
      date: item.date,
      p50: item.p50,
      p10: item.p10,
      p90: item.p90
    }));

    const lastHist = histCoords[histCoords.length - 1];
    const p50Points = [lastHist ? `${lastHist.x},${lastHist.y}` : '', ...futureCoords.map(c => `${c.x},${c.yP50}`)].filter(Boolean).join(' ');
    const histPath = histCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

    // Uncertainty band polygon
    const upperBand = futureCoords.map(c => `${c.x},${c.yP90}`);
    const lowerBand = [...futureCoords].reverse().map(c => `${c.x},${c.yP10}`);
    const bandPolygon = `${lastHist ? `${lastHist.x},${lastHist.y} ` : ''}${upperBand.join(' ')} ${lowerBand.join(' ')}`;

    return (
      <div className="forecast-chart-container">
        <div className="chart-legend">
          <div className="legend-item"><span className="legend-line line-blue"></span> Actuals (Last 20d)</div>
          <div className="legend-item"><span className="legend-line line-slate"></span> Forecast P50 Median</div>
          <div className="legend-item"><span className="legend-box box-slate"></span> P10 – P90 Uncertainty Interval</div>
        </div>

        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="forecast-svg">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="rgba(255,255,255,0.06)" />
          <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="rgba(255,255,255,0.06)" />
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="rgba(255,255,255,0.1)" />

          {/* Division Line between History and Future */}
          {lastHist && (
            <line 
              x1={lastHist.x} 
              y1={padding} 
              x2={lastHist.x} 
              y2={chartHeight - padding} 
              stroke="rgba(148, 163, 184, 0.3)" 
              strokeDasharray="4 4" 
            />
          )}

          {/* Uncertainty Band Fill */}
          <polygon points={bandPolygon} fill="rgba(148, 163, 184, 0.08)" />

          {/* Historical Line */}
          <path d={histPath} fill="none" stroke="#3B82F6" strokeWidth="2" />

          {/* Historical Points */}
          {histCoords.map((c, i) => (
            <circle key={`hist-${i}`} cx={c.x} cy={c.y} r="2.5" fill="#3B82F6" />
          ))}

          {/* Forecast P50 Line */}
          <polyline points={p50Points} fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="3 3" />

          {/* Forecast P50 Points */}
          {futureCoords.map((c, i) => (
            <circle key={`fut-${i}`} cx={c.x} cy={c.yP50} r="2.5" fill="#94A3B8" />
          ))}

          {/* X Axis Label */}
          <text x={padding} y={chartHeight - 12} fill="#64748B" fontSize="11" className="mono">History</text>
          <text x={chartWidth - padding - 60} y={chartHeight - 12} fill="#94A3B8" fontSize="11" className="mono">Projection (P50)</text>
        </svg>
      </div>
    );
  };

  return (
    <div className="view-page" id="forecasting-studio-view">
      <div className="view-header">
        <div>
          <h1 className="view-title">Demand Forecasting Intelligence</h1>
          <p className="view-description">
            Time-series machine learning backtesting with lag feature engineering and P10/P50/P90 prediction intervals.
          </p>
        </div>
      </div>

      {/* Control Bar: Selectors */}
      <form onSubmit={handleRun} className="glass-panel forecast-controls-bar">
        <div className="control-group">
          <label>Product SKU:</label>
          <select 
            id="forecast-sku-select"
            value={selectedSku} 
            onChange={(e) => setSelectedSku(e.target.value)}
            className="select-field"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.id} - {p.name} ({p.category})</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Fulfillment Warehouse:</label>
          <select 
            id="forecast-wh-select"
            value={selectedWh} 
            onChange={(e) => setSelectedWh(e.target.value)}
            className="select-field"
          >
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Horizon (Days):</label>
          <select 
            id="forecast-horizon-select"
            value={horizon} 
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="select-field"
          >
            <option value={7}>7 Days (Tactical)</option>
            <option value={14}>14 Days (Standard)</option>
            <option value={30}>30 Days (Monthly Replenishment)</option>
            <option value={60}>60 Days (Quarterly S&OP)</option>
          </select>
        </div>

        <button 
          id="run-forecast-btn"
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          <Play size={15} />
          <span>{loading ? 'Forecasting...' : 'Run ML Pipeline'}</span>
        </button>
      </form>

      {/* Results Section */}
      {forecastData && (
        <div className="forecast-results-grid">
          {/* Main Chart Card */}
          <div className="glass-panel chart-panel">
            <div className="panel-header">
              <div>
                <h3>{forecastData.product_name} (`{forecastData.product_id}`)</h3>
                <span className="mono text-muted">Model: {forecastData.model_name}</span>
              </div>
              <div className="badge-group">
                <span className="badge badge-info">WAPE: {(forecastData.wape * 100).toFixed(1)}%</span>
                <span className="badge badge-success">MAE: {forecastData.mae} Units</span>
              </div>
            </div>

            {renderChart()}

            <div className="model-explain-footer">
              <Info size={16} color="#38BDF8" />
              <span>
                Engine trained with walk-forward time-series backtesting using 5 lag features, 
                rolling moving averages, and festive seasonality multipliers to eliminate lookahead data leakage.
              </span>
            </div>
          </div>

          {/* Daily Predictions Breakdown Table */}
          <div className="glass-panel table-panel">
            <div className="panel-header">
              <h3>Projected Daily Demand</h3>
              <span className="badge badge-purple">{forecastData.horizon_days} Days Horizon</span>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>P10 (Low)</th>
                    <th>P50 (Median)</th>
                    <th>P90 (High)</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData.forecast.map((pt) => (
                    <tr key={pt.date}>
                      <td className="mono">{pt.date}</td>
                      <td className="mono text-muted">{pt.p10}</td>
                      <td className="mono font-bold text-cyan">{pt.p50}</td>
                      <td className="mono text-purple">{pt.p90}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
