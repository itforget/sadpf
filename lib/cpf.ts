/** Remove qualquer separador e limita o CPF aos seus 11 dígitos. */
export function normalizarCpf(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

/** Aplica progressivamente a máscara 000.000.000-00. */
export function formatarCpf(value: string): string {
  const cpf = normalizarCpf(value);
  return cpf
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3}\.\d{3}\.\d{3})(\d)/, '$1-$2');
}

export function cpfEstaCompleto(value: string): boolean {
  return normalizarCpf(value).length === 11;
}
