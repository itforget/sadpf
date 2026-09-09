'use client';

import { useState, type DragEvent } from 'react';
import {
  User,
  Briefcase,
  MapPin,
  CalendarDays,
  Mail,
  Phone,
  Printer,
  Download,
  Plus,
  FileText,
  BadgeCheck,
  Search,
  ChevronDown,
  ChevronUp,
  Pencil,
  Camera,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import type { Servidor, DocumentoPDF } from '@/lib/types';
import EditarServidorModal from './EditarServidorModal';
import EditarDocumentoModal from './EditarDocumentoModal';
import Image from 'next/image';
import { fetchBlob, fetchJson } from '@/lib/client/api';
import { CATEGORIAS_DOCUMENTO } from '@/lib/documentos';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface CapaPastaProps {
  servidor: Servidor;
  documentos: DocumentoPDF[];
}

const CORES_CATEGORIA: Record<DocumentoPDF['categoria'], { cartao: string; etiqueta: string }> = {
  'Pasta Física Digitalizada': {
    cartao: 'bg-ssp-blue/5 border-ssp-blue/20 hover:border-ssp-blue/50',
    etiqueta: 'text-ssp-blue bg-ssp-blue/10 border-ssp-blue/20',
  },
  'Posse Eletrônica': {
    cartao: 'bg-status-success/5 border-status-success/20 hover:border-status-success/50',
    etiqueta: 'text-status-success bg-status-success/10 border-status-success/20',
  },
  'Documentos Pessoais': {
    cartao: 'bg-muted border-border hover:border-ssp-blue/50',
    etiqueta: 'text-muted-foreground bg-muted border-border',
  },
  Publicações: {
    cartao: 'bg-status-warning/5 border-status-warning/20 hover:border-status-warning/50',
    etiqueta: 'text-status-warning bg-status-warning/10 border-status-warning/20',
  },
  'Certidões/Declarações': {
    cartao: 'bg-status-danger/5 border-status-danger/20 hover:border-status-danger/50',
    etiqueta: 'text-status-danger bg-status-danger/10 border-status-danger/20',
  },
  Processos: {
    cartao: 'bg-ssp-blue/5 border-ssp-blue/20 hover:border-ssp-blue/50',
    etiqueta: 'text-ssp-blue bg-ssp-blue/10 border-ssp-blue/20',
  },
  Outros: {
    cartao: 'bg-muted border-border hover:border-ssp-blue/50',
    etiqueta: 'text-muted-foreground bg-muted border-border',
  },
};

export default function CapaPasta({ servidor, documentos }: CapaPastaProps) {
  const [documentosOrdenados, setDocumentosOrdenados] = useState(documentos);
  const [documentoMovendo, setDocumentoMovendo] = useState<string | null>(null);
  const [documentoArrastado, setDocumentoArrastado] = useState<string | null>(null);
  const [documentoSobreposto, setDocumentoSobreposto] = useState<string | null>(null);
  const [editorServidor, setEditorServidor] = useState<'dados' | 'foto' | null>(null);
  const [documentoEditando, setDocumentoEditando] = useState<DocumentoPDF | null>(null);
  const [documentoExcluindo, setDocumentoExcluindo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Todos');
  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [consultaExecutada, setConsultaExecutada] = useState('');
  const [paginasEncontradas, setPaginasEncontradas] = useState<Record<string, number[]>>({});
  const [pesquisaEmAndamento, setPesquisaEmAndamento] = useState(false);
  const [erroPesquisa, setErroPesquisa] = useState<string | null>(null);

  const categorias = ['Todos', ...CATEGORIAS_DOCUMENTO];

  const filteredDocs = documentosOrdenados.filter((doc) => {
    const matchCategory = activeTab === 'Todos' || doc.categoria === activeTab;
    const query = searchDocQuery.trim().toLocaleLowerCase('pt-BR');
    const matchQuery =
      !query ||
      doc.titulo.toLocaleLowerCase('pt-BR').includes(query) ||
      (consultaExecutada === searchDocQuery.trim() &&
        (paginasEncontradas[doc.id]?.length ?? 0) > 0);
    return matchCategory && matchQuery;
  });

  const pesquisarConteudoDosPdfs = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchDocQuery.trim();

    if (!query) {
      setConsultaExecutada('');
      setPaginasEncontradas({});
      setErroPesquisa(null);
      return;
    }

    setPesquisaEmAndamento(true);
    setErroPesquisa(null);
    setPaginasEncontradas({});

    try {
      const { PDF } = await import('@libpdf/core');
      const resultados = await Promise.all(
        documentosOrdenados.map(async (documento) => {
          const response = await fetch(documento.arquivoUrl);
          if (!response.ok) {
            throw new Error(`Não foi possível abrir ${documento.titulo}.`);
          }

          const bytes = new Uint8Array(await response.arrayBuffer());
          const pdf = await PDF.load(bytes);
          const paginas = pdf
            .extractText()
            .filter((pagina) =>
              pagina.text.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))
            )
            .map((pagina) => pagina.pageIndex + 1);

          return [documento.id, paginas] as const;
        })
      );

      setPaginasEncontradas(Object.fromEntries(resultados));
      setConsultaExecutada(query);
    } catch (error) {
      console.error('[CapaPasta] erro ao pesquisar conteúdo dos PDFs:', error);
      setErroPesquisa('Não foi possível pesquisar o conteúdo de todos os PDFs desta pasta.');
    } finally {
      setPesquisaEmAndamento(false);
    }
  };

  const handleDownloadPasta = async () => {
    try {
      const blob = await fetchBlob(
        `/api/pastas/exportar?servidorId=${encodeURIComponent(servidor.id)}`,
        {
          method: 'GET',
        }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pasta-funcional-${servidor.matricula.replace(/[^a-zA-Z0-9-]/g, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      console.error('[CapaPasta] erro ao gerar pasta funcional:', e);
      const message = e instanceof Error ? e.message : 'Erro ao gerar a pasta funcional em PDF.';
      alert(message);
    }
  };

  const salvarOrdem = async (
    novaOrdem: DocumentoPDF[],
    ordemAnterior: DocumentoPDF[],
    documentoId: string
  ) => {
    setDocumentosOrdenados(novaOrdem);
    setDocumentoMovendo(documentoId);

    try {
      await fetchJson('/api/pastas/ordem', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servidorId: servidor.id,
          documentoIds: novaOrdem.map((documento) => documento.id),
        }),
      });
    } catch (error) {
      console.error('[CapaPasta] erro ao reordenar documentos:', error);
      setDocumentosOrdenados(ordemAnterior);
      alert(error instanceof Error ? error.message : 'Não foi possível salvar a nova ordem.');
    } finally {
      setDocumentoMovendo(null);
    }
  };

  const moverDocumento = (documentoId: string, direcao: 'cima' | 'baixo') => {
    const indice = documentosOrdenados.findIndex((documento) => documento.id === documentoId);
    const proximoIndice = direcao === 'cima' ? indice - 1 : indice + 1;
    if (indice < 0 || proximoIndice < 0 || proximoIndice >= documentosOrdenados.length) return;

    const ordemAnterior = documentosOrdenados;
    const novaOrdem = [...documentosOrdenados];
    [novaOrdem[indice], novaOrdem[proximoIndice]] = [novaOrdem[proximoIndice], novaOrdem[indice]];
    void salvarOrdem(novaOrdem, ordemAnterior, documentoId);
  };

  const iniciarArraste = (event: DragEvent<HTMLDivElement>, documentoId: string) => {
    if (documentoMovendo) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', documentoId);
    setDocumentoArrastado(documentoId);
  };

  const soltarDocumento = (event: DragEvent<HTMLDivElement>, documentoDestinoId: string) => {
    event.preventDefault();
    const documentoOrigemId = documentoArrastado || event.dataTransfer.getData('text/plain');
    setDocumentoArrastado(null);
    setDocumentoSobreposto(null);
    if (!documentoOrigemId || documentoOrigemId === documentoDestinoId) return;

    const indiceOrigem = documentosOrdenados.findIndex(
      (documento) => documento.id === documentoOrigemId
    );
    const indiceDestino = documentosOrdenados.findIndex(
      (documento) => documento.id === documentoDestinoId
    );
    if (indiceOrigem < 0 || indiceDestino < 0) return;

    const ordemAnterior = documentosOrdenados;
    const novaOrdem = [...documentosOrdenados];
    const [documentoMovido] = novaOrdem.splice(indiceOrigem, 1);
    novaOrdem.splice(indiceDestino, 0, documentoMovido);
    void salvarOrdem(novaOrdem, ordemAnterior, documentoOrigemId);
  };

  const handleImprimirPasta = () => {
    window.open(
      `/api/pastas/exportar?servidorId=${encodeURIComponent(servidor.id)}&modo=imprimir`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const atualizarPagina = () => window.location.reload();

  const excluirDocumento = async (documento: DocumentoPDF) => {
    if (!window.confirm(`Excluir permanentemente o documento “${documento.titulo}”?`)) return;

    setDocumentoExcluindo(documento.id);
    try {
      await fetchJson(`/api/documentos/${documento.id}`, { method: 'DELETE' });
      atualizarPagina();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível excluir o documento.');
    } finally {
      setDocumentoExcluindo(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-300">
      {editorServidor && (
        <EditarServidorModal
          servidor={servidor}
          modo={editorServidor}
          onClose={() => setEditorServidor(null)}
          onUpdated={atualizarPagina}
        />
      )}
      {documentoEditando && (
        <EditarDocumentoModal
          documento={documentoEditando}
          onClose={() => setDocumentoEditando(null)}
          onUpdated={atualizarPagina}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav
          aria-label="Breadcrumb"
          className="text-muted-foreground text-sm flex items-center space-x-2"
        >
          <Link href="/servidores" className="hover:text-foreground transition-colors font-medium">
            Servidores
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Pasta Funcional</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={handleImprimirPasta}>
            <Printer size={16} className="text-ssp-blue" /> Imprimir Pasta
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditorServidor('dados')}
          >
            <Pencil size={16} className="text-ssp-blue" /> Editar dados pessoais
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditorServidor('foto')}
          >
            <Camera size={16} className="text-ssp-blue" /> Adicionar / editar foto
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={handleDownloadPasta}>
            <Download size={16} className="text-ssp-blue" /> Salvar / Baixar
          </Button>

          <Link
            href={`/documentos/novo?servidorId=${servidor.id}`}
            className={buttonVariants({ size: 'sm' })}
          >
            <Plus size={16} /> Anexar Documento PDF
          </Link>
        </div>
      </div>

      <Card className="gap-0 overflow-hidden border-0 py-0 shadow-corporate">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-ssp-blueDark px-5 py-2.5 text-white sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/logo-sspdf.png"
              alt="Logo SSP-DF"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pasta Funcional Digital
            </span>
          </div>
          <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
            USO EXCLUSIVO RH
          </span>
        </div>

        <CardContent className="grid gap-0 p-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col items-center bg-muted/50 px-6 py-8 text-center lg:items-start lg:text-left">
            <div className="relative h-28 w-28 overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-md">
              {servidor.fotoUrl ? (
                <Image
                  src={servidor.fotoUrl}
                  alt={servidor.nome}
                  width={200}
                  height={200}
                  unoptimized={
                    servidor.fotoUrl.startsWith('data:') || servidor.fotoUrl.startsWith('/api/')
                  }
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                  <User size={64} />
                </div>
              )}
            </div>

            <Badge
              variant="outline"
              className={`mt-4 h-auto gap-1.5 px-3 py-1 text-xs font-bold ${
                servidor.status === 'Ativo'
                  ? 'bg-status-success/15 text-status-success border-status-success/30'
                  : 'bg-status-danger/15 text-status-danger border-status-danger/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  servidor.status === 'Ativo'
                    ? 'bg-status-success animate-pulse'
                    : 'bg-status-danger'
                }`}
              />
              Status: {servidor.status}
            </Badge>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Pasta Funcional
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Acervo administrativo e histórico funcional do servidor.
            </p>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {servidor.nome}
                </h1>
                <BadgeCheck className="text-ssp-blue" size={24} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Badge
                  variant="outline"
                  className="h-auto rounded-md bg-muted px-3 py-1 font-mono text-xs"
                >
                  CPF: {servidor.cpf}
                </Badge>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vínculos e identificação
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card
                  size="sm"
                  className="gap-0 border-0 bg-background py-0 shadow-none ring-1 ring-border"
                >
                  <CardContent className="space-y-4 p-4">
                    <div className="space-y-1">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Matrícula SSP-DF
                      </span>
                      <p className="font-mono text-sm font-bold text-ssp-blue">
                        {servidor.matricula}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Separator className="mb-3" />
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Briefcase size={14} className="text-ssp-blue" /> Cargo SSP-DF
                      </span>
                      <p className="font-bold text-sm text-foreground">
                        {servidor.cargoOcupado || '—'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  size="sm"
                  className="gap-0 border-0 bg-background py-0 shadow-none ring-1 ring-border"
                >
                  <CardContent className="space-y-4 p-4">
                    <div className="space-y-1">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Matrícula do cargo efetivo
                      </span>
                      <p className="font-mono text-sm font-bold text-ssp-blue">
                        {servidor.matriculaCargoEfetivo || '—'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Separator className="mb-3" />
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Briefcase size={14} className="text-ssp-blue" /> Cargo efetivo
                      </span>
                      <p className="font-bold text-sm text-foreground">{servidor.cargoEfetivo}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
              <div className="p-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <MapPin size={14} className="text-ssp-blue" /> Lotação Atual
                </span>
                <p className="font-bold text-sm text-foreground">{servidor.lotacao}</p>
              </div>

              <div className="p-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <CalendarDays size={14} className="text-ssp-blue" /> Data de Admissão
                </span>
                <p className="font-semibold text-sm text-foreground">{servidor.dataIngresso}</p>
              </div>

              <div className="p-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Mail size={14} className="text-ssp-blue" /> E-mail Institucional
                </span>
                <p
                  className="font-semibold text-sm text-foreground truncate"
                  title={servidor.email}
                >
                  {servidor.email || '—'}
                </p>
              </div>

              <div className="p-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Phone size={14} className="text-ssp-blue" /> Telefone
                </span>
                <p className="font-semibold text-sm text-foreground">{servidor.telefone || '—'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="gap-0 border-0 py-0 shadow-corporate">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Documentos Anexados (Acervo PDF)
              </h2>
              <p className="text-xs text-muted-foreground">
                Arraste os documentos para definir a ordem usada ao baixar ou imprimir a pasta.
              </p>
            </div>

            <form className="flex w-full gap-2 sm:w-auto" onSubmit={pesquisarConteudoDosPdfs}>
              <div className="relative min-w-0 flex-1 sm:w-72">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
                <Input
                  type="search"
                  placeholder="Pesquisar nos PDFs desta pasta..."
                  value={searchDocQuery}
                  onChange={(e) => setSearchDocQuery(e.target.value)}
                  className="h-8 pl-9 text-xs"
                />
              </div>
              <Button type="submit" size="sm" disabled={pesquisaEmAndamento}>
                {pesquisaEmAndamento ? 'Pesquisando...' : 'Pesquisar'}
              </Button>
            </form>
          </div>

          {consultaExecutada && !pesquisaEmAndamento && (
            <p className="text-xs text-muted-foreground">
              Pesquisa textual em {documentosOrdenados.length} PDF(s) para &quot;{consultaExecutada}
              &quot;.
            </p>
          )}
          {erroPesquisa && <p className="text-xs text-status-danger">{erroPesquisa}</p>}

          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {categorias.map((cat) => (
              <Button
                key={cat}
                type="button"
                variant={activeTab === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(cat)}
                className={`shrink-0 text-xs ${
                  activeTab === cat ? 'bg-ssp-blue hover:bg-ssp-blueDark' : 'text-muted-foreground'
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>

          {filteredDocs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => {
                const cores = CORES_CATEGORIA[doc.categoria];

                return (
                  <div
                    key={doc.id}
                    draggable={documentoMovendo === null}
                    onDragStart={(event) => iniciarArraste(event, doc.id)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (documentoArrastado !== doc.id) setDocumentoSobreposto(doc.id);
                    }}
                    onDrop={(event) => soltarDocumento(event, doc.id)}
                    onDragEnd={() => {
                      setDocumentoArrastado(null);
                      setDocumentoSobreposto(null);
                    }}
                    className={`p-5 rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 cursor-grab active:cursor-grabbing ${
                      cores.cartao
                    } ${documentoArrastado === doc.id ? 'opacity-50' : ''} ${
                      documentoSobreposto === doc.id
                        ? 'border-ssp-blue ring-2 ring-ssp-blue/30'
                        : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${cores.etiqueta}`}
                        >
                          {doc.categoria}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {doc.tamanho}
                        </span>
                      </div>

                      <Link
                        href={`/documentos/${doc.id}`}
                        className="font-semibold text-sm text-foreground hover:text-ssp-blue transition-colors flex items-start gap-2 group"
                      >
                        <FileText size={18} className="text-ssp-blue shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-tight">{doc.titulo}</span>
                      </Link>

                      {doc.processoSEI && (
                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                          SEI: {doc.processoSEI}
                        </p>
                      )}
                      {paginasEncontradas[doc.id]?.length ? (
                        <p className="mt-2 text-xs font-semibold text-ssp-blue">
                          Termo encontrado na
                          {paginasEncontradas[doc.id].length === 1 ? ' página' : 's páginas'}{' '}
                          {paginasEncontradas[doc.id].join(', ')}.
                        </p>
                      ) : null}
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2 text-xs font-semibold">
                      <span className="text-muted-foreground">Enviado: {doc.dataUpload}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => moverDocumento(doc.id, 'cima')}
                          disabled={
                            documentoMovendo !== null ||
                            documentosOrdenados.findIndex(
                              (documento) => documento.id === doc.id
                            ) === 0
                          }
                          aria-label={`Mover ${doc.titulo} para cima`}
                          title="Mover para cima"
                          variant="ghost"
                          size="icon-xs"
                        >
                          <ChevronUp size={16} />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => moverDocumento(doc.id, 'baixo')}
                          disabled={
                            documentoMovendo !== null ||
                            documentosOrdenados.findIndex(
                              (documento) => documento.id === doc.id
                            ) ===
                              documentosOrdenados.length - 1
                          }
                          aria-label={`Mover ${doc.titulo} para baixo`}
                          title="Mover para baixo"
                          variant="ghost"
                          size="icon-xs"
                        >
                          <ChevronDown size={16} />
                        </Button>
                        <Link
                          href={`/documentos/${doc.id}`}
                          className={buttonVariants({
                            variant: 'link',
                            size: 'sm',
                            className: 'h-auto px-0 text-xs text-ssp-blue',
                          })}
                        >
                          Visualizar PDF
                        </Link>
                        <Button
                          type="button"
                          onClick={() => setDocumentoEditando(doc)}
                          aria-label={`Editar ${doc.titulo}`}
                          title="Editar documento"
                          variant="ghost"
                          size="icon-xs"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => excluirDocumento(doc)}
                          disabled={documentoExcluindo !== null}
                          aria-label={`Excluir ${doc.titulo}`}
                          title="Excluir documento"
                          variant="ghost"
                          size="icon-xs"
                          className="text-status-danger hover:bg-status-danger/10 hover:text-status-danger"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-card rounded-xl border border-border text-muted-foreground space-y-2">
              <FileText size={40} className="mx-auto text-muted-foreground/40" />
              <p className="font-semibold">
                Nenhum documento PDF encontrado para o filtro selecionado.
              </p>
              <p className="text-xs">
                Utilize o botão &quot;Anexar Documento PDF&quot; para incluir novos arquivos nesta
                pasta.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
