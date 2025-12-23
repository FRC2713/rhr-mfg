-- Add Onshape fields to kanban_cards table
-- These fields store Onshape identifiers needed to construct links to open parts in Onshape
ALTER TABLE kanban_cards 
ADD COLUMN IF NOT EXISTS onshape_document_id TEXT,
ADD COLUMN IF NOT EXISTS onshape_instance_type TEXT,
ADD COLUMN IF NOT EXISTS onshape_instance_id TEXT,
ADD COLUMN IF NOT EXISTS onshape_element_id TEXT,
ADD COLUMN IF NOT EXISTS onshape_part_id TEXT;

