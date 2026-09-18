import Link from 'next/link';

type DocumentCardProps = {
  doc: {
    id: string;
    titulo: string;
    data_upload: string;
    arquivo_url: string;
  };
};

export default function DocumentCard({ doc }: DocumentCardProps) {
  return (
    <article className="bg-card p-4 rounded border border-border">
      <h3 className="break-words font-semibold text-lg">{doc.titulo}</h3>
      <p className="text-sm text-muted-foreground">{doc.data_upload}</p>
      <div className="mt-3 flex items-center gap-2">
        <Link href={`/documentos/${doc.id}`} className="text-ssp-blue font-medium hover:underline">
          Abrir
        </Link>
        <a
          href={doc.arquivo_url}
          className="text-muted-foreground hover:text-ssp-blue hover:underline"
          aria-label={`Abrir arquivo de ${doc.titulo} em outra aba`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir arquivo
        </a>
      </div>
    </article>
  );
}
