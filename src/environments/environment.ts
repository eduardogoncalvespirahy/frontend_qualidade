import { appConfig } from './app-config';

export const environment = {
  production: true,
  systemId:'1',
  // Trocar pela URL real quando o backend definir a porta/domínio
  ...appConfig
};
