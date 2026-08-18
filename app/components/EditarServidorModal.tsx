'use client';

import { useState, type FormEvent } from 'react';
import type { Servidor } from '@/lib/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchSession } from '@/lib/client/api';
import { queryKeys, summaryQueryKeys } from '@/lib/client/query-keys';
import { useQuery } from '@tanstack/react-query';

interface EditarServidorModalProps {
  servidor: Servidor;
  modo: 'dados' | 'foto';
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditarServidorModal({
  servidor,
  modo,
  onClose,
  onUpdated,
}: EditarServidorModalProps) {
  const [dados, setDados] = useState(servidor);
  const [foto, setFoto] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const editandoFoto = modo === 'foto';
  const queryClient = useQueryClient();
  const { data: sessionData } = useQuery({
    queryKey: queryKeys.session,
    queryFn: fetchSession,
  });
  const podeEditarPerfil = sessionData?.user?.role === 'ADMIN';

  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (editandoFoto) {
        if (!foto) throw new Error('Selecione uma imagem para enviar.');
        if (!['image/png', 'image/jpeg'].includes(foto.type)) {
          throw new Error('Envie uma imagem PNG ou JPEG.');
        }
        if (foto.size > 5 * 1024 * 1024) throw new Error('A foto deve ter no máximo 5 MB.');
        const formData = new FormData();
        formData.append('foto', foto);
        const response = await fetch(`/api/servidores/${servidor.id}/foto`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const resposta = await response.json().catch(() => null);
          throw new Error(resposta?.error || 'Não foi possível salvar a foto.');
        }
        return;
      }

      const response = await fetch(`/api/servidores?id=${encodeURIComponent(servidor.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: dados.nome,
          matricula: dados.matricula,
          matriculaCargoEfetivo: dados.matriculaCargoEfetivo,
          cpf: dados.cpf,
          cargoEfetivo: dados.cargoEfetivo,
          cargoOcupado: dados.cargoOcupado,
          lotacao: dados.lotacao,
          status: dados.status,
          ...(podeEditarPerfil ? { role: dados.role } : {}),
          dataIngresso: dados.dataIngresso,
          email: dados.email,
          telefone: dados.telefone,
        }),
      });
      if (!response.ok) {
        const resposta = await response.json().catch(() => null);
        throw new Error(resposta?.error || 'Não foi possível salvar as alterações.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['servidores'] });
      await Promise.all(
        summaryQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      );
      onUpdated();
      onClose();
    },
    onError: (error) => {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar as alterações.');
    },
    onSettled: () => {
      setSalvando(false);
    },
  });

  const atualizar = <K extends keyof Servidor>(campo: K, valor: Servidor[K]) => {
    setDados((anterior) => ({ ...anterior, [campo]: valor }));
  };

  const salvar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      await salvarMutation.mutateAsync();
    } catch {}
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" showCloseButton={!salvando}>
        <DialogHeader>
          <DialogTitle>
            {editandoFoto ? 'Adicionar ou editar foto' : 'Editar dados do servidor'}
          </DialogTitle>
          <DialogDescription>
            {editandoFoto
              ? 'Envie uma imagem para a pasta funcional e os PDFs.'
              : 'Atualize os dados cadastrais do servidor.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          {editandoFoto ? (
            <div className="space-y-2">
              <Label htmlFor="foto">Foto do servidor</Label>
              <Input
                id="foto"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => setFoto(event.target.files?.[0] || null)}
                required
              />
              <p className="text-xs text-muted-foreground">PNG ou JPEG, até 5 MB.</p>
            </div>
          ) : (
            <>
              <Campo
                id="nome"
                label="Nome completo"
                value={dados.nome}
                onChange={(value) => atualizar('nome', value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Campo
                  id="matricula"
                  label="Matrícula SSP-DF"
                  value={dados.matricula}
                  onChange={(value) => atualizar('matricula', value)}
                />
                <Campo
                  id="matriculaCargoEfetivo"
                  label="Matrícula do cargo efetivo"
                  value={dados.matriculaCargoEfetivo}
                  onChange={(value) => atualizar('matriculaCargoEfetivo', value)}
                />
                <Campo
                  id="cpf"
                  label="CPF"
                  value={dados.cpf}
                  onChange={(value) => atualizar('cpf', value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo
                  id="cargoOcupado"
                  label="Cargo SSP-DF"
                  value={dados.cargoOcupado}
                  onChange={(value) => atualizar('cargoOcupado', value)}
                />
                <Campo
                  id="cargoEfetivo"
                  label="Cargo efetivo"
                  value={dados.cargoEfetivo}
                  onChange={(value) => atualizar('cargoEfetivo', value)}
                />
              </div>
              <Campo
                id="lotacao"
                label="Lotação"
                value={dados.lotacao}
                onChange={(value) => atualizar('lotacao', value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Campo
                  id="email"
                  label="E-mail institucional"
                  type="email"
                  value={dados.email}
                  onChange={(value) => atualizar('email', value)}
                />
                <Campo
                  id="telefone"
                  label="Telefone"
                  value={dados.telefone}
                  onChange={(value) => atualizar('telefone', value)}
                />
              </div>
              <Campo
                id="dataIngresso"
                label="Data de admissão"
                value={dados.dataIngresso}
                onChange={(value) => atualizar('dataIngresso', value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Selecao
                  id="status"
                  label="Status"
                  value={dados.status}
                  opcoes={['Ativo', 'Inativo', 'Aposentado']}
                  onChange={(value) => atualizar('status', value as Servidor['status'])}
                />
                {podeEditarPerfil ? (
                  <Selecao
                    id="role"
                    label="Perfil"
                    value={dados.role}
                    opcoes={['ADMIN', 'OPERADOR', 'PASTA']}
                    onChange={(value) => atualizar('role', value as Servidor['role'])}
                  />
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="role">Perfil</Label>
                    <Input id="role" value={dados.role} disabled />
                    <p className="text-xs text-muted-foreground">
                      Apenas administradores podem alterar este campo.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
          {erro && <p className="text-sm text-status-danger">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando} className="bg-ssp-blue hover:bg-ssp-blueDark">
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  id,
  label,
  value,
  onChange,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={id !== 'email' && id !== 'telefone'}
      />
    </div>
  );
}

function Selecao({
  id,
  label,
  value,
  opcoes,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  opcoes: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue ?? '')}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((opcao) => (
            <SelectItem key={opcao} value={opcao}>
              {opcao}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
