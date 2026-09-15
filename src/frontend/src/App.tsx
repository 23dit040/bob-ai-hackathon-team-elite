import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard.js';
import SiteRiskMap from './pages/SiteRiskMap.js';
import DeviationList from './pages/DeviationList.js';

function NavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
            : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
        }`
      }
    >
      <span className="text-base">{icon}</span>
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 flex">
        {/* Sidebar */}
        <aside className="w-60 bg-slate-800 border-r border-slate-700/50 flex flex-col fixed h-full">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-slate-700/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">CT</div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Clinical Trial</p>
                <p className="text-slate-400 text-xs">Risk Monitor</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-2 mb-2">Monitoring</p>
            <NavItem to="/" label="Dashboard" icon="📊" />
            <NavItem to="/sites" label="Site Risk" icon="🏥" />
            <NavItem to="/deviations" label="Deviations" icon="⚠️" />
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-slate-400">MCP Server Active</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">IBM Bob Integration</p>
          </div>
        </aside>

        {/* Main */}
        <main className="ml-60 flex-1 min-h-screen">
          {/* Top bar */}
          <header className="bg-slate-800/50 border-b border-slate-700/50 px-8 py-4 flex items-center justify-between backdrop-blur sticky top-0 z-10">
            <div>
              <h1 className="text-white font-semibold text-base">Protocol Deviation Detector</h1>
              <p className="text-slate-400 text-xs">Powered by IBM Bob MCP Integration</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                <span className="text-xs text-slate-300">Backend Connected</span>
              </div>
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg px-3 py-1.5">
                <span className="text-xs text-blue-400 font-medium">8 MCP Tools</span>
              </div>
            </div>
          </header>

          <div className="px-8 py-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sites" element={<SiteRiskMap />} />
              <Route path="/deviations" element={<DeviationList />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
