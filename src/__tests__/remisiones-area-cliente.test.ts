import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/constants/airtable', () => ({
  SIRIUS_CLIENT_CORE_CONFIG: { API_KEY: 'x', BASE_ID: 'x', TABLES: { AREAS_CLIENTE: 'x' } },
  SIRIUS_PEDIDOS_CORE_CONFIG: { API_KEY: 'x', BASE_ID: 'x', TABLES: { PEDIDOS: 'x' } },
}));

import { contactoRecibeRemision, resolverAreaCliente } from '@/lib/remisiones/area-cliente';

// AC-0003 Ambiental de GUAICARAMO, el área de Carolina Obando.
const AMBIENTAL = 'recWd1jvfPwxWK3st';
const SANIDAD = 'rec5MZzgs9Gn5b2Ye';

describe('contactoRecibeRemision', () => {
  it('un contacto sin áreas recibe todo, como antes del filtro', () => {
    expect(contactoRecibeRemision(undefined, null)).toBe(true);
    expect(contactoRecibeRemision([], SANIDAD)).toBe(true);
  });

  it('un contacto con áreas recibe solo las remisiones de su área', () => {
    expect(contactoRecibeRemision([AMBIENTAL], AMBIENTAL)).toBe(true);
    expect(contactoRecibeRemision([AMBIENTAL], SANIDAD)).toBe(false);
    expect(contactoRecibeRemision([SANIDAD, AMBIENTAL], AMBIENTAL)).toBe(true);
  });

  it('un pedido sin área no le llega a quien tiene áreas (caso SIRIUS-REM-0233)', () => {
    expect(contactoRecibeRemision([AMBIENTAL], null)).toBe(false);
  });

  it('si no se pudo saber el área, notifica a todos para no perder el aviso', () => {
    expect(contactoRecibeRemision([AMBIENTAL], undefined)).toBe(true);
  });
});

describe('resolverAreaCliente', () => {
  it('distingue "sin área" de "no se pudo leer el pedido"', async () => {
    expect(await resolverAreaCliente('')).toBeNull();
    expect(await resolverAreaCliente('  ')).toBeNull();
    expect(await resolverAreaCliente(undefined)).toBeUndefined();
  });
});
