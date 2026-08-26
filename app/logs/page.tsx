'use client';

import { useState } from 'react';
import { ScrollText, Search, RefreshCw, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchLogs } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
      case 'ATUALIZACAO':
        return 'bg-status-warning/10 text-status-warning border-status-warning/20';
      case 'EXCLUSAO':
        return 'bg-status-danger/10 text-status-danger border-status-danger/20';
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
            Registro imutável de todas as operações de visualização, download, impressão e
            encaminhamento do RH, reunido em uma única página.
          </p>
        </div>

        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw size={16} /> Atualizar Log
        </Button>
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
          <Input
            type="search"
            placeholder="Filtrar por operador, matrícula ou evento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1 md:pb-0">
          <span className="text-xs font-semibold text-muted-foreground">Ação:</span>
          {[
            'TODAS',
            'CONSULTA',
            'ATUALIZACAO',
            'EXCLUSAO',
            'UPLOAD',
            'IMPRESSAO',
            'EXPORTACAO',
            'ENCAMINHAMENTO',
          ].map((ac) => (
            <Button
              key={ac}
              type="button"
              variant={filterAction === ac ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setFilterAction(ac)}
              className={`shrink-0 text-xs ${
                filterAction === ac ? 'bg-ssp-blue hover:bg-ssp-blueDark' : 'text-muted-foreground'
              }`}
            >
              {ac}
            </Button>
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
          <Table className="text-left text-sm">
            <TableHeader className="bg-muted/60 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <TableRow>
                <TableHead className="px-6 py-4">Data e Hora</TableHead>
                <TableHead className="px-6 py-4">Operador RH</TableHead>
                <TableHead className="px-6 py-4">Ação Registrada</TableHead>
                <TableHead className="px-6 py-4">Detalhes da Operação</TableHead>
                <TableHead className="px-6 py-4 text-right">IP de Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-xs">
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="px-6 py-4 font-bold text-foreground">
                    {log.dataHora}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <p className="font-bold text-foreground font-sans">{log.operador}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Mat.: {log.operadorMatricula}
                    </p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={`h-auto px-2.5 py-0.5 font-bold text-[11px] ${getBadgeClass(
                        log.acao
                      )}`}
                    >
                      {log.acao}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md px-6 py-4 font-sans text-foreground/90 whitespace-normal line-clamp-2">
                    {log.detalhes}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right font-mono text-muted-foreground">
                    {log.ip}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
