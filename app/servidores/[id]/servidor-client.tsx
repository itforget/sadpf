'use client';

import { useQuery } from '@tanstack/react-query';
import QueryError from '@/app/components/QueryError';
import CapaPasta from '@/app/components/CapaPasta';
import type { ServidorComDocumentos } from '@/lib/types';
import { fetchServidorProfile } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';

export default function ServidorClient({
  initialData,
  id,
}: {
  initialData: ServidorComDocumentos;
  id: string;
}) {
  const {
    data = initialData,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.servidor(id),
    queryFn: () => fetchServidorProfile(id),
    initialData,
  });

  return (
    <div className="space-y-4">
      {isError && <QueryError onRetry={() => refetch()} pending={isFetching} />}
      <CapaPasta servidor={data.servidor} documentos={data.documentos} />
    </div>
  );
}
