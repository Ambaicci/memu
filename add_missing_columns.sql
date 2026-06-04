-- Add missing columns to memus table
ALTER TABLE memus 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'delivered',
ADD COLUMN IF NOT EXISTS read_at timestamptz,
ADD COLUMN IF NOT EXISTS delivered_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS opened_at timestamptz,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_memus_recipient_id ON memus(recipient_id);
CREATE INDEX IF NOT EXISTS idx_memus_sender_id ON memus(sender_id);
CREATE INDEX IF NOT EXISTS idx_memus_created_at ON memus(created_at);