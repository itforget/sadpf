import { connection } from 'next/server';
import RelatoriosClient from './relatorios-client';
import { getRelatoriosSummary } from '@/lib/server/summary';

export default async function RelatoriosPage() {
  await connection();
  const initialData = await getRelatoriosSummary();
  return <RelatoriosClient initialData={initialData} />;
}
