import ConfiguracoesClient from './configuracoes-client';
import { getConfiguracoesSummary } from '@/lib/server/summary';

export default async function ConfiguracoesPage() {
  const initialData = await getConfiguracoesSummary();
  return <ConfiguracoesClient initialData={initialData} />;
}
