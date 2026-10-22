// Gives every test a valid environment without reading a real .env file.
import { TEST_DATABASE_URL } from './testDatabaseUrl';

process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_ACCESS_SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
process.env.PASSWORD_RESET_URL = 'snowsync://reset-password';
