import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, LayoutDashboard,
  Package, ShoppingBag, Truck,
} from 'lucide-react';
import {
  CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const COLORS = ['#a855f7', '#06b6d4', '#f97316', '#10b981'];
const currency = (value) => `$${Math.round(value || 0).toLocaleString('es-AR')}`;

function MetricCard({ title, value, suffix = '', warning = false }) {
  return (
    <div className="glass-card">
      <div className="card-title">{title}</div>
      <div className="card-value">{value}{suffix}</div>
      <div className={`card-trend ${warning ? 'trend-down' : 'trend-up'}`}>
        {warning ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
        <span>{warning ? 'Requiere seguimiento' : 'Datos agregados'}</span>
      </div>
    </div>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}dashboard-data.json`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('No se encontró el resumen público.');
        return response.json();
      })
      .then(setData)
      .catch((loadError) => setError(loadError.message));
  }, []);

  const generatedLabel = useMemo(() => {
    if (!data?.generatedAt) return '';
    return new Date(data.generatedAt).toLocaleString('es-AR');
  }, [data]);

  if (error) return <main className="main-content"><div className="glass-card"><h1>Resumen no disponible</h1><p>{error}</p></div></main>;
  if (!data) return <main className="main-content"><div className="glass-card">Cargando resumen público…</div></main>;

  const logistics = data.charts?.logistics || [];
  const metrics = data.metrics || {};

  const renderDashboard = () => (
    <div className="fade-in">
      <div className="metrics-grid">
        <MetricCard title="Facturación bruta" value={currency(metrics.grossSales)} />
        <MetricCard title="Ventas" value={metrics.orders || 0} />
        <MetricCard title="Unidades" value={metrics.units || 0} />
        <MetricCard title="Margen registrado" value={(metrics.marginOnGross || 0).toFixed(1)} suffix="%" />
        <MetricCard title="Alertas de stock" value={metrics.critical || 0} warning={(metrics.critical || 0) > 0} />
      </div>
      <p className="privacy-note">{data.privacy}</p>
      <div className="charts-container">
        <div className="glass-card" style={{ height: '400px' }}>
          <div className="card-title">Ventas por día</div>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data.charts?.salesByDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
              <Tooltip formatter={(value) => currency(value)} contentStyle={{ background: '#16171d', border: '1px solid var(--card-border)', borderRadius: '12px' }} />
              <Line type="monotone" dataKey="value" stroke="var(--accent-purple)" strokeWidth={4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card" style={{ height: '400px' }}>
          <div className="card-title">Canales de envío</div>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={logistics} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count">
                {logistics.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => `${value} envíos`} />
              <Legend verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="table-section">
        <section className="glass-card">
          <div className="card-title">Productos con mayor movimiento</div>
          <table className="data-table"><thead><tr><th>PRODUCTO</th><th>UNIDADES</th><th>FACTURACIÓN</th></tr></thead>
            <tbody>{(data.topProducts || []).slice(0, 5).map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.qty}</td><td className="cyan">{currency(item.gross)}</td></tr>)}</tbody>
          </table>
        </section>
        <section className="glass-card">
          <div className="card-title">Alertas operativas</div>
          <table className="data-table"><thead><tr><th>SKU</th><th>PRODUCTO</th><th>ESTADO</th></tr></thead>
            <tbody>{(data.toRestock || []).slice(0, 5).map((item) => <tr key={item.sku}><td>{item.sku}</td><td>{item.name}</td><td><span className="status-warning">{item.status}</span></td></tr>)}</tbody>
          </table>
        </section>
      </div>
    </div>
  );

  const renderAlerts = () => <section className="fade-in glass-card"><h2 className="card-title">Alertas de reposición</h2><p className="privacy-note">Se informa el estado, no cantidades de inventario.</p><table className="data-table"><thead><tr><th>SKU</th><th>PRODUCTO</th><th>ESTADO</th></tr></thead><tbody>{(data.toRestock || []).map((item) => <tr key={item.sku}><td>{item.sku}</td><td>{item.name}</td><td><span className="status-warning">{item.status}</span></td></tr>)}</tbody></table></section>;
  const renderLogistics = () => <section className="fade-in glass-card"><h2 className="card-title">Logística del período</h2><p className="privacy-note">Cantidad agregada de envíos, sin destinos ni costos operativos.</p><table className="data-table"><thead><tr><th>MODALIDAD</th><th>ENVÍOS</th></tr></thead><tbody>{logistics.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.count}</td></tr>)}</tbody></table></section>;
  const titles = { dashboard: 'Resumen de negocio', alerts: 'Alertas de stock', logistics: 'Logística' };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo-section"><div className="brand"><div className="logo-icon"><ShoppingBag size={30} /></div><span>URBANO STORE</span></div></div>
        <nav className="nav-links">
          <button className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}><LayoutDashboard size={20} /> Dashboard</button>
          <button className={`nav-item ${activeView === 'alerts' ? 'active' : ''}`} onClick={() => setActiveView('alerts')}><Package size={20} /> Alertas de stock</button>
          <button className={`nav-item ${activeView === 'logistics' ? 'active' : ''}`} onClick={() => setActiveView('logistics')}><Truck size={20} /> Logística</button>
        </nav>
      </aside>
      <main className="main-content">
        <header className="header"><div><h1>{titles[activeView]}</h1><p>Período: {data.period} · actualizado {generatedLabel}</p></div><div className="public-badge"><AlertTriangle size={18} /> Resumen público</div></header>
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'alerts' && renderAlerts()}
        {activeView === 'logistics' && renderLogistics()}
      </main>
    </div>
  );
}

export default App;
