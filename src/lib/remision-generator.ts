/**
 * Generador de documentos HTML para remisiones
 */

export interface ProductoRemision {
  nombre: string;
  cantidad: number;
  unidad: string;
}

export interface DatosRemision {
  idRemision: string;
  numeracion: number;
  fechaRemision: string;
  cliente: string;
  idCliente: string;
  idPedido: string;
  productos: ProductoRemision[];
  responsableEntrega: string;
  transportista?: {
    nombre: string;
    cedula: string;
    fechaFirma?: string;
  };
  receptor?: {
    nombre: string;
    cedula: string;
    fechaFirma?: string;
  };
  areaOrigen: string;
  notas?: string;
  urlFirmaReceptor?: string;
}

/**
 * Genera el documento HTML de la remisión
 */
export function generarDocumentoRemision(datos: DatosRemision): string {
  const fechaActual = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const horaActual = new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalCantidad = datos.productos.reduce((sum, p) => sum + p.cantidad, 0);

  const productosHTML = datos.productos.map((producto, index) => `
    <tr>
      <td style="padding: 12px; text-align: center; border: 1px solid #e0e0e0;">${index + 1}</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">${producto.nombre}</td>
      <td style="padding: 12px; text-align: center; border: 1px solid #e0e0e0;">${producto.cantidad}</td>
      <td style="padding: 12px; text-align: center; border: 1px solid #e0e0e0;">${producto.unidad}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Remisión ${datos.idRemision}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 30px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo-section h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    
    .logo-section p {
      font-size: 12px;
      opacity: 0.8;
    }
    
    .remision-number {
      text-align: right;
    }
    
    .remision-number .label {
      font-size: 12px;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .remision-number .number {
      font-size: 28px;
      font-weight: 700;
      color: #4ade80;
    }
    
    .content {
      padding: 40px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .info-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid #4ade80;
    }
    
    .info-card.full-width {
      grid-column: 1 / -1;
    }
    
    .info-card h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 8px;
    }
    
    .info-card p {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin: 30px 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section-title::before {
      content: '';
      width: 4px;
      height: 20px;
      background: #4ade80;
      border-radius: 2px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border-radius: 12px;
      overflow: hidden;
    }
    
    thead {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }
    
    thead th {
      padding: 15px;
      text-align: left;
      color: white;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    
    tbody tr:hover {
      background: #e0f2fe;
    }
    
    .total-row {
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%) !important;
    }
    
    .total-row td {
      color: white;
      font-weight: 700;
      padding: 15px;
    }
    
    .signatures {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 40px;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #e2e8f0;
    }
    
    .signature-box {
      text-align: center;
    }
    
    .signature-line {
      border-top: 2px solid #1e293b;
      margin-top: 60px;
      padding-top: 10px;
    }
    
    .signature-box h4 {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 5px;
    }
    
    .signature-box p {
      font-size: 12px;
      color: #64748b;
    }
    
    .footer {
      background: #f8fafc;
      padding: 20px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
    }
    
    .footer-info {
      font-size: 11px;
      color: #64748b;
    }
    
    .badge {
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .notes {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 20px;
      margin-top: 20px;
    }
    
    .notes h4 {
      color: #b45309;
      font-size: 14px;
      margin-bottom: 10px;
    }
    
    .notes p {
      color: #92400e;
      font-size: 14px;
      line-height: 1.6;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-section">
        <h1>SIRIUS REGENERATIVE SOLUTIONS</h1>
        <p>S.A.S. ZOMAC | NIT: 901.234.567-8</p>
      </div>
      <div class="remision-number">
        <div class="label">Remisión No.</div>
        <div class="number">${datos.numeracion.toString().padStart(3, '0')}</div>
      </div>
    </div>
    
    <div class="content">
      <div class="info-grid">
        <div class="info-card">
          <h3>Cliente</h3>
          <p>${datos.cliente}</p>
        </div>
        <div class="info-card">
          <h3>Código Cliente</h3>
          <p>${datos.idCliente}</p>
        </div>
        <div class="info-card">
          <h3>Fecha de Remisión</h3>
          <p>${fechaActual}</p>
        </div>
        <div class="info-card">
          <h3>Hora</h3>
          <p>${horaActual}</p>
        </div>
        <div class="info-card">
          <h3>ID Remisión</h3>
          <p>${datos.idRemision}</p>
        </div>
        <div class="info-card">
          <h3>Pedido Relacionado</h3>
          <p>${datos.idPedido}</p>
        </div>
        <div class="info-card">
          <h3>Área de Origen</h3>
          <p>${datos.areaOrigen}</p>
        </div>
        <div class="info-card">
          <h3>Responsable de Entrega</h3>
          <p>${datos.responsableEntrega || 'No especificado'}</p>
        </div>
        ${datos.transportista ? `
        <div class="info-card full-width">
          <h3>🚚 Transportista</h3>
          <p>${datos.transportista.nombre} - CC: ${datos.transportista.cedula}</p>
          ${datos.transportista.fechaFirma ? `<small style="color: #10b981;">✓ Firmado el ${datos.transportista.fechaFirma}</small>` : ''}
        </div>
        ` : ''}
        ${datos.receptor ? `
        <div class="info-card full-width">
          <h3>📦 Receptor</h3>
          <p>${datos.receptor.nombre} - CC: ${datos.receptor.cedula}</p>
          ${datos.receptor.fechaFirma ? `<small style="color: #10b981;">✓ Recibido el ${datos.receptor.fechaFirma}</small>` : ''}
        </div>
        ` : ''}
      </div>
      
      <h2 class="section-title">Productos Despachados</h2>
      
      <table>
        <thead>
          <tr>
            <th style="width: 60px; text-align: center;">#</th>
            <th>Producto</th>
            <th style="width: 120px; text-align: center;">Cantidad</th>
            <th style="width: 100px; text-align: center;">Unidad</th>
          </tr>
        </thead>
        <tbody>
          ${productosHTML}
          <tr class="total-row">
            <td colspan="2" style="text-align: right;">TOTAL</td>
            <td style="text-align: center;">${totalCantidad.toFixed(2)}</td>
            <td style="text-align: center;">-</td>
          </tr>
        </tbody>
      </table>
      
      ${datos.notas ? `
      <div class="notes">
        <h4>📝 Notas</h4>
        <p>${datos.notas}</p>
      </div>
      ` : ''}
      
      ${!datos.receptor && datos.urlFirmaReceptor ? `
      <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-top: 30px; text-align: center;">
        <h3 style="color: #b45309; margin-bottom: 10px;">⏳ Pendiente de Recepción</h3>
        <p style="color: #92400e; margin-bottom: 15px;">Esta remisión está en tránsito. El receptor debe firmar al recibir.</p>
        <a href="${datos.urlFirmaReceptor}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Firmar Recepción →
        </a>
      </div>
      ` : datos.receptor ? `
      <div style="background: #d1fae5; border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin-top: 30px;">
        <h3 style="color: #047857; margin-bottom: 10px;">✓ Remisión Completada</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
          <div>
            <small style="color: #065f46; font-weight: 600;">Receptor</small>
            <p style="color: #047857; margin: 5px 0;"><strong>${datos.receptor.nombre}</strong></p>
            <small style="color: #065f46;">CC: ${datos.receptor.cedula}</small>
          </div>
          <div>
            <small style="color: #065f46; font-weight: 600;">Fecha de Recepción</small>
            <p style="color: #047857; margin: 5px 0;"><strong>${datos.receptor.fechaFirma || 'N/A'}</strong></p>
          </div>
        </div>
      </div>
      ` : ''}
    </div>
    </div>
    
    <div class="footer">
      <div class="footer-info">
        <p>Documento generado automáticamente por DataLab</p>
        <p>Fecha de generación: ${fechaActual} - ${horaActual}</p>
      </div>
      <span class="badge">✓ Documento Válido</span>
    </div>
  </div>
</body>
</html>
  `.trim();
}
