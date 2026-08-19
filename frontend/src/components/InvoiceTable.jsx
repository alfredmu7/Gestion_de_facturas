import React, { useState } from 'react';
import { Search, CheckCircle, AlertCircle, XCircle, ExternalLink, FileText } from 'lucide-react';

export default function InvoiceTable({ invoices = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');

  // Normalización flexible para campos de Supabase / Backend
  const getProveedor = (inv) => inv.proveedor || inv.nombre_proveedor || inv.vendorName || 'Desconocido';
  const getNumeroFactura = (inv) => inv.numero_factura || inv.invoiceNumber || 'N/A';
  const getComprobanteUrl = (inv) => inv.archivo_url || inv.url_imagen || inv.fileUrl || inv.file_url;

  // Normalizador de categoría
  const getCategoryRaw = (inv) => inv.categoria || inv.category || 'SIN CATEGORÍA';
  const getCategoryNormalized = (inv) => {
    const cat = getCategoryRaw(inv);
    return cat
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quita tildes para evitar descalces como CATEGORÍA vs CATEGORIA
      .replace(/\s+/g, '_');
  };

  // Formateador de fecha que evita el desfase de 1 día por zona horaria UTC
  const formatFechaExacta = (fechaStr) => {
    if (!fechaStr) return 'N/A';
    // Si viene en formato ISO (YYYY-MM-DD), extrae año, mes y día limpios
    const cleanDate = String(fechaStr).split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return new Date(fechaStr).toLocaleDateString('es-CO');
  };

  // Filtro en tiempo real
  const filteredInvoices = invoices.filter(inv => {
    const proveedorText = getProveedor(inv).toLowerCase();
    const numeroText = getNumeroFactura(inv).toLowerCase();
    const categoryText = getCategoryRaw(inv).toLowerCase();
    const searchLower = searchTerm.toLowerCase().trim();

    const matchesSearch = proveedorText.includes(searchLower) || 
                          numeroText.includes(searchLower) || 
                          categoryText.includes(searchLower);
    
    const currentCategory = getCategoryNormalized(inv);
    const matchesCategory = categoryFilter === 'TODAS' || currentCategory === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Renderizado de badges de estado
  const renderBadge = (estado) => {
    const estadoNormalized = (estado || '').toUpperCase();

    switch (estadoNormalized) {
      case 'APROBADA':
      case 'APROBADO':
      case 'VALID':
        return <span className="badge aprobada"><CheckCircle size={14} /> Aprobada</span>;
      case 'REQUIERE_REVISION':
      case 'REVISION':
      case 'WARNING':
        return <span className="badge revision"><AlertCircle size={14} /> Revisión</span>;
      case 'RECHAZADA':
      case 'RECHAZADO':
        return <span className="badge rechazada"><XCircle size={14} /> Rechazada</span>;
      default:
        return <span className="badge revision">Pendiente</span>;
    }
  };

  // Formateador de moneda COP
  const formatMonto = (monto) => {
    const num = parseFloat(monto);
    if (isNaN(num)) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="content-card">
      <div className="card-header">
        <h2 className="card-title">Facturas Registradas y Auditadas</h2>
        <span className="count-badge">{filteredInvoices.length} resultados</span>
      </div>

      <div className="table-controls">
        <div className="search-wrapper" style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Buscar por proveedor, N° factura o categoría..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>

        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="select-filter"
        >
          <option value="TODAS">Todas las categorías</option>
          <option value="INVENTARIO">Inventario</option>
          <option value="GASTO_OPERATIVO">Gasto Operativo</option>
          <option value="INSUMOS">Insumos</option>
          <option value="ACTIVO_FIJO">Activo Fijo</option>
          <option value="OTROS">Otros</option>
          <option value="SIN_CATEGORIA">Sin Categoría</option>
        </select>
      </div>

      <div className="table-container">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>N° Factura</th>
              <th>Fecha Emisión</th>
              <th>Categoría</th>
              <th>Monto Total</th>
              <th>Estado Auditoría</th>
              <th>Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv, index) => {
                const comprobanteUrl = getComprobanteUrl(inv);
                const fecha = inv.fecha_emision || inv.issueDate || inv.created_at;

                return (
                  <tr key={inv.id || index}>
                    <td><strong>{getProveedor(inv)}</strong></td>
                    <td>{getNumeroFactura(inv)}</td>
                    <td>{formatFechaExacta(fecha)}</td>
                    <td>
                      <span className="category-badge">
                        {getCategoryRaw(inv)}
                      </span>
                    </td>
                    <td className="monto-cell">
                      {formatMonto(inv.monto_total ?? inv.totalAmount ?? inv.total)}
                    </td>
                    <td>{renderBadge(inv.estado_auditoria || inv.auditStatus)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {comprobanteUrl ? (
                        <a 
                          href={comprobanteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: '#0284c7', display: 'inline-flex', alignItems: 'center' }}
                          title="Ver documento original"
                        >
                          <ExternalLink size={18} />
                        </a>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '2.5rem' }}>
                  <FileText size={32} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.5 }} />
                  No se encontraron facturas con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}