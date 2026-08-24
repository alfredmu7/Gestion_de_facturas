import React from 'react';
import { 
  DollarSign, 
  FileCheck2, 
  AlertTriangle, 
  Tag, 
  PieChart as PieIcon 
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export default function MetricsHeader({ invoices = [] }) {
  // Totales generales
  const totalInvoices = invoices.length;
  
  const totalAmount = invoices.reduce((acc, inv) => {
    return acc + (Number(inv.monto_total) || 0);
  }, 0);

  const pendingReview = invoices.filter(
    inv => inv.estado_auditoria === 'REQUIERE_REVISION'
  ).length;

  // Agrupación por categorías
  const categoryStats = invoices.reduce((acc, inv) => {
    const cat = inv.categoria || 'OTROS';
    const amount = Number(inv.monto_total) || 0;

    if (!acc[cat]) {
      acc[cat] = { count: 0, total: 0 };
    }
    acc[cat].count += 1;
    acc[cat].total += amount;
    return acc;
  }, {});

  const chartData = Object.keys(categoryStats).map(catName => ({
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
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '1.25rem', 
        width: '100%' 
      }}>
        {/* Tarjeta Gasto Total */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            backgroundColor: '#eff6ff',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Gasto Total</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0.1rem 0 0 0' }}>
              {formatCurrency(totalAmount)}
            </h3>
          </div>
        </div>

        {/* Tarjeta Total Facturas */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            backgroundColor: '#ecfdf5',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileCheck2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Total Facturas</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0.1rem 0 0 0' }}>
              {totalInvoices}
            </h3>
          </div>
        </div>

        {/* Tarjeta Requieren Revisión */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            backgroundColor: '#fffbebfb',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Requieren Revisión</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0.1rem 0 0 0' }}>
              {pendingReview}
            </h3>
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN INFERIOR DE DESGLOSE Y GRÁFICO */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1.2fr', 
        gap: '1.25rem', 
        width: '100%' 
      }}>
        {/* Lista Desglose por Categoría */}
<div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
  <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <Tag size={18} /> Desglose por Categoría
  </h4>

  {Object.keys(categoryStats).length === 0 ? (
    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay facturas registradas.</p>
  ) : (
    Object.entries(categoryStats).map(([cat, stats], index) => (
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
        {/* 📌 ALINEACIÓN ESTRUCTURAL DIRECTA */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
          <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem', margin: 0, padding: 0, lineHeight: 1.2 }}>
            {cat}
          </span>
          <span style={{ color: '#64748b', fontSize: '0.8rem', margin: 0, padding: 0, lineHeight: 1.2 }}>
            {stats.count} {stats.count === 1 ? 'factura' : 'facturas'}
          </span>
        </div>

        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
          {formatCurrency(stats.total)}
        </span>
      </div>
    ))
  )}
</div>

        {/* Gráfico Distribución de Gastos */}
<div style={{ 
  backgroundColor: '#fff', 
  borderRadius: '12px', 
  padding: '1.25rem', 
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between'
}}>
  <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <PieIcon size={18} /> Distribución de Gastos
  </h4>

  {chartData.length === 0 ? (
    <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
      Sin datos para graficar
    </div>
  ) : (
    /* Aumentamos la altura del contenedor a 320px */
    <div style={{ width: '100%', height: '320px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            /* Ampliamos el grosor y tamaño del círculo */
            innerRadius={70}
            outerRadius={110}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
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

    </div>
  );
}