import React, { useMemo } from 'react';
import { 
  DollarSign, 
  FileCheck2, 
  AlertTriangle, 
  Tag, 
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export default function MetricsHeader({ invoices = [] }) {
  
  // 📊 Cálculo de Métricas y Comparativas Intermensuales
  const metrics = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((acc, inv) => acc + (Number(inv.monto_total) || 0), 0);
    const pendingReview = invoices.filter(inv => (inv.estado_auditoria || '').toUpperCase() === 'REQUIERE_REVISION').length;

    // Agrupación por Mes (YYYY-MM)
    const monthlyMap = {};
    invoices.forEach(inv => {
      const rawDate = inv.created_at || inv.fecha_emision || inv.issueDate;
      if (!rawDate) return;
      
      const monthKey = String(rawDate).substring(0, 7); // 'YYYY-MM'
      const amount = Number(inv.monto_total) || 0;

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { total: 0, count: 0 };
      }
      monthlyMap[monthKey].total += amount;
      monthlyMap[monthKey].count += 1;
    });

    const sortedMonths = Object.keys(monthlyMap).sort();
    const currentMonthKey = sortedMonths[sortedMonths.length - 1] || '';
    const prevMonthKey = sortedMonths[sortedMonths.length - 2] || '';

    const currentMonthData = monthlyMap[currentMonthKey] || { total: 0, count: 0 };
    const prevMonthData = monthlyMap[prevMonthKey] || { total: 0, count: 0 };

    // % Comparativo de Costos respecto al mes anterior
    let costDiffPercentage = 0;
    if (prevMonthData.total > 0) {
      costDiffPercentage = ((currentMonthData.total - prevMonthData.total) / prevMonthData.total) * 100;
    } else if (currentMonthData.total > 0) {
      costDiffPercentage = 100;
    }

    // Datos para gráfico histórico de costos por mes (Últimos 6 meses)
    const monthlyChartData = sortedMonths.slice(-6).map(key => {
      const [year, month] = key.split('-');
      const dateObj = new Date(year, parseInt(month) - 1, 1);
      const label = dateObj.toLocaleString('es-CO', { month: 'short' }).toUpperCase();
      return {
        month: label,
        monto: monthlyMap[key].total,
        facturas: monthlyMap[key].count
      };
    });

    return {
      totalInvoices,
      totalAmount,
      pendingReview,
      currentMonthData,
      prevMonthData,
      costDiffPercentage,
      monthlyChartData,
      currentMonthKey
    };
  }, [invoices]);

  // Agrupación por categorías
  const categoryStats = useMemo(() => {
    return invoices.reduce((acc, inv) => {
      const cat = inv.categoria || 'OTROS';
      const amount = Number(inv.monto_total) || 0;
      if (!acc[cat]) acc[cat] = { count: 0, total: 0 };
      acc[cat].count += 1;
      acc[cat].total += amount;
      return acc;
    }, {});
  }, [invoices]);

  const categoryChartData = Object.keys(categoryStats).map(catName => ({
    name: catName,
    value: categoryStats[catName].total,
    count: categoryStats[catName].count
  }));

  const formatCurrency = (val) => `$${val.toLocaleString('es-CO')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* 1. FILA DE TARJETAS DE MÉTRICAS PRINCIPALES */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '1rem', 
        width: '100%' 
      }}>
        
        {/* Tarjeta 1: Acumulado Histórico Total */}
        <div style={cardStyle}>
          <div style={{ ...iconContainerStyle, backgroundColor: '#eff6ff', color: '#3b82f6' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <span style={labelStyle}>Gasto Total Acumulado</span>
            <h3 style={valueStyle}>{formatCurrency(metrics.totalAmount)}</h3>
            <span style={subLabelStyle}>{metrics.totalInvoices} facturas registradas</span>
          </div>
        </div>

        {/* Tarjeta 2: Gastos del Mes Actual vs Anterior */}
        <div style={cardStyle}>
          <div style={{ ...iconContainerStyle, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <Calendar size={22} />
          </div>
          <div>
            <span style={labelStyle}>Gasto Mes Actual</span>
            <h3 style={valueStyle}>{formatCurrency(metrics.currentMonthData.total)}</h3>
            
            {/* Indicador de Balance */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              {metrics.costDiffPercentage >= 0 ? (
                <span style={{ ...badgeStyle, backgroundColor: '#fef2f2', color: '#dc2626' }}>
                  <TrendingUp size={12} /> +{metrics.costDiffPercentage.toFixed(1)}%
                </span>
              ) : (
                <span style={{ ...badgeStyle, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  <TrendingDown size={12} /> {metrics.costDiffPercentage.toFixed(1)}%
                </span>
              )}
              <span style={subLabelStyle}>vs mes anterior</span>
            </div>
          </div>
        </div>

        {/* Tarjeta 3: Facturas del Mes Actual vs General */}
        <div style={cardStyle}>
          <div style={{ ...iconContainerStyle, backgroundColor: '#faf5ff', color: '#9333ea' }}>
            <FileCheck2 size={22} />
          </div>
          <div>
            <span style={labelStyle}>Facturas del Mes</span>
            <h3 style={valueStyle}>{metrics.currentMonthData.count} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 400 }}>/ {metrics.totalInvoices} total</span></h3>
            <span style={subLabelStyle}>
              {metrics.prevMonthData.count} cargadas el mes pasado
            </span>
          </div>
        </div>

        {/* Tarjeta 4: Requieren Revisión */}
        <div style={cardStyle}>
          <div style={{ ...iconContainerStyle, backgroundColor: '#fffbebfb', color: '#f59e0b' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <span style={labelStyle}>Requieren Revisión</span>
            <h3 style={valueStyle}>{metrics.pendingReview}</h3>
            <span style={subLabelStyle}>Pendientes por aclaración</span>
          </div>
        </div>

      </div>

      {/* 2. SECCIÓN DE GRÁFICOS ANALÍTICOS (Costos por Mes & Categorías) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1.4fr 1fr', 
        gap: '1.25rem', 
        width: '100%' 
      }}>
        
        {/* Gráfico de Barras: Evolución de Costos Mensuales */}
        <div style={panelStyle}>
          <h4 style={panelTitleStyle}>
            <BarChart3 size={18} /> Costos Totales por Mes
          </h4>
          {metrics.monthlyChartData.length === 0 ? (
            <div style={emptyChartStyle}>Sin datos mensuales para mostrar</div>
          ) : (
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.monthlyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip 
                    formatter={(val) => [formatCurrency(val), 'Costo Total']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="monto" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Gráfico de Torta: Distribución por Categorías */}
        <div style={panelStyle}>
          <h4 style={panelTitleStyle}>
            <PieIcon size={18} /> Distribución de Gastos
          </h4>
          {categoryChartData.length === 0 ? (
            <div style={emptyChartStyle}>Sin datos de categorías</div>
          ) : (
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* 3. DESGLOSE DETALLADO POR CATEGORÍAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h4 style={panelTitleStyle}>
          <Tag size={18} /> Desglose por Categoría
        </h4>

        {Object.keys(categoryStats).length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay facturas registradas.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {Object.entries(categoryStats).map(([cat, stats], index) => (
              <div 
                key={cat} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.85rem 1.25rem', 
                  backgroundColor: '#fff', 
                  borderRadius: '12px', 
                  borderLeft: `5px solid ${COLORS[index % COLORS.length]}`,
                  borderTop: '1px solid #e2e8f0',
                  borderRight: '1px solid #e2e8f0',
                  borderBottom: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                    {cat}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    {stats.count} {stats.count === 1 ? 'factura' : 'facturas'}
                  </span>
                </div>

                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                  {formatCurrency(stats.total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// 🎨 Estilos Inline
const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  padding: '1rem 1.1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.85rem',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
};

const iconContainerStyle = {
  width: '44px',
  height: '44px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
};

const labelStyle = { fontSize: '0.8rem', color: '#64748b', fontWeight: 500, display: 'block' };
const valueStyle = { fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0.1rem 0' };
const subLabelStyle = { fontSize: '0.725rem', color: '#94a3b8' };

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  padding: '1px 6px',
  borderRadius: '4px',
  fontSize: '0.7rem',
  fontWeight: 700
};

const panelStyle = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  padding: '1.25rem',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
};

const panelTitleStyle = {
  margin: '0 0 1rem 0',
  color: '#1e293b',
  fontSize: '0.95rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
};

const emptyChartStyle = {
  height: '240px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#94a3b8'
};