import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Validar configuración requerida
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID son requeridas');
}

// Configurar Airtable de forma segura
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

// IDs de las tablas
const DESCARTES_TABLE_ID = process.env.AIRTABLE_TABLE_DESCARTES;
const SALIDA_CEPAS_TABLE_ID = process.env.AIRTABLE_TABLE_SALIDA_CEPAS;
const SALIDA_INOCULACION_TABLE_ID = process.env.AIRTABLE_TABLE_SALIDA_INOCULACION;

interface DescarteData {
  tipoDescarte: 'cepas' | 'inoculacion';
  microorganismo: string;
  microorganismoId: string;
  loteId: string;
  cantidad: number;
  motivo: string;
  registradoPor: string;
  fechaDescarte: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: DescarteData = await request.json();
    
    console.log('🗑️ Iniciando proceso de descarte:', {
      tipo: data.tipoDescarte,
      microorganismo: data.microorganismo,
      loteId: data.loteId,
      cantidad: data.cantidad,
      registradoPor: data.registradoPor,
      timestamp: new Date().toISOString()
    });

    // Validar datos requeridos
    if (!data.tipoDescarte || !data.loteId || !data.cantidad || !data.motivo || !data.registradoPor) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: tipoDescarte, loteId, cantidad, motivo, registradoPor' },
        { status: 400 }
      );
    }

    // Validar variables de entorno
    if (!DESCARTES_TABLE_ID) {
      throw new Error('Missing AIRTABLE_TABLE_DESCARTES environment variable');
    }

    // PASO 1: Crear registro en tabla Descartes usando Field IDs de la documentación
    console.log('📝 Paso 1: Creando registro en tabla Descartes...');
    
    const descarteRecord = await base(DESCARTES_TABLE_ID).create([
      {
        fields: {
          // Usar Field IDs de la documentación
          'fldWXmSOZKaVFtOrs': data.fechaDescarte, // Fecha Evento
          'fldLT7eru7YlqbOTP': data.cantidad, // Cantidad Bolsas Descartadas
          'fldzfJDGjJxl8EHTg': data.motivo, // Motivo (aquí va la transcripción)
          'flde4tstaKVkiHdkY': data.registradoPor, // Realiza Registro
          // Los campos de Salida Inoculacion y Salida Cepas se llenarán después de crear el registro de salida
        }
      }
    ]);

    const descarteRecordId = descarteRecord[0].id;
    console.log('✅ Registro de descarte creado:', { descarteRecordId });

    // PASO 2: Crear registro en Salida Cepas o Salida Inoculacion según corresponda
    let salidaRecordId: string;
    
    if (data.tipoDescarte === 'cepas') {
      // Crear registro en Salida Cepas con Field IDs correctos de la documentación
      console.log('📝 Paso 2: Creando registro en Salida Cepas...');
      
      if (!SALIDA_CEPAS_TABLE_ID) {
        throw new Error('Missing AIRTABLE_TABLE_SALIDA_CEPAS environment variable');
      }

      const salidaCepasRecord = await base(SALIDA_CEPAS_TABLE_ID).create([
        {
          fields: {
            'fldG3F5RAJ9U8LjeV': data.fechaDescarte, // Fecha Evento
            'fldvZqru56XkTtjGi': data.cantidad, // Cantidad Bolsas
            'fldhF7oOqQhcP5tJr': [data.loteId], // Cepas (vincular con el lote de cepa)
            // El campo Descartes se llenará después cuando vinculemos ambos registros
          }
        }
      ]);
      
      salidaRecordId = salidaCepasRecord[0].id;
      console.log('✅ Registro en Salida Cepas creado:', { salidaRecordId });
      
      // PASO 3: Actualizar el registro de Descarte para vincular con Salida Cepas
      console.log('📝 Paso 3: Vinculando Descarte con Salida Cepas...');
      await base(DESCARTES_TABLE_ID).update([
        {
          id: descarteRecordId,
          fields: {
            'fldIE9yDJmZmniXpW': [salidaRecordId] // Salida Cepas (Field ID)
          }
        }
      ]);

      // PASO 4: Actualizar el registro de Salida Cepas para vincular con Descarte
      console.log('📝 Paso 4: Vinculando Salida Cepas con Descarte...');
      await base(SALIDA_CEPAS_TABLE_ID).update([
        {
          id: salidaRecordId,
          fields: {
            'fldU2rwYbn3xNMu2B': [descarteRecordId] // Descartes (Field ID correcto)
          }
        }
      ]);
      
    } else {
      console.log('📝 Paso 2: Creando registro en Salida Inoculacion...');
      
      if (!SALIDA_INOCULACION_TABLE_ID) {
        throw new Error('Missing AIRTABLE_TABLE_SALIDA_INOCULACION environment variable');
      }

      // Crear registro en Salida Inoculacion usando Field IDs de la documentación
      const salidaInoculacionRecord = await base(SALIDA_INOCULACION_TABLE_ID).create([
        {
          fields: {
            'fld1SHaeWH4MA3ZAt': data.fechaDescarte, // Fecha Evento
            'fldQOswRr4SclLZ2Q': data.cantidad, // Cantidad Bolsas
            'fldNNoQyvPwBG6afF': [data.loteId], // Lote Alterado (vincular con el lote de inoculación)
            // El campo Descartes se llenará después cuando vinculemos ambos registros
          }
        }
      ]);
      
      salidaRecordId = salidaInoculacionRecord[0].id;
      console.log('✅ Registro en Salida Inoculacion creado:', { salidaRecordId });
      
      // PASO 3: Actualizar el registro de Descarte para vincular con Salida Inoculacion
      console.log('📝 Paso 3: Vinculando Descarte con Salida Inoculacion...');
      await base(DESCARTES_TABLE_ID).update([
        {
          id: descarteRecordId,
          fields: {
            'fldfPim7YDWZfiKdl': [salidaRecordId] // Salida Inoculacion (Field ID)
          }
        }
      ]);

      // PASO 4: Actualizar el registro de Salida Inoculacion para vincular con Descarte
      console.log('📝 Paso 4: Vinculando Salida Inoculacion con Descarte...');
      await base(SALIDA_INOCULACION_TABLE_ID).update([
        {
          id: salidaRecordId,
          fields: {
            'fldAGNotVCvCYcKuQ': [descarteRecordId] // Descartes (Field ID)
          }
        }
      ]);
    }

    console.log('🎉 Proceso de descarte completado exitosamente:', {
      descarteRecordId,
      salidaRecordId,
      tipo: data.tipoDescarte,
      microorganismo: data.microorganismo,
      cantidad: data.cantidad,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Descarte registrado exitosamente',
      data: {
        descarteRecordId,
        salidaRecordId,
        tipo: data.tipoDescarte,
        cantidad: data.cantidad,
        motivo: data.motivo
      }
    });

  } catch (error) {
    console.error('❌ Error en proceso de descarte:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al registrar descarte',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipoDescarte = searchParams.get('tipoDescarte');
    
    // Validar variable de entorno
    if (!DESCARTES_TABLE_ID) {
      throw new Error('Missing AIRTABLE_TABLE_DESCARTES environment variable');
    }

    console.log('🔍 Obteniendo registros de descartes:', {
      tipoDescarte,
      timestamp: new Date().toISOString()
    });

    const records = await base(DESCARTES_TABLE_ID)
      .select({
        maxRecords: 100,
        sort: [{ field: 'Fecha Creacion', direction: 'desc' }],
        fields: [
          'ID',
          'Fecha Creacion',
          'Fecha Evento',
          'Cantidad Bolsas Descartadas',
          'Salida Inoculacion',
          'Salida Cepas'
        ]
      })
      .firstPage();

    const formattedRecords = records.map(record => ({
      id: record.get('ID'),
      fechaCreacion: record.get('Fecha Creacion'),
      fechaEvento: record.get('Fecha Evento'),
      cantidadDescartada: record.get('Cantidad Bolsas Descartadas'),
      salidaInoculacion: record.get('Salida Inoculacion'),
      salidaCepas: record.get('Salida Cepas')
    }));

    console.log('✅ Registros de descartes obtenidos:', {
      cantidad: formattedRecords.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      descartes: formattedRecords,
      total: formattedRecords.length
    });

  } catch (error) {
    console.error('❌ Error al obtener registros de descartes:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener registros de descartes',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
