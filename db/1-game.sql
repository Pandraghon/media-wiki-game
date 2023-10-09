CREATE SCHEMA IF NOT EXISTS game;

CREATE FUNCTION gen_random_user() RETURNS TEXT
  AS $$ select 'Player_' || upper(substr(md5(random()::text), 0, 7)) $$
  LANGUAGE SQL;

CREATE TABLE game.wiki (
  wikiid TEXT PRIMARY KEY,
  sitename TEXT NOT NULL,
  mainpage TEXT NOT NULL,
  server TEXT NOT NULL,
  articlepath TEXT NOT NULL,
  scriptpath TEXT NOT NULL,
  logo TEXT,
  favicon TEXT NOT NULL,
  lang TEXT NOT NULL
);

CREATE TABLE game.room (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE game.user (
  username TEXT NOT NULL DEFAULT gen_random_user(),
  token UUID DEFAULT gen_random_uuid()
);

CREATE TABLE game.game (
  id SERIAL PRIMARY KEY,
  rooid UUID NOT NULL REFERENCES game.room(id),
  wikiid TEXT NOT NULL REFERENCES game.wiki(wikiid),
  articlestart TEXT NOT NULL,
  articleend TEXT NOT NULL
);