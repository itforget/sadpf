'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, User, Search, Plus, Filter, ChevronRight, UserPlus } from 'lucide-react';
import Image from 'next/image';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
import { fetchJson, fetchServidores } from '@/lib/client/api';
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
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo' | 'Aposentado'>(
    'Todos'
  );
  const [searchQuery, setSearchQuery] = useState('');
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

  const status = useWatch({ control, name: 'status' });
  const {
    data: servidores = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.servidores({ status: statusFilter, search: searchQuery }),
    queryFn: () =>
      fetchServidores({
        status: statusFilter,
        search: searchQuery,
      }),
  });

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
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) setCreateError(null);
        }}
      >
        <DialogContent className="max-w-2xl">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  {...register('nome')}
                  placeholder="Ex.: Mariana Alves de Souza"
                  className={errors.nome ? 'border-destructive' : ''}
                />
                {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula SSP-DF *</Label>
                <Input
                  id="matricula"
                  {...register('matricula')}
                  placeholder="Ex.: 987.654-3"
                  className={`font-mono ${errors.matricula ? 'border-destructive' : ''}`}
                />
                {errors.matricula && (
                  <p className="text-sm text-destructive">{errors.matricula.message}</p>
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
                />
                {errors.matriculaCargoEfetivo && (
                  <p className="text-sm text-destructive">{errors.matriculaCargoEfetivo.message}</p>
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
                />
                {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail institucional *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="nome@ssp.df.gov.br"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  type="tel"
                  {...register('telefone')}
                  placeholder="(61) 99999-9999"
                  className={errors.telefone ? 'border-destructive' : ''}
                />
                {errors.telefone && (
                  <p className="text-sm text-destructive">{errors.telefone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    if (value) setValue('status', value);
                  }}
                >
                  <SelectTrigger className={errors.status ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Aposentado">Aposentado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataIngresso">Data de admissão *</Label>
                <Input
                  id="dataIngresso"
                  {...register('dataIngresso')}
                  placeholder="DD/MM/AAAA"
                  className={errors.dataIngresso ? 'border-destructive' : ''}
                />
                {errors.dataIngresso && (
                  <p className="text-sm text-destructive">{errors.dataIngresso.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargoOcupado">Cargo SSP-DF</Label>
                <Input
                  id="cargoOcupado"
                  {...register('cargoOcupado')}
                  placeholder="Ex.: Agente de Polícia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargoEfetivo">Cargo Efetivo *</Label>
                <Input
                  id="cargoEfetivo"
                  {...register('cargoEfetivo')}
                  className={errors.cargoEfetivo ? 'border-destructive' : ''}
                />
                {errors.cargoEfetivo && (
                  <p className="text-sm text-destructive">{errors.cargoEfetivo.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lotacao">Lotação Atual *</Label>
              <Input
                id="lotacao"
                {...register('lotacao')}
                className={errors.lotacao ? 'border-destructive' : ''}
              />
              {errors.lotacao && (
                <p className="text-sm text-destructive">{errors.lotacao.message}</p>
              )}
            </div>

            <DialogFooter>
              {createError && <p className="mr-auto text-sm text-destructive">{createError}</p>}
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-ssp-blue hover:bg-ssp-blueDark">
                Criar Pasta Funcional
              </Button>
            </DialogFooter>
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
            placeholder="Buscar por nome, matrícula, CPF ou cargo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground">Status:</span>
          {(['Todos', 'Ativo', 'Inativo', 'Aposentado'] as const).map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(st)}
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
            <p className="text-sm font-semibold">Carregando acervo de servidores...</p>
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
                <TableHead className="px-6 py-4">Role</TableHead>
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
                        <p className="text-xs text-muted-foreground font-mono">CPF: {s.cpf}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-mono font-bold text-ssp-blue">
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
                      {s.role}
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
    </div>
  );
}
