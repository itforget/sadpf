import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 space-y-6 animate-in fade-in duration-300">
      <div className="w-20 h-20 bg-ssp-blue/10 text-ssp-blue rounded-full flex items-center justify-center">
        <FileQuestion size={40} />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Página Não Encontrada (404)
        </h1>
        <p className="text-muted-foreground text-sm">
          O endereço solicitado não existe ou a pasta funcional não foi localizada no sistema
          SADPF/SSP-DF.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-ssp-blue hover:bg-ssp-blueDark text-white font-semibold text-sm rounded-lg shadow-sm transition-colors"
        >
          <ArrowLeft size={18} /> Voltar ao Painel Gerencial
        </Link>
      </div>

      <div className="text-xs text-muted-foreground pt-4 border-t border-border flex items-center gap-1.5">
        <Image
          src="/logo-sspdf.png"
          alt="Logo SSP-DF"
          width={16}
          height={16}
          className="inline-block"
        />
        <span>SADPF • Secretaria de Estado de Segurança Pública do DF</span>
      </div>
    </div>
  );
}
