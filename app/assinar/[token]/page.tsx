import { notFound } from 'next/navigation';
import AssinaturaClient from './AssinaturaClient';
import { getSigningRequest } from '@/lib/server/signature-service';

export default async function AssinarPage({ params }: PageProps<'/assinar/[token]'>) {
  const { token } = await params;
  const assinatura = await getSigningRequest(token);
  if (!assinatura) notFound();
  return (
    <AssinaturaClient
      token={token}
      documento={assinatura.documento.titulo}
      servidor={`${assinatura.servidor.nome} (${assinatura.servidor.matricula})`}
      expiracao={assinatura.dataExpiracao.toLocaleString('pt-BR')}
      assinado={Boolean(assinatura.assinadoEm)}
    />
  );
}
