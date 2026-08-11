'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Printer,
  Send,
  Search,
  CheckCircle2,
  Download,
  Shield,
} from 'lucide-react';
import PDFViewer from '@/app/components/PDFViewer';
import PrintModal from '@/app/components/PrintModal';
import EncaminharModal from '@/app/components/EncaminharModal';
import type { DocumentoPDF, Servidor } from '@/lib/types';
import Image from 'next/image';

export default function DocumentoDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [documento, setDocumento] = useState<DocumentoPDF | null>(null);
  const [servidor, setServidor] = useState<Servidor | null>(null);
  const [loading, setLoading] = useState(true);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEncaminharModal, setShowEncaminharModal] = useState(false);
  const [operador, setOperador] = useState({
    nome: 'Operador não identificado',
    matricula: 'N/A',
    ip: 'N/A',
  });

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const session = await res.json();
        if (session?.authenticated && session.user) {
          setOperador((prev) => ({
            nome: session.user.nome || prev.nome,
            matricula: session.user.matricula || prev.matricula,
            ip: session.user.ip || prev.ip,
          }));
        }
      } catch {}
    };

    void loadSession();
  }, []);

  useEffect(() => {
    if (!id) return;

    const loadDocument = async () => {
      try {
        const res = await fetch(`/api/pesquisa?id=${id}`);
        const docs: DocumentoPDF[] = await res.json();
        const foundDoc = docs[0] ?? null;

        if (!foundDoc) {
          setDocumento(null);
          return;
        }

        setDocumento(foundDoc);

        const resServ = await fetch(`/api/servidores`);
        const servs: Servidor[] = await resServ.json();
        const foundServ = servs.find((s) => s.id === foundDoc.servidorId) ?? null;
        setServidor(foundServ);
      } catch (e) {
        console.error('[DocumentoDetailPage]', e);
      } finally {
        setLoading(false);
      }
    };

    void loadDocument();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground space-y-3">
        <div className="w-8 h-8 border-4 border-ssp-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold">Carregando visualizador de PDF...</p>
      </div>
    );
  }

  if (!documento || !servidor) {
    return (
      <div className="p-12 text-center text-muted-foreground space-y-3">
        <FileText size={48} className="mx-auto opacity-40" />
        <p className="font-semibold text-lg">Documento não encontrado.</p>
        <Link href="/servidores" className="text-ssp-blue underline font-medium">
          Voltar para Servidores
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {showPrintModal && (
        <PrintModal
          servidor={servidor}
          documento={documento}
          operador={operador}
          onClose={() => setShowPrintModal(false)}
        />
      )}
      {showEncaminharModal && (
        <EncaminharModal
          servidor={servidor}
          documento={documento}
          operador={operador}
          onClose={() => setShowEncaminharModal(false)}
        />
      )}

      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/servidores/${servidor.id}`}
            className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText size={22} className="text-ssp-blue" /> {documento.titulo}
            </h1>
            <p className="text-xs text-muted-foreground">
              Servidor: <strong>{servidor.nome}</strong> (Matrícula: {servidor.matricula}) •
              Categoria: <strong>{documento.categoria}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
          >
            <Printer size={16} className="text-ssp-blue" /> Imprimir Documento
          </button>
          <button
            onClick={() => setShowEncaminharModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-sm"
          >
            <Send size={16} className="text-ssp-blue" /> Encaminhar
          </button>
          <a
            href={documento.arquivoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-ssp-blue hover:bg-ssp-blueDark text-white transition-colors shadow-sm"
          >
            <Download size={16} /> Salvar PDF
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-corporate overflow-hidden flex flex-col">
          <div className="p-4 bg-muted/50 border-b border-border flex justify-between items-center text-xs font-semibold text-muted-foreground">
            <span>Visualizador de PDF Integrado (SADPF/SSP-DF)</span>
            <span className="font-mono">
              {documento.tamanho} • {documento.paginas} páginas
            </span>
          </div>
          <div className="p-4 flex-1 bg-slate-900/5 min-h-[600px]">
            <PDFViewer src={documento.arquivoUrl} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card p-5 rounded-2xl border border-border shadow-corporate space-y-4 text-xs">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Image
                src="/logo-sspdf.png"
                alt="Logo SSP-DF"
                width={120}
                height={120}
                className="mb-6 h-auto w-auto"
              />{' '}
              Metadados do Assentamento
            </h3>

            <div className="space-y-2 divide-y divide-border">
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground font-semibold">Data do Upload:</span>
                <span className="font-semibold text-foreground">{documento.dataUpload}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground font-semibold">Processo SEI:</span>
                <span className="font-mono text-ssp-blue font-bold">
                  {documento.processoSEI || 'N/A'}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground font-semibold">Operador do RH:</span>
                <span className="font-semibold text-foreground">{documento.operadorRH}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-muted-foreground font-semibold">Status OCR:</span>
                <span className="text-status-success font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} /> Indexado
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card p-5 rounded-2xl border border-border shadow-corporate space-y-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Search size={16} className="text-ssp-blue" /> Conteúdo Extraído via OCR
            </h3>
            <p className="text-xs text-muted-foreground">
              Texto reconhecido automaticamente pelo motor de OCR para permitir a pesquisa por
              termos no texto.
            </p>
            <div className="p-3 bg-muted/60 rounded-xl border border-border font-serif text-xs leading-relaxed text-foreground max-h-80 overflow-y-auto">
              {documento.textoOCR}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
