export default function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header específico del laboratorio */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg px-3 py-1 rounded-lg">
                DataLab
              </div>
              <div className="text-gray-600">
                <span className="text-sm">Sistema Interno |</span>
                <span className="text-sm font-medium"> Centro de Investigación Regenerativa</span>
              </div>
            </div>
            
            {/* Indicador de sesión activa */}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Sistema Activo</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main>
        {children}
      </main>

      {/* Footer mínimo */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            DataLab v2.1 | Centro de Investigación Regenerativa | 
            <span className="ml-2">Datos protegidos bajo confidencialidad científica</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
