import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, MessageSquare, Settings, ShieldCheck } from 'lucide-react';
import MetricsHeader from './components/MetricsHeader';
import InvoiceUploader from './components/InvoiceUploader';
import InvoiceTable from './components/InvoiceTable';
import WhatsAppChannel from './components/WhatsAppLinker';
import './styles/Dashboard.css';

export default function App() {
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  const fetchInvoices = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/invoices/history');
      if (response.ok) {
        const data = await response.json();
        const invoiceList = Array.isArray(data) ? data : (data.data || []);
        setInvoices(invoiceList);
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  };

  useEffect(() => {
    fetchInvoices();

    // Sincronización automática cada 5 segundos
    const interval = setInterval(() => {
      fetchInvoices();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleInvoiceProcessed = () => {
    fetchInvoices();
  };

  return (
    <div className="dashboard-container">
      
      {/* Sidebar de Navegación */}
      <aside className="sidebar">
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
}