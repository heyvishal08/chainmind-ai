import React from 'react';
import { 
  Activity, 
  Bot, 
  TrendingUp, 
  Boxes, 
  Truck, 
  Factory, 
  FlaskConical, 
  BookOpen, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenCopilot, pendingActionsCount = 0 }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'copilot', label: 'AI Copilot', icon: Bot, isSpecial: true },
    { id: 'forecasting', label: 'Forecasting', icon: TrendingUp },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'logistics', label: 'Logistics', icon: Truck },
    { id: 'suppliers', label: 'Suppliers', icon: Factory },
    { id: 'optimization', label: 'Optimization Lab', icon: FlaskConical },
    { id: 'knowledge', label: 'Knowledge Hub', icon: BookOpen },
    { 
      id: 'actions', 
      label: 'Action Center', 
      icon: CheckCircle2,
      badge: pendingActionsCount > 0 ? pendingActionsCount : null 
    },
  ];

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <div className="navbar-brand" onClick={() => setActiveTab('overview')}>
          <div className="brand-icon">
            <Sparkles size={20} color="#38BDF8" />
          </div>
          <div className="brand-text">
            <span className="brand-title">ChainMind <span className="brand-highlight">AI</span></span>
            <span className="brand-subtitle">Intelligent Supply Chain Copilot</span>
          </div>
        </div>

        <div className="system-status-pill">
          <span className="pulse-dot emerald"></span>
          <span className="status-label">Engine Operational</span>
        </div>
      </div>

      <nav className="navbar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-btn-${item.id}`}
              className={`nav-tab-btn ${isActive ? 'active' : ''} ${item.isSpecial ? 'special-tab' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="navbar-right">
        <button 
          id="open-copilot-drawer-btn" 
          className="btn btn-purple ask-copilot-btn"
          onClick={onOpenCopilot}
        >
          <Bot size={16} />
          <span>Quick Copilot</span>
        </button>
      </div>
    </header>
  );
}
