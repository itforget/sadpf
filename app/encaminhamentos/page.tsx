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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchEncaminhamentos } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';

interface Encaminhamento {
  id: string;
  dataHora: string;
  destinatario: string;
  servidor: string;
  validade: string;
  status: string;
  justificativa: string;
}

export default function EncaminhamentosPage() {
  const { data: encaminhamentos = [], isLoading } = useQuery({
    queryKey: queryKeys.encaminhamentos,
    queryFn: fetchEncaminhamentos,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send size={26} className="text-ssp-blue" /> Gestão de Encaminhamentos Seguros
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Controle de links de acesso temporário e auditável gerados para comissões e órgãos de
            controle.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground space-y-3">
              <div className="w-8 h-8 border-4 border-ssp-blue border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold">Carregando encaminhamentos...</p>
            </div>
          ) : encaminhamentos.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-3">
              <Send size={48} className="mx-auto opacity-40" />
              <p className="font-semibold text-base">Nenhum encaminhamento registrado.</p>
              <p className="text-xs">
                Os encaminhamentos gerados através das pastas funcionais aparecerão aqui.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data de Geração</TableHead>
                  <TableHead>Unidade Destinatária</TableHead>
                  <TableHead>Pasta / Servidor</TableHead>
                  <TableHead>Justificativa</TableHead>
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
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {enc.justificativa}
                    </TableCell>
                    <TableCell className="font-mono">{enc.validade}</TableCell>
                    <TableCell>
                      <Badge
                        variant={enc.status === 'Ativo' ? 'default' : 'destructive'}
                        className={
                          enc.status === 'Ativo'
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
