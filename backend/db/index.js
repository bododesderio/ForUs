import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });
export { pool };

export const checkConnection = async () => {
    const client = await pool.connect();
    console.log('PostgreSQL connection successful');
    client.release();
};
