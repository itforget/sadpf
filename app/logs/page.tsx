'use client';

import { ScrollText, Search, RefreshCw, Lock } from 'lucide-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchLogsPage } from '@/lib/client/api';
import Pagination from '@/app/components/Pagination';
import { parsePage } from '@/lib/pagination';
import { useUrlFilters } from '@/lib/client/use-url-filters';
import { useDebouncedValue } from '@/lib/client/use-debounced-value';
import { AUDIT_ACTION_LABELS } from '@/lib/audit-labels';
import { queryKeys } from '@/lib/client/query-keys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function LogsPage() {
  const { params, updateFilters } = useUrlFilters();
  const rawAction = params.get('action') ?? 'TODAS';
  const filterAction = Object.hasOwn(AUDIT_ACTION_LABELS, rawAction) ? rawAction : 'TODAS';
  const search = params.get('search') ?? '';
  const filters = {
    action: filterAction,
    search: useDebouncedValue(search),
    page: parsePage(params.get('page')),
  };
  const {
    data: result,
    isFetching,
    isPlaceholderData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.logsPage(filters),
    queryFn: () => fetchLogsPage(filters),
    placeholderData: keepPreviousData,
  });

  const filteredLogs = result?.items ?? [];

  const getBadgeClass = (acao: string) => {
    switch (acao) {
      case 'IMPRESSAO':
        return 'bg-muted text-muted-foreground border-border';
      case 'EXPORTACAO':
        return 'bg-ssp-blue/10 text-ssp-blue border-ssp-blue/20';
      case 'ENCAMINHAMENTO':
        return 'bg-status-warning/10 text-status-warning border-status-warning/20';
      case 'UPLOAD':
        return 'bg-status-success/10 text-status-success border-status-success/20';
      case 'ATUALIZACAO':
        return 'bg-status-warning/10 text-status-warning border-status-warning/20';
      case 'EXCLUSAO':
        return 'bg-status-danger/10 text-status-danger border-status-danger/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
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
            Consulte os eventos registrados pelo sistema, com filtros por ação e operador.
          </p>
        </div>

        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw size={16} /> Atualizar Log
        </Button>
      </div>

      <div className="p-4 bg-ssp-blueDark text-white rounded-2xl flex items-center gap-4 shadow-corporate">
        <Lock size={32} className="text-white/70 shrink-0" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-sm">Acompanhamento de eventos e proteção de dados</p>
          <p className="text-white/80">
            Os registros exibem a ação, a data e hora, a matrícula do operador e o endereço IP.
            Utilize estas informações para acompanhar as operações registradas no SADPF.
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
            name="search"
            aria-label="Buscar eventos por operador, matrícula ou detalhes"
            placeholder="Filtrar por operador, matrícula ou evento…"
            value={search}
            onChange={(e) => updateFilters({ search: e.target.value, page: null })}
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
              key={AUDIT_ACTION_LABELS[ac as keyof typeof AUDIT_ACTION_LABELS]}
              type="button"
              variant={filterAction === ac ? 'default' : 'secondary'}
              size="sm"
              aria-pressed={filterAction === ac}
              onClick={() =>
                updateFilters({ action: ac === 'TODAS' ? null : ac, page: null }, true)
              }
              className={`shrink-0 text-xs ${
                filterAction === ac ? 'bg-ssp-blue hover:bg-ssp-blueDark' : 'text-muted-foreground'
              }`}
            >
              {AUDIT_ACTION_LABELS[ac as keyof typeof AUDIT_ACTION_LABELS]}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-corporate overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <div className="w-8 h-8 border-4 border-ssp-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold">Carregando trilha de auditoria…</p>
          </div>
        ) : isError ? (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {error instanceof Error
                    ? error.message
                    : 'Não foi possível carregar a trilha de auditoria.'}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
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
                  <TableCell className="px-6 py-4 font-bold text-foreground whitespace-nowrap">
                    {log.dataHora}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <p className="font-bold text-foreground font-sans">{log.operador}</p>
                    <p className="text-[11px] text-muted-foreground whitespace-nowrap">
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
                      {AUDIT_ACTION_LABELS[log.acao]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md px-6 py-4 font-sans text-foreground/90 whitespace-normal">
                    <details>
                      <summary className="cursor-pointer rounded-sm text-ssp-blue focus-visible:outline-2 focus-visible:outline-ring">
                        Ver detalhes do evento
                      </summary>
                      <p className="mt-2 break-words">{log.detalhes}</p>
                    </details>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right font-mono text-muted-foreground whitespace-nowrap">
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
      {result && !isError && (
        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          pending={isFetching || isPlaceholderData}
          onPageChange={(page) => updateFilters({ page: String(page) }, true)}
        />
      )}
    </div>
  );
}
