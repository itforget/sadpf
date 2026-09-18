'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function QueryError({
  message = 'Não foi possível atualizar os dados. Tente novamente.',
  onRetry,
  pending = false,
}: {
  message?: string;
  onRetry: () => void;
  pending?: boolean;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{message}</span>
        <Button variant="outline" size="sm" disabled={pending} onClick={onRetry}>
          {pending ? 'Atualizando…' : 'Tentar novamente'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
