// Utility for conditional logging - only logs in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

export const debugLog = (message: string, data?: any) => {
  if (!isDevelopment) return;
  
  if (data !== undefined) {
    console.log(message, data);
  } else {
    console.log(message);
  }
};

export const debugError = (message: string, error?: any) => {
  if (!isDevelopment) return;
  
  if (error !== undefined) {
    console.error(message, error);
  } else {
    console.error(message);
  }
};

export const debugWarn = (message: string, data?: any) => {
  if (!isDevelopment) return;
  
  if (data !== undefined) {
    console.warn(message, data);
  } else {
    console.warn(message);
  }
};