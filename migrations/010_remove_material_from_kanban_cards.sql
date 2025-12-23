-- Remove material column from kanban_cards table
-- Material will now be fetched from Onshape API instead of being stored in the database
ALTER TABLE kanban_cards 
DROP COLUMN IF EXISTS material;

