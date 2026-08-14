import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/server/prisma';
import { sendPasswordSetupEmail } from '@/lib/server/email';

const TOKEN_EXPIRATION_MS = 15 * 60 * 1000;

type Account = {
  id: string;
  email: string;
  nome: string;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getApplicationUrl(): string {
  const applicationUrl = process.env.APP_URL;
  if (!applicationUrl) {
    throw new Error('APP_URL deve ser configurada para enviar e-mails de primeiro acesso.');
  }
  return applicationUrl.replace(/\/$/, '');
}

export async function sendFirstAccessEmail(account: Account): Promise<void> {
  const now = new Date();
  const activeToken = await prisma.passwordResetToken.findFirst({
    where: {
      servidorId: account.id,
      usedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (activeToken) return;

  const token = randomBytes(32).toString('base64url');
  const savedToken = await prisma.passwordResetToken.create({
    data: {
      servidorId: account.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + TOKEN_EXPIRATION_MS),
    },
  });

  try {
    const resetUrl = `${getApplicationUrl()}/redefinir-senha?token=${encodeURIComponent(token)}`;
    await sendPasswordSetupEmail({
      recipient: account.email,
      recipientName: account.nome,
      resetUrl,
    });
  } catch (error) {
    await prisma.passwordResetToken.delete({ where: { id: savedToken.id } });
    throw error;
  }
}

export async function resetPassword(token: string, senhaHash: string): Promise<boolean> {
  const tokenHash = hashToken(token);

  return prisma.$transaction(async (transaction) => {
    const resetToken = await transaction.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      return false;
    }

    await transaction.servidor.update({
      where: { id: resetToken.servidorId },
      data: { senhaHash, senhaDefinidaEm: new Date() },
    });
    await transaction.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    return true;
  });
}
