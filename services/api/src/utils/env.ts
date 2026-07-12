import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.trim().length === 0) {
  throw new Error(
    'JWT_SECRET environment variable is not set. Copy services/api/.env.example to services/api/.env and set a strong random value before starting the API.'
  );
}

export const JWT_SECRET: string = jwtSecret;
