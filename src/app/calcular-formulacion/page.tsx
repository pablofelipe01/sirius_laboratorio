'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Microorganismo {
  id: string;
  nombre: string;
  tipo?: string;
}

interface Insumo {
  nombre: string;
  cantidad: number;
  unidad: string;
  descripcion: string;
}

interface FormulacionResultado {
  microorganismo: string;
  litrosProduccion: number;
  bolsasNecesarias: number;
  insumos: Insumo[];
}

interface FormulaComponent {
  cantidad: number;
  unidad: string;
  descripcion: string;
  categoria?: string;
}

interface Formula {
  [key: string]: FormulaComponent;
}

interface Formulas {
  FORMULA_BACILLUS: Formula;
  FORMULA_AZOTOBACTER: Formula;
  FORMULA_AZOSPIRILLUM: Formula;
  FORMULA_PSEUDOMONAS: Formula;
  FORMULA_SIRIUSBACTER_COMPLETA: Formula;
  FORMULA_BASE: Formula;
}

// Para Bacillus se calcula directamente por litros, para otras bacterias por bolsas
const BOLSAS_POR_LITRO = 4;

export default function CalcularFormulacionPage() {
  const { isAuthenticated } = useAuth();
  const [microorganismos, setMicroorganismos] = useState<Microorganismo[]>([]);
  const [microorganismoSeleccionado, setMicroorganismoSeleccionado] = useState<string>('');
  const [litrosProduccion, setLitrosProduccion] = useState<string>('');
  const [resultado, setResultado] = useState<FormulacionResultado | null>(null);
  const [error, setError] = useState<string>('');
  const [formulas, setFormulas] = useState<Formulas | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Cargar fórmulas desde la API
  useEffect(() => {
    const cargarFormulas = async () => {
      try {
        const response = await fetch('/api/formulas');
        const data = await response.json();
        setFormulas(data);
      } catch (error) {
        console.error('Error loading formulas:', error);
        setError('Error al cargar las fórmulas de producción');
      } finally {
        setLoading(false);
      }
    };

    cargarFormulas();
  }, []);

  // Cargar microorganismos disponibles
  useEffect(() => {
    if (isAuthenticated) {
      cargarMicroorganismos();
    }
  }, [isAuthenticated]);

  const cargarMicroorganismos = async () => {
    try {
      const response = await fetch('/api/microorganismos');
      const data = await response.json();
      
      if (data.success) {
        // Filtrar SOLO bacterias (filtro estricto)
        const bacterias = data.microorganismos.filter((micro: Microorganismo) => {
          if (!micro.tipo) return false;
          const tipoLower = micro.tipo.toLowerCase().trim();
          return tipoLower === 'bacteria' || 
                 tipoLower === 'bacterias' || 
                 tipoLower.startsWith('bacteria ') ||
                 tipoLower.endsWith(' bacteria');
        });
        console.log('Microorganismos filtrados (solo bacterias):', bacterias);
        setMicroorganismos(bacterias);
      } else {
        setError('Error al cargar microorganismos');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión al cargar microorganismos');
    }
  };

  // Cálculo automático en tiempo real
  useEffect(() => {
    if (!microorganismoSeleccionado || !litrosProduccion || !formulas) {
      setResultado(null);
      setError('');
      return;
    }

    const litros = parseFloat(litrosProduccion);
    if (isNaN(litros) || litros <= 0) {
      setResultado(null);
      if (litrosProduccion !== '') {
        setError('Los litros deben ser un número positivo');
      } else {
        setError('');
      }
      return;
    }

    setError('');

    // Encontrar nombre del microorganismo
    const microorganismoInfo = microorganismos.find(m => m.id === microorganismoSeleccionado);
    const nombreMicroorganismo = microorganismoInfo?.nombre || '';

    // Detectar tipo de microorganismo específico
    const nombreLower = nombreMicroorganismo.toLowerCase();
    const esBacillus = nombreLower.includes('bacillus') || nombreLower.includes('thuringiensis');
    const esAzotobacter = nombreLower.includes('azotobacter');
    const esAzospirillum = nombreLower.includes('azospirillum'); 
    const esPseudomonas = nombreLower.includes('pseudomonas');
    const esSiriusbacterCompleto = nombreLower.includes('siriusbacter') || nombreLower.includes('sirius bacter');

    let insumosCalculados: Insumo[];
    let bolsasNecesarias: number;
    let formulaUsada = '';

    if (esAzotobacter) {
      // AZOTOBACTER - Solo sus componentes
      insumosCalculados = Object.entries(formulas.FORMULA_AZOTOBACTER).map(([nombre, datos]) => ({
        nombre,
        cantidad: datos.cantidad * litros,
        unidad: datos.unidad,
        descripcion: datos.descripcion
      }));
      bolsasNecesarias = 0;
      formulaUsada = 'AZOTOBACTER';
    } else if (esAzospirillum) {
      // AZOSPIRILLUM - Solo sus componentes
      insumosCalculados = Object.entries(formulas.FORMULA_AZOSPIRILLUM).map(([nombre, datos]) => ({
        nombre,
        cantidad: datos.cantidad * litros,
        unidad: datos.unidad,
        descripcion: datos.descripcion
      }));
      bolsasNecesarias = 0;
      formulaUsada = 'AZOSPIRILLUM';
    } else if (esPseudomonas) {
      // PSEUDOMONAS - Solo sus componentes
      insumosCalculados = Object.entries(formulas.FORMULA_PSEUDOMONAS).map(([nombre, datos]) => ({
        nombre,
        cantidad: datos.cantidad * litros,
        unidad: datos.unidad,
        descripcion: datos.descripcion
      }));
      bolsasNecesarias = 0;
      formulaUsada = 'PSEUDOMONAS';
    } else if (esSiriusbacterCompleto) {
      // SIRIUS BACTER COMPLETO - Todas las subformulaciones con categorías
      insumosCalculados = Object.entries(formulas.FORMULA_SIRIUSBACTER_COMPLETA).map(([nombre, datos]) => ({
        nombre,
        cantidad: datos.cantidad * litros,
        unidad: datos.unidad,
        descripcion: datos.categoria ? `${datos.descripcion} [${datos.categoria}]` : datos.descripcion
      }));
      bolsasNecesarias = 0;
      formulaUsada = 'SIRIUS BACTER';
    } else if (esBacillus) {
      // Para Bacillus usar fórmula específica (cálculo directo por litros)
      insumosCalculados = Object.entries(formulas.FORMULA_BACILLUS).map(([nombre, datos]) => ({
        nombre,
        cantidad: datos.cantidad * litros,
        unidad: datos.unidad,
        descripcion: datos.descripcion
      }));
      bolsasNecesarias = 0; // No aplica para Bacillus
    } else {
      // Para otras bacterias usar fórmula genérica (cálculo por bolsas)
      bolsasNecesarias = Math.ceil(litros * BOLSAS_POR_LITRO);
      insumosCalculados = Object.entries(formulas.FORMULA_BASE).map(([nombre, datos]) => ({
        nombre,
        cantidad: datos.cantidad * bolsasNecesarias,
        unidad: datos.unidad,
        descripcion: datos.descripcion
      }));
    }

    const resultadoCalculado: FormulacionResultado = {
      microorganismo: nombreMicroorganismo,
      litrosProduccion: litros,
      bolsasNecesarias,
      insumos: insumosCalculados
    };

    // Agregar información de la fórmula usada para la interfaz
    (resultadoCalculado as any).formulaUsada = formulaUsada;

    setResultado(resultadoCalculado);
  }, [microorganismoSeleccionado, litrosProduccion, microorganismos, formulas]);

  const limpiarFormulario = () => {
    setMicroorganismoSeleccionado('');
    setLitrosProduccion('');
    setResultado(null);
    setError('');
  };

  const formatearCantidad = (cantidad: number, unidad: string) => {
    // Formatear números pequeños con más decimales
    if (cantidad < 1) {
      return `${cantidad.toFixed(3)} ${unidad}`;
    } else if (cantidad < 10) {
      return `${cantidad.toFixed(2)} ${unidad}`;
    } else {
      return `${Math.round(cantidad)} ${unidad}`;
    }
  };

  return (
    <>
      <Navbar />
      <div 
        className="min-h-screen relative pt-24"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6 text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🧮 CALCULAR FORMULACIÓN
              </h1>
              <p className="text-gray-600">
                Determine los insumos químicos necesarios para la producción de bacterias
              </p>
            </div>

            {!isAuthenticated ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Requerido</h2>
                <p className="text-gray-600">
                  Debe iniciar sesión para acceder al calculador de formulaciones.
                </p>
              </div>
            ) : loading ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Cargando...</h2>
                <p className="text-gray-600">
                  Cargando fórmulas de producción...
                </p>
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Formulario de entrada */}
                <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    Parámetros
                  </h2>

                  <div className="space-y-6">                    {/* Selector de microorganismo */}
                    <div>
                      <label htmlFor="microorganismo" className="block text-sm font-medium text-gray-700 mb-2">
                        Bacteria *
                      </label>
                      <select
                        id="microorganismo"
                        value={microorganismoSeleccionado}
                        onChange={(e) => setMicroorganismoSeleccionado(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                        required
                      >
                        <option value="" className="text-gray-700">Seleccione una bacteria...</option>
                        {microorganismos.map((micro) => (
                          <option key={micro.id} value={micro.id} className="text-gray-900">
                            {micro.nombre} {micro.tipo && `(${micro.tipo})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Input de litros */}
                    <div>
                      <label htmlFor="litros" className="block text-sm font-medium text-gray-700 mb-2">
                        Litros a Producir *
                      </label>
                      <input
                        type="number"
                        id="litros"
                        value={litrosProduccion}
                        onChange={(e) => setLitrosProduccion(e.target.value)}
                        placeholder="Ej: 10"
                        min="0.1"
                        step="0.1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-600"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Especifique cuántos litros del producto final necesita
                      </p>
                      {microorganismoSeleccionado && litrosProduccion && !error && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-green-600">
                          <span className="animate-pulse">⚡</span>
                          <span>Calculando automáticamente...</span>
                        </div>
                      )}
                    </div>

                    {/* Mensaje de error */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-red-500">⚠️</span>
                          <p className="text-red-700 text-sm">{error}</p>
                        </div>
                      </div>
                    )}

                    {/* Botón Limpiar */}
                    <div className="flex justify-end">
                      <button
                        onClick={limpiarFormulario}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                      >
                        Limpiar Formulario
                      </button>
                    </div>
                  </div>
                </div>

                {/* Resultados */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <span className="text-xl">📋</span>
                    Formulación Calculada
                    {resultado && (
                      <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-normal">
                        ✓ Actualizado
                      </span>
                    )}
                  </h2>

                  {resultado ? (
                    <div className="space-y-6">
                      {/* Información general */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 mb-1">Bacteria:</p>
                            <p className="font-semibold text-gray-900">{resultado.microorganismo}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Litros:</p>
                            <p className="font-semibold text-gray-900">{resultado.litrosProduccion}L</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Cálculo:</p>
                            <p className="font-semibold text-gray-900">
                              {resultado.bolsasNecesarias > 0 ? `${resultado.bolsasNecesarias} bolsas` : 'Directo por litros'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Fórmula:</p>
                            <p className="font-semibold text-gray-900">
                              {(resultado as any).formulaUsada || 
                               (resultado.microorganismo.toLowerCase().includes('bacillus') ? 'BT Sirius' : 'Estándar')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Lista de insumos */}
                      <div>
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          Insumos Requeridos 
                          <span className="text-sm font-normal bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {resultado.insumos.length}
                          </span>
                        </h3>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                          {resultado.insumos.map((insumo, index) => {
                            // Detectar si tiene categoría en la descripción
                            const tieneCategoria = insumo.descripcion.includes('[') && insumo.descripcion.includes(']');
                            const categoria = tieneCategoria 
                              ? insumo.descripcion.match(/\[([^\]]+)\]/)?.[1] || null
                              : null;
                            
                            // Colores por categoría
                            const getColorCategoria = (cat: string | null) => {
                              switch(cat) {
                                case 'AZOTOBACTER': return 'bg-blue-50 border-blue-200 text-blue-700';
                                case 'AZOSPIRILLUM': return 'bg-green-50 border-green-200 text-green-700';
                                case 'PSEUDOMONAS': return 'bg-purple-50 border-purple-200 text-purple-700';
                                case 'ADITIVOS': return 'bg-orange-50 border-orange-200 text-orange-700';
                                default: return 'bg-gray-50 border-gray-200 text-gray-700';
                              }
                            };

                            return (
                              <div key={index} className={`rounded-lg p-4 border ${getColorCategoria(categoria)}`}>
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1 pr-4">
                                    <h4 className="font-semibold text-gray-900 mb-1">
                                      {insumo.nombre}
                                    </h4>
                                    {categoria && (
                                      <span className="inline-block px-2 py-1 text-xs font-medium bg-white rounded-full mb-2">
                                        {categoria}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-lg font-bold text-blue-600 whitespace-nowrap">
                                    {formatearCantidad(insumo.cantidad, insumo.unidad)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {insumo.descripcion.replace(/\s*\[[^\]]+\]\s*/, '')}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Nota informativa */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <span className="text-yellow-600 mt-0.5">💡</span>
                          <div>
                            <p className="text-yellow-800 text-sm font-medium mb-1">Nota Importante:</p>
                            <p className="text-yellow-700 text-sm">
                              Fórmula específica para <strong>{(resultado as any).formulaUsada || 'bacteria seleccionada'}</strong>. 
                              Verifique la disponibilidad de insumos en el inventario antes de proceder.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <div className="text-4xl mb-4">🧪</div>
                        <p className="text-lg font-medium">Seleccione una bacteria y especifique los litros</p>
                        <p className="text-sm">Los resultados aparecerán automáticamente</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
