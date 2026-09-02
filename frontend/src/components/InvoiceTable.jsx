import React, { useState, useRef } from 'react';
import { Search, CheckCircle, AlertCircle, XCircle, ExternalLink, FileText, MessageSquareText, Trash2, Calendar, X } from 'lucide-react';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';
import { deleteInvoice } from '../services/api';

export default function InvoiceTable({ invoices = [], onInvoiceUpdated }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');
  
  // 📅 Estados para el filtro por Rango de Fechas (YYYY-MM-DD)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

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

  // Formateador de Fecha Emisión
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

  // 🕒 Formateador de Fecha y Hora de Carga al Sistema
  const formatFechaHoraCarga = (fechaStr) => {
    if (!fechaStr) return 'N/A';
    const dateObj = new Date(fechaStr);
    if (isNaN(dateObj.getTime())) return 'N/A';

    return dateObj.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Manejo de eliminación
  const handleDelete = async (e, id) => {
    e.stopPropagation();

    if (!window.confirm('¿Estás seguro de que deseas eliminar esta factura de la base de datos?')) {
      return;
    }

    try {
      const result = await deleteInvoice(id);

      if (result.success) {
        if (onInvoiceUpdated) {
          onInvoiceUpdated();
        }
      } else {
        alert(result.error || result.message || 'No se pudo eliminar la factura.');
      }
    } catch (error) {
      console.error('Error al eliminar la factura:', error);
      alert('Error de conexión al intentar eliminar la factura.');
    }
  };

  // 🔍 Filtro en tiempo real por Rango de Fechas de CARGA (`created_at`)
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

    // 📅 Lógica del filtro por Rango
    let matchesRange = true;
    const rawUploadDate = inv.created_at || inv.uploaded_at;

    if (rawUploadDate) {
      const uploadDateFormatted = String(rawUploadDate).split('T')[0]; // 'YYYY-MM-DD'

      if (startDate && uploadDateFormatted < startDate) {
        matchesRange = false;
      }
      if (endDate && uploadDateFormatted > endDate) {
        matchesRange = false;
      }
    } else if (startDate || endDate) {
      matchesRange = false;
    }

    return matchesSearch && matchesCategory && matchesRange;
  });

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

      <div className="table-controls" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Input de Búsqueda */}
        <div className="search-wrapper" style={{ position: 'relative', flex: 2, minWidth: '220px' }}>
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


         {/* 📅 Selector por Rango de Fechas */}
<div 
  style={{ 
    display: 'inline-flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0.4rem 0.75rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    gap: '0.25rem'
  }}
>
  {/* Icono Principal */}
  <Calendar size={17} style={{ color: '#0284c7', marginRight: '4px', flexShrink: 0 }} />

  {/* CSS Inline para ocultar el icono nativo del navegador que descentra el input */}
  <style>{`
    .custom-date-input::-webkit-calendar-picker-indicator {
      display: none;
      -webkit-appearance: none;
    }
  `}</style>
  
  {/* Fecha Inicio */}
  <input 
    ref={startInputRef}
    type="date" 
    className="custom-date-input"
    value={startDate}
    onChange={(e) => setStartDate(e.target.value)}
    onClick={() => startInputRef.current?.showPicker && startInputRef.current.showPicker()}
    style={{ 
      border: 'none',
      outline: 'none',
      fontSize: '0.825rem',
      color: '#334155',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontFamily: 'inherit',
      width: '117px',
      textAlign: 'center',
      padding: 0
    }}
    title="Fecha inicial de carga"
  />

  <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold', userSelect: 'none', padding: '0 2px' }}>
    a
  </span>

  {/* Fecha Fin */}
  <input 
    ref={endInputRef}
    type="date" 
    className="custom-date-input"
    value={endDate}
    min={startDate}
    onChange={(e) => setEndDate(e.target.value)}
    onClick={() => endInputRef.current?.showPicker && endInputRef.current.showPicker()}
    style={{ 
      border: 'none',
      outline: 'none',
      fontSize: '0.825rem',
      color: '#334155',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontFamily: 'inherit',
      width: '117px',
      textAlign: 'center',
      padding: 0
    }}
    title="Fecha final de carga"
  />

  {/* Botón para Limpiar (mantiene el espacio o aparece sin desajustar) */}
  {(startDate || endDate) && (
    <button 
      onClick={() => {
        setStartDate('');
        setEndDate('');
      }}
      style={{
        border: 'none',
        background: 'transparent',
        color: '#94a3b8',
        cursor: 'pointer',
        padding: '0 0 0 4px',
        display: 'flex',
        alignItems: 'center'
      }}
      title="Limpiar rango"
    >
      <X size={15} />
    </button>
  )}
</div>

        {/* Selector de Categoría */}
        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="select-filter"
          style={{ flex: 1, minWidth: '160px' }}
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
              <th>Fecha y Hora Carga</th>
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
                const fechaEmision = inv.fecha_emision || inv.issueDate;
                const fechaCarga = inv.created_at || inv.uploaded_at;
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
                    <td>{formatFechaExacta(fechaEmision)}</td>
                    
                    <td style={{ fontSize: '0.75rem', color: '#475569aa', whiteSpace: 'nowrap' }}>
                      {formatFechaHoraCarga(fechaCarga)}
                    </td>

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
                <td colSpan="11" style={{ textAlign: 'center', color: '#94a3b8', padding: '2.5rem' }}>
                  <FileText size={32} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.5 }} />
                  No se encontraron facturas dentro del rango de fechas seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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