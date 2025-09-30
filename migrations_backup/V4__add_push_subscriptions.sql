-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  keys text NOT NULL
);
