-- Enable realtime for evolution_config table
ALTER TABLE evolution_config REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'evolution_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE evolution_config;
  END IF;
END $$;