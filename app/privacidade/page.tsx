import Link from 'next/link';

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <h1 className="text-2xl font-bold text-foreground">Aviso de Privacidade</h1>
      <p className="text-muted-foreground">
        O SADPF trata dados funcionais para a gestão de pessoas e do acervo documental. Este aviso é
        um modelo técnico e deve ser aprovado e completado pelo controlador antes da entrada em
        produção.
      </p>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Informações que devem ser publicadas</h2>
        <p className="text-sm text-muted-foreground">
          Identificação e contato do controlador e do encarregado, previsão legal e finalidade de
          cada tratamento, categorias de dados, compartilhamentos, prazo de retenção, medidas de
          segurança e canal para exercer os direitos do titular.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Direitos do titular</h2>
        <p className="text-sm text-muted-foreground">
          Solicitações de confirmação, acesso, correção e informação sobre compartilhamentos devem
          ser encaminhadas ao canal oficial do encarregado, após validação segura de identidade.
        </p>
      </section>
      <p className="text-sm text-muted-foreground">
        Consulte o documento operacional de privacidade com os campos que precisam de aprovação
        institucional.
      </p>
      <Link href="/login" className="text-sm font-semibold text-ssp-blue hover:underline">
        Acessar o sistema
      </Link>
    </div>
  );
}
