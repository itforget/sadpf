'use client';

import { useState } from 'react';
import { ScrollText, Search, RefreshCw, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchLogs } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';

export default function LogsPage() {
  const [filterAction, setFilterAction] = useState('TODAS');
  const [search, setSearch] = useState('');
  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.logs,
    queryFn: fetchLogs,
  });

  const filteredLogs = logs.filter((log) => {
    const matchAction = filterAction === 'TODAS' || log.acao === filterAction;
    const matchSearch =
      !search ||
      log.operador.toLowerCase().includes(search.toLowerCase()) ||
      log.detalhes.toLowerCase().includes(search.toLowerCase()) ||
      log.operadorMatricula.toLowerCase().includes(search.toLowerCase());
    return matchAction && matchSearch;
  });

  const getBadgeClass = (acao: string) => {
    switch (acao) {
      case 'IMPRESSAO':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'EXPORTACAO':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'ENCAMINHAMENTO':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'UPLOAD':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'PESQUISA_OCR':
        return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ScrollText size={26} className="text-ssp-blue" /> Trilha de Auditoria, Impressões e
            Segurança (LGPD)
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro imutável de todas as operações de visualização, OCR, download, impressão e
            encaminhamento do RH, reunido em uma única página.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border hover:bg-muted text-foreground text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <RefreshCw size={16} /> Atualizar Log
        </button>
      </div>

      <div className="p-4 bg-ssp-blueDark text-white rounded-2xl flex items-center gap-4 shadow-corporate">
        <Lock size={32} className="text-blue-300 shrink-0" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-sm">
            Garantia de Integridade e Sigilo - Lei nº 13.709/2018 (LGPD)
          </p>
          <p className="text-blue-100">
            Todas as pesquisas, acessos a assentamentos funcionais, exportações em PDF, impressões e
            demais eventos registrados no SADPF são auditados individualmente com carimbo de
            data/hora, matrícula do operador e endereço IP.
          </p>
        </div>
      </div>

      <div className="bg-card p-4 rounded-xl border border-border shadow-corporate flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <input
            type="search"
            placeholder="Filtrar por operador, matrícula ou evento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ssp-blue"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1 md:pb-0">
          <span className="text-xs font-semibold text-muted-foreground">Ação:</span>
          {[
            'TODAS',
            'CONSULTA',
            'UPLOAD',
            'IMPRESSAO',
            'EXPORTACAO',
            'ENCAMINHAMENTO',
            'PESQUISA_OCR',
          ].map((ac) => (
            <button
              key={ac}
              onClick={() => setFilterAction(ac)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                filterAction === ac
                  ? 'bg-ssp-blue text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {ac}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-corporate overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <div className="w-8 h-8 border-4 border-ssp-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold">Carregando trilha de auditoria...</p>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/60 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-4">Data e Hora</th>
                  <th className="px-6 py-4">Operador RH</th>
                  <th className="px-6 py-4">Ação Registrada</th>
                  <th className="px-6 py-4">Detalhes da Operação</th>
                  <th className="px-6 py-4 text-right">IP de Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-xs">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-foreground">
                      {log.dataHora}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-foreground font-sans">{log.operador}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Mat.: {log.operadorMatricula}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${getBadgeClass(
                          log.acao
                        )}`}
                      >
                        {log.acao}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-foreground/90 font-sans max-w-md line-clamp-2">
                      {log.detalhes}
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground font-mono">
                      {log.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <ScrollText size={48} className="mx-auto opacity-40" />
            <p className="font-semibold text-base">
              Nenhum evento registrado com os filtros aplicados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
