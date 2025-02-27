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
    authToken: window.env?.authToken || "",
  };
  