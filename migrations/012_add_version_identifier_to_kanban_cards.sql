-- Add version identifier to kanban_cards table
-- This field stores the Onshape document version ID to uniquely identify parts
-- by the combination of part number and document version
ALTER TABLE kanban_cards 
ADD COLUMN IF NOT EXISTS onshape_version_id TEXT;

-- Populate onshape_version_id from onshape_instance_id when instance_type is 'v' (version)
-- For workspace (w) or microversion (m) cards, leave as NULL
UPDATE kanban_cards
SET onshape_version_id = onshape_instance_id
WHERE onshape_instance_type = 'v' AND onshape_instance_id IS NOT NULL;
