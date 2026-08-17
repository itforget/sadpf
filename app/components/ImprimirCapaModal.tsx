'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import Image from 'next/image';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Servidor } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { fetchJson, fetchSession } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';

interface ImprimirCapaModalProps {
  servidor: Servidor;
  onClose: () => void;
}

interface OperadorLog {
  nome: string;
  matricula: string;
  ip: string;
}

const OPERADOR_DESCONHECIDO: OperadorLog = {
  nome: 'Operador não identificado',
  matricula: 'N/A',
  ip: 'N/A',
};

export default function ImprimirCapaModal({ servidor, onClose }: ImprimirCapaModalProps) {
  const [imprimindo, setImprimindo] = useState(false);
  const [impressoComSucesso, setImpressoComSucesso] = useState(false);
  const [hashValidacao] = useState(() => Math.random().toString(36).substring(2, 12).toUpperCase());
  const [dataHoraAtual] = useState(() => new Date().toLocaleString('pt-BR'));
  const { data: sessionData, isLoading: operadorCarregado } = useQuery({
    queryKey: queryKeys.session,
    queryFn: fetchSession,
  });

  const operador = sessionData?.user
    ? {
        nome: sessionData.user.nome || OPERADOR_DESCONHECIDO.nome,
        matricula: sessionData.user.matricula || OPERADOR_DESCONHECIDO.matricula,
        ip: OPERADOR_DESCONHECIDO.ip,
      }
    : OPERADOR_DESCONHECIDO;

  const logMutation = useMutation({
    mutationFn: async () => {
      await fetchJson('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operador: operador.nome,
          operadorMatricula: operador.matricula,
          acao: 'IMPRESSAO',
          detalhes: `Imprimiu a Capa da Pasta Funcional do servidor ${servidor.nome} (Mat. ${servidor.matricula}) - Hash: ${hashValidacao}`,
          ip: operador.ip,
        }),
      });
    },
  });

  const handlePrint = async () => {
    setImprimindo(true);

    try {
      await logMutation.mutateAsync();
    } catch (e) {
      console.error('[ImprimirCapaModal] erro ao registrar log:', e);
    }

    setTimeout(() => {
      setImprimindo(false);
      setImpressoComSucesso(true);
      window.print();
    }, 600);
  };

  const dados = [
    { rotulo: 'Nome Completo', valor: servidor.nome, mono: false },
    { rotulo: 'Matrícula SSP-DF', valor: servidor.matricula, mono: true },
    { rotulo: 'CPF', valor: servidor.cpf, mono: true },
    { rotulo: 'Cargo Efetivo', valor: servidor.cargoEfetivo, mono: false },
    { rotulo: 'Cargo Ocupado no Órgão', valor: servidor.cargoOcupado || '—', mono: false },
    { rotulo: 'Lotação Atual', valor: servidor.lotacao, mono: false },
    { rotulo: 'Data de Ingresso', valor: servidor.dataIngresso, mono: false },
    { rotulo: 'E-mail Institucional', valor: servidor.email || '—', mono: false },
    { rotulo: 'Telefone', valor: servidor.telefone || '—', mono: false },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:relative print:inset-auto print:w-full print:bg-transparent print:block print:p-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden bg-card rounded-2xl shadow-2xl border border-border print:w-full print:max-w-none print:max-h-none print:bg-white print:shadow-none print:rounded-none print:border-0 print:overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-5 border-b border-border print:hidden">
          <Printer size={24} className="text-ssp-blue" />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base text-foreground">
              Imprimir Capa da Pasta Funcional
            </h2>
            <p className="text-xs text-muted-foreground">
              Emissão auditada pela Gestão de Pessoas — validação com hash de segurança.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[55vh] bg-slate-100 p-5 print:bg-transparent print:overflow-visible print:max-h-none print:p-0">
          <div className="print-area bg-white text-slate-900 p-8 rounded-lg shadow-md border border-slate-300 relative overflow-hidden font-sans print:bg-white print:text-slate-900 print:p-[14mm] print:shadow-none print:rounded-none print:border-0 print:overflow-visible">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] select-none rotate-[-35deg] text-center font-black text-4xl sm:text-5xl text-slate-900 leading-normal">
              SSP-DF • IMPRESSÃO AUDITADA
              <br />
              {hashValidacao}
            </div>

            <div className="border-b-2 border-ssp-blue pb-4 mb-6 flex justify-between items-center">
              <div>
                <p className="font-bold text-xs uppercase text-slate-600">
                  Governo do Distrito Federal
                </p>
                <h3 className="font-bold text-base text-ssp-blue">
                  Secretaria de Estado de Segurança Pública — SSP/DF
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Subsecretaria de Administração Geral • Coordenação de Gestão de Pessoas (COGEP)
                </p>
              </div>
              <Image
                src="/logo-sspdf.png"
                alt="Logo SSP-DF"
                width={110}
                height={110}
                className="h-auto w-auto"
              />
            </div>

            <div className="text-center mb-6 bg-slate-50 py-3 rounded border border-slate-200">
              <h4 className="font-bold text-sm tracking-wide text-slate-800 uppercase">
                Capa da Pasta Funcional Digital
              </h4>
            </div>

            <div className="flex gap-6 items-start mb-6">
              <div className="shrink-0">
                <div className="w-28 h-28 rounded-md border border-slate-300 overflow-hidden bg-slate-100 flex items-center justify-center">
                  {servidor.fotoUrl ? (
                    <Image
                      src={servidor.fotoUrl}
                      alt={`Foto de ${servidor.nome}`}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold uppercase px-2 text-center">
                      Sem foto
                    </span>
                  )}
                </div>
                <span
                  className={`inline-block mt-2 px-2.5 py-1 rounded text-[10px] font-bold text-center w-full border ${
                    servidor.status === 'Ativo'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  STATUS: {servidor.status.toUpperCase()}
                </span>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                {dados.map((campo) => (
                  <div key={campo.rotulo}>
                    <span className="font-bold text-slate-500 block uppercase tracking-wide text-[10px]">
                      {campo.rotulo}:
                    </span>
                    <span
                      className={`font-semibold text-slate-900 text-sm ${
                        campo.mono ? 'font-mono' : ''
                      }`}
                    >
                      {campo.valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-2 border-dashed border-slate-300 pt-3 mt-8 text-[10px] text-slate-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <p className="font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck size={12} /> EMISSÃO AUDITADA PELO SETOR DE GESTÃO DE PESSOAS (RH)
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
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/50 print:hidden">
          <div className="text-xs text-muted-foreground min-w-0 flex-1">
            {impressoComSucesso ? (
              <span className="text-status-success font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Impressão registrada na trilha de auditoria LGPD.
              </span>
            ) : operadorCarregado ? (
              <span>A emissão gerará registro auditável com marca d&apos;água e hash.</span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-ssp-blue border-t-transparent rounded-full animate-spin" />
                Identificando operador...
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
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
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
