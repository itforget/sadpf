import 'server-only';

import { prisma } from '@/lib/server/prisma';
import { getStorage } from '@/lib/storage';
import type { StorageBackend } from '@/prisma/generated';

export async function processPendingStorageDeletionTasks(limit = 25) {
  const tasks = await prisma.storageDeletionTask.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  await Promise.all(
    tasks.map(async (task) => {
      try {
        await getStorage(task.backend.toLowerCase()).delete(task.storageKey);
        await prisma.storageDeletionTask.update({
          where: { id: task.id },
          data: { processedAt: new Date(), lastError: null },
        });
      } catch (error) {
        await prisma.storageDeletionTask.update({
          where: { id: task.id },
          data: {
            attempts: { increment: 1 },
            lastError: error instanceof Error ? error.message.slice(0, 2000) : 'Erro desconhecido',
          },
        });
      }
    })
  );
}

export function storageDeletionTask(backend: StorageBackend | null, storageKey: string | null) {
  if (!storageKey) return null;
  return {
    backend: backend ?? 'LOCAL',
    storageKey,
  };
}
