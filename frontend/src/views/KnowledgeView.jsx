import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  FileText, 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { fetchKnowledgeDocs, queryKnowledge } from '../services/api';

export default function KnowledgeView() {
  const [docs, setDocs] = useState([]);
  const [queryText, setQueryText] = useState('What is the penalty if Apex delivers late?');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchKnowledgeDocs().then(setDocs).catch(console.error);
    // Initial grounded search
    handleSearch('What is the penalty if Apex delivers late?');
  }, []);

  const handleSearch = async (textToQuery) => {
    const q = textToQuery || queryText;
    if (!q.trim() || loading) return;

    setLoading(true);
    try {
      const data = await queryKnowledge(q);
      setResult(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    "What is the penalty if Apex delivers late?",
    "What is the financial approval threshold for orders between 1.5L and 7.5L?",
    "When is expedited air freight economically justified?",
    "What is the policy for inter-warehouse stock transfers?",
    "What is the company policy on employee vacation in Hawaii?"
  ];

  return (
    <div className="view-page" id="knowledge-hub-view">
      <div className="view-header">
        <div>
          <h1 className="view-title">Knowledge Hub & Grounded RAG</h1>
          <p className="view-description">
            Semantic clause search across supplier contracts, corporate procurement DOA policies, and disruption playbooks with anti-hallucination abstention.
          </p>
        </div>
      </div>

      {/* Two Column Layout: Search on Left, Document Index on Right */}
      <div className="knowledge-layout-grid">
        {/* Left Column: Interactive Grounded Query Engine */}
        <div className="knowledge-search-col">
          <div className="glass-panel query-box-panel">
            <div className="search-input-wrapper">
              <Search size={18} color="#9CA3AF" />
              <input
                id="rag-query-input"
                type="text"
                placeholder="Ask a question about supplier contracts, DOA limits, freight guidelines..."
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="rag-search-field"
              />
              <button 
                id="submit-rag-query-btn"
                className="btn btn-primary"
                onClick={() => handleSearch()}
                disabled={loading}
              >
                <span>{loading ? 'Retrieving...' : 'Search Grounded RAG'}</span>
              </button>
            </div>

            <div className="sample-queries-container">
              <span className="samples-label">Preset Policy & Contract Questions:</span>
              <div className="sample-chips">
                {sampleQueries.map((sq, i) => (
                  <button 
                    key={i} 
                    className="chip-btn"
                    onClick={() => {
                      setQueryText(sq);
                      handleSearch(sq);
                    }}
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RAG Output Result */}
          {result && (
            <div className="glass-panel rag-result-panel mt-4">
              <div className="result-header">
                <div className="result-title-group">
                  <ShieldCheck size={16} color="#10B981" />
                  <h3>Grounded Policy Findings</h3>
                </div>
                {result.abstention_triggered ? (
                  <span className="badge badge-warning">Abstention Triggered</span>
                ) : (
                  <span className="badge badge-success">Grounded & Verified</span>
                )}
              </div>

              {result.abstention_triggered ? (
                <div className="abstention-box">
                  <AlertCircle size={20} color="#F59E0B" />
                  <div>
                    <h4 className="abstention-title">Governance Guardrail Engaged</h4>
                    <p>{result.answer}</p>
                  </div>
                </div>
              ) : (
                <div className="answer-content">
                  <div className="grounded-answer-text">
                    {result.answer.split('\n\n').map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>

                  {result.citations.length > 0 && (
                    <div className="citations-list-box mt-4">
                      <h4>Verified Document Citations ({result.citations.length})</h4>
                      <div className="citations-cards">
                        {result.citations.map((c, i) => (
                          <div key={i} className="citation-card">
                            <div className="citation-top">
                              <span className="citation-doc-title">{c.document_title}</span>
                              <span className="badge badge-purple mono">{c.section}</span>
                            </div>
                            <blockquote className="citation-quote">
                              "{c.snippet}"
                            </blockquote>
                            <div className="citation-footer mono">
                              <span>Confidence Score: {(c.confidence_score * 100).toFixed(1)}%</span>
                              <span className="text-muted">{c.document_id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Indexed Document Repository */}
        <div className="knowledge-docs-col">
          <div className="glass-panel docs-list-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <BookOpen size={18} color="#06B6D4" />
                <h3>Knowledge Hub Index</h3>
              </div>
              <span className="badge badge-info">{docs.length} Documents</span>
            </div>

            <div className="indexed-docs-list">
              {docs.map((doc) => (
                <div key={doc.id} className="doc-card">
                  <div className="doc-top">
                    <FileText size={16} color="#38BDF8" />
                    <div>
                      <h4 className="doc-title">{doc.title}</h4>
                      <span className="doc-meta mono text-muted">
                        v{doc.version} | Effective {doc.effective_date}
                      </span>
                    </div>
                  </div>
                  <p className="doc-summary-snippet text-muted">{doc.content_summary}</p>
                  <div className="doc-footer">
                    <span className="badge badge-info">{doc.document_type}</span>
                    <span className="mono text-muted">{doc.filename}</span>
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
