import { notFound } from 'next/navigation';
import AssinaturaClient from './AssinaturaClient';
import { getAssinaturaEletronica } from '@/lib/server/db';

export default async function AssinarPage({ params }: PageProps<'/assinar/[token]'>) {
  const { token } = await params;
  const assinatura = await getAssinaturaEletronica(token);
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
