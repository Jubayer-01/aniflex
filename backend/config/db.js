import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL;

export const pool = connectionUri
  ? mysql.createPool(connectionUri)
  : mysql.createPool({
      host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
      user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'aniflex_db',
      port: Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT DATABASE() as db');
    console.log(`Connected to MySQL Database: ${rows[0]?.db || process.env.DB_NAME || 'aniflex_db'}`);
    connection.release();
    return true;
  } catch (error) {
    console.warn('MySQL connection warning (DB might not be running locally yet):', error.message);
    return false;
  }
}

export async function initDatabase() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      avatar_url VARCHAR(255) DEFAULT NULL,
      role ENUM('user', 'admin') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS genres (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      slug VARCHAR(50) NOT NULL UNIQUE
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS anime (
      id INT AUTO_INCREMENT PRIMARY KEY,
      anilist_id INT UNIQUE DEFAULT NULL,
      title_english VARCHAR(255) NOT NULL,
      title_romaji VARCHAR(255) DEFAULT NULL,
      synopsis TEXT DEFAULT NULL,
      banner_url VARCHAR(500) DEFAULT NULL,
      poster_url VARCHAR(500) DEFAULT NULL,
      season_year INT DEFAULT NULL,
      score DECIMAL(3, 1) DEFAULT 0.0,
      rating_badge VARCHAR(20) DEFAULT '14+',
      studio VARCHAR(100) DEFAULT NULL,
      status ENUM('airing', 'finished', 'upcoming') DEFAULT 'finished',
      is_featured BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS anime_genres (
      anime_id INT NOT NULL,
      genre_id INT NOT NULL,
      PRIMARY KEY (anime_id, genre_id),
      FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
      FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS seasons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      anime_id INT NOT NULL,
      season_number INT NOT NULL,
      title VARCHAR(150) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
      UNIQUE KEY unique_anime_season (anime_id, season_number)
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS episodes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      season_id INT NOT NULL,
      episode_number INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      duration VARCHAR(20) DEFAULT '24m',
      thumbnail_url VARCHAR(500) DEFAULT NULL,
      video_url VARCHAR(500) DEFAULT NULL,
      synopsis TEXT DEFAULT NULL,
      released_date VARCHAR(50) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
      UNIQUE KEY unique_season_episode (season_id, episode_number)
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS watchlist (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      anime_id INT NOT NULL,
      status ENUM('plan_to_watch', 'watching', 'completed', 'dropped') DEFAULT 'watching',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_anime (user_id, anime_id)
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS watch_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      episode_id INT NOT NULL,
      progress_seconds INT DEFAULT 0,
      duration_seconds INT DEFAULT 0,
      is_completed BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_episode (user_id, episode_id)
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      anime_id INT NOT NULL,
      rating DECIMAL(2, 1) NOT NULL,
      comment TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_review (user_id, anime_id)
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS subtitles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      episode_id INT NOT NULL,
      language VARCHAR(50) NOT NULL,
      subtitle_url VARCHAR(500) NOT NULL,
      FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    `INSERT IGNORE INTO genres (name, slug) VALUES 
      ('Action', 'action'),
      ('Adventure', 'adventure'),
      ('Comedy', 'comedy'),
      ('Drama', 'drama'),
      ('Fantasy', 'fantasy'),
      ('Horror', 'horror'),
      ('Mystery', 'mystery'),
      ('Romance', 'romance'),
      ('Sci-Fi', 'sci-fi'),
      ('Supernatural', 'supernatural');`
  ];

  try {
    const connection = await pool.getConnection();
    for (const sql of tables) {
      await connection.query(sql);
    }
    console.log('Database tables & default seed verified successfully');
    connection.release();
  } catch (error) {
    console.warn('Database initialization warning:', error.message);
  }
}
