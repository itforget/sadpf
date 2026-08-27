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

async function sendPasswordLink(account: Account, purpose: 'first-access' | 'password-reset') {
  const now = new Date();
  const activeToken = await prisma.passwordResetToken.findFirst({
    where: {
      servidorId: account.id,
      usedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (activeToken) {
    if (purpose === 'first-access') return;
    await prisma.passwordResetToken.delete({ where: { id: activeToken.id } });
  }

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
      purpose,
    });
  } catch (error) {
    await prisma.passwordResetToken.delete({ where: { id: savedToken.id } });
    throw error;
  }
}

export async function sendFirstAccessEmail(account: Account): Promise<void> {
  await sendPasswordLink(account, 'first-access');
}

/** Solicita uma nova senha sem revelar se o e-mail possui uma conta válida. */
export async function requestPasswordReset(email: string): Promise<void> {
  const account = await prisma.servidor.findFirst({
    where: {
      email: { equals: email.trim(), mode: 'insensitive' },
      status: 'Ativo',
      role: { in: ['ADMIN', 'OPERADOR'] },
    },
    select: { id: true, email: true, nome: true },
  });
  if (account) await sendPasswordLink(account, 'password-reset');
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
