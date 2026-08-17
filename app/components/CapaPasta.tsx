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
  Send,
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
import EncaminharModal from './EncaminharModal';
import EditarServidorModal from './EditarServidorModal';
import EditarDocumentoModal from './EditarDocumentoModal';
import Image from 'next/image';

interface CapaPastaProps {
  servidor: Servidor;
  documentos: DocumentoPDF[];
}

const CORES_CATEGORIA: Record<DocumentoPDF['categoria'], { cartao: string; etiqueta: string }> = {
  'Dados Pessoais': {
    cartao: 'bg-sky-50/70 border-sky-200 hover:border-sky-400',
    etiqueta: 'text-sky-800 bg-sky-100 border-sky-200',
  },
  'Posse e Exercício': {
    cartao: 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400',
    etiqueta: 'text-emerald-800 bg-emerald-100 border-emerald-200',
  },
  'Vida Funcional': {
    cartao: 'bg-violet-50/70 border-violet-200 hover:border-violet-400',
    etiqueta: 'text-violet-800 bg-violet-100 border-violet-200',
  },
  'Licenças e Afastamentos': {
    cartao: 'bg-amber-50/70 border-amber-200 hover:border-amber-400',
    etiqueta: 'text-amber-800 bg-amber-100 border-amber-200',
  },
  'Avaliação de Desempenho': {
    cartao: 'bg-rose-50/70 border-rose-200 hover:border-rose-400',
    etiqueta: 'text-rose-800 bg-rose-100 border-rose-200',
  },
};

export default function CapaPasta({ servidor, documentos }: CapaPastaProps) {
  const [showEncaminharModal, setShowEncaminharModal] = useState(false);
  const [documentosOrdenados, setDocumentosOrdenados] = useState(documentos);
  const [documentoMovendo, setDocumentoMovendo] = useState<string | null>(null);
  const [documentoArrastado, setDocumentoArrastado] = useState<string | null>(null);
  const [documentoSobreposto, setDocumentoSobreposto] = useState<string | null>(null);
  const [editorServidor, setEditorServidor] = useState<'dados' | 'foto' | null>(null);
  const [documentoEditando, setDocumentoEditando] = useState<DocumentoPDF | null>(null);
  const [documentoExcluindo, setDocumentoExcluindo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Todos');
  const [searchDocQuery, setSearchDocQuery] = useState('');

  const categorias = [
    'Todos',
    'Dados Pessoais',
    'Posse e Exercício',
    'Vida Funcional',
    'Licenças e Afastamentos',
    'Avaliação de Desempenho',
  ];

  const filteredDocs = documentosOrdenados.filter((doc) => {
    const matchCategory = activeTab === 'Todos' || doc.categoria === activeTab;
    const matchQuery =
      !searchDocQuery ||
      doc.titulo.toLowerCase().includes(searchDocQuery.toLowerCase()) ||
      doc.textoOCR.toLowerCase().includes(searchDocQuery.toLowerCase());
    return matchCategory && matchQuery;
  });

  const handleDownloadPasta = async () => {
    try {
      const response = await fetch(
        `/api/pastas/exportar?servidorId=${encodeURIComponent(servidor.id)}`,
        { method: 'GET', cache: 'no-store' }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Não foi possível gerar a pasta funcional em PDF.');
      }

      const blob = await response.blob();
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
      const response = await fetch('/api/pastas/ordem', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servidorId: servidor.id,
          documentoIds: novaOrdem.map((documento) => documento.id),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Não foi possível salvar a nova ordem.');
      }
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
      const response = await fetch(`/api/documentos/${documento.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Não foi possível excluir o documento.');
      }
      atualizarPagina();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível excluir o documento.');
    } finally {
      setDocumentoExcluindo(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {showEncaminharModal && (
        <EncaminharModal servidor={servidor} onClose={() => setShowEncaminharModal(false)} />
      )}
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

      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-border pb-4">
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
          <button
            onClick={handleImprimirPasta}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
          >
            <Printer size={16} className="text-ssp-blue" /> Imprimir Pasta
          </button>

          <button
            onClick={() => setEditorServidor('dados')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
          >
            <Pencil size={16} className="text-ssp-blue" /> Editar dados pessoais
          </button>

          <button
            onClick={() => setEditorServidor('foto')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
          >
            <Camera size={16} className="text-ssp-blue" /> Adicionar / editar foto
          </button>

          <button
            onClick={() => setShowEncaminharModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
          >
            <Send size={16} className="text-ssp-blue" /> Encaminhar Pasta
          </button>

          <button
            onClick={handleDownloadPasta}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
          >
            <Download size={16} className="text-ssp-blue" /> Salvar / Baixar
          </button>

          <Link
            href={`/documentos/novo?servidorId=${servidor.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-ssp-blue hover:bg-ssp-blueDark text-white transition-colors shadow-sm"
          >
            <Plus size={16} /> Anexar Documento PDF
          </Link>
        </div>
      </div>

      <section className="bg-card rounded-2xl border-2 border-ssp-blue/20 shadow-corporate overflow-hidden relative">
        <div className="bg-ssp-blueDark px-6 py-3 text-white flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-sspdf.png"
              alt="Logo SSP-DF"
              width={120}
              height={120}
              className="h-auto w-auto"
            />
            <span>PASTA FUNCIONAL DIGITAL • SECRETARIA DE ESTADO DE SEGURANÇA PÚBLICA DO DF</span>
          </div>
          <span className="bg-blue-900/60 px-2.5 py-1 rounded text-[11px] font-mono border border-blue-700/50">
            USO EXCLUSIVO RH
          </span>
        </div>

        <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <div className="shrink-0 flex flex-col items-center gap-3">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-xl border-4 border-white shadow-md overflow-hidden bg-muted relative">
              {servidor.fotoUrl ? (
                <Image
                  src={servidor.fotoUrl}
                  alt={servidor.nome}
                  width={200}
                  height={200}
                  unoptimized={
                    servidor.fotoUrl.startsWith('data:') || servidor.fotoUrl.startsWith('/api/')
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500">
                  <User size={64} />
                </div>
              )}
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
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
              Status Atual: {servidor.status}
            </span>
          </div>

          <div className="flex-1 w-full space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {servidor.nome}
                </h1>
                <BadgeCheck className="text-ssp-blue" size={24} />
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="font-mono bg-ssp-blue/10 text-ssp-blueDark px-3 py-1 rounded-md text-xs font-bold border border-ssp-blue/20">
                  Matrícula: {servidor.matricula}
                </span>
                <span className="font-mono bg-muted px-3 py-1 rounded-md text-xs font-semibold text-muted-foreground border border-border">
                  CPF: {servidor.cpf}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 pt-2 border-t border-border">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase size={14} className="text-ssp-blue" /> Cargo Efetivo
                </span>
                <p className="font-bold text-sm text-foreground">{servidor.cargoEfetivo}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase size={14} className="text-ssp-blue" /> Cargo Ocupado no Órgão
                </span>
                <p className="font-bold text-sm text-foreground">{servidor.cargoOcupado}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={14} className="text-ssp-blue" /> Lotação Atual
                </span>
                <p className="font-bold text-sm text-foreground">{servidor.lotacao}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-ssp-blue" /> Data de Ingresso
                </span>
                <p className="font-semibold text-sm text-foreground">{servidor.dataIngresso}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Mail size={14} className="text-ssp-blue" /> E-mail Institucional
                </span>
                <p
                  className="font-semibold text-sm text-foreground truncate"
                  title={servidor.email}
                >
                  {servidor.email || '—'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={14} className="text-ssp-blue" /> Telefone
                </span>
                <p className="font-semibold text-sm text-foreground">{servidor.telefone || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Documentos Anexados (Acervo PDF)
            </h2>
            <p className="text-xs text-muted-foreground">
              Arraste os documentos para definir a ordem usada ao baixar ou imprimir a pasta.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              type="text"
              placeholder="Filtrar nesta pasta..."
              value={searchDocQuery}
              onChange={(e) => setSearchDocQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ssp-blue"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${
                activeTab === cat
                  ? 'bg-ssp-blue text-white border-ssp-blue shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {cat}
            </button>
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
                    documentoSobreposto === doc.id ? 'border-ssp-blue ring-2 ring-ssp-blue/30' : ''
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
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2 text-xs font-semibold">
                    <span className="text-muted-foreground">Enviado: {doc.dataUpload}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moverDocumento(doc.id, 'cima')}
                        disabled={
                          documentoMovendo !== null ||
                          documentosOrdenados.findIndex((documento) => documento.id === doc.id) ===
                            0
                        }
                        aria-label={`Mover ${doc.titulo} para cima`}
                        title="Mover para cima"
                        className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moverDocumento(doc.id, 'baixo')}
                        disabled={
                          documentoMovendo !== null ||
                          documentosOrdenados.findIndex((documento) => documento.id === doc.id) ===
                            documentosOrdenados.length - 1
                        }
                        aria-label={`Mover ${doc.titulo} para baixo`}
                        title="Mover para baixo"
                        className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <Link
                        href={`/documentos/${doc.id}`}
                        className="text-ssp-blue hover:underline"
                      >
                        Visualizar PDF
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDocumentoEditando(doc)}
                        aria-label={`Editar ${doc.titulo}`}
                        title="Editar documento"
                        className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => excluirDocumento(doc)}
                        disabled={documentoExcluindo !== null}
                        aria-label={`Excluir ${doc.titulo}`}
                        title="Excluir documento"
                        className="p-1 rounded text-status-danger hover:bg-status-danger/10 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={16} />
                      </button>
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
      </section>
    </div>
  );
}
