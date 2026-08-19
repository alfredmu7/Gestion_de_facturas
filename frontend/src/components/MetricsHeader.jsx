//Cards de Balances y Porcentajes

import React from 'react';
import { DollarSign, FileCheck, AlertTriangle, Layers } from 'lucide-react';

export default function MetricsHeader({ invoices = [] }) {
  // Calculamos los totales dinámicamente desde los datos recibidos
  const totalMonto = invoices.reduce((acc, inv) => acc + (inv.monto_total || 0), 0);
  const totalAprobadas = invoices.filter(inv => inv.estado_auditoria === 'APROBADA').length;
  const totalRevision = invoices.filter(inv => inv.estado_auditoria === 'REQUIERE_REVISION' || inv.estado_auditoria === 'RECHAZADA').length;
  
  // Categoría con mayor gasto
  const categoriasCount = invoices.reduce((acc, inv) => {
    acc[inv.categoria] = (acc[inv.categoria] || 0) + (inv.monto_total || 0);
    return acc;
  }, {});

  const categoriaTop = Object.keys(categoriasCount).reduce((a, b) => 
    categoriasCount[a] > categoriasCount[b] ? a : b, 'N/A'
  );

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-icon blue">
          <DollarSign size={24} />
        </div>
        <div className="kpi-data">
          <span className="kpi-label">Balance Total Gastado</span>
          <span className="kpi-value">${totalMonto.toLocaleString()}</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon green">
          <FileCheck size={24} />
        </div>
        <div className="kpi-data">
          <span className="kpi-label">Facturas Auditadas</span>
          <span className="kpi-value">{totalAprobadas}</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon amber">
          <AlertTriangle size={24} />
        </div>
        <div className="kpi-data">
          <span className="kpi-label">Atención / Alertas</span>
          <span className="kpi-value">{totalRevision}</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon purple">
          <Layers size={24} />
        </div>
        <div className="kpi-data">
          <span className="kpi-label">Mayor Categoría</span>
          <span className="kpi-value">{categoriaTop}</span>
        </div>
      </div>
    </div>
  );
}