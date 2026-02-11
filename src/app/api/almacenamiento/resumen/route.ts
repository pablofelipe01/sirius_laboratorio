import { NextResponse } from 'next/server';
import {
  SIRIUS_INVENTARIO_CONFIG,
  SIRIUS_PRODUCT_CORE_CONFIG,
  buildSiriusInventarioUrl,
  buildSiriusProductCoreUrl,
  getSiriusInventarioHeaders,
  getSiriusProductCoreHeaders
} from '@/lib/constants/airtable';

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

type ProductInfo = {
  nombre: string;
  tipo: string;
  unidadBase: string;
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const fetchAllInventarioRecords = async (baseUrl: string): Promise<AirtableRecord[]> => {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(baseUrl);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('returnFieldsByFieldId', 'true');
    if (offset) {
      url.searchParams.set('offset', offset);
    }

    const response = await fetch(url.toString(), {
      headers: getSiriusInventarioHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Inventario: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return records;
};

const fetchProductInfo = async (productIds: string[]): Promise<Map<string, ProductInfo>> => {
  const infoMap = new Map<string, ProductInfo>();

  if (productIds.length === 0) {
    return infoMap;
  }

  const baseUrl = buildSiriusProductCoreUrl(SIRIUS_PRODUCT_CORE_CONFIG.TABLES.PRODUCTOS);
  const batches = chunkArray(productIds, 25);

  for (const batch of batches) {
    const filterFormula = `OR(${batch.map(id => `{Codigo Producto}="${id}"`).join(',')})`;
    const url = `${baseUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;

    const response = await fetch(url, {
      headers: getSiriusProductCoreHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Product Core: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const records = data.records || [];

    records.forEach((record: AirtableRecord) => {
      const codigoProducto = (record.fields['Codigo Producto'] as string) || '';
      if (!codigoProducto) {
        return;
      }

      infoMap.set(codigoProducto, {
        nombre: (record.fields['Nombre Comercial'] as string) || codigoProducto,
        tipo: (record.fields['Tipo Producto'] as string) || '',
        unidadBase: (record.fields['Unidad Base'] as string) || ''
      });
    });
  }

  return infoMap;
};

const buildUnitTotals = (stockActual: number, unidadBase: string) => {
  const unidad = unidadBase.toLowerCase();
  const stock = Number.isFinite(stockActual) ? stockActual : 0;

  let litros = 0;
  let bolsas = 0;

  if (['l', 'lt', 'litro', 'litros'].includes(unidad)) {
    litros = stock;
    bolsas = stock;
  } else if (['bolsa', 'bolsas', 'bulto', 'bultos'].includes(unidad)) {
    bolsas = stock;
    litros = stock;
  } else {
    litros = stock;
  }

  return { litros, bolsas };
};

export async function GET() {
  try {
    const stockUrl = buildSiriusInventarioUrl(SIRIUS_INVENTARIO_CONFIG.TABLES.STOCK_ACTUAL);
    const stockRecords = await fetchAllInventarioRecords(stockUrl);

    const productIds = Array.from(new Set(
      stockRecords
        .map(record => record.fields[SIRIUS_INVENTARIO_CONFIG.FIELDS_STOCK.PRODUCTO_ID] as string)
        .filter(Boolean)
    ));

    const productInfo = await fetchProductInfo(productIds);

    const hongosMap = new Map<string, { bolsas: number; litros: number }>();
    const bacteriasMap = new Map<string, { litros: number }>();

    stockRecords.forEach(record => {
      const productId = record.fields[SIRIUS_INVENTARIO_CONFIG.FIELDS_STOCK.PRODUCTO_ID] as string;
      const stockActualRaw = record.fields[SIRIUS_INVENTARIO_CONFIG.FIELDS_STOCK.STOCK_ACTUAL] as number;
      const stockActual = Number(stockActualRaw) || 0;

      if (!productId || stockActual <= 0) {
        return;
      }

      const info = productInfo.get(productId);
      const nombre = info?.nombre || productId;
      const tipo = (info?.tipo || '').toLowerCase();
      const unidadBase = info?.unidadBase || '';
      const { litros, bolsas } = buildUnitTotals(stockActual, unidadBase);

      if (tipo.includes('hongo')) {
        const current = hongosMap.get(nombre) || { bolsas: 0, litros: 0 };
        hongosMap.set(nombre, {
          bolsas: current.bolsas + bolsas,
          litros: current.litros + litros
        });
        return;
      }

      const current = bacteriasMap.get(nombre) || { litros: 0 };
      bacteriasMap.set(nombre, {
        litros: current.litros + litros
      });
    });

    const hongos = Array.from(hongosMap.entries()).map(([microorganismo, datos]) => ({
      microorganismo,
      bolsas: datos.bolsas,
      litros: datos.litros
    }));

    const bacterias = Array.from(bacteriasMap.entries()).map(([microorganismo, datos]) => ({
      microorganismo,
      litros: datos.litros
    }));

    return NextResponse.json({
      success: true,
      hongos,
      bacterias
    });
  } catch (error) {
    console.error('Error en resumen inventario:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor',
        hongos: [],
        bacterias: []
      },
      { status: 500 }
    );
  }
}
