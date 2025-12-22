-- Create junction table for equipment-process many-to-many relationship
CREATE TABLE IF NOT EXISTS equipment_processes (
  equipment_id TEXT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  PRIMARY KEY (equipment_id, process_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_equipment_processes_equipment_id ON equipment_processes(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_processes_process_id ON equipment_processes(process_id);

