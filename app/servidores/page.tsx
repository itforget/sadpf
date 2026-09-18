'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, User, Search, Plus, Filter, ChevronRight, UserPlus } from 'lucide-react';
import Image from 'next/image';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { servidorSchema, type ServidorFormData } from '@/lib/validations/servidor';
import { formatarCpf } from '@/lib/cpf';
import { fetchJson, fetchServidoresPage, type ServidoresFilters } from '@/lib/client/api';
import Pagination from '@/app/components/Pagination';
import { parsePage } from '@/lib/pagination';
import { useUrlFilters } from '@/lib/client/use-url-filters';
import { useDebouncedValue } from '@/lib/client/use-debounced-value';
import { queryKeys, summaryQueryKeys } from '@/lib/client/query-keys';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ServidoresListPage() {
  const { params, updateFilters } = useUrlFilters();
  const rawStatus = params.get('status');
  const statusFilter =
    rawStatus === 'Ativo' || rawStatus === 'Inativo' || rawStatus === 'Aposentado'
      ? rawStatus
      : 'Todos';
  const searchQuery = params.get('search') ?? '';
  const search = useDebouncedValue(searchQuery);
  const filters: ServidoresFilters & { page: number } = {
    status: statusFilter,
    search,
    page: parsePage(params.get('page')),
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ServidorFormData>({
    resolver: zodResolver(servidorSchema),
    defaultValues: {
      nome: '',
      matricula: '',
      matriculaCargoEfetivo: '',
      cpf: '',
      cargoEfetivo: '',
      cargoOcupado: '',
      lotacao: '',
      dataIngresso: '',
      email: '',
      telefone: '',
      status: 'Ativo',
      role: 'PASTA',
      senha: '',
    },
  });

  const {
    data: result,
    isFetching,
    isPlaceholderData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.servidoresPage(filters),
    queryFn: () => fetchServidoresPage(filters),
    placeholderData: keepPreviousData,
  });

  const servidores = result?.items ?? [];

  const createMutation = useMutation({
    mutationFn: async (data: ServidorFormData) => {
      await fetchJson('/api/servidores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          role: 'PASTA',
          senha: '',
          fotoUrl: '',
        }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['servidores'] });
      await Promise.all(
        summaryQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      );
      setShowAddModal(false);
      setCreateError(null);
      reset();
    },
  });

  const onSubmit = async (data: ServidorFormData) => {
    if (createMutation.isPending) return;
    setCreateError(null);
    try {
      await createMutation.mutateAsync(data);
    } catch (error: unknown) {
      setCreateError(
        error instanceof Error ? error.message : 'Não foi possível criar a pasta funcional.'
      );
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setCreateError(null);
    reset();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <Dialog
        open={showAddModal}
        disablePointerDismissal={createMutation.isPending}
        onOpenChange={(open) => {
          if (createMutation.isPending) return;
          setShowAddModal(open);
          if (!open) {
            setCreateError(null);
            reset();
          }
        }}
      >
        <DialogContent className="max-w-2xl" showCloseButton={!createMutation.isPending}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <UserPlus size={24} className="text-ssp-blue" />
              <div>
                <DialogTitle>Criar Nova Pasta Funcional de Servidor</DialogTitle>
                <DialogDescription>
                  Preencha os dados do servidor para criar sua pasta funcional.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <fieldset disabled={createMutation.isPending} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    {...register('nome')}
                    placeholder="Ex.: Mariana Alves de Souza"
                    className={errors.nome ? 'border-destructive' : ''}
                    aria-invalid={!!errors.nome}
                    aria-describedby={errors.nome ? 'nome-error' : undefined}
                  />
                  {errors.nome && (
                    <p id="nome-error" role="alert" className="text-sm text-destructive">
                      {errors.nome.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matricula">Matrícula SSP-DF *</Label>
                  <Input
                    id="matricula"
                    {...register('matricula')}
                    placeholder="Ex.: 987.654-3"
                    className={`font-mono ${errors.matricula ? 'border-destructive' : ''}`}
                    aria-invalid={!!errors.matricula}
                    aria-describedby={errors.matricula ? 'matricula-error' : undefined}
                  />
                  {errors.matricula && (
                    <p id="matricula-error" role="alert" className="text-sm text-destructive">
                      {errors.matricula.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matriculaCargoEfetivo">Matrícula do Cargo Efetivo *</Label>
                  <Input
                    id="matriculaCargoEfetivo"
                    {...register('matriculaCargoEfetivo')}
                    placeholder="Ex.: 987.654-3"
                    className={`font-mono ${
                      errors.matriculaCargoEfetivo ? 'border-destructive' : ''
                    }`}
                    aria-invalid={!!errors.matriculaCargoEfetivo}
                    aria-describedby={
                      errors.matriculaCargoEfetivo ? 'matriculaCargoEfetivo-error' : undefined
                    }
                  />
                  {errors.matriculaCargoEfetivo && (
                    <p
                      id="matriculaCargoEfetivo-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {errors.matriculaCargoEfetivo.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    {...register('cpf')}
                    onChange={(event) =>
                      setValue('cpf', formatarCpf(event.target.value), { shouldValidate: true })
                    }
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    maxLength={14}
                    className={`font-mono ${errors.cpf ? 'border-destructive' : ''}`}
                    aria-invalid={!!errors.cpf}
                    aria-describedby={errors.cpf ? 'cpf-error' : undefined}
                  />
                  {errors.cpf && (
                    <p id="cpf-error" role="alert" className="text-sm text-destructive">
                      {errors.cpf.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail institucional *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="nome@ssp.df.gov.br"
                    className={errors.email ? 'border-destructive' : ''}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p id="email-error" role="alert" className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    {...register('telefone')}
                    placeholder="(61) 99999-9999"
                    className={errors.telefone ? 'border-destructive' : ''}
                    aria-invalid={!!errors.telefone}
                    aria-describedby={errors.telefone ? 'telefone-error' : undefined}
                  />
                  {errors.telefone && (
                    <p id="telefone-error" role="alert" className="text-sm text-destructive">
                      {errors.telefone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          aria-invalid={!!errors.status}
                          aria-describedby={errors.status ? 'status-error' : undefined}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          id="status"
                          className={errors.status ? 'border-destructive' : ''}
                        >
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Inativo">Inativo</SelectItem>
                          <SelectItem value="Aposentado">Aposentado</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.status && (
                    <p id="status-error" role="alert" className="text-sm text-destructive">
                      {errors.status.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataIngresso">Data de admissão *</Label>
                  <Input
                    id="dataIngresso"
                    {...register('dataIngresso')}
                    placeholder="DD/MM/AAAA"
                    className={errors.dataIngresso ? 'border-destructive' : ''}
                    aria-invalid={!!errors.dataIngresso}
                    aria-describedby={errors.dataIngresso ? 'dataIngresso-error' : undefined}
                  />
                  {errors.dataIngresso && (
                    <p id="dataIngresso-error" role="alert" className="text-sm text-destructive">
                      {errors.dataIngresso.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargoOcupado">Cargo SSP-DF</Label>
                  <Input
                    id="cargoOcupado"
                    {...register('cargoOcupado')}
                    placeholder="Ex.: Agente de Polícia"
                    aria-invalid={!!errors.cargoOcupado}
                    aria-describedby={errors.cargoOcupado ? 'cargoOcupado-error' : undefined}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargoEfetivo">Cargo Efetivo *</Label>
                  <Input
                    id="cargoEfetivo"
                    {...register('cargoEfetivo')}
                    className={errors.cargoEfetivo ? 'border-destructive' : ''}
                    aria-invalid={!!errors.cargoEfetivo}
                    aria-describedby={errors.cargoEfetivo ? 'cargoEfetivo-error' : undefined}
                  />
                  {errors.cargoEfetivo && (
                    <p id="cargoEfetivo-error" role="alert" className="text-sm text-destructive">
                      {errors.cargoEfetivo.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lotacao">Lotação Atual *</Label>
                <Input
                  id="lotacao"
                  {...register('lotacao')}
                  className={errors.lotacao ? 'border-destructive' : ''}
                  aria-invalid={!!errors.lotacao}
                  aria-describedby={errors.lotacao ? 'lotacao-error' : undefined}
                />
                {errors.lotacao && (
                  <p id="lotacao-error" role="alert" className="text-sm text-destructive">
                    {errors.lotacao.message}
                  </p>
                )}
              </div>

              <DialogFooter>
                {createError && (
                  <p role="alert" className="mr-auto text-sm text-destructive">
                    {createError}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={createMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-ssp-blue hover:bg-ssp-blueDark"
                >
                  {createMutation.isPending ? 'Criando…' : 'Criar pasta funcional'}
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pastas Funcionais de Servidores
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulta centralizada do acervo digital de servidores da Secretaria de Segurança Pública
            do DF.
          </p>
        </div>

        <Button onClick={() => setShowAddModal(true)} className="bg-ssp-blue hover:bg-ssp-blueDark">
          <Plus size={18} className="mr-2" /> Nova Pasta Funcional
        </Button>
      </div>

      <div className="bg-card p-4 rounded-xl border border-border shadow-corporate flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            type="search"
            aria-label="Buscar servidores por nome, matrícula, CPF ou cargo"
            name="search"
            placeholder="Buscar por nome, matrícula, CPF ou cargo…"
            value={searchQuery}
            onChange={(e) => updateFilters({ search: e.target.value, page: null })}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground">Status:</span>
          {(['Todos', 'Ativo', 'Inativo', 'Aposentado'] as const).map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? 'default' : 'outline'}
              size="sm"
              aria-pressed={statusFilter === st}
              onClick={() =>
                updateFilters({ status: st === 'Todos' ? null : st, page: null }, true)
              }
              className={statusFilter === st ? 'bg-ssp-blue hover:bg-ssp-blueDark' : ''}
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-corporate overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <div className="w-8 h-8 border-4 border-ssp-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold">Carregando acervo de servidores…</p>
          </div>
        ) : isError ? (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {error instanceof Error
                    ? error.message
                    : 'Não foi possível carregar o acervo de servidores.'}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : servidores.length > 0 ? (
          <Table className="text-left text-sm">
            <TableHeader className="bg-muted/60 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <TableRow>
                <TableHead className="px-6 py-4">Servidor</TableHead>
                <TableHead className="px-6 py-4">Matrículas</TableHead>
                <TableHead className="px-6 py-4">Cargo SSP-DF / Efetivo</TableHead>
                <TableHead className="px-6 py-4">Lotação Atual</TableHead>
                <TableHead className="px-6 py-4">Perfil de acesso</TableHead>
                <TableHead className="px-6 py-4">Status</TableHead>
                <TableHead className="px-6 py-4 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servidores.map((s) => (
                <TableRow key={s.id} className="group">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {s.fotoUrl ? (
                        <Image
                          src={s.fotoUrl}
                          alt={s.nome}
                          width={200}
                          height={200}
                          unoptimized={
                            s.fotoUrl.startsWith('/api/') || s.fotoUrl.startsWith('data:')
                          }
                          className="w-10 h-10 rounded-full object-cover border border-border shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                          <User size={18} />
                        </div>
                      )}
                      <div>
                        <Link
                          href={`/servidores/${s.id}`}
                          className="font-bold text-foreground hover:text-ssp-blue transition-colors"
                        >
                          {s.nome}
                        </Link>
                        <p className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                          CPF: {s.cpf}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-mono font-bold text-ssp-blue whitespace-nowrap">
                    <p>{s.matricula}</p>
                    <p className="text-xs text-muted-foreground">{s.matriculaCargoEfetivo}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <p className="font-semibold text-foreground">{s.cargoOcupado}</p>
                    <p className="text-xs text-muted-foreground">{s.cargoEfetivo}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium text-muted-foreground">
                    {s.lotacao}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={`h-auto px-2.5 py-0.5 text-xs font-bold ${
                        s.role === 'ADMIN'
                          ? 'bg-ssp-blue/10 text-ssp-blue border-ssp-blue/20'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {
                        { ADMIN: 'Administrador', OPERADOR: 'Operador do RH', PASTA: 'Pasta' }[
                          s.role
                        ]
                      }
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={`h-auto px-2.5 py-0.5 text-xs font-bold ${
                        s.status === 'Ativo'
                          ? 'bg-status-success/15 text-status-success border-status-success/20'
                          : s.status === 'Inativo'
                          ? 'bg-status-danger/15 text-status-danger border-status-danger/20'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <Link
                      href={`/servidores/${s.id}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Abrir Capa <ChevronRight size={14} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <Users size={48} className="mx-auto opacity-40" />
            <p className="font-semibold text-base">Nenhum servidor encontrado.</p>
            <p className="text-xs">Tente ajustar a busca ou limpar os filtros de status.</p>
          </div>
        )}
      </div>
      {result && !isError && (
        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          pending={isFetching || isPlaceholderData}
          onPageChange={(page) => updateFilters({ page: String(page) }, true)}
        />
      )}
    </div>
  );
}
