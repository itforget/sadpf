import { CheckCircle2, CircleX, FileCheck2, ShieldCheck } from 'lucide-react';
import { getAssinaturaEletronica } from '@/lib/server/db';

export default async function AutenticidadePage({ params }: PageProps<'/autenticidade/[token]'>) {
  const { token } = await params;
  const assinatura = await getAssinaturaEletronica(token);
  const autentico = Boolean(assinatura?.assinadoEm);

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-corporate">
        <div className="border-b border-border bg-ssp-blue px-6 py-7 text-white sm:px-10">
          <div className="flex items-center gap-3">
            <ShieldCheck size={32} strokeWidth={1.8} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                SADPF · SSP-DF
              </p>
              <h1 className="mt-1 text-2xl font-bold">Validação de assinatura</h1>
            </div>
          </div>
        </div>
        <div className="space-y-6 p-6 sm:p-10">
          <div className="flex items-center gap-3">
            {autentico ? (
              <CheckCircle2 className="text-status-success" size={30} />
            ) : (
              <CircleX className="text-status-danger" size={30} />
            )}
            <div>
              <h2 className="text-xl font-bold">
                {autentico ? 'Assinatura autêntica' : 'Assinatura não validada'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {autentico
                  ? 'Os dados abaixo foram confirmados pelo SADPF.'
                  : 'Não foi possível confirmar os dados desta assinatura.'}
              </p>
            </div>
          </div>

          {autentico && assinatura ? (
            <div className="divide-y divide-border rounded-xl border border-border text-sm">
              <p className="flex items-center gap-2 bg-status-success/10 px-4 py-3 font-semibold text-status-success">
                <FileCheck2 size={18} /> Documento autenticado eletronicamente
              </p>
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Documento
                  </p>
                  <p className="mt-1 font-medium">{assinatura.documento.titulo}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Assinado por
                  </p>
                  <p className="mt-1 font-medium">{assinatura.servidor.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    Matrícula {assinatura.servidor.matricula}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Data e hora
                  </p>
                  <p className="mt-1 font-medium">
                    {assinatura.assinadoEm?.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Validade do registro
                  </p>
                  <p className="mt-1 font-medium">Registro permanente</p>
                </div>
              </div>
              <div className="break-all bg-muted/50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Código de validação
                </p>
                <p className="mt-1 font-mono text-xs">{token}</p>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              Verifique se o token informado corresponde ao exibido no documento.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
