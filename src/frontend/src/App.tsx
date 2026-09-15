import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard.js';
import SiteRiskMap from './pages/SiteRiskMap.js';
import DeviationList from './pages/DeviationList.js';

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 rounded text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Clinical Trial Risk Monitor
              </h1>
              <p className="text-xs text-gray-500">Protocol Deviation Detector</p>
            </div>
            <nav className="flex gap-2">
              <NavItem to="/" label="Dashboard" />
              <NavItem to="/sites" label="Site Risk" />
              <NavItem to="/deviations" label="Deviations" />
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sites" element={<SiteRiskMap />} />
            <Route path="/deviations" element={<DeviationList />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
