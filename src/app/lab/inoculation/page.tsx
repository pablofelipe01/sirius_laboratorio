import { Metadata } from 'next';
import MushroomInoculationForm from '@/components/MushroomInoculationForm';

export const metadata: Metadata = {
  title: 'Formulario de Inoculación | DataLab CIR',
  description: 'Sistema de registro de inoculación de hongos para el Centro de Investigación Regenerativa',
  robots: 'noindex, nofollow', // Evita que aparezca en buscadores
};

export default function InoculationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MushroomInoculationForm />
    </div>
  );
}
