'use client';

import { Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { fetchEncaminhamentos } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';

export default function EncaminhamentosPage() {
  const {
    data: encaminhamentos = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.encaminhamentos,
    queryFn: fetchEncaminhamentos,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Send size={26} className="text-ssp-blue" /> Solicitações de assinatura
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe os convites individuais enviados aos titulares para revisão e assinatura dos
            documentos.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground space-y-3">
              <div className="w-8 h-8 border-4 border-ssp-blue border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold">Carregando encaminhamentos…</p>
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {error instanceof Error
                    ? error.message
                    : 'Não foi possível carregar os encaminhamentos.'}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : encaminhamentos.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-3">
              <Send size={48} className="mx-auto opacity-40" />
              <p className="font-semibold text-base">Nenhum encaminhamento registrado.</p>
              <p className="text-xs">
                As solicitações criadas nas páginas dos documentos aparecerão aqui.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data de Geração</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Pasta / Servidor</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encaminhamentos.map((enc) => (
                  <TableRow key={enc.id}>
                    <TableCell className="font-mono font-bold">{enc.dataHora}</TableCell>
                    <TableCell className="font-semibold text-ssp-blue">
                      {enc.destinatario}
                    </TableCell>
                    <TableCell className="font-medium">{enc.servidor}</TableCell>
                    <TableCell className="font-mono">{enc.validade}</TableCell>
                    <TableCell>
                      <Badge
                        variant={enc.status === 'Expirado' ? 'destructive' : 'default'}
                        className={
                          enc.status === 'Assinado'
                            ? 'bg-status-success/15 text-status-success border-status-success/20'
                            : ''
                        }
                      >
                        {enc.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
