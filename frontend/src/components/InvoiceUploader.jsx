import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Image, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { uploadInvoice } from '../services/api'; // 👈 Importamos la función de la API

export default function InvoiceUploader({ onInvoiceProcessed }) {
  const [queue, setQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Maneja la selección o arrastre de PDFs e Imágenes
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
      error: null
    }));

    setQueue(prev => [...prev, ...newItems]);
  };

  // Eventos de Drag & Drop
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

  // Procesa cada archivo de la cola de forma secuencial
  const processBatch = async () => {
    if (isProcessing || queue.length === 0) return;
    setIsProcessing(true);

    const pendingItems = queue.filter(item => item.status === 'pending');

    for (const item of pendingItems) {
      // 1. Cambiar estado a 'processing'
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'processing' } : q));

      try {
        // 2. Usar uploadInvoice del servicio API (conecta automáticamente a Render)
        const data = await uploadInvoice(item.file);

        // 3. Cambiar estado a 'completed'
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed' } : q));

        // 4. Notificar al Dashboard
        if (onInvoiceProcessed) {
          onInvoiceProcessed(data.data);
        }
      } catch (err) {
        console.error(`Error en ${item.name}:`, err);
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', error: err.message } : q));
      }
    }

    setIsProcessing(false);
  };

  return (
    <div className="content-card">
      {/* Zona Drag & Drop */}
      <div 
        className={`upload-label ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ cursor: 'pointer', border: '2px dashed #0284c7', padding: '2rem', textAlign: 'center', borderRadius: '8px' }}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp" 
          multiple
          onChange={(e) => handleFilesSelect(e.target.files)} 
          style={{ display: 'none' }} 
        />
        <UploadCloud size={40} color="#0284c7" />
        <span className="upload-text" style={{ display: 'block', marginTop: '10px' }}>
          Arrastra fotos o PDFs de tus facturas aquí o haz clic para seleccionar varios a la vez
        </span>
      </div>

      {/* Lista de procesamiento en lote */}
      {queue.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <strong>Facturas en Cola ({queue.filter(i => i.status === 'completed').length} / {queue.length})</strong>
            <button 
              onClick={processBatch} 
              disabled={isProcessing || !queue.some(i => i.status === 'pending')}
              className="submit-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', cursor: 'pointer' }}
            >
              {isProcessing ? (
                <><Loader2 className="spin" size={18} /> Procesando Lote...</>
              ) : (
                <><Sparkles size={18} /> Procesar Facturas con IA</>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {queue.map((item) => (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '10px 14px', 
                  backgroundColor: '#f8fafc', 
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {item.isImage ? (
                    <Image size={20} color="#0284c7" />
                  ) : (
                    <FileText size={20} color="#0284c7" />
                  )}
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{item.size}</div>
                  </div>
                </div>

                <div>
                  {item.status === 'pending' && <span style={{ color: '#64748b', fontSize: '13px' }}>Pendiente</span>}
                  {item.status === 'processing' && (
                    <span style={{ color: '#0284c7', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Loader2 className="spin" size={14} /> Analizando...
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <span style={{ color: '#16a34a', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> Listo
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span style={{ color: '#dc2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={14} /> Error
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}