import { Alert, AlertDescription } from '@/components/ui/alert';
import AssinaturaClient from './AssinaturaClient';
import { getSigningRequest } from '@/lib/server/signature-service';

export default async function AssinarPage({ params }: PageProps<'/assinar/[token]'>) {
  const { token } = await params;
  const assinatura = await getSigningRequest(token);
  if (!assinatura)
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-bold">Convite de assinatura não encontrado</h1>
        <Alert variant="destructive">
          <AlertDescription>
            Confira o endereço recebido ou solicite um novo convite ao setor de Gestão de Pessoas.
          </AlertDescription>
        </Alert>
      </div>
    );
  return (
    <AssinaturaClient
      token={token}
      documento={assinatura.documento.titulo}
      servidor={`${assinatura.servidor.nome} (${assinatura.servidor.matricula})`}
      expiracao={assinatura.dataExpiracao.toLocaleString('pt-BR')}
      assinado={Boolean(assinatura.assinadoEm)}
      expirado={!assinatura.assinadoEm && assinatura.dataExpiracao <= new Date()}
    />
  );
}
