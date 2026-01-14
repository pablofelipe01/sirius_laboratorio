'use client';

import { useState, useEffect } from 'react';
import LoteSelector from '@/components/LoteSelector';

interface Cliente {
  id: string;
  nombre: string;
  email: string;
}

export default function TestClienteLotes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');
  const [lotesSeleccionados, setLotesSeleccionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const response = await fetch('/api/clientes-core');
        if (response.ok) {
          const data = await response.json();
          setClientes(data.clientes || []);
        }
      } catch (error) {
        console.error('Error cargando clientes:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarClientes();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Test: Cliente → Lotes
            </h1>
            <p className="text-gray-600">
              Prueba la funcionalidad de cargar TODOS los lotes de TODOS los cultivos cuando se selecciona un cliente.
            </p>
          </div>

          <div className="grid gap-8">
            {/* Selector de Cliente */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                1. Selecciona un Cliente
              </label>
              {loading ? (
                <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500">
                  Cargando clientes...
                </div>
              ) : (
                <select
                  value={clienteSeleccionado}
                  onChange={(e) => {
                    setClienteSeleccionado(e.target.value);
                    setLotesSeleccionados([]); // Limpiar lotes seleccionados
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900"
                >
                  <option value="">-- Selecciona un cliente --</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} ({cliente.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selector de Lotes */}
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  2. Lotes Disponibles del Cliente
                </h3>
                <p className="text-sm text-gray-600">
                  Aquí deberían aparecer TODOS los lotes de TODOS los cultivos que tiene registrados el cliente seleccionado.
                </p>
              </div>

              <LoteSelector
                clienteId={clienteSeleccionado}
                lotesSeleccionados={lotesSeleccionados}
                onLotesChange={setLotesSeleccionados}
                className="w-full"
              />
            </div>

            {/* Información de Debug */}
            {clienteSeleccionado && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  3. Información de Debug
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="font-medium text-gray-700 mb-2">Cliente Seleccionado:</div>
                    <div className="text-gray-900 font-mono text-xs break-all">
                      {clienteSeleccionado}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="font-medium text-gray-700 mb-2">Lotes Seleccionados:</div>
                    <div className="text-gray-900">
                      {lotesSeleccionados.length} lotes seleccionados
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="font-medium text-gray-700 mb-2">API Endpoint:</div>
                    <div className="text-gray-900 font-mono text-xs break-all">
                      /api/cultivos-lotes?clienteId={clienteSeleccionado}
                    </div>
                  </div>
                </div>

                {lotesSeleccionados.length > 0 && (
                  <div className="mt-4">
                    <div className="font-medium text-gray-700 mb-2">IDs de Lotes Seleccionados:</div>
                    <div className="bg-white p-3 rounded-lg border font-mono text-xs text-gray-600">
                      {JSON.stringify(lotesSeleccionados, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instrucciones */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">
                📋 Instrucciones de Prueba
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-blue-700">
                <li>Selecciona un cliente del dropdown</li>
                <li>Verifica que aparezcan TODOS los lotes de TODOS los cultivos del cliente</li>
                <li>Busca lotes usando el campo de búsqueda</li>
                <li>Selecciona algunos lotes para verificar que funciona el multi-select</li>
                <li>Revisa la información de debug en la parte inferior</li>
              </ol>
              
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <div className="font-medium text-blue-800 mb-1">Comportamiento Esperado:</div>
                <div className="text-blue-700 text-sm">
                  La API debe buscar primero todos los cultivos del cliente seleccionado, 
                  luego obtener todos los lotes asociados a esos cultivos, y mostrarlos 
                  en el selector con información detallada.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}