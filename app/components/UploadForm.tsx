'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchJson } from '@/lib/client/api';
import { uploadSchema, type UploadFormData } from '@/lib/validations/upload';

export default function UploadForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData) => {
      const fd = new FormData();
      fd.append('file', data.file);
      fd.append('titulo', data.titulo);
      await fetchJson('/api/upload', { method: 'POST', body: fd });
    },
  });

  const onSubmit = async (data: UploadFormData) => {
    try {
      await uploadMutation.mutateAsync(data);
      reset();
      router.push('/pesquisa');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {uploadMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {uploadMutation.error instanceof Error
              ? uploadMutation.error.message
              : 'Erro ao enviar arquivo'}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="titulo">Título</Label>
        <Input
          id="titulo"
          {...register('titulo')}
          placeholder="Digite o título do documento"
          className={errors.titulo ? 'border-destructive' : ''}
        />
        {errors.titulo && <p className="text-sm text-destructive">{errors.titulo.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Arquivo (PDF)</Label>
        <Input
          id="file"
          type="file"
          accept="application/pdf"
          {...register('file')}
          className={errors.file ? 'border-destructive' : ''}
        />
        {errors.file && <p className="text-sm text-destructive">{errors.file.message}</p>}
      </div>

      <Button type="submit" disabled={uploadMutation.isPending} className="bg-ssp-blue hover:bg-ssp-blueDark">
        {uploadMutation.isPending ? 'Enviando...' : 'Enviar'}
      </Button>
    </form>
  );
}
