import { config } from '../config.prod';

export const environment = {
  production: true,
  ...config,
};
