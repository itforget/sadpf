'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Search, Plus, Filter, ArrowRight } from 'lucide-react';
import type { DocumentoPDF } from '@/lib/types';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<DocumentoPDF[]>([]);
  const [categoriaFilter, setCategoriaFilter] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const categorias = [
    'Todas',
    'Dados Pessoais',
    'Posse e Exercício',
    'Vida Funcional',
    'Licenças e Afastamentos',
    'Avaliação de Desempenho',
  ];

  useEffect(() => {
    fetch('/api/pesquisa?q=')
      .then((res) => res.json())
      .then((data) => setDocumentos(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const filteredDocs = documentos.filter((d) => {
    const matchCat = categoriaFilter === 'Todas' || d.categoria === categoriaFilter;
    const matchQuery =
      !searchQuery ||
      d.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.textoOCR.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Acervo de Documentos (PDFs)
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulta unificada de todos os documentos funcionais digitalizados da SSP-DF.
          </p>
        </div>

        <Link
          href="/documentos/novo"
          className={buttonVariants({ className: 'bg-ssp-blue hover:bg-ssp-blueDark' })}
        >
          <Plus size={18} className="mr-2" /> Anexar Documento PDF
        </Link>
      </div>

      <div className="bg-card p-4 rounded-xl border border-border shadow-corporate flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            type="search"
            placeholder="Buscar por título ou trecho de texto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter size={16} className="text-muted-foreground shrink-0" />
          {categorias.map((cat) => (
            <Button
              key={cat}
              variant={categoriaFilter === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoriaFilter(cat)}
              className={categoriaFilter === cat ? 'bg-ssp-blue hover:bg-ssp-blueDark' : ''}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground space-y-3">
          <div className="w-8 h-8 border-4 border-ssp-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold">Carregando acervo de documentos...</p>
        </div>
      ) : filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className="hover:shadow-md hover:border-ssp-blue/30 transition-all flex flex-col"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className="text-ssp-blue border-ssp-blue/20 bg-ssp-blue/10"
                  >
                    {doc.categoria}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">{doc.tamanho}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <Link
                  href={`/documentos/${doc.id}`}
                  className="font-bold text-foreground text-base hover:text-ssp-blue transition-colors flex items-start gap-2"
                >
                  <FileText size={20} className="text-ssp-blue shrink-0 mt-0.5" />
                  <span className="line-clamp-2 leading-snug">{doc.titulo}</span>
                </Link>
                {doc.processoSEI && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    SEI: {doc.processoSEI}
                  </p>
                )}
              </CardContent>
              <CardFooter className="pt-3 border-t border-border flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Enviado: {doc.dataUpload}</span>
                <Link
                  href={`/documentos/${doc.id}`}
                  className="inline-flex items-center gap-1 text-ssp-blue hover:text-ssp-blueDark font-bold"
                >
                  Visualizar PDF <ArrowRight size={14} />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-muted-foreground space-y-3 bg-card rounded-2xl border border-border">
          <FileText size={48} className="mx-auto opacity-40" />
          <p className="font-semibold text-base">Nenhum documento encontrado.</p>
          <p className="text-xs">
            Tente ajustar o termo de pesquisa ou trocar o filtro por categoria.
          </p>
        </div>
      )}
    </div>
  );
}
