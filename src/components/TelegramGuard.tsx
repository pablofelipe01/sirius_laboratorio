'use client';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Número 404 con efecto */}
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4 select-none">
            404
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
        </div>

        {/* Contenido principal */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <div className="text-4xl mb-4">🔍</div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Página no encontrada
          </h2>
          
          <p className="text-gray-600 mb-8 leading-relaxed">
            Lo sentimos, la página que estás buscando no existe o ha sido movida.
            <br />
            <span className="text-sm text-gray-500 mt-2 block">
              Verifica la URL o regresa a la página principal.
            </span>
          </p>

          {/* Botones con mejor diseño */}
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            >
              ← Volver atrás
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm hover:shadow-md"
            >
              🏠 Ir al inicio
            </button>
          </div>

          {/* Enlaces adicionales */}
          <div className="mt-8 pt-6 border-t border-gray-200">
                   </div>
        </div>

        {/* Footer discreto */}
        <div className="mt-6 text-xs text-gray-500">
          <p>Error 404 - Recurso no encontrado</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;