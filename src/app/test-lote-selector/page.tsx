'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoteSelector from '@/components/LoteSelector';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Cliente {
  id: string;
  nombre: string;
  nit: string;
  contacto: string;
}

export default function TestLoteSelectorPage() {
  const { user, isAuthenticated } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [lotesSeleccionados, setLotesSeleccionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar lista de clientes al inicio
  useEffect(() => {
    if (isAuthenticated) {
      fetchClientes();
    }
  }, [isAuthenticated]);

  const fetchClientes = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/clientes-core');
      if (!response.ok) {
        throw new Error('Error al cargar clientes');
      }
      const data = await response.json();
      setClientes(data.clientes || []);
    } catch (err) {
      console.error('Error cargando clientes:', err);
      setError('Error al cargar los clientes');
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClienteChange = (clienteId: string) => {
    setClienteSeleccionado(clienteId);
    setLotesSeleccionados([]); // Limpiar lotes cuando cambia el cliente
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Datos del formulario:', {
      clienteSeleccionado,
      lotesSeleccionados
    });
    
    alert(`Cliente: ${clienteSeleccionado}\nLotes seleccionados: ${lotesSeleccionados.length}`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Acceso Restringido</h1>
            <p className="text-gray-600">Debe iniciar sesión para acceder a esta página.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-6 text-white">
            <h1 className="text-3xl font-bold">Selector de Lotes - Prueba</h1>
            <p className="text-teal-100 mt-2">Prueba la funcionalidad de selección de lotes por cliente</p>
          </div>

          {/* Contenido */}
          <div className="p-8">
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
                <p className="text-gray-600 mt-4">Cargando clientes...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <span className="text-red-500 text-xl mr-3">⚠️</span>
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            {!loading && !error && (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Selector de Cliente */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-500 p-2 rounded-lg mr-3">
                      <span className="text-white text-xl">🏢</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Seleccionar Cliente</h3>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Cliente
                    </label>
                    <select
                      value={clienteSeleccionado}
                      onChange={(e) => handleClienteChange(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 text-base"
                      required
                    >
                      <option value="">Seleccione un cliente</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nombre} - {cliente.nit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selector de Lotes */}
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-100">
                  <div className="flex items-center mb-4">
                    <div className="bg-teal-500 p-2 rounded-lg mr-3">
                      <span className="text-white text-xl">🌾</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Seleccionar Lotes</h3>
                  </div>
                  
                  <LoteSelector
                    clienteId={clienteSeleccionado}
                    lotesSeleccionados={lotesSeleccionados}
                    onLotesChange={setLotesSeleccionados}
                  />
                </div>

                {/* Resumen */}
                {(clienteSeleccionado || lotesSeleccionados.length > 0) && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                    <div className="flex items-center mb-4">
                      <div className="bg-purple-500 p-2 rounded-lg mr-3">
                        <span className="text-white text-xl">📋</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">Resumen de Selección</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="font-semibold text-gray-700">Cliente seleccionado:</span>
                        <span className="ml-2 text-gray-900">
                          {clienteSeleccionado 
                            ? clientes.find(c => c.id === clienteSeleccionado)?.nombre || 'Cliente no encontrado'
                            : 'Ninguno'
                          }
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Lotes seleccionados:</span>
                        <span className="ml-2 text-gray-900">{lotesSeleccionados.length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botones */}
                <div className="flex justify-end space-x-4 pt-6 border-t-2 border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setClienteSeleccionado('');
                      setLotesSeleccionados([]);
                    }}
                    className="px-8 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 focus:ring-4 focus:ring-gray-500/20 transition-all duration-200 font-semibold text-base"
                  >
                    Limpiar
                  </button>
                  <button
                    type="submit"
                    disabled={!clienteSeleccionado}
                    className="px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 focus:ring-4 focus:ring-teal-500/20 disabled:opacity-50 transition-all duration-200 font-semibold text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
                  >
                    <span className="mr-2 text-xl">✓</span>
                    Confirmar Selección
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}