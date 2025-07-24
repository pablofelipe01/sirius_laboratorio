const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Plataforma',
      links: [
        { href: '#analytics', label: 'Analítica IA' },
        { href: '#automation', label: 'Automatización' },
        { href: '#traceability', label: 'Trazabilidad' },
        { href: '#integration', label: 'Integración Global' },
      ],
    },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-xl px-3 py-1 rounded-lg">
                Sirius
              </div>
            </div>
            <p className="text-white mb-4 max-w-md">
              Sistema de gestión y control de procesos de producción de microorganismos. 
              Capturamos, estructuramos y analizamos datos con precisión científica y escalabilidad global.
            </p>
          </div>

          {/* Footer Sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-white hover:text-blue-300 transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-white text-sm">
            © {currentYear} Sirius. Todos los derechos reservados.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a
              href="#privacy"
              className="text-white hover:text-blue-300 text-sm transition-colors duration-200"
            >
              Política de Privacidad
            </a>
            <a
              href="#terms"
              className="text-white hover:text-blue-300 text-sm transition-colors duration-200"
            >
              Términos de Servicio
            </a>
            <a
              href="#cookies"
              className="text-white hover:text-blue-300 text-sm transition-colors duration-200"
            >
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
