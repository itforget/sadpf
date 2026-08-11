'use client';

import { useState } from 'react';
import { Printer, CheckCircle2 } from 'lucide-react';
import type { Servidor, DocumentoPDF } from '@/lib/types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

interface PrintModalProps {
  servidor: Servidor;
  documento?: DocumentoPDF;
  operador: { nome: string; matricula: string; ip: string };
  onClose: () => void;
}

export default function PrintModal({ servidor, documento, operador, onClose }: PrintModalProps) {
  const [imprimindo, setImprimindo] = useState(false);
  const [impressoComSucesso, setImpressoComSucesso] = useState(false);
  const [hashValidacao] = useState(() => Math.random().toString(36).substring(2, 12).toUpperCase());
  const [dataHoraAtual] = useState(() => new Date().toLocaleString('pt-BR'));

  const handlePrint = async () => {
    setImprimindo(true);

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operador: operador.nome,
          operadorMatricula: operador.matricula,
          acao: 'IMPRESSAO',
          detalhes: `Imprimiu ${
            documento ? `documento '${documento.titulo}'` : 'Capa da Pasta Funcional'
          } do servidor ${servidor.nome} (Mat. ${servidor.matricula}) - Hash: ${hashValidacao}`,
          ip: operador.ip,
        }),
      });
    } catch (e) {
      console.error('[PrintModal] erro ao registrar log:', e);
    }

    setTimeout(() => {
      setImprimindo(false);
      setImpressoComSucesso(true);
      window.print();
    }, 600);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Printer size={24} className="text-ssp-blue" />
            <div>
              <DialogTitle>Módulo de Impressão Auditada (SSP-DF)</DialogTitle>
              <DialogDescription>
                Uso Restrito ao Setor de Gestão de Pessoas - Validação com Marca d&apos;Água
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] bg-slate-100 dark:bg-slate-900 rounded-lg p-4">
          <div className="print-area bg-white text-slate-900 p-8 rounded-lg shadow-md border border-slate-300 relative overflow-hidden font-sans print:shadow-none print:border-none print:rounded-none">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none rotate-[-35deg] text-center font-black text-4xl sm:text-5xl text-slate-900 leading-normal">
              SSP-DF • RH EXCLUSIVO
              <br />
              IMPRESSÃO AUDITADA
              <br />
              {hashValidacao}
            </div>

            <div className="border-b-2 border-ssp-blue pb-4 mb-6 flex justify-between items-center">
              <div>
                <p className="font-bold text-xs uppercase text-slate-600">
                  Governo do Distrito Federal
                </p>
                <h3 className="font-bold text-base text-ssp-blue">
                  Secretaria de Estado de Segurança Pública - SSP/DF
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Subsecretaria de Administração Geral • Coordenação de Gestão de Pessoas (COGEP)
                </p>
              </div>
              <Image
                src="/logo-sspdf.png"
                alt="Logo SSP-DF"
                width={120}
                height={120}
                className="mb-6 h-auto w-auto"
              />
            </div>

            <div className="text-center mb-6 bg-slate-50 py-2.5 rounded border border-slate-200">
              <h4 className="font-bold text-sm tracking-wide text-slate-800 uppercase">
                {documento
                  ? `ASSENTAMENTO FUNCIONAL DIGITAL - ${documento.categoria.toUpperCase()}`
                  : 'CAPA OFICIAL DA PASTA FUNCIONAL DIGITAL'}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50/80 p-4 rounded-lg border border-slate-200">
              <div>
                <span className="font-bold text-slate-500 block">NOME COMPLETO:</span>
                <span className="font-semibold text-slate-900 text-sm">{servidor.nome}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">MATRÍCULA SSP-DF:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {servidor.matricula}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">CARGO EFETIVO:</span>
                <span className="font-medium text-slate-800">{servidor.cargoEfetivo}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">CARGO OCUPADO NO ÓRGÃO:</span>
                <span className="font-medium text-slate-800">{servidor.cargoOcupado}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">LOTAÇÃO ATUAL:</span>
                <span className="font-medium text-slate-800">{servidor.lotacao}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block">STATUS ATUAL:</span>
                <span
                  className={`font-bold ${
                    servidor.status === 'Ativo' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {servidor.status.toUpperCase()}
                </span>
              </div>
            </div>

            {documento && (
              <div className="mb-6 border border-slate-200 rounded p-4 text-xs space-y-2">
                <p className="font-bold text-slate-700">DOCUMENTO ANEXADO: {documento.titulo}</p>
                {documento.processoSEI && (
                  <p className="text-slate-600">PROCESSO SEI: {documento.processoSEI}</p>
                )}
                {documento.textoOCR && (
                  <p className="text-slate-500 font-mono text-[11px] leading-relaxed mt-2 bg-slate-100 p-3 rounded">
                    {documento.textoOCR}
                  </p>
                )}
              </div>
            )}

            <div className="border-t-2 border-dashed border-slate-300 pt-3 mt-8 text-[10px] text-slate-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <p className="font-bold text-slate-700">
                  EMISSÃO AUDITADA PELO SETOR DE GESTÃO DE PESSOAS (RH)
                </p>
                <p>Operador Responsável: {operador.nome}</p>
                <p>Data e Hora da Emissão: {dataHoraAtual}</p>
              </div>
              <div className="text-right bg-slate-100 px-3 py-1.5 rounded border border-slate-200 font-mono">
                <span className="font-bold text-slate-700 block">HASH DE SEGURANÇA:</span>
                <span className="text-xs font-bold text-ssp-blue">{hashValidacao}</span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {impressoComSucesso ? (
              <span className="text-status-success font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Impressão registrada na trilha de auditoria LGPD.
              </span>
            ) : (
              <span>A emissão gerará registro auditável de marca d&apos;água no servidor.</span>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handlePrint}
              disabled={imprimindo}
              className="bg-ssp-blue hover:bg-ssp-blueDark"
            >
              {imprimindo ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Gerando Impressão...
                </>
              ) : (
                <>
                  <Printer size={18} className="mr-2" /> Confirmar & Imprimir
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
