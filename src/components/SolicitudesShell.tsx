import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

/**
 * Marco de las páginas de solicitudes: la foto del laboratorio con el velo
 * oscuro que ya usan las demás vistas, más el Navbar y el Footer de DataLab.
 *
 * Existe para no repetir ese cromado en cuatro páginas. `superficie-noche` (del
 * paquete) da el color de texto claro por herencia: sin ella, cualquier texto al
 * que se le olvide una clase de color hereda el `--foreground` del body —gris casi
 * negro— y desaparece sobre la foto. El `pt-24` deja libre el Navbar, que es fijo.
 */
const FONDO =
  "linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')";

export function SolicitudesShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="superficie-noche relative min-h-screen pt-24 text-white"
      style={{
        backgroundImage: FONDO,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        // `fixed` mantiene la foto quieta al desplazar, como en el resto de DataLab.
        backgroundAttachment: 'fixed',
      }}
    >
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
