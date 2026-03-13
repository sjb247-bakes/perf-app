ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE; UPDATE user_profiles SET is_admin = TRUE WHERE id = '22e23806-1c3a-4e02-9de6-3fb2efd6f854';
