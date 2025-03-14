-- Add new columns to early_access_signups table
ALTER TABLE early_access_signups
ADD COLUMN IF NOT EXISTS ip_source text,
ADD COLUMN IF NOT EXISTS headers jsonb; 