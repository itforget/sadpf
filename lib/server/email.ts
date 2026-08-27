import { Resend } from 'resend';

type PasswordSetupEmail = {
  recipient: string;
  recipientName: string;
  resetUrl: string;
  purpose: 'first-access' | 'password-reset';
};

type SignatureRequestEmail = {
  recipient: string;
  recipientName: string;
  documentTitle: string;
  signatureUrl: string;
  expiresAt: Date;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character];
  });
}

export async function sendPasswordSetupEmail({
  recipient,
  recipientName,
  resetUrl,
  purpose,
}: PasswordSetupEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error('O serviço de e-mail não está configurado.');
  }

  const resend = new Resend(apiKey);
  const isPasswordReset = purpose === 'password-reset';
  const actionLabel = isPasswordReset ? 'Redefinir minha senha' : 'Definir minha senha';
  const subject = isPasswordReset
    ? 'SADPF — redefinição de senha solicitada'
    : 'SADPF — defina sua senha de acesso';
  const introduction = isPasswordReset
    ? 'Recebemos uma solicitação para redefinir a senha da sua conta SADPF.'
    : 'Para acessar o SADPF pela primeira vez, defina sua senha no link abaixo.';
  const { error } = await resend.emails.send({
    from,
    to: [recipient],
    subject,
    html: `
      <main style="max-width:560px;margin:0 auto;padding:32px;font-family:Arial,sans-serif;color:#1f2937">
        <h1 style="margin:0 0 20px;color:#003f7d;font-size:24px">SADPF</h1>
        <p>Olá, ${escapeHtml(recipientName)}.</p>
        <p>${introduction}</p>
        <p style="margin:28px 0"><a href="${resetUrl}" style="display:inline-block;background:#005ca9;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:700">${actionLabel}</a></p>
        <p style="font-size:13px;color:#4b5563">Este link expira em 15 minutos e só pode ser usado uma vez.</p>
        <p style="font-size:13px;color:#4b5563">Se você não solicitou esta ação, ignore esta mensagem.</p>
      </main>
    `,
  });

  if (error) {
    console.error('[email] Falha ao enviar mensagem:', error);
    throw new Error('Não foi possível enviar o e-mail com o link de senha.');
  }
}

export async function sendSignatureRequestEmail({
  recipient,
  recipientName,
  documentTitle,
  signatureUrl,
  expiresAt,
}: SignatureRequestEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error('O serviço de e-mail não está configurado.');
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [recipient],
    subject: 'SADPF — assinatura eletrônica solicitada',
    html: `
      <p>Olá, ${escapeHtml(recipientName)}.</p>
      <p>Há uma solicitação de assinatura eletrônica interna para o documento <strong>${escapeHtml(
        documentTitle
      )}</strong>.</p>
      <p><a href="${signatureUrl}">Revisar e assinar o documento</a></p>
      <p>Este link é pessoal, expira em ${expiresAt.toLocaleString(
        'pt-BR'
      )} e pode ser usado uma única vez.</p>
      <p>Se você não reconhece esta solicitação, ignore esta mensagem.</p>
    `,
  });

  if (error) {
    console.error('[email] Falha ao enviar solicitação de assinatura:', error);
    throw new Error('Não foi possível enviar a solicitação de assinatura por e-mail.');
  }
}
