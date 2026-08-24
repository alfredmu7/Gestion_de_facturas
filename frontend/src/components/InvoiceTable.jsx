import React, { useState } from 'react';
import { Search, CheckCircle, AlertCircle, XCircle, ExternalLink, FileText, MessageSquareText, Trash2 } from 'lucide-react';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';

export default function InvoiceTable({ invoices = [], onInvoiceUpdated }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

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
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
  };

  // Formateador de fecha
  const formatFechaExacta = (fechaStr) => {
    if (!fechaStr) return 'N/A';
    const cleanDate = String(fechaStr).split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return new Date(fechaStr).toLocaleDateString('es-CO');
  };

  // Manejo de eliminación
  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Evita abrir el modal al hacer clic en borrar

    if (!window.confirm('¿Estás seguro de que deseas eliminar esta factura de la base de datos?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/invoices/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (onInvoiceUpdated) {
          onInvoiceUpdated(); // Refresca la lista y métricas en el componente padre
        }
      } else {
        alert(result.error || 'No se pudo eliminar la factura.');
      }
    } catch (error) {
      console.error('Error al eliminar la factura:', error);
      alert('Error de conexión al intentar eliminar la factura.');
    }
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
              <th>Propina</th>
              <th>Estado Auditoría</th>
              <th>Interacción</th>
              <th>Comprobante</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv, index) => {
                const comprobanteUrl = getComprobanteUrl(inv);
                const fecha = inv.fecha_emision || inv.issueDate || inv.created_at;
                const estado = (inv.estado_auditoria || inv.auditStatus || '').toUpperCase();
                const isRevision = estado === 'REQUIERE_REVISION' || estado === 'REVISION';

                return (
                  <tr 
                    key={inv.id || index}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedInvoice(inv)}
                  >
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
                    <td style={{ color: Number(inv.propina) > 0 ? '#059669' : '#94a3b8' }}>
                      {inv.propina ? formatMonto(inv.propina) : '$0'}
                    </td>
                    
                    <td>{renderBadge(inv.estado_auditoria || inv.auditStatus)}</td>
                    <td>
                      <button 
                        className={`action-btn ${isRevision ? 'btn-revision' : 'btn-detail'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInvoice(inv);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          backgroundColor: isRevision ? '#fef3c7' : '#e0f2fe',
                          color: isRevision ? '#b45309' : '#0369a1'
                        }}
                      >
                        <MessageSquareText size={14} />
                        {isRevision ? 'Aclarar al Agente' : 'Agente'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {comprobanteUrl ? (
                        <a 
                          href={comprobanteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: '#0284c7', display: 'inline-flex', alignItems: 'center' }}
                          title="Ver documento original"
                        >
                          <ExternalLink size={18} />
                        </a>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={(e) => handleDelete(e, inv.id)}
                        title="Eliminar factura"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', color: '#94a3b8', padding: '2.5rem' }}>
                  <FileText size={32} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.5 }} />
                  No se encontraron facturas con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🤖 MODAL INTERACTIVO CON AGENTE 3 (MEDIADOR) */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onInvoiceUpdated={(updatedInvoice) => {
            if (onInvoiceUpdated) onInvoiceUpdated(updatedInvoice);
            if (updatedInvoice) {
              setSelectedInvoice(updatedInvoice);
            }
          }}
        />
      )}
    </div>
  );
}