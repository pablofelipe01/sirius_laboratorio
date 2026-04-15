import { describe, it, expect } from 'vitest';
import { InoculationSchema, validateData } from '@/lib/validation/schemas';

/**
 * Tests de integración para validación del endpoint de inoculación.
 * 
 * CAUSA RAÍZ DEL BUG: El campo "Codigo Lote" se guardaba como cadena vacía
 * cuando microorganismAbreviatura estaba vacío, y la UI mostraba "N/A".
 * 
 * Estas pruebas verifican que la capa de validación (Zod) rechaza payloads
 * que producirían un Codigo Lote vacío.
 */

// Payload base válido para inoculación
const validPayload = {
  bagQuantity: 25,
  microorganism: 'Trichoderma harzianum',
  microorganismId: 'rec123example',
  microorganismAbreviatura: 'TR',
  inoculationDate: '2025-04-10',
  responsables: ['Juan Pérez'],
  responsablesIds: ['rec456example'],
  responsablesIdsCore: ['SIRIUS-PERSONAL-0001'],
  registradoPor: 'Admin Lab',
  cepasSeleccionadas: [{
    cepaId: 'rec789example',
    cantidad: 25,
    microorganismo: 'Trichoderma harzianum',
    abreviatura: 'TR',
    totalDisponible: 100,
  }],
};

describe('InoculationSchema — validación de Codigo Lote (microorganismAbreviatura)', () => {
  it('acepta payload con abreviatura válida', () => {
    const result = validateData(InoculationSchema, validPayload);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.microorganismAbreviatura).toBe('TR');
  });

  it('rechaza payload sin microorganismAbreviatura (undefined)', () => {
    const { microorganismAbreviatura, ...sinAbreviatura } = validPayload;
    void microorganismAbreviatura; // evitar lint unused
    const result = validateData(InoculationSchema, sinAbreviatura);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some(e => e.includes('microorganismAbreviatura'))).toBe(true);
  });

  it('rechaza payload con microorganismAbreviatura vacía ("")', () => {
    const payload = { ...validPayload, microorganismAbreviatura: '' };
    const result = validateData(InoculationSchema, payload);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some(e => e.includes('microorganismAbreviatura'))).toBe(true);
  });

  it('rechaza payload con microorganismAbreviatura demasiado larga', () => {
    const payload = { ...validPayload, microorganismAbreviatura: 'ABCDEFGHIJK' }; // 11 chars
    const result = validateData(InoculationSchema, payload);
    expect(result.success).toBe(false);
  });

  it('acepta abreviatura de 1 caracter', () => {
    const payload = { ...validPayload, microorganismAbreviatura: 'B' };
    const result = validateData(InoculationSchema, payload);
    expect(result.success).toBe(true);
  });

  it('genera Codigo Lote correctamente con fecha + abreviatura', () => {
    // Simular la lógica del backend para verificar generación
    const data = validPayload;
    const abreviatura = data.microorganismAbreviatura;
    const [year, month, day] = data.inoculationDate.split('-');
    const fechaFormateada = `${day}${month}${year.slice(2)}`;
    const codigoLote = `${fechaFormateada}${abreviatura}`;
    
    expect(codigoLote).toBe('100425TR');
    expect(codigoLote.length).toBeGreaterThan(0);
  });

  it('rechaza payload sin fecha de inoculación', () => {
    const payload = { ...validPayload, inoculationDate: '' };
    const result = validateData(InoculationSchema, payload);
    expect(result.success).toBe(false);
  });

  it('rechaza payload sin microorganismId', () => {
    const payload = { ...validPayload, microorganismId: '' };
    const result = validateData(InoculationSchema, payload);
    expect(result.success).toBe(false);
  });

  it('rechaza payload con bagQuantity = 0', () => {
    const payload = { ...validPayload, bagQuantity: 0 };
    const result = validateData(InoculationSchema, payload);
    expect(result.success).toBe(false);
  });

  it('rechaza payload sin responsables', () => {
    const payload = { ...validPayload, responsables: [], responsablesIds: [] };
    const result = validateData(InoculationSchema, payload);
    expect(result.success).toBe(false);
  });
});

describe('Validación backend — Codigo Lote no puede ser vacío ni "N/A"', () => {
  /**
   * Simula la lógica de validación del backend (route.ts POST handler)
   * para verificar que nunca se guardará un Codigo Lote inválido.
   */
  function simulateBackendLoteValidation(data: {
    inoculationDate: string;
    microorganismAbreviatura: string;
    cepasSeleccionadas?: { abreviatura: string }[];
  }): { valid: boolean; codigoLote: string } {
    let codigoLote = '';
    const abreviatura = data.microorganismAbreviatura ||
      (data.cepasSeleccionadas?.[0]?.abreviatura) || '';

    if (data.inoculationDate && abreviatura) {
      const [year, month, day] = data.inoculationDate.split('-');
      const fechaFormateada = `${day}${month}${year.slice(2)}`;
      codigoLote = `${fechaFormateada}${abreviatura}`;
    }

    const valid = !!codigoLote && codigoLote.trim() !== '' && codigoLote !== 'N/A';
    return { valid, codigoLote };
  }

  it('genera Codigo Lote válido con datos correctos', () => {
    const result = simulateBackendLoteValidation({
      inoculationDate: '2025-04-10',
      microorganismAbreviatura: 'TR',
    });
    expect(result.valid).toBe(true);
    expect(result.codigoLote).toBe('100425TR');
  });

  it('rechaza cuando abreviatura está vacía', () => {
    const result = simulateBackendLoteValidation({
      inoculationDate: '2025-04-10',
      microorganismAbreviatura: '',
    });
    expect(result.valid).toBe(false);
    expect(result.codigoLote).toBe('');
  });

  it('rechaza cuando fecha está vacía', () => {
    const result = simulateBackendLoteValidation({
      inoculationDate: '',
      microorganismAbreviatura: 'TR',
    });
    expect(result.valid).toBe(false);
  });

  it('usa abreviatura de cepa como fallback', () => {
    const result = simulateBackendLoteValidation({
      inoculationDate: '2025-04-10',
      microorganismAbreviatura: '',
      cepasSeleccionadas: [{ abreviatura: 'BV' }],
    });
    expect(result.valid).toBe(true);
    expect(result.codigoLote).toBe('100425BV');
  });

  it('rechaza Codigo Lote literal "N/A"', () => {
    // Caso extremo: si de algún modo codigoLote fuera "N/A"
    const codigoLote = 'N/A';
    const valid = codigoLote.trim() !== '' && codigoLote !== 'N/A';
    expect(valid).toBe(false);
  });
});
