import { notFound } from 'next/navigation';

import ServidorClient from './servidor-client';
import { getDocumentosByServidor } from '@/lib/server/repositories/documento';
import { getServidorById } from '@/lib/server/repositories/servidor';

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

  return <ServidorClient id={servidor.id} initialData={{ servidor, documentos }} />;
}
