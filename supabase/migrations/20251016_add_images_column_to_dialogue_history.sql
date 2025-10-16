-- Add images column to dialogue_history table to store generated scene images
ALTER TABLE dialogue_history
ADD COLUMN images JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance when filtering by images
CREATE INDEX idx_dialogue_history_images ON dialogue_history USING GIN (images);
