'use client';

import { useState } from 'react';
import { CheckCircle2, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

export default function AssinaturaClient({
  token,
  documento,
  servidor,
  expiracao,
  assinado,
}: {
  token: string;
  documento: string;
  servidor: string;
  expiracao: string;
  assinado: boolean;
}) {
  const [aceite, setAceite] = useState(false);
  const [cpf, setCpf] = useState('');
  const [signed, setSigned] = useState(assinado);
  const [status, setStatus] = useState(assinado ? 'Assinado eletronicamente.' : '');
  const [loading, setLoading] = useState(false);
  const sign = async () => {
    setLoading(true);
    const response = await fetch(`/api/assinaturas/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf }),
    });
    const payload = (await response.json()) as { error?: string };
    setStatus(
      response.ok
        ? 'Assinado eletronicamente com sucesso.'
        : payload.error || 'Não foi possível concluir a assinatura.'
    );
    if (response.ok) setSigned(true);
    setLoading(false);
  };
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-corporate space-y-5">
        <div className="flex items-center gap-3">
          <FileSignature className="text-ssp-blue" size={28} />
          <div>
            <h1 className="text-xl font-bold">Assinatura eletrônica interna</h1>
            <p className="text-sm text-muted-foreground">Solicitação destinada a {servidor}</p>
          </div>
        </div>
        <div className="rounded-xl bg-muted p-4 text-sm">
          <p>
            <strong>Documento:</strong> {documento}
          </p>
          <p className="mt-1">
            <strong>Validade:</strong> {expiracao}
          </p>
        </div>
        <iframe
          src={`/api/assinaturas/${token}/arquivo?assinado=${signed}`}
          title="Documento para assinatura"
          className="h-[420px] w-full rounded-xl border border-border sm:h-[560px]"
        />
        {status ? (
          <p className="flex items-center gap-2 text-status-success">
            <CheckCircle2 size={18} />
            {status}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor="cpf" className="text-sm font-medium">
                Confirme seu CPF para assinar
              </label>
              <Input
                id="cpf"
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                value={cpf}
                onChange={(event) => setCpf(event.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="Somente números"
              />
            </div>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={aceite} onCheckedChange={(value) => setAceite(value === true)} />
              <span>
                Li o documento e confirmo meu aceite eletrônico para os fins internos deste
                processo.
              </span>
            </label>
            <Button
              disabled={!aceite || cpf.length !== 11 || loading}
              onClick={sign}
              className="bg-ssp-blue hover:bg-ssp-blueDark"
            >
              {loading ? 'Registrando...' : 'Confirmar assinatura eletrônica'}
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
