-- TrendLens Database Schema (AGENTS.md Section 7)

CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  domain TEXT NOT NULL,          -- 'fashion' | 'cars'
  path TEXT NOT NULL,
  taken_on DATE NOT NULL,        -- real, dated or simulated (see D1)
  embed_index INT NOT NULL       -- row in the .npy embeddings file
);

CREATE TABLE IF NOT EXISTS clusters (
  domain TEXT NOT NULL,
  cluster_id INT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (domain, cluster_id)
);

CREATE TABLE IF NOT EXISTS image_clusters (
  image_id INT REFERENCES images(id),
  algo TEXT NOT NULL,            -- 'kmeans' | 'dbscan'
  cluster_id INT NOT NULL,       -- -1 = DBSCAN noise
  PRIMARY KEY (image_id, algo)
);

CREATE TABLE IF NOT EXISTS trends (
  domain TEXT NOT NULL,
  cluster_id INT NOT NULL,
  year INT NOT NULL,
  share REAL NOT NULL,           -- percent of that year's images
  label TEXT NOT NULL,           -- emerging | declining | stable
  PRIMARY KEY (domain, cluster_id, year)
);

CREATE TABLE IF NOT EXISTS forecasts (
  domain TEXT NOT NULL,
  cluster_id INT NOT NULL,
  year INT NOT NULL,
  yhat REAL NOT NULL,
  lower REAL NOT NULL,
  upper REAL NOT NULL,
  PRIMARY KEY (domain, cluster_id, year)
);

