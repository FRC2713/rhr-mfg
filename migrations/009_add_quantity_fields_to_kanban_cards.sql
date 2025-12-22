-- Add quantity fields to kanban_cards table
-- These fields track manufacturing quantities for each card
ALTER TABLE kanban_cards 
ADD COLUMN IF NOT EXISTS quantity_per_robot INTEGER,
ADD COLUMN IF NOT EXISTS quantity_to_make INTEGER;

