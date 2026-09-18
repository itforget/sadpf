'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchJson } from '@/lib/client/api';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import Image from 'next/image';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return fetchJson<{ firstAccess?: boolean; passwordRequired?: boolean; message?: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
    },
  });

  const resetRequestMutation = useMutation({
    mutationFn: async (email: string) => {
      return fetchJson<{ message: string }>('/api/auth/solicitar-redefinicao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setNotice(null);

    try {
      const result = await loginMutation.mutateAsync(data);

      if (result?.firstAccess) {
        setNotice(result.message || null);
        return;
      }

      if (result?.passwordRequired) {
        setPasswordRequired(true);
        requestAnimationFrame(() => setFocus('password'));
        return;
      }

      window.location.replace('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível conectar ao servidor. Tente novamente.'
      );
    }
  };

  const requestPasswordReset = async () => {
    setError(null);
    setNotice(null);
    if (!(await trigger('email'))) return;

    try {
      const result = await resetRequestMutation.mutateAsync(getValues('email'));
      setNotice(result.message);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível solicitar a redefinição de senha. Tente novamente.'
      );
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-background lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-ssp-blueDark flex-col justify-center items-center p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        <Image
          src="/logo-sspdf.png"
          alt="Logo SSP-DF"
          width={120}
          height={120}
          className="mb-6 h-auto w-auto"
        />
        <p className="text-4xl font-bold mb-4 z-10 tracking-tight">SADPF</p>
        <p className="z-10 max-w-md text-center text-xl font-light leading-relaxed text-white/80">
          Sistema de Arquivo Digital de Pastas Funcionais da Secretaria de Estado de Segurança
          Pública do Distrito Federal - SSP DF
        </p>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 py-8 sm:p-8 bg-card shadow-[-20px_0_30px_-15px_rgba(0,0,0,0.1)] z-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
              Acesso Restrito
            </h1>
            <p className="text-muted-foreground text-sm">
              Insira suas credenciais corporativas GDF.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail institucional</Label>
              <Input
                id="email"
                type="email"
                spellCheck={false}
                {...register('email')}
                autoComplete="email"
                placeholder="nome@ssp.df.gov.br"
                className={errors.email ? 'border-destructive' : ''}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {passwordRequired && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    autoComplete="current-password"
                    className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-status-danger">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="text-sm text-status-success">
                {notice}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Informe seu e-mail para continuar. No primeiro acesso, enviaremos um link para você
              criar sua senha.
            </p>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-ssp-blue hover:bg-ssp-blueDark mt-4"
            >
              {loginMutation.isPending
                ? 'Verificando…'
                : passwordRequired
                ? 'Entrar no Sistema'
                : 'Continuar'}
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full text-ssp-blue"
              disabled={resetRequestMutation.isPending}
              onClick={requestPasswordReset}
            >
              {resetRequestMutation.isPending ? 'Enviando link…' : 'Redefinir senha'}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-muted border border-border rounded-lg">
            <p className="text-xs text-muted-foreground leading-relaxed text-left">
              <strong className="text-foreground">Aviso de Privacidade (LGPD):</strong> O acesso é
              restrito a servidores autorizados. O sistema utiliza dados funcionais e registra
              eventos para auditoria. Mantenha o sigilo das informações acessadas e consulte o aviso
              de privacidade para conhecer as informações disponíveis sobre esse uso.
            </p>
            <Link
              href="/privacidade"
              className="mt-3 inline-block text-sm font-medium text-ssp-blue hover:underline"
            >
              Consultar aviso de privacidade
            </Link>
          </div>
        </div>

        <div className="mt-6 text-xs font-medium text-muted-foreground">
          SADPF {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
