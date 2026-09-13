import "dotenv/config";

function requiredEnv(key: string, value?: string): string {
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  PORT: process.env.PORT || "3500",

  NODE_ENV: process.env.NODE_ENV || "development",

  JWT_SECRET: requiredEnv(
    "JWT_SECRET",
    process.env.JWT_SECRET
  ),

  JWT_REFRESH_SECRET: requiredEnv(
    "JWT_REFRESH_SECRET",
    process.env.JWT_REFRESH_SECRET
  ),

  JWT_EXPIRY: process.env.JWT_EXPIRY || "1h",

  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || "7d",

  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,

  GCP_SA_KEY: process.env.GCP_SA_KEY,


  RATE_LIMIT_WINDOW_MS: parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || "900000",
    10
  ),

  RATE_LIMIT_MAX_REQUESTS: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || "100",
    10
  ),

  
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174,http://localhost:5175",
  
    
  ENABLE_FIREBASE_VERIFY: process.env.ENABLE_FIREBASE_VERIFY === "true",
};