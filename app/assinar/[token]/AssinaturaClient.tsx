'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, FileSignature } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cpfEstaCompleto, formatarCpf } from '@/lib/cpf';
import { fetchJson, ApiError } from '@/lib/client/api';

export default function AssinaturaClient({
  token,
  documento,
  servidor,
  expiracao,
  assinado,
  expirado = false,
}: {
  token: string;
  documento: string;
  servidor: string;
  expiracao: string;
  assinado: boolean;
  expirado?: boolean;
}) {
  const [aceite, setAceite] = useState(false);
  const [cpf, setCpf] = useState('');
  const [signed, setSigned] = useState(assinado);
  const [expired, setExpired] = useState(expirado);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileUrl = `/api/assinaturas/${token}/arquivo?assinado=${signed}`;
  const sign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    if (!cpfEstaCompleto(cpf) || !aceite) {
      setError('Informe seu CPF completo e confirme que leu o documento.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await fetchJson(`/api/assinaturas/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf }),
      });
      setSigned(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) setExpired(true);
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível registrar a assinatura. Verifique sua conexão e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="space-y-5 rounded-xl border border-border bg-card p-4 shadow-corporate sm:p-6">
        <div className="flex items-center gap-3">
          <FileSignature aria-hidden="true" className="shrink-0 text-ssp-blue" size={28} />
          <div className="min-w-0">
            <h1 className="text-xl font-bold">Assinatura eletrônica interna</h1>
            <p className="break-words text-sm text-muted-foreground">
              Solicitação destinada a {servidor}
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-muted p-4 text-sm break-words">
          <p>
            <strong>Documento:</strong> {documento}
          </p>
          <p className="mt-1">
            <strong>Validade:</strong> {expiracao}
          </p>
        </div>
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: 'outline' })}
        >
          Abrir PDF em outra aba
        </a>
        <iframe
          src={fileUrl}
          title="Documento para assinatura"
          className="h-[min(65dvh,560px)] min-h-64 w-full rounded-lg border border-border"
        />
        {signed ? (
          <p role="status" className="flex items-center gap-2 text-status-success">
            <CheckCircle2 aria-hidden="true" size={18} /> Assinado eletronicamente com sucesso.
          </p>
        ) : expired ? (
          <Alert variant="destructive">
            <AlertDescription>
              Este link expirou. Solicite um novo convite ao setor de Gestão de Pessoas.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={sign} className="space-y-4" aria-busy={loading}>
            {error && (
              <Alert variant="destructive" id="assinatura-erro">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label htmlFor="cpf" className="text-sm font-medium">
                Confirme seu CPF para assinar
              </label>
              <Input
                id="cpf"
                name="cpf"
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                value={cpf}
                disabled={loading}
                aria-invalid={!!error}
                aria-describedby={error ? 'assinatura-erro' : undefined}
                onChange={(event) => setCpf(formatarCpf(event.target.value))}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Checkbox
                id="aceite"
                name="aceite"
                checked={aceite}
                disabled={loading}
                onCheckedChange={(value) => setAceite(value === true)}
              />
              <label htmlFor="aceite">
                Li o documento e confirmo meu aceite eletrônico para os fins internos deste
                processo.
              </label>
            </div>
            <Button type="submit" disabled={loading} className="h-auto min-h-11 whitespace-normal">
              {loading ? 'Registrando…' : 'Confirmar assinatura eletrônica'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
