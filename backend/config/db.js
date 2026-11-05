import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aniflex_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL Database: ' + (process.env.DB_NAME || 'aniflex_db'));
    connection.release();
    return true;
  } catch (error) {
    console.warn('MySQL connection warning (DB might not be running locally yet):', error.message);
    return false;
  }
}

