declare global {
    interface Window {
      env?: {
        apiUrl?: string;
        authToken?: string;
      };
    }
  }
  
  export const environment = {
    production: false,
    apiUrl: window.env?.apiUrl || "https://api.telnyx.com/v2",
    authToken: window.env?.authToken || "KEY019545FFDF282A75C08A9F6CA4E7BFB7_70MN4UvpyiZ9qSoq2buqO2",
  };
  