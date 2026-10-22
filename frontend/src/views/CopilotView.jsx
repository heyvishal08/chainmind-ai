import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Cpu, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  Database,
  Terminal,
  Zap
} from 'lucide-react';
import { sendCopilotChat } from '../services/api';

export default function CopilotView({ onNavigateTab, onInspectEvidence }) {
  const [messages, setMessages] = useState([
    {
      id: 'msg-init',
      sender: 'agent',
      thought_process: 'Initialized supply chain monitoring state across 4 hubs and 30 SKUs.',
      tool_called: 'telemetry_bootstrap',
      response_markdown: 
        `### Welcome to ChainMind Copilot Studio\n\n` +
        `I am your autonomous supply chain intelligence assistant. Connected to live operational databases, ` +
        `machine learning demand models, Google OR-Tools optimization solvers, and internal procurement contracts.\n\n` +
        `**Try asking one of the key questions below:**`,
      citations: [],
      evidence: null,
      action_proposal: null
    }
  ]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeEvidence, setActiveEvidence] = useState(null);

  const presetQueries = [
    "Which products are likely to stock out in Delhi next week, and what should we do?",
    "What does our contract with Apex Microtronics say about late penalties?",
    "Zenith Battery has a 5-day delay on GaN chargers. What is our best resolution?",
    "Compare carrier performance and active transit delays.",
    "Propose an inter-warehouse stock transfer from Mumbai to Delhi."
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
      if (data.evidence) {
        setActiveEvidence({
          evidence: data.evidence,
          thought: data.thought_process,
          tool: data.tool_called
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'agent',
          response_markdown: `**Error:** Failed to execute agentic query (${err.message}).`,
          citations: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view-page" id="copilot-studio-view">
      <div className="view-header">
        <div>
          <h1 className="view-title text-gradient-purple">AI Supply Chain Copilot Studio</h1>
          <p className="view-description">
            Conversational reasoning layer connected directly to operational telemetry, predictive models, and mathematical solvers.
          </p>
        </div>
      </div>

      <div className="copilot-studio-grid">
        {/* Left Column: Full Chat Experience */}
        <div className="glass-panel copilot-chat-window">
          <div className="chat-messages-container">
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
                        <span className="proposal-title">Autonomous Action Proposal Generated</span>
                      </div>
                      <p className="proposal-desc">{m.action_proposal.title}</p>
                      <div className="proposal-metrics">
                        <div>
                          <span className="metric-label">Estimated Cost:</span>
                          <span className="metric-val mono text-rose">INR {m.action_proposal.cost?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="metric-label">Protected Revenue:</span>
                          <span className="metric-val mono text-emerald font-bold">INR {m.action_proposal.expected_savings?.toLocaleString()}</span>
                        </div>
                      </div>
                      <button 
                        className="btn btn-success btn-sm mt-2"
                        onClick={() => onNavigateTab('actions')}
                      >
                        <span>Approve in Action Center</span>
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
                        onClick={() => {
                          setActiveEvidence({
                            evidence: m.evidence,
                            thought: m.thought_process,
                            tool: m.tool_called
                          });
                        }}
                      >
                        <Cpu size={13} />
                        <span>View Live Telemetry in Inspector</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="agent-loading-indicator">
                <RefreshCw size={16} className="spin" color="#38BDF8" />
                <span>Agent Supervisor executing tool workflow...</span>
              </div>
            )}
          </div>

          {/* Preset Prompts */}
          <div className="studio-preset-bar">
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

          {/* Chat Input */}
          <div className="studio-input-bar">
            <input
              id="copilot-studio-input"
              type="text"
              placeholder="Ask ChainMind about stockouts, supplier contracts, delay trade-offs..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="copilot-input"
              disabled={loading}
            />
            <button 
              id="send-studio-msg-btn"
              className="btn btn-purple"
              onClick={() => handleSend()}
              disabled={loading || !prompt.trim()}
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Telemetry & Inspector */}
        <div className="glass-panel copilot-telemetry-window">
          <div className="panel-header">
            <div className="panel-title-group">
              <Terminal size={18} color="#38BDF8" />
              <h3>Live Telemetry & Solvers Inspector</h3>
            </div>
            <span className="badge badge-purple">Real-Time State</span>
          </div>

          {activeEvidence ? (
            <div className="telemetry-details">
              <div className="evidence-section">
                <span className="section-label">Active Tool Node:</span>
                <span className="badge badge-info mono">{activeEvidence.tool}</span>
              </div>

              <div className="evidence-section mt-2">
                <span className="section-label">Supervisor Reasoning Trace:</span>
                <p className="thought-text text-muted">{activeEvidence.thought}</p>
              </div>

              <div className="evidence-section mt-3">
                <span className="section-label">Payload & Constraint Telemetry:</span>
                <pre className="evidence-json-block mono">
                  {JSON.stringify(activeEvidence.evidence, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="empty-telemetry-box">
              <Cpu size={32} color="#64748B" />
              <p>Ask a question or select an inquiry above. The supervisor agent's tool calls, SQL responses, and OR-Tools constraints will be visualized live here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
