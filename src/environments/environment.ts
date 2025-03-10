import appconfigsetting from '../assets/appconfigsetting.json';

export const environment = {
  production: false,
  apiUrl: appconfigsetting.apiUrl,
  authToken: appconfigsetting.authToken,
};
