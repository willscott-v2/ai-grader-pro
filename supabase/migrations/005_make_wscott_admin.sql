-- Make wscott@searchinfluence.com an admin
UPDATE profiles
SET is_admin = true
WHERE email = 'wscott@searchinfluence.com';
