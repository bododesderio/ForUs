-- Add role column to users table
ALTER TABLE users
ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Add role column to consultants table 
ALTER TABLE consultants
ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'consultant';

-- Add role column to admin table
ALTER TABLE admin
ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin';
