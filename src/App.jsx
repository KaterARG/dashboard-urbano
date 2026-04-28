import React, { useState } from 'react';
import { parseMasterExcel } from './utils/excelParser';
import { 
  LayoutDashboard, ShoppingBag, Package, Users, Settings, 
  Upload, TrendingUp, DollarSign, Activity, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Search, Truck
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

const COLORS = ['#a855f7', '#06b6d4', '#f97316', '#10b981'];

const MetricCard = ({ title, value, type, suffix = '' }) => {
  const isNegative = type === 'critical' && value > 10;
  return (
    <div className="glass-card">
      <div className="card-title">{title}</div>
      <div className="card-value">
        {type !== 'margin' && type !== 'critical' && '$'}
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix}
      </div>
      <div className={`card-trend ${isNegative ? 'trend-down' : 'trend-up'}`}>
        {isNegative ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
        <span>{isNegative ? 'Atención' : '+12.4%'}</span>
      </div>
    </div>
  );
};

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const result = parseMasterExcel(evt.target.result);
        setData(result);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err) {
        alert("Error al procesar el archivo: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const renderDashboard = () => {
    // Format logistics for pie chart
    const pieData = [
      { name: 'Mercado Envíos', value: data.charts.logistics['Mercado Envíos'].count },
      { name: 'Flex', value: data.charts.logistics['Flex'].count }
    ];

    return (
      <div className="fade-in">
        <div className="metrics-grid">
          <MetricCard title="Ventas Totales" value={data.metrics.sales} type="sales" />
          <MetricCard title="Ganancia Neta" value={data.metrics.profit} type="profit" />
          <MetricCard title="Margen Bruto" value={data.metrics.margin.toFixed(1)} suffix="%" type="margin" />
          <MetricCard title="Items Críticos" value={data.metrics.critical} type="critical" />
        </div>

        <div className="charts-container">
          <div className="glass-card" style={{height: '400px'}}>
            <div className="card-title">Ventas por Día</div>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={data.charts.salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip contentStyle={{background: '#16171d', border: '1px solid var(--card-border)', borderRadius: '12px'}} />
                <Line type="monotone" dataKey="value" stroke="var(--accent-purple)" strokeWidth={4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="glass-card" style={{height: '400px'}}>
            <div className="card-title">Volumen Logística</div>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="table-section">
          <div className="glass-card">
            <div className="card-title">Top Productos</div>
            <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '16px'}}>
              <thead>
                <tr style={{textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px'}}>
                  <th style={{paddingBottom: '12px'}}>PRODUCTO</th>
                  <th style={{paddingBottom: '12px', textAlign: 'right'}}>CANT.</th>
                  <th style={{paddingBottom: '12px', textAlign: 'right'}}>GANANCIA</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.slice(0, 5).map((p, i) => (
                  <tr key={i} style={{borderTop: '1px solid var(--card-border)'}}>
                    <td style={{padding: '12px 0', fontSize: '14px'}}>{p.name}</td>
                    <td style={{textAlign: 'right'}}>{p.qty}</td>
                    <td style={{textAlign: 'right', color: 'var(--accent-cyan)'}}>${Math.round(p.profit).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-card">
            <div className="card-title">Reposición Necesaria</div>
            <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '16px'}}>
              <thead>
                <tr style={{textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px'}}>
                  <th style={{paddingBottom: '12px'}}>SKU</th>
                  <th style={{paddingBottom: '12px', textAlign: 'right'}}>STOCK</th>
                  <th style={{paddingBottom: '12px', textAlign: 'right'}}>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {data.toRestock.slice(0, 5).map((p, i) => (
                  <tr key={i} style={{borderTop: '1px solid var(--card-border)'}}>
                    <td style={{padding: '12px 0', fontSize: '14px'}}>{p.sku}</td>
                    <td style={{textAlign: 'right'}}>{p.stock}</td>
                    <td style={{textAlign: 'right'}}><span style={{color: '#f97316', fontSize: '12px'}}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderInventory = () => (
    <div className="fade-in glass-card">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
        <h2 className="card-title">Inventario Completo</h2>
        <div style={{display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '8px'}}>
          <Search size={18} style={{marginRight: '8px', color: 'var(--text-muted)'}} />
          <input 
            type="text" 
            placeholder="Buscar producto..." 
            style={{background: 'none', border: 'none', color: 'white', outline: 'none'}}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <table style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead>
          <tr style={{textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px'}}>
            <th style={{padding: '12px'}}>SKU</th>
            <th style={{padding: '12px'}}>PRODUCTO</th>
            <th style={{padding: '12px', textAlign: 'right'}}>STOCK ACTUAL</th>
            <th style={{padding: '12px', textAlign: 'right'}}>STOCK MÍN.</th>
            <th style={{padding: '12px', textAlign: 'right'}}>ESTADO</th>
          </tr>
        </thead>
        <tbody>
          {data.fullInventory.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())).map((item, i) => (
            <tr key={i} style={{borderTop: '1px solid var(--card-border)'}}>
              <td style={{padding: '12px', fontSize: '13px'}}>{item.sku}</td>
              <td style={{padding: '12px', fontSize: '13px'}}>{item.name}</td>
              <td style={{padding: '12px', textAlign: 'right'}}>{item.stock}</td>
              <td style={{padding: '12px', textAlign: 'right'}}>{item.min}</td>
              <td style={{padding: '12px', textAlign: 'right'}}>
                <span style={{
                  color: item.status.includes('REPOSICIÓN') ? '#f97316' : '#10b981',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  background: item.status.includes('REPOSICIÓN') ? 'rgba(249,115,22,0.1)' : 'rgba(16,185,129,0.1)',
                  borderRadius: '6px'
                }}>
                  {item.status || 'OK'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSales = () => (
    <div className="fade-in glass-card">
      <h2 className="card-title">Historial Reciente de Ventas</h2>
      <table style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead>
          <tr style={{textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px'}}>
            <th style={{padding: '12px'}}>FECHA</th>
            <th style={{padding: '12px'}}>CLIENTE</th>
            <th style={{padding: '12px'}}>PRODUCTO</th>
            <th style={{padding: '12px', textAlign: 'right'}}>CANT.</th>
            <th style={{padding: '12px', textAlign: 'right'}}>TOTAL NETO</th>
          </tr>
        </thead>
        <tbody>
          {data.fullSales.map((sale, i) => (
            <tr key={i} style={{borderTop: '1px solid var(--card-border)'}}>
              <td style={{padding: '12px', fontSize: '13px'}}>{sale['Fecha Compra']}</td>
              <td style={{padding: '12px', fontSize: '13px'}}>{sale['Cliente']}</td>
              <td style={{padding: '12px', fontSize: '13px'}}>{sale['Producto']}</td>
              <td style={{padding: '12px', textAlign: 'right'}}>{sale['Cantidad']}</td>
              <td style={{padding: '12px', textAlign: 'right', fontWeight: 'bold'}}>${sale['Total Neto'].toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderClients = () => (
    <div className="fade-in metrics-grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'}}>
      {data.clients.map((client, i) => (
        <div key={i} className="glass-card" style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
          <div style={{width: '40px', height: '40px', background: 'var(--accent-purple)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>
            {client.name.charAt(0)}
          </div>
          <div>
            <div style={{fontWeight: 'bold'}}>{client.name}</div>
            <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>{client.orders} pedidos realizados</div>
            <div style={{fontSize: '14px', color: 'var(--accent-cyan)', fontWeight: 'bold', marginTop: '4px'}}>
              Total: ${client.totalBought.toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderLogistics = () => {
    const log = data.charts.logistics;
    return (
      <div className="fade-in space-y-8">
        <div className="metrics-grid">
          <MetricCard title="Gasto Mercado Envíos" value={log['Mercado Envíos'].total} type="sales" />
          <MetricCard title="Gasto Flex Total" value={log['Flex'].total} type="sales" />
          <MetricCard title="Gasto Flex Marina" value={log['Flex'].sub['Marina'].total} type="sales" />
          <MetricCard title="Gasto Flex LBS" value={log['Flex'].sub['LBS'].total} type="sales" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card">
            <div className="card-title">Distribución de Gastos</div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={[
                    { name: 'Mercado Envíos', value: log['Mercado Envíos'].total },
                    { name: 'Flex Marina', value: log['Flex'].sub['Marina'].total },
                    { name: 'Flex LBS', value: log['Flex'].sub['LBS'].total }
                  ]} 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card">
            <div className="card-title">Detalle de Envíos</div>
            <div style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Mercado Envíos ({log['Mercado Envíos'].count} envíos)</span>
                <span className="text-gradient font-bold">${log['Mercado Envíos'].total.toLocaleString()}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Flex Marina ({log['Flex'].sub['Marina'].count} envíos)</span>
                <span className="text-gradient font-bold">${log['Flex'].sub['Marina'].total.toLocaleString()}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Flex LBS ({log['Flex'].sub['LBS'].count} envíos)</span>
                <span className="text-gradient font-bold">${log['Flex'].sub['LBS'].total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section">
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
            <div className="logo-icon" style={{width: '60px', height: '60px', marginBottom: '12px'}}>
              <ShoppingBag size={30} style={{margin: '15px'}} />
            </div>
            <span style={{fontWeight: 800, fontSize: '18px', textAlign: 'center'}}>URBANO STORE</span>
          </div>
        </div>
        
        <div className="nav-links">
          <div className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>
            <LayoutDashboard size={20}/> Dashboard
          </div>
          <div className={`nav-item ${activeView === 'inventario' ? 'active' : ''}`} onClick={() => setActiveView('inventario')}>
            <Package size={20}/> Inventario
          </div>
          <div className={`nav-item ${activeView === 'ventas' ? 'active' : ''}`} onClick={() => setActiveView('ventas')}>
            <ShoppingBag size={20}/> Ventas
          </div>
          <div className={`nav-item ${activeView === 'logistica' ? 'active' : ''}`} onClick={() => setActiveView('logistica')}>
            <Truck size={20}/> Logística
          </div>
          <div className={`nav-item ${activeView === 'clientes' ? 'active' : ''}`} onClick={() => setActiveView('clientes')}>
            <Users size={20}/> Clientes
          </div>
          <div style={{marginTop: 'auto'}} className={`nav-item ${activeView === 'config' ? 'active' : ''}`} onClick={() => setActiveView('config')}>
            <Settings size={20}/> Configuración
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1 style={{fontSize: '28px', marginBottom: '4px'}}>
              {activeView === 'dashboard' ? 'Resumen de Negocio' : 
               activeView === 'inventario' ? 'Gestión de Stock' : 
               activeView === 'ventas' ? 'Historial de Ventas' : 
               activeView === 'logistica' ? 'Control de Logística' : 'Clientes'}
            </h1>
            <p style={{color: 'var(--text-muted)'}}>
              {lastUpdated ? `Última actualización: ${lastUpdated}` : 'Dashboard interactivo basado en tu Master Excel'}
            </p>
          </div>
          
          <label className="upload-btn">
            <input type="file" style={{display: 'none'}} onChange={handleFileUpload} />
            <Upload size={20} />
            <span>Actualizar Master</span>
          </label>
        </header>

        {loading ? (
          <div style={{display: 'flex', justifyContent: 'center', marginTop: '100px'}}>Cargando datos...</div>
        ) : data ? (
          <>
            {activeView === 'dashboard' && renderDashboard()}
            {activeView === 'inventario' && renderInventory()}
            {activeView === 'ventas' && renderSales()}
            {activeView === 'logistica' && renderLogistics()}
            {activeView === 'clientes' && renderClients()}
          </>
        ) : (
          <div className="glass-card" style={{textAlign: 'center', padding: '80px', borderStyle: 'dashed'}}>
            <Upload size={48} style={{color: 'var(--accent-purple)', marginBottom: '24px'}} />
            <h2 style={{fontSize: '24px', marginBottom: '12px'}}>Tu negocio en alta resolución</h2>
            <p style={{color: 'var(--text-muted)'}}>Sube tu Master Excel para ver la magia.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
