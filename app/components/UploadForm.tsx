'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadSchema, type UploadFormData } from '@/lib/validations/upload';

export default function UploadForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
  });

  const onSubmit = async (data: UploadFormData) => {
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append('file', data.file);
    fd.append('titulo', data.titulo);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });

      if (res.ok) {
        reset();
        router.push('/documentos');
      } else {
        const text = await res.text();
        setError(text || 'Erro no upload');
      }
    } catch (err) {
      setError('Erro ao enviar arquivo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
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

      <Button type="submit" disabled={loading} className="bg-ssp-blue hover:bg-ssp-blueDark">
        {loading ? 'Enviando...' : 'Enviar'}
      </Button>
    </form>
  );
}
