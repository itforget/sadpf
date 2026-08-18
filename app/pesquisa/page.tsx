'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search as SearchIcon, FileText, ArrowRight, ExternalLink, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { DocumentoPDF } from '@/lib/types';

import { fetchPesquisa } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type PesquisaResult = {
  resultados: DocumentoPDF[];
  tempoBusca: number;
};

function PesquisaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.pesquisa(submittedQuery),
    queryFn: async (): Promise<PesquisaResult> => {
      const start = performance.now();
      const resultados = await fetchPesquisa(submittedQuery);
      const end = performance.now();
      return {
        resultados,
        tempoBusca: parseFloat(((end - start) / 1000).toFixed(2)) || 0.08,
      };
    },
    enabled: submittedQuery.trim().length > 0,
  });

  const resultados = data?.resultados ?? [];
  const tempoBusca = data?.tempoBusca ?? 0.12;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    setSubmittedQuery(value);
    router.push(value ? `/pesquisa?q=${encodeURIComponent(value)}` : '/pesquisa');
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
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-14 rounded-full pl-14 pr-36 text-base shadow-corporate sm:text-lg"
          placeholder="Digite portarias, certidões, termos, averbações ou palavras-chave..."
        />
        <Button
          type="submit"
          disabled={isFetching}
          className="absolute right-2.5 rounded-full bg-ssp-blue px-6 hover:bg-ssp-blueDark"
        >
          {isFetching ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            'Pesquisar OCR'
          )}
        </Button>
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
              <Card
                key={doc.id}
                className="gap-0 border-ssp-blue/10 py-0 shadow-corporate transition-all hover:ring-ssp-blue/40"
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
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
                      <Badge
                        variant="outline"
                        className="h-auto rounded-md bg-muted px-2.5 py-1 font-mono"
                      >
                        Pág. 1-{doc.paginas}
                      </Badge>
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
                </CardContent>
              </Card>
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
