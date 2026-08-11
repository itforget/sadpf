'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';
import type { Servidor, DocumentoPDF } from '@/lib/types';
import ImprimirCapaModal from './ImprimirCapaModal';
import EncaminharModal from './EncaminharModal';
import Image from 'next/image';

interface CapaPastaProps {
  servidor: Servidor;
  documentos: DocumentoPDF[];
  operador?: { nome: string; matricula: string; ip: string };
}

const OPERADOR_DESCONHECIDO = {
  nome: 'Operador não identificado',
  matricula: 'N/A',
  ip: 'N/A',
};

export default function CapaPasta({
  servidor,
  documentos,
  operador = OPERADOR_DESCONHECIDO,
}: CapaPastaProps) {
  const [showImprimirCapa, setShowImprimirCapa] = useState(false);
  const [showEncaminharModal, setShowEncaminharModal] = useState(false);
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

  const filteredDocs = documentos.filter((doc) => {
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {showImprimirCapa && (
        <ImprimirCapaModal servidor={servidor} onClose={() => setShowImprimirCapa(false)} />
      )}
      {showEncaminharModal && (
        <EncaminharModal
          servidor={servidor}
          operador={operador}
          onClose={() => setShowEncaminharModal(false)}
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
            onClick={() => setShowImprimirCapa(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
          >
            <Printer size={16} className="text-ssp-blue" /> Imprimir Capa
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
              Todos os documentos possuem indexação de texto via OCR para pesquisa.
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
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="bg-card p-5 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-ssp-blue/30 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-ssp-blue bg-ssp-blue/10 px-2.5 py-0.5 rounded-full border border-ssp-blue/20">
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

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Enviado: {doc.dataUpload}</span>
                  <Link href={`/documentos/${doc.id}`} className="text-ssp-blue hover:underline">
                    Visualizar PDF
                  </Link>
                </div>
              </div>
            ))}
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
