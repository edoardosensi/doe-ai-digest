-- Clear old articles and clicks so new ones from sport and culture feeds can be fetched
TRUNCATE TABLE user_clicks CASCADE;
TRUNCATE TABLE articles CASCADE;