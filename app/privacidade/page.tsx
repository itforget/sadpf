import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Aviso de privacidade</h1>
      <Alert>
        <AlertDescription>
          O aviso institucional completo e os contatos do controlador e do encarregado ainda não
          foram disponibilizados nesta página.
        </AlertDescription>
      </Alert>
      <p className="leading-relaxed text-muted-foreground">
        O SADPF organiza dados funcionais e documentos para a gestão de pessoas e do acervo
        documental da SSP-DF. O acesso ao sistema é restrito a usuários autorizados.
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Dados e registros de acesso</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          As pastas funcionais reúnem dados cadastrais e documentos dos servidores. Operações no
          sistema geram registros de auditoria para acompanhamento pelo setor responsável.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Solicitações sobre seus dados</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Para informações sobre sua pasta funcional ou correção de dados cadastrais, procure o
          setor de Gestão de Pessoas da SSP-DF pelos canais institucionais que você utiliza.
        </p>
      </section>
      <Link
        href="/login"
        className="inline-block text-sm font-semibold text-ssp-blue hover:underline"
      >
        Voltar ao login
      </Link>
    </div>
  );
}
