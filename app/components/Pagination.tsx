import { Button } from '@/components/ui/button';

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  pending = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  pending?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3 p-4">
      <p role="status" className="text-sm tabular-nums text-muted-foreground">
        Página {page.toLocaleString('pt-BR')} de {pages.toLocaleString('pt-BR')} ·{' '}
        {total.toLocaleString('pt-BR')} registros
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={page <= 1 || pending}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={page >= pages || pending}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </nav>
  );
}
