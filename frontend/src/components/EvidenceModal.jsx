import React from 'react';
import { X, Database, Cpu, FileText, CheckCircle } from 'lucide-react';

export default function EvidenceModal({ isOpen, onClose, evidenceData, thoughtProcess, toolCalled }) {
  if (!isOpen || !evidenceData) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Cpu size={20} color="#38BDF8" />
            <div>
              <h3>Agent Evidence & Telemetry Inspector</h3>
              <p className="modal-subtitle">Grounded operational records and mathematical solver outputs</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} id="close-evidence-modal-btn">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="evidence-section">
            <div className="section-label">
              <Database size={15} color="#A855F7" />
              <span>Supervisor Reasoning & Tool Execution</span>
            </div>
            <div className="evidence-card thought-card">
              <div className="tool-executed-tag">
                <span className="badge badge-purple">{toolCalled || 'Direct Agent Tool'}</span>
              </div>
              <p className="thought-text">{thoughtProcess || 'Evaluated telemetry against operational constraints.'}</p>
            </div>
          </div>

          <div className="evidence-section">
            <div className="section-label">
              <FileText size={15} color="#06B6D4" />
              <span>Underlying Model & Solver Payloads</span>
            </div>
            <pre className="evidence-json-block mono">
              {JSON.stringify(evidenceData, null, 2)}
            </pre>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close Inspector</button>
        </div>
      </div>
    </div>
  );
}
