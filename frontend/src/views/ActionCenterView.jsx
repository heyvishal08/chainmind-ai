import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  Clock, 
  ShieldCheck, 
  DollarSign, 
  ArrowRight, 
  FileCheck,
  Filter,
  UserCheck
} from 'lucide-react';
import { fetchActions, submitActionDecision } from '../services/api';

export default function ActionCenterView() {
  const [actions, setActions] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = () => {
    setLoading(true);
    fetchActions()
      .then(setActions)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleDecision = async (actionId, decision) => {
    setActingId(actionId);
    try {
      await submitActionDecision(actionId, decision, 'Supply Chain Director', `Authorized decision: ${decision}`);
      loadActions();
    } catch (err) {
      alert(`Action decision failed: ${err.message}`);
    } finally {
      setActingId(null);
    }
  };

  const filtered = actions.filter((a) => {
    if (selectedFilter === 'ALL') return true;
    return a.status.toUpperCase() === selectedFilter;
  });

  return (
    <div className="view-page" id="action-center-view">
      <div className="view-header">
        <div>
          <h1 className="view-title text-gradient">Action Center & Human-in-the-Loop Governance</h1>
          <p className="view-description">
            Human approval queue for AI-proposed inventory transfers, emergency purchase orders, and logistics interventions with immutable audit logs.
          </p>
        </div>

        {/* Status Filters */}
        <div className="action-status-filters">
          {['ALL', 'PENDING APPROVAL', 'APPROVED', 'EXECUTED', 'DRAFT'].map((st) => (
            <button
              key={st}
              className={`filter-btn ${selectedFilter === st ? 'active' : ''}`}
              onClick={() => setSelectedFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Actions Cards List */}
      <div className="actions-list-container">
        {filtered.length === 0 ? (
          <div className="empty-actions-box glass-panel">
            <CheckCircle2 size={32} color="#10B981" />
            <p>No actions matching filter "{selectedFilter}".</p>
          </div>
        ) : (
          filtered.map((action) => {
            const isPending = action.status === 'Pending Approval';
            const isApproved = action.status === 'Approved';
            const isExecuted = action.status === 'Executed';
            const isRejected = action.status === 'Rejected';

            return (
              <div 
                key={action.id} 
                id={`action-card-${action.id}`}
                className={`glass-panel action-card ${isPending ? 'border-amber' : isExecuted ? 'border-emerald' : ''}`}
              >
                <div className="action-card-header">
                  <div className="action-title-group">
                    <div className="action-type-pill">
                      <span className="badge badge-purple">{action.category}</span>
                      <span className="mono text-muted">{action.id}</span>
                    </div>
                    <h3 className="action-card-title">{action.title}</h3>
                  </div>

                  <div className="action-status-badge">
                    <span className={`badge ${
                      isPending ? 'badge-warning' : 
                      isApproved ? 'badge-info' : 
                      isExecuted ? 'badge-success' : 'badge-critical'
                    }`}>
                      {action.status}
                    </span>
                  </div>
                </div>

                <div className="action-content-body">
                  <div className="action-stmt-block">
                    <span className="stmt-label">Problem Context:</span>
                    <p className="stmt-text">{action.problem_statement}</p>
                  </div>

                  <div className="action-stmt-block mt-2">
                    <span className="stmt-label">Proposed Operational Action:</span>
                    <p className="stmt-text text-cyan">{action.proposed_action}</p>
                  </div>

                  {/* Financial & ROI Row */}
                  <div className="action-metrics-row">
                    <div className="metric-cell">
                      <span className="cell-label">Estimated Implementation Cost</span>
                      <span className="cell-val mono text-rose">INR {action.estimated_cost.toLocaleString()}</span>
                    </div>

                    <div className="metric-cell">
                      <span className="cell-label">Protected Revenue / Savings</span>
                      <span className="cell-val mono text-emerald font-bold">
                        INR {action.expected_savings_or_revenue_protected.toLocaleString()}
                      </span>
                    </div>

                    <div className="metric-cell">
                      <span className="cell-label">Net Projected ROI</span>
                      <span className="cell-val mono text-cyan">{action.net_roi}x Benefit</span>
                    </div>

                    <div className="metric-cell">
                      <span className="cell-label">Initiated By</span>
                      <span className="cell-val mono text-muted">{action.created_by}</span>
                    </div>
                  </div>

                  {/* Policy Citation */}
                  {action.policy_citation && (
                    <div className="action-citation-box">
                      <FileCheck size={14} color="#38BDF8" />
                      <span className="mono text-muted"><strong>Policy Grounding:</strong> {action.policy_citation}</span>
                    </div>
                  )}

                  {/* Execution Audit Trail if Executed */}
                  {action.execution_result && (
                    <div className="execution-audit-box mt-3">
                      <div className="audit-header">
                        <UserCheck size={14} color="#10B981" />
                        <span className="text-emerald font-bold">Execution Confirmed & Logged</span>
                      </div>
                      <p className="audit-text mono text-muted">{action.execution_result}</p>
                    </div>
                  )}
                </div>

                {/* Human Approval Action Buttons */}
                <div className="action-card-footer">
                  <div className="footer-meta mono text-muted">
                    Created: {new Date(action.created_at).toLocaleDateString()}
                    {action.approved_by && ` • Approved by: ${action.approved_by}`}
                  </div>

                  <div className="footer-action-buttons">
                    {isPending && (
                      <>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDecision(action.id, 'Reject')}
                          disabled={actingId === action.id}
                        >
                          <XCircle size={15} />
                          <span>Reject</span>
                        </button>
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => handleDecision(action.id, 'Approve')}
                          disabled={actingId === action.id}
                        >
                          <CheckCircle2 size={15} />
                          <span>Approve Action</span>
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleDecision(action.id, 'Execute')}
                        disabled={actingId === action.id}
                      >
                        <Play size={15} />
                        <span>Dispatch & Execute Manifest</span>
                      </button>
                    )}

                    {isExecuted && (
                      <span className="badge badge-success">
                        <CheckCircle2 size={13} />
                        <span>Audit Record Locked</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
