import {
  BarChart3,
  Users,
  FileText,
  ShieldCheck,
  Layers3,
  Building2,
  Gauge,
  FolderOpen,
} from 'lucide-react';
import { getServidores, getTodosDocumentos } from '@/lib/server/db';
import ExportButton from '@/app/components/ExportButton';
import type { DocumentoPDF, Servidor } from '@/lib/types';

type CategoriaResumo = {
  categoria: DocumentoPDF['categoria'];
  quantidade: number;
};

type LotacaoResumo = {
  lotacao: string;
  quantidade: number;
};

type ServidorResumo = {
  servidor: Servidor;
  quantidade: number;
  paginas: number;
};

function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
}

function BarItem({
  label,
  value,
  total,
  subtitle,
  tone = 'bg-ssp-blue',
}: {
  label: string;
  value: number;
  total: number;
  subtitle?: string;
  tone?: string;
}) {
  const width = total > 0 ? Math.max((value / total) * 100, value > 0 ? 4 : 0) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{label}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          {value.toLocaleString('pt-BR')}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default async function RelatoriosPage() {
  let totalServidores = 0;
  let servidoresComPasta = 0;
  let totalDocumentos = 0;
  let totalPaginas = 0;
  let cobertura = 0;
  let servidoresAtivos = 0;
  let servidoresInativos = 0;
  let mediaDocsPorServidor = 0;
  let mediaPaginasPorDocumento = 0;
  let categoriaResumo: CategoriaResumo[] = [];
  let lotacaoResumo: LotacaoResumo[] = [];
  let topServidores: ServidorResumo[] = [];
  let topLotacao = '';
  let topCategoria = '';
  let totalServidoresSemPasta = 0;

  try {
    const [servidores, documentos] = await Promise.all([getServidores(), getTodosDocumentos()]);
    totalServidores = servidores.length;
    servidoresComPasta = new Set(documentos.map((d) => d.servidorId)).size;
    totalDocumentos = documentos.length;
    totalPaginas = documentos.reduce((soma, d) => soma + (d.paginas || 1), 0);
    cobertura = totalServidores > 0 ? Math.round((servidoresComPasta / totalServidores) * 100) : 0;
    servidoresAtivos = servidores.filter((s) => s.status === 'Ativo').length;
    servidoresInativos = servidores.filter((s) => s.status === 'Inativo').length;
    mediaDocsPorServidor = totalServidores > 0 ? totalDocumentos / totalServidores : 0;
    mediaPaginasPorDocumento = totalDocumentos > 0 ? totalPaginas / totalDocumentos : 0;
    totalServidoresSemPasta = totalServidores - servidoresComPasta;

    const categorias: DocumentoPDF['categoria'][] = [
      'Dados Pessoais',
      'Posse e Exercício',
      'Vida Funcional',
      'Licenças e Afastamentos',
      'Avaliação de Desempenho',
    ];

    categoriaResumo = categorias.map((categoria) => ({
      categoria,
      quantidade: documentos.filter((d) => d.categoria === categoria).length,
    }));

    const documentosPorLotacao = new Map<string, number>();
    const documentosPorServidor = new Map<string, { quantidade: number; paginas: number }>();
    for (const documento of documentos) {
      const servidor = servidores.find((s) => s.id === documento.servidorId);
      const lotacao = servidor?.lotacao?.trim() || 'Lotação não informada';
      documentosPorLotacao.set(lotacao, (documentosPorLotacao.get(lotacao) ?? 0) + 1);

      const atual = documentosPorServidor.get(documento.servidorId) ?? { quantidade: 0, paginas: 0 };
      atual.quantidade += 1;
      atual.paginas += documento.paginas || 1;
      documentosPorServidor.set(documento.servidorId, atual);
    }

    lotacaoResumo = Array.from(documentosPorLotacao.entries())
      .map(([lotacao, quantidade]) => ({ lotacao, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    topServidores = Array.from(documentosPorServidor.entries())
      .map(([servidorId, info]) => ({
        servidor: servidores.find((s) => s.id === servidorId)!,
        quantidade: info.quantidade,
        paginas: info.paginas,
      }))
      .filter((item) => Boolean(item.servidor))
      .sort((a, b) => b.quantidade - a.quantidade || b.paginas - a.paginas)
      .slice(0, 5);

    topCategoria =
      categoriaResumo
        .filter((item) => item.quantidade > 0)
        .sort((a, b) => b.quantidade - a.quantidade)[0]?.categoria ?? 'Nenhuma';
    topLotacao = lotacaoResumo[0]?.lotacao ?? 'Nenhuma';
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="p-3 bg-ssp-blue/10 text-ssp-blue w-fit rounded-xl">
            <Users size={24} />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground">
            Cobertura de Digitalização
          </h3>
          <p className="text-3xl font-extrabold text-foreground">{formatPercent(cobertura)}</p>
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
          <div className="p-3 bg-amber-500/10 text-amber-600 w-fit rounded-xl">
            <Gauge size={24} />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground">Média por Servidor</h3>
          <p className="text-3xl font-extrabold text-foreground">
            {mediaDocsPorServidor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
          </p>
          <p className="text-xs text-muted-foreground">
            documentos por servidor cadastrado no sistema
          </p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 w-fit rounded-xl">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground">Conformidade LGPD</h3>
          <p className="text-3xl font-extrabold text-foreground">{formatPercent(cobertura)}</p>
          <p className="text-xs text-status-success font-medium">
            {servidoresAtivos} ativos, {servidoresInativos} inativos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-card rounded-2xl border border-border shadow-corporate p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Layers3 size={20} className="text-ssp-blue" />
                Distribuição por Categoria
              </h3>
              <p className="text-sm text-muted-foreground">
                Visão da composição documental do acervo.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              Top: {topCategoria}
            </span>
          </div>

          {totalDocumentos === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <FileText size={40} className="mx-auto opacity-30" />
              <p className="text-sm font-medium">
                Nenhum documento cadastrado ainda. Anexe documentos nas pastas funcionais para
                visualizar os gráficos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {categoriaResumo.map((item) => (
                <BarItem
                  key={item.categoria}
                  label={item.categoria}
                  value={item.quantidade}
                  total={totalDocumentos}
                  subtitle={`${Math.round((item.quantidade / totalDocumentos) * 100)}% do acervo`}
                />
              ))}
            </div>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border shadow-corporate p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Building2 size={20} className="text-ssp-blue" />
                Documentos por Lotação
              </h3>
              <p className="text-sm text-muted-foreground">
                Mostra onde o acervo está mais concentrado.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              Top: {topLotacao}
            </span>
          </div>

          {totalDocumentos === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <FolderOpen size={40} className="mx-auto opacity-30" />
              <p className="text-sm font-medium">
                Sem dados para consolidar lotações no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {lotacaoResumo.map((item) => (
                <BarItem
                  key={item.lotacao}
                  label={item.lotacao}
                  value={item.quantidade}
                  total={totalDocumentos}
                  subtitle={`${Math.round((item.quantidade / totalDocumentos) * 100)}% do acervo`}
                  tone="bg-emerald-500"
                />
              ))}
            </div>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border shadow-corporate p-6 space-y-5 xl:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <FileText size={20} className="text-ssp-blue" />
                Pastas com Maior Volume
              </h3>
              <p className="text-sm text-muted-foreground">
                Ranking das pastas com mais documentos e páginas indexadas.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {totalServidoresSemPasta} sem pasta
            </span>
          </div>

          {topServidores.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <Users size={40} className="mx-auto opacity-30" />
              <p className="text-sm font-medium">
                Nenhuma pasta funcional cadastrada ainda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {topServidores.map((item, index) => (
                <div
                  key={item.servidor.id}
                  className="p-4 rounded-xl border border-border bg-muted/20 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground line-clamp-1">
                        {index + 1}. {item.servidor.nome}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Mat. {item.servidor.matricula} • {item.servidor.lotacao}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ssp-blue">
                        {item.quantidade.toLocaleString('pt-BR')} docs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.paginas.toLocaleString('pt-BR')} páginas
                      </p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{
                        width: `${Math.max((item.quantidade / Math.max(topServidores[0].quantidade, 1)) * 100, 4)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 w-fit rounded-xl">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground">Páginas indexadas</h3>
          <p className="text-3xl font-extrabold text-foreground">
            {totalPaginas.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">
            Média de{' '}
            {mediaPaginasPorDocumento.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
            páginas por documento
          </p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 w-fit rounded-xl">
            <FolderOpen size={24} />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground">Pastas sem acervo</h3>
          <p className="text-3xl font-extrabold text-foreground">
            {totalServidoresSemPasta.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">
            Servidores ainda sem documentos anexados
          </p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 w-fit rounded-xl">
            <Users size={24} />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground">Servidores ativos</h3>
          <p className="text-3xl font-extrabold text-foreground">
            {servidoresAtivos.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">
            {servidoresInativos.toLocaleString('pt-BR')} inativos no cadastro
          </p>
        </div>
      </div>
    </div>
  );
}
