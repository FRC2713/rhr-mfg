-- Remove category column from equipment table
-- This migration should be run after all code has been updated to use processes
ALTER TABLE equipment DROP COLUMN IF EXISTS category;

