import { describe, expect, it } from 'vitest';
import {
  FLUJO_CAJA,
  NOMBRE_CONSUMO_INTERNO,
  camposPorCompletar,
  construirCamposProductos,
  construirCamposRemision,
  construirObservaciones,
  extraerBloqueParcela,
  nombreMicroorganismo,
  numeroDeRemision,
  type RemisionCore,
} from '@/lib/remisiones/flujo-caja-registro';

const R = FLUJO_CAJA.FIELDS_REMISION;
const P = FLUJO_CAJA.FIELDS_PRODUCTO;

// SIRIUS-REM-0225 tal como está en Remisiones Core.
const remision = (cambios: Partial<RemisionCore> = {}): RemisionCore => ({
  idRemision: 'SIRIUS-REM-0225',
  idPedido: 'SIRIUS-PED-0117',
  idCliente: 'CL-0001',
  nombreCliente: 'GUAICARAMO SAS',
  areaOrigen: 'Laboratorio',
  estado: 'Entregada',
  responsableEntrega: 'María Alexandra Orosco Gil ',
  fechaRemision: '2026-10-13T18:58:10.000Z',
  fechaDespacho: '2026-10-13',
  fechaRecibido: '2026-10-13',
  notas: 'Bloque 327 parcela 2-3-4-5',
  urlDocumento: 'https://siriuslaboratorio.s3.us-east-1.amazonaws.com/SIRIUS-REM-0225.pdf',
  productos: [{ nombre: 'Trichoderma harzianum (L)', cantidad: 150, unidad: 'L' }],
  transportista: { nombre: 'Rosendo Olarte', cedula: '17.387.943', codigo: 'PER-REM-0004' },
  receptor: { nombre: 'Leidy Fernanda Montoya Orjuela', cedula: '1006534524', codigo: 'PER-REM-0002' },
  ...cambios,
});

describe('numeroDeRemision', () => {
  it('toma el consecutivo del ID de Core', () => {
    expect(numeroDeRemision('SIRIUS-REM-0227')).toBe(227);
  });

  it('no inventa un número si el ID no lo trae', () => {
    expect(numeroDeRemision('')).toBeNull();
    expect(numeroDeRemision('recABC')).toBeNull();
  });
});

describe('nombreMicroorganismo', () => {
  it('quita la presentación que Core pone al nombre comercial', () => {
    expect(nombreMicroorganismo('Trichoderma harzianum (L)')).toBe('Trichoderma harzianum');
    expect(nombreMicroorganismo('Trichoderma harzianum (Kg)')).toBe('Trichoderma harzianum');
    expect(nombreMicroorganismo('Siriusbacter')).toBe('Siriusbacter');
  });

  it('quita el prefijo de las notas por defecto del API', () => {
    expect(nombreMicroorganismo('Producto: Beauveria bassiana (L)')).toBe('Beauveria bassiana');
  });
});

describe('extraerBloqueParcela', () => {
  it('separa bloque y parcelas de la forma habitual', () => {
    expect(extraerBloqueParcela('Bloque 21 parcela 1 a la 17 ')).toEqual({ bloques: '21', parcelas: '1 a la 17' });
    expect(extraerBloqueParcela('Bloque 3 parcela 1 a la 10.')).toEqual({ bloques: '3', parcelas: '1 a la 10' });
  });

  it('deja vacío lo que no sigue esa forma', () => {
    expect(extraerBloqueParcela('Entregar en portería')).toEqual({});
    expect(extraerBloqueParcela('')).toEqual({});
  });
});

describe('construirCamposRemision', () => {
  it('replica el registro que finanzas tenía para la #225', () => {
    const campos = construirCamposRemision(remision());
    expect(campos).toMatchObject({
      [R.NUMERO_REMISION]: 225,
      [R.FECHA_CREACION]: '2026-10-13T18:58:10.000Z',
      [R.NOMBRE_CLIENTE]: 'GUAICARAMO SAS',
      [R.CODIGO_CLIENTE]: 'CL-0001',
      [R.RESPONSABLE_ENTREGA]: 'María Alexandra Orosco Gil',
      [R.NOMBRE_LLEVA]: 'Rosendo Olarte',
      [R.CEDULA_LLEVA]: 17387943,
      [R.FECHA_LLEVO]: '2026-10-13',
      [R.NOMBRE_RECIBE]: 'Leidy Fernanda Montoya Orjuela',
      [R.CEDULA_RECIBE]: 1006534524,
      [R.FECHA_RECIBIO]: '2026-10-13',
    });
    expect(campos[R.OBSERVACIONES]).toBe(
      'SIRIUS-REM-0225 | Pedido: SIRIUS-PED-0117 | Área origen: Laboratorio | Productos: Trichoderma harzianum 150L | ' +
        'Total: 150L | Estado: Entregada | Bloque 327 parcela 2-3-4-5 | Personal: PER-REM-0004, PER-REM-0002',
    );
  });

  it('en tránsito no registra receptor aunque Core ya lo tenga', () => {
    const campos = construirCamposRemision(remision({ estado: 'En Tránsito', fechaRecibido: undefined }));
    expect(campos).not.toHaveProperty(R.NOMBRE_RECIBE);
    expect(campos).not.toHaveProperty(R.CEDULA_RECIBE);
    expect(campos).not.toHaveProperty(R.FECHA_RECIBIO);
  });

  it('nombra al cliente interno de modo que la fórmula de valor lo deje en 0', () => {
    const campos = construirCamposRemision(
      remision({ idCliente: 'CL-0019', nombreCliente: 'SIRIUS REGENERATIVE SOLUTIONS S.A.S ZOMAC' }),
    );
    expect(campos[R.NOMBRE_CLIENTE]).toBe(NOMBRE_CONSUMO_INTERNO);
    expect(NOMBRE_CONSUMO_INTERNO).toContain('CONSUMO INTERNO');
  });

  it('no manda campos vacíos', () => {
    const campos = construirCamposRemision(remision({ transportista: undefined, fechaDespacho: undefined, notas: '' }));
    expect(campos).not.toHaveProperty(R.NOMBRE_LLEVA);
    expect(campos).not.toHaveProperty(R.CEDULA_LLEVA);
    expect(campos).not.toHaveProperty(R.FECHA_LLEVO);
  });

  it('suma por unidad cuando la remisión las mezcla', () => {
    const obs = construirObservaciones(
      remision({
        productos: [
          { nombre: 'Beauveria bassiana (L)', cantidad: 150, unidad: 'L' },
          { nombre: 'Trichoderma harzianum (Kg)', cantidad: 20, unidad: 'Kg' },
        ],
      }),
    );
    expect(obs).toContain('Total: 150L + 20Kg');
  });
});

describe('construirCamposProductos', () => {
  it('una línea por producto, con la fecha de la remisión y bloque/parcela de las notas', () => {
    const lineas = construirCamposProductos(
      remision({
        productos: [
          { nombre: 'Siriusbacter', cantidad: 150, unidad: 'L' },
          { nombre: 'Trichoderma harzianum (Kg)', cantidad: 291, unidad: 'Kg' },
        ],
      }),
    );
    expect(lineas).toEqual([
      {
        [P.FECHA_CREACION]: '2026-10-13T18:58:10.000Z',
        [P.CANTIDAD]: 150,
        [P.MICROORGANISMO]: 'Siriusbacter',
        [P.PRODUCTO_LIQUIDO]: true,
        [P.BLOQUES]: '327',
        [P.PARCELAS]: '2-3-4-5',
      },
      {
        [P.FECHA_CREACION]: '2026-10-13T18:58:10.000Z',
        [P.CANTIDAD]: 291,
        [P.MICROORGANISMO]: 'Trichoderma harzianum',
        [P.PRODUCTO_LIQUIDO]: false,
        [P.BLOQUES]: '327',
        [P.PARCELAS]: '2-3-4-5',
      },
    ]);
  });
});

describe('camposPorCompletar', () => {
  // La #221 quedó en Flujo de caja mientras iba En Tránsito.
  const existente = {
    [R.NUMERO_REMISION]: 221,
    [R.NOMBRE_CLIENTE]: 'AGRICOLA GUARILA SAS',
    [R.NOMBRE_LLEVA]: 'Nombre corregido por finanzas',
    [R.OBSERVACIONES]: 'SIRIUS-REM-0221 | Total: 291Kg | Estado: En Tránsito | Personal: PER-REM-0027',
    [R.FACTURA]: ['recFactura'],
  };

  it('al firmarse llena solo lo vacío y actualiza el estado en Observaciones', () => {
    const cambios = camposPorCompletar(existente, remision({ idRemision: 'SIRIUS-REM-0221' }));
    expect(cambios).toMatchObject({
      [R.NOMBRE_RECIBE]: 'Leidy Fernanda Montoya Orjuela',
      [R.CEDULA_RECIBE]: 1006534524,
      [R.FECHA_RECIBIO]: '2026-10-13',
      [R.OBSERVACIONES]: 'SIRIUS-REM-0221 | Total: 291Kg | Estado: Entregada | Personal: PER-REM-0027',
    });
    expect(cambios).not.toHaveProperty(R.NOMBRE_LLEVA);
    expect(cambios).not.toHaveProperty(R.NOMBRE_CLIENTE);
    expect(cambios).not.toHaveProperty(R.FACTURA);
    expect(cambios).not.toHaveProperty(R.FECHA_CREACION);
  });

  it('no cambia nada si el registro ya está completo', () => {
    const completo = construirCamposRemision(remision());
    expect(camposPorCompletar(completo, remision())).toEqual({});
  });
});
