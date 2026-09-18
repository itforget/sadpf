'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UploadCloud, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
import { fetchJson, fetchServidorProfile, fetchServidores } from '@/lib/client/api';
import QueryError from '@/app/components/QueryError';
import { queryKeys } from '@/lib/client/query-keys';
import { CATEGORIAS_DOCUMENTO } from '@/lib/documentos';
import { uploadSupabaseSignedFile } from '@/lib/storage/supabase-browser';

function NovoDocumentoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultServidorId = searchParams.get('servidorId') || '';

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const queryClient = useQueryClient();

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
      categoria: 'Pasta Física Digitalizada',
      processoSEI: '',
    },
  });

  const servidorId = useWatch({ control, name: 'servidorId' });

  const servidoresQuery = useQuery({
    queryKey: queryKeys.servidores(),
    queryFn: () => fetchServidores(),
    enabled: !defaultServidorId,
  });

  const pastaQuery = useQuery({
    queryKey: queryKeys.servidor(defaultServidorId),
    queryFn: () => fetchServidorProfile(defaultServidorId),
    enabled: Boolean(defaultServidorId),
  });

  const servidores = servidoresQuery.data ?? [];
  const servidorDaPasta = pastaQuery.data;
  const destinationQuery = defaultServidorId ? pastaQuery : servidoresQuery;
  const destinationPending = destinationQuery.isLoading;
  const destinationError = destinationQuery.isError;
  const servidorSelecionado =
    servidorDaPasta?.servidor ?? servidores.find((servidor) => servidor.id === defaultServidorId);
  const servidoresDisponiveis = defaultServidorId
    ? servidorSelecionado
      ? [servidorSelecionado]
      : []
    : servidores;

  const uploadMutation = useMutation({
    mutationFn: async (data: DocumentoFormData) => {
      const upload = await fetchJson<{
        storageKey: string;
        signedUrl: string;
      }>('/api/upload/assinar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servidorId: data.servidorId,
          titulo: data.titulo,
          categoria: data.categoria,
          processoSEI: data.processoSEI || undefined,
          fileName: data.file.name,
          fileSize: data.file.size,
        }),
      });

      await uploadSupabaseSignedFile({
        file: data.file,
        signedUrl: upload.signedUrl,
        onProgress: setUploadProgress,
      });

      await fetchJson('/api/upload/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servidorId: data.servidorId,
          titulo: data.titulo,
          categoria: data.categoria,
          processoSEI: data.processoSEI || undefined,
          fileName: data.file.name,
          fileSize: data.file.size,
          storageKey: upload.storageKey,
        }),
      });
    },
    onSuccess: async (_result, data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.servidor(data.servidorId) });
    },
  });

  const onSubmit = async (data: DocumentoFormData) => {
    if (loading || successMsg || destinationPending || destinationError) return;
    setLoading(true);
    setUploadProgress(0);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await uploadMutation.mutateAsync(data);
      setSuccessMsg('Documento PDF anexado com sucesso!');
      setTimeout(() => {
        router.push(`/servidores/${data.servidorId}`);
      }, 1200);
    } catch (err: unknown) {
      console.error('Erro durante o envio do arquivo:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao enviar arquivo.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValue('file', file, { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Link
          href={servidorId ? `/servidores/${servidorId}` : '/servidores'}
          title="Voltar"
          aria-label="Voltar à pasta do servidor"
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Anexar Documento PDF na Pasta Digital
          </h1>
          <p className="text-sm text-muted-foreground">
            Apenas arquivos PDF são aceitos. Para pesquisar o conteúdo, o PDF precisa conter texto
            selecionável; digitalizações de imagem precisam de OCR.
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

      {destinationError && (
        <QueryError
          message="Não foi possível carregar a pasta de destino. Tente novamente."
          onRetry={() => destinationQuery.refetch()}
          pending={destinationQuery.isFetching}
        />
      )}
      <form onSubmit={handleSubmit(onSubmit)} aria-busy={loading}>
        <fieldset disabled={loading || !!successMsg}>
          <Card>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="servidorId">
                  Servidor / Pasta Funcional Destino <span className="text-destructive">*</span>
                </Label>
                {defaultServidorId ? (
                  <>
                    <input type="hidden" {...register('servidorId')} />
                    <div className="flex min-h-8 items-center rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-foreground">
                      {servidorSelecionado
                        ? `${servidorSelecionado.nome} (Matrícula: ${servidorSelecionado.matricula}) - ${servidorSelecionado.cargoEfetivo}`
                        : destinationError
                        ? 'Pasta indisponível. Tente novamente.'
                        : 'Carregando servidor…'}
                    </div>
                  </>
                ) : (
                  <Controller
                    control={control}
                    name="servidorId"
                    render={({ field }) => (
                      <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          aria-invalid={!!errors.servidorId}
                          aria-describedby={errors.servidorId ? 'servidorId-error' : undefined}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          id="servidorId"
                          className={errors.servidorId ? 'border-destructive' : ''}
                        >
                          <SelectValue placeholder="Selecione um servidor" />
                        </SelectTrigger>
                        <SelectContent>
                          {servidoresDisponiveis.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nome} (Matrícula: {s.matricula}) - {s.cargoEfetivo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                {errors.servidorId && (
                  <p id="servidorId-error" role="alert" className="text-sm text-destructive">
                    {errors.servidorId.message}
                  </p>
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
                    aria-invalid={!!errors.titulo}
                    aria-describedby={errors.titulo ? 'titulo-error' : undefined}
                  />
                  {errors.titulo && (
                    <p id="titulo-error" role="alert" className="text-sm text-destructive">
                      {errors.titulo.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">
                    Categoria Documental <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="categoria"
                    render={({ field }) => (
                      <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          aria-invalid={!!errors.categoria}
                          aria-describedby={errors.categoria ? 'categoria-error' : undefined}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          id="categoria"
                          className={errors.categoria ? 'border-destructive' : ''}
                        >
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS_DOCUMENTO.map((categoria) => (
                            <SelectItem key={categoria} value={categoria}>
                              {categoria}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.categoria && (
                    <p id="categoria-error" role="alert" className="text-sm text-destructive">
                      {errors.categoria.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="processoSEI">Número do Processo SEI-DF (Opcional)</Label>
                <Input
                  id="processoSEI"
                  {...register('processoSEI')}
                  placeholder="Ex.: 00050-0001234/2026-11"
                  aria-invalid={!!errors.processoSEI}
                  aria-describedby={errors.processoSEI ? 'processoSEI-error' : undefined}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">
                  Arquivo Digital (Apenas PDF) <span className="text-destructive">*</span>
                </Label>
                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (loading || successMsg) return;
                    const file = event.dataTransfer.files[0];
                    if (file) {
                      setSelectedFile(file);
                      setValue('file', file, { shouldValidate: true });
                    }
                  }}
                  className="border-2 border-dashed border-border hover:border-ssp-blue/50 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring rounded-xl p-6 text-center bg-muted/20 flex flex-col items-center justify-center cursor-pointer relative"
                >
                  <Input
                    id="file"
                    type="file"
                    accept="application/pdf,.pdf"
                    aria-invalid={!!errors.file}
                    aria-describedby={errors.file ? 'file-error' : undefined}
                    onChange={handleFileChange}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <UploadCloud size={40} className="text-ssp-blue mb-2" />
                  {selectedFile ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground bg-card px-3 py-1.5 rounded-md border border-border shadow-sm">
                      <FileText size={18} className="text-ssp-blue" />
                      <span className="min-w-0 break-all">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground">
                        (
                        {(selectedFile.size / 1024 / 1024).toLocaleString('pt-BR', {
                          maximumFractionDigits: 2,
                        })}{' '}
                        MB)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Clique ou arraste um arquivo PDF para anexar
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Tamanho máximo: 50 MB.</p>
                    </div>
                  )}
                </div>
                {errors.file && (
                  <p id="file-error" role="alert" className="text-sm text-destructive">
                    {errors.file.message}
                  </p>
                )}
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
                  aria-disabled={loading || !!successMsg}
                  tabIndex={loading || successMsg ? -1 : undefined}
                  onClick={(event) => {
                    if (loading || successMsg) event.preventDefault();
                  }}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  Cancelar
                </Link>
                <Button
                  type="submit"
                  disabled={loading || !!successMsg || destinationPending || destinationError}
                  className="bg-ssp-blue hover:bg-ssp-blueDark"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                      {uploadProgress === null || uploadProgress === 100
                        ? 'Processando documento…'
                        : `Enviando arquivo: ${uploadProgress}%`}
                    </>
                  ) : successMsg ? (
                    'Documento anexado'
                  ) : (
                    'Anexar documento'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </fieldset>
      </form>
    </div>
  );
}

export default function NovoDocumentoPage() {
  return (
    <div className="max-w-3xl mx-auto py-6 px-4 animate-in fade-in duration-300">
      <Suspense
        fallback={
          <div className="p-8 text-center text-muted-foreground">Carregando formulário…</div>
        }
      >
        <NovoDocumentoForm />
      </Suspense>
    </div>
  );
}
