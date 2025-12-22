-- Seed initial processes with process-oriented names
INSERT INTO processes (id, name, description) VALUES
  ('process-cnc-milling', 'CNC Milling', 'Computer numerical control milling operations'),
  ('process-3d-printing', '3D Printing', 'Additive manufacturing using 3D printers'),
  ('process-hand-tooling', 'Hand Tooling', 'Manual operations using hand tools'),
  ('process-measuring', 'Measuring', 'Measurement and inspection operations'),
  ('process-power-tooling', 'Power Tooling', 'Operations using power tools'),
  ('process-safety-equipment', 'Safety Equipment', 'Safety-related processes and equipment'),
  ('process-fastening', 'Fastening', 'Assembly and fastening operations'),
  ('process-material-processing', 'Material Processing', 'Material preparation and processing'),
  ('process-other', 'Other', 'Other manufacturing processes')
ON CONFLICT (id) DO NOTHING;

