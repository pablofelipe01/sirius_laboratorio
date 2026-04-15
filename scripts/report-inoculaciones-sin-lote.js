/**
 * Script de consulta: Registros de inoculación con Codigo Lote vacío o "N/A"
 * 
 * PROPÓSITO: Identificar registros históricos afectados por el bug.
 * ACCIÓN: Solo lectura — NO modifica ningún registro.
 * 
 * USO:
 *   node -r dotenv/config scripts/report-inoculaciones-sin-lote.js
 * 
 * REQUISITOS:
 *   - Variables de entorno AIRTABLE_API_KEY, AIRTABLE_BASE_ID,
 *     y AIRTABLE_TABLE_INOCULACION definidas en .env
 */

const Airtable = require('airtable');
require('dotenv').config();

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_ID = process.env.AIRTABLE_TABLE_INOCULACION;

if (!API_KEY || !BASE_ID || !TABLE_ID) {
  console.error('❌ Faltan variables de entorno: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_INOCULACION');
  process.exit(1);
}

const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);

async function reportRegistrosAfectados() {
  console.log('🔍 Buscando registros de inoculación con Codigo Lote vacío o "N/A"...\n');

  try {
    // Consultar registros donde Codigo Lote esté vacío
    // Nota: Airtable filterByFormula OR({Codigo Lote} = '', {Codigo Lote} = 'N/A', {Codigo Lote} = BLANK())
    const records = await base(TABLE_ID)
      .select({
        filterByFormula: `OR({Codigo Lote} = '', {Codigo Lote} = 'N/A', {Codigo Lote} = BLANK())`,
        fields: [
          'Codigo Lote',
          'Fecha Inoculacion',
          'Cantidad Bolsas Inoculadas',
          'ID Producto Core',
          'Realiza Registro',
        ],
        sort: [{ field: 'Fecha Inoculacion', direction: 'desc' }],
      })
      .all();

    console.log(`📊 Total de registros afectados: ${records.length}\n`);

    if (records.length === 0) {
      console.log('✅ No se encontraron registros con Codigo Lote vacío o "N/A".');
      return;
    }

    console.log('ID Registro            | Codigo Lote | Fecha          | Bolsas | Producto Core          | Registrado por');
    console.log('-'.repeat(120));

    records.forEach((record) => {
      const fields = record.fields;
      console.log(
        `${record.id.padEnd(22)} | ` +
        `${(fields['Codigo Lote'] || '(vacío)').toString().padEnd(11)} | ` +
        `${(fields['Fecha Inoculacion'] || 'Sin fecha').toString().padEnd(14)} | ` +
        `${(fields['Cantidad Bolsas Inoculadas'] || 0).toString().padEnd(6)} | ` +
        `${(fields['ID Producto Core'] || 'N/A').toString().padEnd(22)} | ` +
        `${fields['Realiza Registro'] || 'Desconocido'}`
      );
    });

    console.log('-'.repeat(120));
    console.log(`\n⚠️  Estos ${records.length} registros tienen Codigo Lote inválido.`);
    console.log('📋 NOTA: Este script es solo de lectura. No se modificó ningún registro.');
  } catch (error) {
    console.error('❌ Error al consultar Airtable:', error.message);
    process.exit(1);
  }
}

reportRegistrosAfectados();
