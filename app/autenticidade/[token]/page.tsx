import { CheckCircle2, CircleX, FileCheck2 } from 'lucide-react';
import { getAssinaturaEletronica } from '@/lib/server/db';

export default async function AutenticidadePage({ params }: PageProps<'/autenticidade/[token]'>) {
  const { token } = await params;
  const assinatura = await getAssinaturaEletronica(token);
  const autentico = Boolean(assinatura?.assinadoEm);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <section className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-corporate">
        <div className="flex items-center gap-3">
          {autentico ? (
            <CheckCircle2 className="text-status-success" size={30} />
          ) : (
            <CircleX className="text-status-danger" size={30} />
          )}
          <div>
            <h1 className="text-xl font-bold">Verificação de autenticidade</h1>
            <p className="text-sm text-muted-foreground">
              {autentico
                ? 'Este documento possui uma assinatura eletrônica válida.'
                : 'Não foi possível confirmar a autenticidade deste documento.'}
            </p>
          </div>
        </div>

        {autentico && assinatura ? (
          <div className="space-y-3 rounded-xl bg-muted p-4 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <FileCheck2 className="text-ssp-blue" size={18} /> Documento autenticado
            </p>
            <p>
              <strong>Documento:</strong> {assinatura.documento.titulo}
            </p>
            <p>
              <strong>Assinado por:</strong> {assinatura.servidor.nome} (
              {assinatura.servidor.matricula})
            </p>
            <p>
              <strong>Data da assinatura:</strong> {assinatura.assinadoEm?.toLocaleString('pt-BR')}
            </p>
            <p className="break-all">
              <strong>Token de verificação:</strong> {token}
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Verifique se o token informado corresponde ao exibido no documento.
          </p>
        )}
      </section>
    </main>
  );
}
