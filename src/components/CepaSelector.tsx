'use client';

import { useState, useEffect } from 'react';

interface Cepa {
  id: string;
  microorganismo: string[];
  abreviatura: string[];
  codigoCepa: string;
  totalCantidadBolsas: number;
  fechaCreacion: string;
  responsables: string[];
}

interface CepaSeleccionada {
  cepaId: string;
  cantidad: number;
  microorganismo: string;
  abreviatura: string;
  codigoCepa: string;
  totalDisponible: number;
}

interface CepaSelectorProps {
  microorganismoSeleccionado: string;
  abreviaturaSeleccionada?: string;
  onCepaAgregada: (cepa: CepaSeleccionada) => void;
  onCepaRemovida: (index: number) => void;
  cepasAgregadas: CepaSeleccionada[];
}

const CepaSelector = ({ 
  microorganismoSeleccionado, 
  abreviaturaSeleccionada,
  onCepaAgregada,
  onCepaRemovida,
  cepasAgregadas 
}: CepaSelectorProps) => {
  const [cepasDisponibles, setCepasDisponibles] = useState<Cepa[]>([]);
  const [loadingCepas, setLoadingCepas] = useState(false);
  const [cepaSeleccionada, setCepaSeleccionada] = useState<string>('');
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState<number>(1);
  const [showDropdown, setShowDropdown] = useState(false);

  // Cargar cepas cuando cambie el microorganismo
  useEffect(() => {
    if (microorganismoSeleccionado) {
      fetchCepasDisponibles();
    } else {
      setCepasDisponibles([]);
      setCepaSeleccionada('');
    }
  }, [microorganismoSeleccionado, abreviaturaSeleccionada]);

  const fetchCepasDisponibles = async () => {
    setLoadingCepas(true);
    try {
      const params = new URLSearchParams();
      if (microorganismoSeleccionado) {
        params.append('microorganismo', microorganismoSeleccionado);
      }
      if (abreviaturaSeleccionada) {
        params.append('abreviatura', abreviaturaSeleccionada);
      }

      const response = await fetch(`/api/cepas-disponibles?${params}`);
      const data = await response.json();
      
      if (data.success) {
        // Filtrar cepas que aún tienen cantidad disponible después de considerar todas las instancias agregadas
        const cepasFiltradasPorUsadas = data.cepas.filter((cepa: Cepa) => {
          // Calcular el total ya usado de esta cepa específica (sumar todas las instancias)
          const cantidadTotalYaUsada = cepasAgregadas
            .filter(c => c.cepaId === cepa.id)
            .reduce((total, c) => total + c.cantidad, 0);
          
          // Solo mostrar si aún tiene cantidad disponible
          const cantidadRestante = cepa.totalCantidadBolsas - cantidadTotalYaUsada;
          return cantidadRestante > 0;
        });
        
        setCepasDisponibles(cepasFiltradasPorUsadas);
      } else {
        console.error('Error loading cepas:', data.error);
        setCepasDisponibles([]);
      }
    } catch (error) {
      console.error('Error fetching cepas:', error);
      setCepasDisponibles([]);
    } finally {
      setLoadingCepas(false);
    }
  };

  const getCepaById = (id: string): Cepa | undefined => {
    return cepasDisponibles.find(cepa => cepa.id === id);
  };

  const getCantidadMaximaDisponible = (cepaId: string): number => {
    const cepa = getCepaById(cepaId);
    if (!cepa) return 0;
    
    // Calcular el total ya usado de esta cepa específica (sumar todas las instancias)
    const cantidadTotalYaUsada = cepasAgregadas
      .filter(c => c.cepaId === cepaId)
      .reduce((total, c) => total + c.cantidad, 0);
    
    return cepa.totalCantidadBolsas - cantidadTotalYaUsada;
  };

  const handleCepaChange = (cepaId: string) => {
    setCepaSeleccionada(cepaId);
    const maxDisponible = getCantidadMaximaDisponible(cepaId);
    setCantidadSeleccionada(Math.min(1, maxDisponible));
  };

  const handleAgregarCepa = () => {
    const cepa = getCepaById(cepaSeleccionada);
    if (!cepa || cantidadSeleccionada <= 0) return;

    const cepaData: CepaSeleccionada = {
      cepaId: cepa.id,
      cantidad: cantidadSeleccionada,
      microorganismo: Array.isArray(cepa.microorganismo) ? cepa.microorganismo[0] : cepa.microorganismo,
      abreviatura: Array.isArray(cepa.abreviatura) ? cepa.abreviatura[0] : cepa.abreviatura,
      codigoCepa: cepa.codigoCepa,
      totalDisponible: cepa.totalCantidadBolsas
    };

    onCepaAgregada(cepaData);
    
    // Reset selección pero mantener dropdown abierto para agregar más cepas
    setCepaSeleccionada('');
    setCantidadSeleccionada(1);
    
    // Recargar cepas para actualizar disponibilidad
    fetchCepasDisponibles();
  };

  const maxDisponible = cepaSeleccionada ? getCantidadMaximaDisponible(cepaSeleccionada) : 0;

  if (!microorganismoSeleccionado) {
    return (
      <div className="text-gray-500 text-sm italic">
        Selecciona un microorganismo primero para ver las cepas disponibles
      </div>
    );
  }

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-800">Cepas Disponibles</h4>
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={loadingCepas || cepasDisponibles.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium transition-all duration-200"
        >
          {loadingCepas ? 'Cargando...' : '+ Agregar Cepa'}
        </button>
      </div>

      {showDropdown && (
        <div className="space-y-4 border-t pt-4">
          {/* Selector de Cepa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Cepa
            </label>
            <select
              value={cepaSeleccionada}
              onChange={(e) => handleCepaChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
            >
              <option value="" className="text-gray-500">Selecciona una cepa...</option>
              {cepasDisponibles.map((cepa) => {
                const disponible = getCantidadMaximaDisponible(cepa.id);
                return (
                  <option key={cepa.id} value={cepa.id} disabled={disponible <= 0} className="text-gray-900">
                    {cepa.codigoCepa} - {disponible} bolsas disponibles
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selector de Cantidad */}
          {cepaSeleccionada && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad a usar (máximo: {maxDisponible})
              </label>
              <input
                type="number"
                min="1"
                max={maxDisponible}
                value={cantidadSeleccionada}
                onChange={(e) => setCantidadSeleccionada(Math.min(parseInt(e.target.value) || 1, maxDisponible))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-500"
                placeholder="Cantidad..."
              />
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAgregarCepa}
              disabled={!cepaSeleccionada || cantidadSeleccionada <= 0 || cantidadSeleccionada > maxDisponible}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium transition-all duration-200"
            >
              ✓ Agregar Cepa
            </button>
            <button
              type="button"
              onClick={() => setShowDropdown(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium transition-all duration-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Mostrar cepas agregadas */}
      {cepasAgregadas.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <h5 className="font-medium text-gray-700 mb-3">Cepas Seleccionadas ({cepasAgregadas.length}):</h5>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {cepasAgregadas.map((cepa, index) => (
              <div key={`${cepa.cepaId}-${index}`} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-green-700 bg-green-100 px-3 py-1 rounded-lg border-2 border-green-300">
                      {cepa.codigoCepa}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-gray-800 font-semibold">{cepa.cantidad} bolsas</span>
                      <span className="text-xs text-gray-500">{cepa.abreviatura}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onCepaRemovida(index)}
                  className="ml-3 text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-all duration-200 flex-shrink-0"
                  title="Remover cepa"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-700">
              <strong>Total bolsas seleccionadas:</strong> {cepasAgregadas.reduce((sum, cepa) => sum + cepa.cantidad, 0)}
            </div>
          </div>
        </div>
      )}

      {!loadingCepas && cepasDisponibles.length === 0 && microorganismoSeleccionado && (
        <div className="text-orange-600 text-sm mt-2">
          No hay cepas disponibles para {microorganismoSeleccionado}
        </div>
      )}
    </div>
  );
};

export default CepaSelector;
