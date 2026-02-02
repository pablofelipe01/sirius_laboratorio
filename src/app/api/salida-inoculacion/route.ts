import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configuración de Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID!);

export async function POST(request: NextRequest) {
  try {
    console.log('📦 API SALIDA-INOCULACION: Iniciando registro...');
    
    const body = await request.json();
    const { 
      fechaEvento, 
      cantidadBolsas, 
      loteAlteradoId,
      cepaId,
      userName,
      idResponsableCore
    } = body;
    
    console.log('🔍 Datos recibidos:', { 
      fechaEvento, 
      cantidadBolsas, 
      loteAlteradoId,
      cepaId,
      userName,
      idResponsableCore
    });
    
    if (!fechaEvento || !cantidadBolsas || !loteAlteradoId || !cepaId) {
      return NextResponse.json({
        success: false,
        error: 'Faltan datos requeridos: fechaEvento, cantidadBolsas, loteAlteradoId, cepaId'
      }, { status: 400 });
    }
    
    // Crear el registro en la tabla Salida Inoculacion
    const record = await base(process.env.AIRTABLE_TABLE_SALIDA_INOCULACION || 'tblFYgPP3LS9lo5J4').create({
      'Fecha Evento': fechaEvento,
      'Cantidad Bolsas': parseInt(cantidadBolsas),
      'Lote Alterado': [loteAlteradoId],
      'Cepas': [cepaId], // Vincular con la cepa creada
      'Realiza Registro': userName || 'Usuario Desconocido',
      'ID Responsable Core': idResponsableCore || '' // Código del usuario (SIRIUS-PER-XXXX)
      // Nota: No incluimos Descartes ni Cosecha Laboratorio porque es conversión a cepas
    });
    
    console.log('✅ Salida de inoculación registrada:', record.id);
    
    return NextResponse.json({
      success: true,
      recordId: record.id,
      message: `Salida de ${cantidadBolsas} bolsas registrada del lote de inoculación por ${userName || 'Usuario Desconocido'}`
    });

  } catch (error) {
    console.error('❌ Error en API salida-inoculacion:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al registrar salida de inoculación',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
