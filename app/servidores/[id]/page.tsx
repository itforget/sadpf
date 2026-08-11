import { getServidorById, getDocumentosByServidor } from '@/lib/server/db';
import CapaPasta from '@/app/components/CapaPasta';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ServidorProfilePage({ params }: PageProps) {
  const { id } = await params;
  const servidor = await getServidorById(id);

  if (!servidor) {
    notFound();
  }

  const documentos = await getDocumentosByServidor(servidor.id);

  return <CapaPasta servidor={servidor} documentos={documentos} />;
}
