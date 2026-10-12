


CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  watched INTEGER DEFAULT 0,
  liked INTEGER DEFAULT 0,
  watchlist INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  notes TEXT DEFAULT '',
  vote_average REAL DEFAULT 0,
  popularity REAL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_tmdb ON logs (tmdb_id, media_type);
CREATE INDEX IF NOT EXISTS idx_logs_watched ON logs (watched);
CREATE INDEX IF NOT EXISTS idx_logs_watchlist ON logs (watchlist);
CREATE INDEX IF NOT EXISTS idx_logs_liked ON logs (liked);




CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);




CREATE TABLE IF NOT EXISTS list_items (
  list_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (list_id, tmdb_id, media_type),
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON list_items (list_id);



CREATE TABLE IF NOT EXISTS starred_entities (
  id TEXT PRIMARY KEY,
  tmdb_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  image_path TEXT,
  subtitle TEXT,
  starred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_starred_entities_type ON starred_entities (type);