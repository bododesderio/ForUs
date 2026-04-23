import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const checkConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Connection to database was successful!!')
        connection.release();
    } catch (error) {
        console.log('Failed to connect to database!')
        throw error;
    }
}

export {pool, checkConnection};
