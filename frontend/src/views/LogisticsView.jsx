import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Navigation,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { fetchShipments, fetchCarriers } from '../services/api';

export default function LogisticsView({ onNavigateTab }) {
  const [shipments, setShipments] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchShipments(), fetchCarriers()])
      .then(([shps, cars]) => {
        setShipments(shps);
        setCarriers(cars);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="view-page" id="logistics-shipments-view">
      <div className="view-header">
        <div>
          <h1 className="view-title text-gradient">Logistics & Shipment Intelligence</h1>
          <p className="view-description">
            Live shipment tracking with predictive machine learning delay risk, carrier SLAs, and downstream stockout correlation.
          </p>
        </div>
      </div>

      {/* Carrier Performance Benchmark Cards */}
      <div className="carrier-cards-row">
        {carriers.map((c) => (
          <div key={c.carrier} className="glass-panel carrier-card">
            <div className="carrier-header">
              <span className="carrier-name">{c.carrier}</span>
              <span className="badge badge-info">{c.mode}</span>
            </div>
            <div className="carrier-metrics">
              <div>
                <span className="metric-label">Contract SLA</span>
                <span className="metric-val mono text-emerald">{c.on_time_rate}%</span>
              </div>
              <div>
                <span className="metric-label">Average Delay</span>
                <span className="metric-val mono">{c.avg_delay_hours} hrs</span>
              </div>
            </div>
            <span className="carrier-status-tag mono text-muted">{c.status}</span>
          </div>
        ))}
      </div>

      {/* Active Inbound Shipments Table */}
      <div className="glass-panel table-panel mt-4">
        <div className="panel-header">
          <div className="panel-title-group">
            <Truck size={18} color="#06B6D4" />
            <h3>In-Transit Shipments & Delay Predictions</h3>
          </div>
          <span className="badge badge-info">{shipments.length} Active Consignments</span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Shipment / PO</th>
                <th>Carrier & Mode</th>
                <th>Origin ➔ Destination</th>
                <th>Current Telemetry Location</th>
                <th>Predicted Delay</th>
                <th>Destination Coverage</th>
                <th>Disruption Risk</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shp) => {
                const isDelayed = shp.predicted_delay_hours > 0;
                return (
                  <tr key={shp.shipment_id} className={shp.is_critical_disruption ? 'row-critical' : ''}>
                    <td>
                      <div className="sku-cell">
                        <span className="sku-title">{shp.shipment_id}</span>
                        <span className="sku-code mono">{shp.purchase_order_id} ({shp.quantity} units)</span>
                      </div>
                    </td>
                    <td>
                      <div className="carrier-cell">
                        <span className="font-bold">{shp.carrier_name}</span>
                        <span className="mono text-muted">{shp.transport_mode}</span>
                      </div>
                    </td>
                    <td>
                      <div className="route-cell">
                        <span>{shp.origin}</span>
                        <span className="route-arrow">➔</span>
                        <span className="text-cyan">{shp.destination_warehouse}</span>
                      </div>
                    </td>
                    <td>
                      <div className="location-cell">
                        <MapPin size={13} color="#38BDF8" />
                        <span className="mono">{shp.current_location}</span>
                      </div>
                    </td>
                    <td>
                      {isDelayed ? (
                        <span className="badge badge-critical mono">
                          +{shp.predicted_delay_hours}h ({(shp.delay_probability * 100).toFixed(0)}% Prob)
                        </span>
                      ) : (
                        <span className="badge badge-success mono">On-Schedule</span>
                      )}
                    </td>
                    <td>
                      <span className={`mono font-bold ${shp.destination_inventory_coverage_days < 7 ? 'text-rose' : 'text-emerald'}`}>
                        {shp.destination_inventory_coverage_days.toFixed(1)} Days
                      </span>
                    </td>
                    <td>
                      <span className="impact-text-cell">{shp.impact_summary}</span>
                    </td>
                    <td>
                      {shp.is_critical_disruption && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => onNavigateTab('optimization')}
                        >
                          <Zap size={13} color="#06B6D4" />
                          <span>Simulate</span>
                        </button>
                      )}
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
