'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search as SearchIcon, FileText, ArrowRight, ExternalLink, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { DocumentoPDF } from '@/lib/types';

function PesquisaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [resultados, setResultados] = useState<DocumentoPDF[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempoBusca, setTempoBusca] = useState(0.12);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(`/api/pesquisa?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      setResultados(data);
    } catch (e) {
      console.error(e);
    } finally {
      const end = performance.now();
      setTempoBusca(parseFloat(((end - start) / 1000).toFixed(2)) || 0.08);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialQuery) return;

    const searchOnLoad = async () => {
      await performSearch(initialQuery);
    };

    void searchOnLoad();
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/pesquisa?q=${encodeURIComponent(query)}`);
    performSearch(query);
  };

  const highlightMatch = (text: string, term: string) => {
    if (!term || !term.trim()) return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark
          key={index}
          className="bg-status-warning/40 text-foreground font-semibold px-1 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center p-4 bg-ssp-blue/10 rounded-full mb-4">
          <SearchIcon size={36} className="text-ssp-blue" strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
          Pesquisa de Conteúdo OCR em PDFs
        </h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Localização exata de termos e palavras-chave dentro do texto dos arquivos PDF das pastas
          funcionais dos servidores da SSP-DF.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative flex items-center">
        <SearchIcon className="absolute left-5 text-muted-foreground" size={22} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-14 pr-36 py-4 text-base sm:text-lg bg-card border border-border shadow-corporate rounded-full focus:outline-none focus:ring-2 focus:ring-ssp-blue focus:border-transparent transition-all"
          placeholder="Digite portarias, certidões, termos, averbações ou palavras-chave..."
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2.5 bg-ssp-blue text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-ssp-blueDark transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-ssp-blue flex items-center gap-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            'Pesquisar OCR'
          )}
        </button>
      </form>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3 text-xs text-muted-foreground font-medium">
          <span>
            {resultados.length} resultados encontrados ({tempoBusca} segundos) para{' '}
            <strong>&quot;{query}&quot;</strong>
          </span>
          <span className="flex items-center gap-1 text-ssp-blue font-bold">
            <Sparkles size={14} /> Indexação em tempo real (ElasticSearch / OCR)
          </span>
        </div>

        {resultados.length > 0 ? (
          <div className="space-y-4">
            {resultados.map((doc) => (
              <article
                key={doc.id}
                className="bg-card p-5 sm:p-6 rounded-2xl border border-border hover:border-ssp-blue/40 transition-all shadow-corporate group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div>
                    <Link
                      href={`/documentos/${doc.id}`}
                      className="text-lg font-bold text-ssp-blue hover:underline hover:text-ssp-blueDark flex items-center gap-2"
                    >
                      <FileText size={20} className="shrink-0 text-ssp-blue" />
                      {doc.titulo}
                    </Link>
                    <div className="flex items-center gap-2 text-xs font-semibold text-status-success mt-1.5 flex-wrap">
                      <span>Categoria: {doc.categoria}</span>
                      <ArrowRight size={12} />
                      <Link href={`/servidores/${doc.servidorId}`} className="hover:underline">
                        Ver Pasta do Servidor
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-md border border-border font-mono">
                      Pág. 1-{doc.paginas}
                    </span>
                    <Link
                      href={`/documentos/${doc.id}`}
                      className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors"
                      title="Abrir documento"
                    >
                      <ExternalLink size={18} />
                    </Link>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed font-serif bg-muted/30 p-3.5 rounded-xl border border-border">
                  &quot;{highlightMatch(doc.textoOCR, query)}&quot;
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground space-y-3 bg-card rounded-2xl border border-border">
            <SearchIcon size={48} className="mx-auto opacity-40" />
            <p className="font-bold text-base text-foreground">
              Nenhum resultado de OCR para &quot;{query}&quot;
            </p>
            <p className="text-xs">
              Tente usar termos mais abrangentes como ‘portaria’, ‘posse’, ‘licença’ ou ‘servidor’.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PesquisaPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in zoom-in-95 duration-500">
      <Suspense
        fallback={
          <div className="p-8 text-center text-muted-foreground">
            Carregando mecanismo de pesquisa...
          </div>
        }
      >
        <PesquisaContent />
      </Suspense>
    </div>
  );
}
