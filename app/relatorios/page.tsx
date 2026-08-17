import RelatoriosClient from './relatorios-client';
import { getRelatoriosSummary } from '@/lib/server/summary';

export default async function RelatoriosPage() {
  const initialData = await getRelatoriosSummary();
  return <RelatoriosClient initialData={initialData} />;
}
