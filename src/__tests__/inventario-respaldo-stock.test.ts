import { afterEach, describe, expect, it, vi } from 'vitest';

// constants/airtable exige variables de entorno al importarse; aquí solo hacen
// falta las formas, no las bases reales.
vi.mock('@/lib/constants/airtable', () => ({
  AIRTABLE_CONFIG: { TABLES: { MICROORGANISMOS: 'tblMicro', SALIDA_FERMENTACION: 'tblSalida' } },
  buildAirtableUrl: (tabla: string, recordId?: string) =>
    `https://api.airtable.com/v0/appTest/${tabla}${recordId ? `/${recordId}` : ''}`,
  getAirtableHeaders: () => ({}),
  SIRIUS_INVENTARIO_CONFIG: { TABLES: {}, FIELDS_MOVIMIENTOS: {} },
  buildSiriusInventarioUrl: () => '',
  getSiriusInventarioHeaders: () => ({}),
}));

import { calcularDisponibleParaPedido, type MovimientoStock } from '@/lib/inventario/stock-producto';
import { RespaldoInvalido, resolverRespaldo } from '@/lib/inventario/respaldo-bacterias';

const entrada = (cantidad: number, destino: string): MovimientoStock => ({ tipo: 'Entrada', cantidad, destino });
const salida = (cantidad: number, destino: string): MovimientoStock => ({ tipo: 'Salida', cantidad, destino });

const PEDIDO = ['SIRIUS-PED-0100', 'recPedido100'];

describe('calcularDisponibleParaPedido', () => {
  it('suma lo producido para el pedido y lo libre del granel', () => {
    const movs = [entrada(100, 'SIRIUS-PED-0100'), entrada(50, 'STOCK-GENERAL'), entrada(10, '')];
    expect(calcularDisponibleParaPedido(movs, PEDIDO)).toBe(160);
  });

  it('cuenta como granel la cosecha que quedó sin pedido', () => {
    expect(calcularDisponibleParaPedido([entrada(100, 'PED-NO-IDENTIFICADO')], PEDIDO)).toBe(100);
  });

  it('reconoce el pedido por su recId', () => {
    expect(calcularDisponibleParaPedido([entrada(30, 'recPedido100')], PEDIDO)).toBe(30);
  });

  it('no cuenta lo producido para otros pedidos', () => {
    expect(calcularDisponibleParaPedido([entrada(200, 'SIRIUS-PED-0200')], PEDIDO)).toBe(0);
  });

  it('descuenta del granel lo que otro pedido despachó de más', () => {
    // PED-0200 tenía 40 propios y despachó 100: los 60 de diferencia salieron del granel.
    const movs = [
      entrada(100, 'STOCK-GENERAL'),
      entrada(40, 'SIRIUS-PED-0200'),
      salida(100, 'SIRIUS-PED-0200'),
    ];
    expect(calcularDisponibleParaPedido(movs, PEDIDO)).toBe(40);
  });

  it('descuenta lo que el propio pedido ya despachó desde el granel', () => {
    const movs = [entrada(100, 'STOCK-GENERAL'), salida(70, 'SIRIUS-PED-0100')];
    expect(calcularDisponibleParaPedido(movs, PEDIDO)).toBe(30);
  });

  it('un sobregiro ajeno no se come la producción propia', () => {
    const movs = [entrada(50, 'SIRIUS-PED-0100'), salida(80, 'SIRIUS-PED-0200')];
    expect(calcularDisponibleParaPedido(movs, PEDIDO)).toBe(50);
  });

  it('nunca devuelve negativo e ignora tipos sin signo definido', () => {
    const movs = [salida(30, 'SIRIUS-PED-0100'), { tipo: 'Ajuste', cantidad: 500, destino: 'STOCK-GENERAL' }];
    expect(calcularDisponibleParaPedido(movs, PEDIDO)).toBe(0);
  });
});

describe('resolverRespaldo', () => {
  const BT = { id: 'recBT', fields: { Microorganismo: 'Bacillus thuringiensis' } };
  const fermentacion = (fields: Record<string, unknown>) => ({
    id: 'recFerm',
    fields: { 'Codigo Lote': '051026BT', Estado: 'Disponible', 'Total Litros': 150, Microorganismos: ['recBT'], ...fields },
  });

  function mockAirtable(microorganismos: unknown[], fermentacionRegistro?: unknown) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const cuerpo = url.includes('/tblMicro') ? { records: microorganismos } : fermentacionRegistro;
        return { ok: true, json: async () => cuerpo, text: async () => '' } as Response;
      }),
    );
  }

  afterEach(() => vi.unstubAllGlobals());

  it('no pide respaldo a un producto que no es bacteria', async () => {
    mockAirtable([]);
    expect(await resolverRespaldo('SIRIUS-PRODUCT-0004', 100, {})).toBeNull();
  });

  it('acepta una fermentación disponible de la misma bacteria', async () => {
    process.env.AIRTABLE_TABLE_FERMENTACION = 'tblFerm';
    mockAirtable([BT], fermentacion({}));
    expect(await resolverRespaldo('SIRIUS-PRODUCT-0005', 100, { fermentacionId: 'recFerm' })).toEqual({
      tipo: 'fermentacion',
      fermentacionId: 'recFerm',
      codigoLote: '051026BT',
    });
  });

  it('rechaza registrar más litros de los que tiene la fermentación', async () => {
    process.env.AIRTABLE_TABLE_FERMENTACION = 'tblFerm';
    mockAirtable([BT], fermentacion({ 'Total Litros': 80 }));
    await expect(resolverRespaldo('SIRIUS-PRODUCT-0005', 100, { fermentacionId: 'recFerm' })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('rechaza una fermentación de otra bacteria', async () => {
    process.env.AIRTABLE_TABLE_FERMENTACION = 'tblFerm';
    mockAirtable([BT], fermentacion({ Microorganismos: ['recSiriusbacter'] }));
    await expect(resolverRespaldo('SIRIUS-PRODUCT-0005', 100, { fermentacionId: 'recFerm' })).rejects.toBeInstanceOf(
      RespaldoInvalido,
    );
  });

  it('sin fermentación queda marcada aunque falten lote y motivo', async () => {
    mockAirtable([BT]);
    expect(await resolverRespaldo('SIRIUS-PRODUCT-0005', 100, {})).toEqual({
      tipo: 'sin-fermentacion',
      codigoLote: '',
      motivo: '',
    });

    expect(
      await resolverRespaldo('SIRIUS-PRODUCT-0005', 100, {
        codigoLote: ' 051026BT ',
        motivoSinFermentacion: 'Fermentación hecha antes de usar DataLab',
      }),
    ).toEqual({ tipo: 'sin-fermentacion', codigoLote: '051026BT', motivo: 'Fermentación hecha antes de usar DataLab' });
  });
});
