-- ANIFLEX Database Schema
-- Database: aniflex_db

CREATE DATABASE IF NOT EXISTS aniflex_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE aniflex_db;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255) DEFAULT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Genres table
CREATE TABLE IF NOT EXISTS genres (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 3. Anime table
CREATE TABLE IF NOT EXISTS anime (
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
) ENGINE=InnoDB;

-- 4. Anime-Genre Junction table
CREATE TABLE IF NOT EXISTS anime_genres (
  anime_id INT NOT NULL,
  genre_id INT NOT NULL,
  PRIMARY KEY (anime_id, genre_id),
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  anime_id INT NOT NULL,
  season_number INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
  UNIQUE KEY unique_anime_season (anime_id, season_number)
) ENGINE=InnoDB;

-- 6. Episodes table
CREATE TABLE IF NOT EXISTS episodes (
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
) ENGINE=InnoDB;

-- 7. Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  anime_id INT NOT NULL,
  status ENUM('plan_to_watch', 'watching', 'completed', 'dropped') DEFAULT 'watching',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_anime (user_id, anime_id)
) ENGINE=InnoDB;

-- 8. Watch History / Progress table
CREATE TABLE IF NOT EXISTS watch_history (
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
) ENGINE=InnoDB;

-- 9. Reviews / Ratings table
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  anime_id INT NOT NULL,
  rating DECIMAL(2, 1) NOT NULL,
  comment TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_review (user_id, anime_id)
) ENGINE=InnoDB;

-- 10. Subtitles table
CREATE TABLE IF NOT EXISTS subtitles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  episode_id INT NOT NULL,
  language VARCHAR(50) NOT NULL,
  subtitle_url VARCHAR(500) NOT NULL,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed Basic Genres
INSERT IGNORE INTO genres (name, slug) VALUES 
('Action', 'action'),
('Adventure', 'adventure'),
('Comedy', 'comedy'),
('Drama', 'drama'),
('Fantasy', 'fantasy'),
('Horror', 'horror'),
('Mystery', 'mystery'),
('Romance', 'romance'),
('Sci-Fi', 'sci-fi'),
('Supernatural', 'supernatural');

