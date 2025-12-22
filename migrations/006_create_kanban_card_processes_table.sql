-- Create junction table for kanban card-process many-to-many relationship
CREATE TABLE IF NOT EXISTS kanban_card_processes (
  card_id TEXT NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
  process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, process_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_kanban_card_processes_card_id ON kanban_card_processes(card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_card_processes_process_id ON kanban_card_processes(process_id);

