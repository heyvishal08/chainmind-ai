import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  ArrowRight, 
  ExternalLink, 
  Cpu, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { sendCopilotChat } from '../services/api';

export default function CopilotDrawer({ isOpen, onClose, onInspectEvidence, onNavigateToActionCenter }) {
  const [messages, setMessages] = useState([
    {
      id: 'msg-init',
      sender: 'agent',
      thought_process: 'Initialized supply chain monitoring state across 4 hubs and 30 SKUs.',
      tool_called: 'telemetry_bootstrap',
      response_markdown: 
        `**Good day! I am ChainMind Copilot.**\n\n` +
        `I am actively monitoring inventory positions, delay risks, supplier reliability, and contract policies.\n\n` +
        `How can I assist your operations today?`,
      citations: [],
      evidence: null,
      action_proposal: null
    }
  ]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const presetQueries = [
    "Which products are likely to stock out in Delhi next week?",
    "What does our contract with Apex say about late penalties?",
    "Zenith Battery has a 5-day delay. What is our best resolution?",
    "Compare carrier performance and active transit delays."
  ];

  const handleSend = async (queryText) => {
    const textToSend = queryText || prompt;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      const data = await sendCopilotChat(textToSend);
      const agentMsg = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        thought_process: data.thought_process,
        tool_called: data.tool_called,
        response_markdown: data.response_markdown,
        citations: data.citations || [],
        action_proposal: data.action_proposal,
        evidence: data.evidence
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'agent',
          response_markdown: `**Error:** Failed to connect to copilot reasoning engine (${err.message}).`,
          citations: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="copilot-drawer-backdrop" onClick={onClose}>
      <aside className="copilot-drawer glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-group">
            <div className="bot-avatar">
              <Bot size={20} color="#A855F7" />
            </div>
            <div>
              <h3>ChainMind AI Copilot</h3>
              <p className="drawer-subtitle">Autonomous reasoning & solver orchestration</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} id="close-copilot-drawer-btn">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-messages-area">
          {messages.map((m) => {
            if (m.sender === 'user') {
              return (
                <div key={m.id} className="chat-bubble user-bubble">
                  <p>{m.text}</p>
                </div>
              );
            }

            return (
              <div key={m.id} className="chat-bubble agent-bubble">
                {m.thought_process && (
                  <div className="agent-thought-pill">
                    <Sparkles size={12} color="#A855F7" />
                    <span>{m.thought_process}</span>
                  </div>
                )}

                <div className="agent-markdown-content">
                  {m.response_markdown.split('\n\n').map((para, i) => (
                    <p key={i} dangerouslySetInnerHTML={{ 
                      __html: para
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/`(.*?)`/g, '<code class="mono">$1</code>')
                    }} />
                  ))}
                </div>

                {m.action_proposal && (
                  <div className="action-proposal-card">
                    <div className="proposal-header">
                      <CheckCircle2 size={16} color="#10B981" />
                      <span className="proposal-title">Autonomous Action Proposal</span>
                    </div>
                    <p className="proposal-desc">{m.action_proposal.title}</p>
                    <div className="proposal-metrics">
                      <div>
                        <span className="metric-label">Estimated Cost:</span>
                        <span className="metric-val">INR {m.action_proposal.cost?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="metric-label">Protected Revenue:</span>
                        <span className="metric-val text-emerald">INR {m.action_proposal.expected_savings?.toLocaleString()}</span>
                      </div>
                    </div>
                    <button 
                      className="btn btn-success btn-sm mt-2"
                      onClick={() => {
                        onClose();
                        onNavigateToActionCenter();
                      }}
                    >
                      <span>Review in Action Center</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}

                {m.citations && m.citations.length > 0 && (
                  <div className="citation-container">
                    <span className="citation-header"><BookOpen size={13} /> Verified Grounding:</span>
                    <div className="citation-tags">
                      {m.citations.map((c, idx) => (
                        <span key={idx} className="badge badge-info">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {m.evidence && (
                  <div className="agent-footer-actions">
                    <button 
                      className="btn-inspect-evidence"
                      onClick={() => onInspectEvidence(m.evidence, m.thought_process, m.tool_called)}
                    >
                      <Cpu size={13} />
                      <span>Inspect Telemetry & Evidence</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="agent-loading-indicator">
              <RefreshCw size={16} className="spin" color="#38BDF8" />
              <span>Supervisor coordinating tools & mathematical solvers...</span>
            </div>
          )}
        </div>

        <div className="drawer-presets">
          <span className="preset-label">Suggested Inquiries:</span>
          <div className="preset-chips">
            {presetQueries.map((q, idx) => (
              <button 
                key={idx} 
                className="chip-btn" 
                onClick={() => handleSend(q)}
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="drawer-input-container">
          <input
            id="copilot-input-field"
            type="text"
            className="copilot-input"
            placeholder="Ask questions about inventory, suppliers, delay options..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button 
            id="send-copilot-msg-btn"
            className="btn btn-primary btn-send"
            onClick={() => handleSend()}
            disabled={loading || !prompt.trim()}
          >
            <Send size={16} />
          </button>
        </div>
      </aside>
    </div>
  );
}
