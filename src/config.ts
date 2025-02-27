import { environment } from './environments/environment';

export const config = {
  apiKey: environment.authToken,
  apiUrl: environment.apiUrl,
};
