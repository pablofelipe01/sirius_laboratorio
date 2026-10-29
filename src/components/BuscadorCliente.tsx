'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface ClienteOpcion {
  id: string;
  nombre: string;
}

interface BuscadorClienteProps {
  clientes: ClienteOpcion[];
  value: string;
  onChange: (clienteId: string) => void;
  /** Clases del anillo de foco, para que combine con cada pantalla del modal. */
  focusClassName?: string;
}

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export function BuscadorCliente({
  clientes,
  value,
  onChange,
  focusClassName = 'focus:ring-blue-500',
}: BuscadorClienteProps) {
  const seleccionado = clientes.find((c) => c.id === value);
  const [texto, setTexto] = useState(seleccionado?.nombre ?? '');
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const listaId = useId();

  useEffect(() => {
    if (!abierto) setTexto(seleccionado?.nombre ?? '');
  }, [seleccionado, abierto]);

  const filtrados = useMemo(() => {
    const busqueda = normalizar(texto);
    if (!busqueda || busqueda === normalizar(seleccionado?.nombre ?? '')) return clientes;
    return clientes.filter(
      (c) => normalizar(c.nombre).includes(busqueda) || normalizar(c.id).includes(busqueda)
    );
  }, [clientes, texto, seleccionado]);

  useEffect(() => {
    listaRef.current
      ?.querySelector<HTMLElement>(`[data-indice="${resaltado}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [resaltado]);

  const elegir = (cliente: ClienteOpcion) => {
    onChange(cliente.id);
    setTexto(cliente.nombre);
    setAbierto(false);
  };

  const cerrar = () => {
    setAbierto(false);
    setTexto(seleccionado?.nombre ?? '');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAbierto(true);
      setResaltado((i) => Math.min(i + 1, filtrados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setResaltado((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (abierto && filtrados[resaltado]) {
        e.preventDefault();
        elegir(filtrados[resaltado]);
      }
    } else if (e.key === 'Escape' && abierto) {
      e.preventDefault();
      cerrar();
    }
  };

  return (
    <div
      ref={contenedorRef}
      className="relative"
      onBlur={(e) => {
        if (!contenedorRef.current?.contains(e.relatedTarget as Node)) cerrar();
      }}
    >
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={abierto && filtrados[resaltado] ? `${listaId}-${resaltado}` : undefined}
        value={texto}
        placeholder="Buscar cliente por nombre o código..."
        onChange={(e) => {
          setTexto(e.target.value);
          setResaltado(0);
          setAbierto(true);
        }}
        onFocus={(e) => {
          e.target.select();
          setAbierto(true);
        }}
        onKeyDown={onKeyDown}
        className={`w-full pl-10 pr-16 py-3 border border-gray-300 rounded-lg focus:ring-2 ${focusClassName} focus:border-transparent bg-white text-black placeholder:text-gray-400`}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value && (
          <button
            type="button"
            aria-label="Quitar cliente"
            onClick={() => {
              onChange('');
              setTexto('');
              setResaltado(0);
            }}
            className="p-1 text-gray-400 hover:text-gray-700 rounded"
          >
            <X size={16} />
          </button>
        )}
        <ChevronDown size={18} className="text-gray-400 pointer-events-none" />
      </div>

      {abierto && (
        <ul
          ref={listaRef}
          id={listaId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {filtrados.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-500">Ningún cliente coincide con “{texto}”</li>
          ) : (
            filtrados.map((cliente, indice) => (
              <li
                key={cliente.id}
                id={`${listaId}-${indice}`}
                data-indice={indice}
                role="option"
                aria-selected={cliente.id === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(cliente);
                }}
                onMouseEnter={() => setResaltado(indice)}
                className={`px-4 py-2.5 cursor-pointer flex items-center justify-between gap-3 text-sm ${
                  indice === resaltado ? 'bg-blue-50' : ''
                } ${cliente.id === value ? 'font-semibold' : ''}`}
              >
                <span className="text-black">{cliente.nombre}</span>
                <span className="text-xs text-gray-500 shrink-0">{cliente.id}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default BuscadorCliente;
