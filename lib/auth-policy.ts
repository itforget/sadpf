import packageInfo from '../package.json';

export const AUTH_POLICY = {
  minimumPasswordLength: 12,
  sessionDurationHours: 8,
  cookieSameSite: 'strict',
} as const;

export const SYSTEM_NAME = 'Sistema de Arquivo Digital de Pastas Funcionais';

export const SYSTEM_VERSION = packageInfo.version;
