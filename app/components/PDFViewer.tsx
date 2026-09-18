import { buttonVariants } from '@/components/ui/button';

export default function PDFViewer({ src }: { src?: string }) {
  if (!src)
    return (
      <p role="status" className="p-4 text-sm text-muted-foreground">
        Sem arquivo para exibir.
      </p>
    );
  return (
    <div className="w-full space-y-3">
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Abrir PDF em outra aba
      </a>
      <iframe
        src={src}
        className="h-[min(70dvh,800px)] min-h-64 w-full"
        title="Visualizador do documento PDF"
      />
    </div>
  );
}
