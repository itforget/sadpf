'use client';

import { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';

interface LogResponse {
  id: string;
  dataHora: string;
  operador: string;
  operadorMatricula: string;
  detalhes: string;
  acao: string;
}

interface ImpressaoLog {
  id: string;
  dataHora: string;
  operador: string;
  detalhes: string;
}

export default function ImpressoesPage() {
  const [impressoes, setImpressoes] = useState<ImpressaoLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImpressos = async () => {
      try {
        const res = await fetch('/api/logs');
        if (!res.ok) {
          setImpressoes([]);
          return;
        }
        const logs = (await res.json()) as LogResponse[];

        const filtradas = logs
          .filter((l) => l.acao === 'IMPRESSAO')
          .map((l) => ({
            id: l.id,
            dataHora: l.dataHora,
            operador: `${l.operador} (Mat. ${l.operadorMatricula})`,
            detalhes: l.detalhes,
          }));

        setImpressoes(filtradas);
      } catch (e) {
        console.error('[ImpressoesPage]', e);
      } finally {
        setLoading(false);
      }
    };

    void loadImpressos();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Printer size={26} className="text-ssp-blue" /> Histórico de Impressões Auditadas
          </h1>
          <p className="text-sm text-muted-foreground">
            Todas as folhas impressas contêm marca d&apos;água nominal e hash de validação gerado
            pela Gestão de Pessoas.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-corporate overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <div className="w-8 h-8 border-4 border-ssp-blue border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold">Carregando histórico de impressões...</p>
          </div>
        ) : impressoes.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <Printer size={48} className="mx-auto opacity-40" />
            <p className="font-semibold text-base">Nenhuma impressão registrada.</p>
            <p className="text-xs">
              As impressões realizadas nas pastas funcionais aparecem automaticamente aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/60 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-4">Data/Hora</th>
                  <th className="px-6 py-4">Operador do RH</th>
                  <th className="px-6 py-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {impressoes.map((imp) => (
                  <tr key={imp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold font-mono text-foreground">
                      {imp.dataHora}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">{imp.operador}</td>
                    <td className="px-6 py-4 text-muted-foreground max-w-md truncate">
                      {imp.detalhes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
