import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Image, CheckCircle2, AlertCircle, Loader2, Sparkles, Layers } from 'lucide-react';
import { uploadInvoice } from '../services/api';

// Etapas interactivas de procesamiento por factura
const STAGES = [
  { progress: 15, text: "Subiendo archivo al servidor..." },
  { progress: 40, text: "El agente está analizando el documento..." },
  { progress: 70, text: "Extrayendo montos, proveedores y fechas..." },
  { progress: 90, text: "Ejecutando reglas de auditoría y validación..." }
];

export default function InvoiceUploader({ onInvoiceProcessed }) {
  const [queue, setQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFilesSelect = (files) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];

    const validFiles = Array.from(files).filter(file => allowedTypes.includes(file.type));
    if (validFiles.length === 0) {
      alert("Por favor selecciona archivos PDF o imágenes (JPG, PNG, WEBP).");
      return;
    }

    const newItems = validFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      isImage: file.type.startsWith('image/'),
      status: 'pending', // 'pending' | 'processing' | 'completed' | 'error'
      progress: 0,
      stageText: 'En espera...',
      error: null
    }));

    setQueue(prev => [...prev, ...newItems]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const processBatch = async () => {
    if (isProcessing || queue.length === 0) return;
    setIsProcessing(true);

    const pendingItems = queue.filter(item => item.status === 'pending');

    for (const item of pendingItems) {
      // 1. Iniciar estado y primer paso
      setQueue(prev => prev.map(q => q.id === item.id ? { 
        ...q, 
        status: 'processing', 
        progress: STAGES[0].progress, 
        stageText: STAGES[0].text 
      } : q));

      // 2. Simulación de avance gradual del agente en segundo plano
      let stageIdx = 0;
      const interval = setInterval(() => {
        stageIdx++;
        if (stageIdx < STAGES.length) {
          setQueue(prev => prev.map(q => q.id === item.id ? { 
            ...q, 
            progress: STAGES[stageIdx].progress, 
            stageText: STAGES[stageIdx].text 
          } : q));
        }
      }, 1400);

      try {
        // 3. Envío real a la API
        const data = await uploadInvoice(item.file);
        clearInterval(interval);

        // 4. Finalización exitosa
        setQueue(prev => prev.map(q => q.id === item.id ? { 
          ...q, 
          status: 'completed', 
          progress: 100, 
          stageText: '¡Procesado e ingresado con éxito!' 
        } : q));

        if (onInvoiceProcessed) {
          onInvoiceProcessed(data.data);
        }
      } catch (err) {
        clearInterval(interval);
        console.error(`Error en ${item.name}:`, err);
        setQueue(prev => prev.map(q => q.id === item.id ? { 
          ...q, 
          status: 'error', 
          progress: 100, 
          stageText: 'Error durante el procesamiento', 
          error: err.message 
        } : q));
      }
    }

    setIsProcessing(false);
  };

  // Métricas del Lote Global
  const totalItems = queue.length;
  const completedItems = queue.filter(i => i.status === 'completed').length;
  const globalProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const currentProcessingItem = queue.find(i => i.status === 'processing');

  return (
    <div className="content-card" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
      
      {/* Zona Drag & Drop */}
      <div 
        className={`upload-label ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ 
          cursor: 'pointer', 
          border: '2px dashed #0284c7', 
          padding: '2rem', 
          textAlign: 'center', 
          borderRadius: '12px',
          backgroundColor: isDragging ? '#f0f9ff' : '#fafafa',
          transition: 'all 0.2s ease'
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp" 
          multiple
          onChange={(e) => handleFilesSelect(e.target.files)} 
          style={{ display: 'none' }} 
        />
        <UploadCloud size={40} color='#13a847' style={{ marginBottom: '8px' }} />
        <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
          Arrastra fotos o PDFs de tus facturas aquí o haz clic para seleccionar
        </span>
        <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
          Soporta PDFs, JPG, PNG y WEBP
        </span>
      </div>

      {/* Lista de Procesamiento y Barra General */}
      {queue.length > 0 && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Header del Lote & Botón Accionador */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '0.6rem', color: '#1e293ba2' }}>
                Cola de Procesamiento ({completedItems} de {totalItems} completadas)
              </strong>
            </div>

            <button 
              onClick={processBatch} 
              disabled={isProcessing || !queue.some(i => i.status === 'pending')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '0.9rem 1.25rem', 
                cursor: (isProcessing || !queue.some(i => i.status === 'pending')) ? 'not-allowed' : 'pointer', 
                borderRadius: '8px',
                backgroundColor: isProcessing ? '#bcbfc2' : '#13a847',
                color: '#fff',
                border: 'none',
                borderRadius: '25px',
                fontWeight: 600,
                fontSize: '0.8rem'
              }}
            >
              {isProcessing ? (
                <><Loader2 className="spin" size={18} /> Procesando Lote...</>
              ) : (
                <><Sparkles size={18} /> Procesar Facturas</>
              )}  
            </button>
          </div>

          {/* Banner Informativo Global cuando se procesa más de una factura */}
          {isProcessing && totalItems > 1 && (
            <div style={{ padding: '0.85rem 1rem', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Layers size={20} color="#0284c7" />
              <div style={{ fontSize: '0.85rem', color: '#1e40af' }}>
                <strong>Procesando lote en secuencia:</strong> Analizando documento actual. No cierres esta pestaña mientras el agente termina el lote.
              </div>
            </div>
          )}

          {/* Tarjetas Individuales por Factura */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {queue.map((item) => (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  padding: '0.85rem 1rem', 
                  backgroundColor: item.status === 'processing' ? '#f0f9ff' : '#f8fafc', 
                  borderRadius: '8px',
                  border: item.status === 'processing' ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                  gap: '0.5rem'
                }}
              >
                {/* Cabecera del Item */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.isImage ? <Image size={20} color='#13a847' /> : <FileText size={20} color="#0284c7" />}
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1e293b' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.size}</div>
                    </div>
                  </div>

                  {/* Estado Visual Integrado */}
                  <div>
                    {item.status === 'pending' && <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>En espera</span>}
                    {item.status === 'processing' && (
                      <span style={{ color: '#0284c7', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Loader2 className="spin" size={14} /> Analizando...
                      </span>
                    )}
                    {item.status === 'completed' && (
                      <span style={{ color: '#16a34a', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <CheckCircle2 size={14} /> Completado
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span style={{ color: '#dc2626', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <AlertCircle size={14} /> Error
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra de Progreso Dinámica y Texto Informativo del Agente */}
                {item.status === 'processing' && (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#0284c7', fontWeight: 500, marginBottom: '4px' }}>
                      <span>{item.stageText}</span>
                      <span>{item.progress}%</span>
                    </div>
                    {/* Contenedor de la Barra de Carga */}
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${item.progress}%`, 
                          height: '100%', 
                          backgroundColor: '#0284c7', 
                          borderRadius: '4px', 
                          transition: 'width 0.4s ease' 
                        }} 
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}