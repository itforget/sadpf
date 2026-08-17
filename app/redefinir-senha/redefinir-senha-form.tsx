'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchJson } from '@/lib/client/api';
import { passwordResetSchema, type PasswordResetFormData } from '@/lib/validations/auth';

type Props = {
  token: string;
};

export default function RedefinirSenhaForm({ token }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { token },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: PasswordResetFormData) => {
      await fetchJson('/api/auth/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
  });

  const onSubmit = async (data: PasswordResetFormData) => {
    setMessage(null);

    try {
      await resetMutation.mutateAsync(data);
      router.replace('/login');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível conectar ao servidor. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-foreground">Definir senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie uma senha forte com pelo menos 12 caracteres para acessar o SADPF.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <input type="hidden" {...register('token')} />
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {errors.token && <p className="text-sm text-destructive">{errors.token.message}</p>}
          {message && <p className="text-sm text-status-danger">{message}</p>}

          <Button
            type="submit"
            disabled={resetMutation.isPending || !token}
            className="w-full bg-ssp-blue hover:bg-ssp-blueDark"
          >
            {resetMutation.isPending ? 'Salvando...' : 'Salvar senha'}
          </Button>
        </form>

        <Link
          href="/login"
          className="mt-5 block text-center text-sm text-ssp-blue hover:underline"
        >
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}
