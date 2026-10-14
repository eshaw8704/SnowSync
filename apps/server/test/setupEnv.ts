// Gives every test a valid environment without reading a real .env file.
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL = 'postgresql://snowsync:snowsync@localhost:5432/snowsync?schema=public';
