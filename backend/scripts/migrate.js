import { pool } from '../db/index.js';

const runMigration = async () => {
  try {
    // Add role column to all relevant tables
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'
    `);
    
    await pool.query(`
      ALTER TABLE consultants 
      ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'consultant'
    `);

    await pool.query(`
      ALTER TABLE admin 
      ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin'
    `);

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
