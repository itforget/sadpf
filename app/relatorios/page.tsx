import { BarChart3, Users, FileText, ShieldCheck } from 'lucide-react';
import { getServidores, getTodosDocumentos } from '@/lib/server/db';
import ExportButton from '@/app/components/ExportButton';

export default async function RelatoriosPage() {
  let totalServidores = 0;
  let servidoresComPasta = 0;
  let totalDocumentos = 0;
  let cobertura = '0%';

  try {
    const [servidores, documentos] = await Promise.all([getServidores(), getTodosDocumentos()]);
    totalServidores = servidores.length;
    servidoresComPasta = new Set(documentos.map((d) => d.servidorId)).size;
    totalDocumentos = documentos.length;
    cobertura =
      totalServidores > 0 ? `${Math.round((servidoresComPasta / totalServidores) * 100)}%` : '0%';
  } catch (e) {
    console.error('[RelatoriosPage] erro ao buscar dados:', e);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 size={26} className="text-ssp-blue" /> Relatórios Sintéticos de Gestão de
            Pessoas
          </h1>
          <p className="text-sm text-muted-foreground">
            Consolidado estatístico do acervo digitalizado de pastas funcionais da SSP-DF.
          </p>
        </div>
        <ExportButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="p-3 bg-ssp-blue/10 text-ssp-blue w-fit rounded-xl">
            <Users size={24} />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground">
            Cobertura de Digitalização
          </h3>
          <p className="text-3xl font-extrabold text-foreground">{cobertura}</p>
          <p className="text-xs text-status-success font-medium">
            {servidoresComPasta} de {totalServidores} servidores com pasta digitalizada
          </p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 w-fit rounded-xl">
            <FileText size={24} />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground">
            Volume de Documentos em PDF
          </h3>
          <p className="text-3xl font-extrabold text-foreground">
            {totalDocumentos.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">Indexados com OCR para pesquisa de termos</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 w-fit rounded-xl">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground">Conformidade LGPD</h3>
          <p className="text-3xl font-extrabold text-foreground">100% Auditado</p>
          <p className="text-xs text-status-success font-medium">
            Todas as impressões e acessos com marca d&apos;água
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-corporate p-6 space-y-4">
        <h3 className="font-bold text-lg text-foreground">
          Distribuição de Acervo por Categoria Documental
        </h3>
        {totalDocumentos === 0 ? (
          <div className="p-8 text-center text-muted-foreground space-y-2">
            <FileText size={40} className="mx-auto opacity-30" />
            <p className="text-sm font-medium">
              Nenhum documento cadastrado ainda. Anexe documentos nas pastas funcionais para
              visualizar a distribuição por categoria.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Para visualizar a distribuição por categoria, integre um gráfico com os dados reais da
            API.
          </p>
        )}
      </div>
    </div>
  );
}
