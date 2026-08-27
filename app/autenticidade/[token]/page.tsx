import { CheckCircle2, CircleX, FileCheck2, ShieldCheck } from 'lucide-react';
import { getPublicVerification } from '@/lib/server/signature-service';

export default async function AutenticidadePage({ params }: PageProps<'/autenticidade/[token]'>) {
  const { token } = await params;
  const verificacao = await getPublicVerification(token);
  const autentico = verificacao.status === 'signed';
  const assinatura = autentico ? verificacao : null;
  const mensagemStatus = {
    pending: 'Este convite ainda não foi assinado.',
    expired: 'Este convite expirou e não pode mais ser assinado.',
    invalid: 'O código informado não corresponde a uma assinatura registrada.',
  } as const;

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
          <div className="flex items-start gap-3">
            {autentico ? (
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-status-success"
                size={30}
              />
            ) : (
              <CircleX
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-status-danger"
                size={30}
              />
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-bold">
                {autentico ? 'Assinatura autêntica' : 'Assinatura não validada'}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {autentico
                  ? 'Os dados abaixo foram confirmados pelo SADPF.'
                  : mensagemStatus[verificacao.status as keyof typeof mensagemStatus]}
              </p>
            </div>
          </div>

          {autentico && assinatura ? (
            <div className="divide-y divide-border rounded-xl border border-border text-sm">
              <div className="flex items-center gap-2 bg-status-success/10 px-4 py-3 font-semibold text-status-success">
                <FileCheck2 aria-hidden="true" size={18} />
                <span>Documento autenticado eletronicamente</span>
              </div>
              <dl className="grid gap-x-6 gap-y-5 p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Documento
                  </dt>
                  <dd className="mt-1 break-words font-medium">{assinatura.documento.titulo}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Assinado por
                  </dt>
                  <dd className="mt-1 font-medium">{assinatura.servidor.nome}</dd>
                  <dd className="text-xs text-muted-foreground">
                    Matrícula {assinatura.servidor.matricula}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Data e hora
                  </dt>
                  <dd className="mt-1 font-medium">
                    {assinatura.assinadoEm?.toLocaleString('pt-BR') ?? 'Não informado'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Validade do registro
                  </dt>
                  <dd className="mt-1 font-medium">Registro permanente</dd>
                </div>
              </dl>
              <div className="break-all bg-muted/50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Código de validação
                </p>
                <p className="mt-1 font-mono text-xs text-foreground">{token}</p>
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
