'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UploadCloud, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { documentoSchema, type DocumentoFormData } from '@/lib/validations/documento';
import { fetchJson, fetchServidoresAtivos } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';

interface ServidorOption {
  id: string;
  matricula: string;
  nome: string;
  cargoEfetivo: string;
}

function NovoDocumentoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultServidorId = searchParams.get('servidorId') || '';

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = useForm<DocumentoFormData>({
    resolver: zodResolver(documentoSchema),
    defaultValues: {
      servidorId: defaultServidorId,
      titulo: '',
      categoria: 'Vida Funcional',
      processoSEI: '',
    },
  });

  const servidorId = useWatch({ control, name: 'servidorId' });
  const categoria = useWatch({ control, name: 'categoria' });

  const { data: servidores = [] } = useQuery({
    queryKey: queryKeys.servidoresAtivos,
    queryFn: fetchServidoresAtivos,
  });

  useEffect(() => {
    if (!servidorId && servidores.length > 0) {
      setValue('servidorId', servidores[0].id);
    }
  }, [servidorId, servidores, setValue]);

  const uploadMutation = useMutation({
    mutationFn: async (data: DocumentoFormData) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('servidorId', data.servidorId);
      formData.append('titulo', data.titulo);
      formData.append('categoria', data.categoria);
      if (data.processoSEI) {
        formData.append('processoSEI', data.processoSEI);
      }

      await fetchJson('/api/upload', {
        method: 'POST',
        body: formData,
      });
    },
  });

  const onSubmit = async (data: DocumentoFormData) => {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await uploadMutation.mutateAsync(data);
      setSuccessMsg('Documento PDF anexado e indexado com OCR com sucesso!');
      setTimeout(() => {
        router.push(`/servidores/${data.servidorId}`);
      }, 1200);
    } catch (err: unknown) {
      console.error('Erro durante o envio do arquivo:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao enviar arquivo.';
      setErrorMsg(msg);
      setValue('file', undefined as unknown as File);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValue('file', file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Link
          href={servidorId ? `/servidores/${servidorId}` : '/servidores'}
          title="Voltar"
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Anexar Documento PDF na Pasta Digital
          </h1>
          <p className="text-sm text-muted-foreground">
            Apenas arquivos PDF são aceitos. O sistema executará a leitura e indexação via OCR
            automaticamente.
          </p>
        </div>
      </div>

      {successMsg && (
        <Alert className="bg-status-success/10 border-status-success/30 text-status-success">
          <CheckCircle2 size={20} />
          <AlertDescription className="font-semibold">{successMsg}</AlertDescription>
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="destructive">
          <AlertDescription className="font-semibold">{errorMsg}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="servidorId">
                Servidor / Pasta Funcional Destino <span className="text-destructive">*</span>
              </Label>
              <Select
                value={servidorId}
                onValueChange={(value) => {
                  if (value) setValue('servidorId', value);
                }}
              >
                <SelectTrigger className={errors.servidorId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione um servidor" />
                </SelectTrigger>
                <SelectContent>
                  {servidores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome} (Matrícula: {s.matricula}) - {s.cargoEfetivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.servidorId && (
                <p className="text-sm text-destructive">{errors.servidorId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título do Documento</Label>
                <Input
                  id="titulo"
                  {...register('titulo')}
                  placeholder="Ex.: Portaria_Nomeacao_2026.pdf"
                  className={errors.titulo ? 'border-destructive' : ''}
                />
                {errors.titulo && (
                  <p className="text-sm text-destructive">{errors.titulo.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">
                  Categoria Documental <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={categoria}
                  onValueChange={(value) => {
                    if (value) setValue('categoria', value as DocumentoFormData['categoria']);
                  }}
                >
                  <SelectTrigger className={errors.categoria ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dados Pessoais">Dados Pessoais</SelectItem>
                    <SelectItem value="Posse e Exercício">Posse e Exercício</SelectItem>
                    <SelectItem value="Vida Funcional">Vida Funcional</SelectItem>
                    <SelectItem value="Licenças e Afastamentos">Licenças e Afastamentos</SelectItem>
                    <SelectItem value="Avaliação de Desempenho">Avaliação de Desempenho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="processoSEI">Número do Processo SEI-DF (Opcional)</Label>
              <Input
                id="processoSEI"
                {...register('processoSEI')}
                placeholder="Ex.: 00050-0001234/2026-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">
                Arquivo Digital (Apenas PDF) <span className="text-destructive">*</span>
              </Label>
              <div className="border-2 border-dashed border-border hover:border-ssp-blue/50 transition-colors rounded-xl p-6 text-center bg-muted/20 flex flex-col items-center justify-center cursor-pointer relative">
                <input
                  id="file"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud size={40} className="text-ssp-blue mb-2" />
                {selectedFile ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground bg-card px-3 py-1.5 rounded-md border border-border shadow-sm">
                    <FileText size={18} className="text-ssp-blue" />
                    <span>{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Clique ou arraste um arquivo PDF para anexar
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tamanho máximo: 50MB. O OCR será processado automaticamente.
                    </p>
                  </div>
                )}
              </div>
              {errors.file && <p className="text-sm text-destructive">{errors.file.message}</p>}
            </div>

            <div className="p-4 bg-muted/40 rounded-lg border border-border text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">
                Aviso de Governança do Setor de Gestão de Pessoas:
              </p>
              <p>
                Ao realizar o envio deste documento, sua ação será registrada no log auditável
                (LGPD) com a matrícula do operador do RH.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link
                href={servidorId ? `/servidores/${servidorId}` : '/servidores'}
                className={buttonVariants({ variant: 'outline' })}
              >
                Cancelar
              </Link>
              <Button
                type="submit"
                disabled={loading}
                className="bg-ssp-blue hover:bg-ssp-blueDark"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Processando OCR & Inserindo...
                  </>
                ) : (
                  'Confirmar Inserção em PDF'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

export default function NovoDocumentoPage() {
  return (
    <div className="max-w-3xl mx-auto py-6 px-4 animate-in fade-in duration-300">
      <Suspense
        fallback={
          <div className="p-8 text-center text-muted-foreground">Carregando formulário...</div>
        }
      >
        <NovoDocumentoForm />
      </Suspense>
    </div>
  );
}
