import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, MessageSquare, Settings, ShieldCheck, LogOut, User } from 'lucide-react';
import MetricsHeader from '../components/MetricsHeader';
import InvoiceUploader from '../components/InvoiceUploader';
import InvoiceTable from '../components/InvoiceTable';
import WhatsAppChannel from '../components/WhatsAppLinker';
import { getInvoiceHistory } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import '../styles/Dashboard.css';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  const fetchInvoices = async () => {
    try {
      const data = await getInvoiceHistory();
      const invoiceList = Array.isArray(data) ? data : (data?.data || []);
      setInvoices(invoiceList);
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleInvoiceProcessed = () => {
    fetchInvoices();
  };

  return (
    <div className="dashboard-container">
      
      {/* Sidebar de Navegación */}
      <aside className="sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
          <div>
            <div className="sidebar-logo">
              <ShieldCheck size={28} />
              <span>Gestor de Facturas</span>
            </div>

            <ul className="sidebar-menu">
              <li 
                className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutDashboard size={18} /> Dashboard
              </li>
              <li 
                className={`menu-item ${activeTab === 'invoices' ? 'active' : ''}`}
                onClick={() => setActiveTab('invoices')}
              >
                <FileText size={18} /> Mis Facturas
              </li>
              <li 
                className={`menu-item ${activeTab === 'whatsapp' ? 'active' : ''}`}
                onClick={() => setActiveTab('whatsapp')}
              >
                <MessageSquare size={18} /> Canal WhatsApp
              </li>
              <li 
                className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <Settings size={18} /> Ajustes
              </li>
            </ul>
          </div>

          {/* Perfil de Usuario y Logout */}
          <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0' }}>
            {user && (
              <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} color="#64748b" />
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.nombre || 'Usuario'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.email}
                  </p>
                </div>
              </div>
            )}
            
            <button 
              onClick={logout} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.6rem 1rem',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.85rem'
              }}
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="main-content">
        
        {/* VISTA 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <>
            <header className="page-header">
              <h1 className="page-title">Panel de Control de Facturación</h1>
              <p className="page-subtitle">Gestión de facturación, auditoría de agentes y organización automatizada.</p>
            </header>

            {/* Matriz de Métricas e Indicadores Generales */}
            <MetricsHeader invoices={invoices} />

            {/* Carga e Ingestión de Facturas */}
            <InvoiceUploader onInvoiceProcessed={handleInvoiceProcessed} />

            {/* Tabla Principal con Mediación de Agentes */}
            <InvoiceTable invoices={invoices} onInvoiceUpdated={handleInvoiceProcessed} />
          </>
        )}

        {/* VISTA 2: MIS FACTURAS */}
        {activeTab === 'invoices' && (
          <>
            <header className="page-header">
              <h1 className="page-title">Mis Facturas</h1>
              <p className="page-subtitle">Historial completo de documentos cargados y procesados.</p>
            </header>
            <InvoiceTable invoices={invoices} onInvoiceUpdated={handleInvoiceProcessed} />
          </>
        )}

        {/* VISTA 3: CANAL WHATSAPP */}
        {activeTab === 'whatsapp' && (
          <WhatsAppChannel />
        )}

        {/* VISTA 4: AJUSTES */}
        {activeTab === 'settings' && (
          <>
            <header className="page-header">
              <h1 className="page-title">Ajustes del Sistema</h1>
              <p className="page-subtitle">Configura reglas de auditoría y claves de API.</p>
            </header>
            <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '12px', marginTop: '1rem' }}>
              <h3>Configuración General</h3>
              <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
                Opciones del agente Gemini AI, almacenamiento en Supabase y notificaciones.
              </p>
            </div>
          </>
        )}

      </main>

    </div>
  );
};

export default DashboardPage;