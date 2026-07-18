-- Add multi-scan support to invitations table
-- Allows each invitation to have a configurable number of allowed scans

-- Add max_scans column (default 1 for single scan only)
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS max_scans integer DEFAULT 1 NOT NULL;

-- Add scan_count column to track actual number of scans
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS scan_count integer DEFAULT 0 NOT NULL;

-- Add check constraint to ensure valid values
ALTER TABLE invitations ADD CONSTRAINT valid_max_scans CHECK (max_scans > 0);
ALTER TABLE invitations ADD CONSTRAINT valid_scan_count CHECK (scan_count >= 0);

-- Create index for performance on scanned_at and scan_count
CREATE INDEX IF NOT EXISTS idx_invitations_scans ON invitations(event_id, scan_count);

-- Add comment for documentation
COMMENT ON COLUMN invitations.max_scans IS 'Maximum number of times this invitation can be scanned (default 1 for single scan)';
COMMENT ON COLUMN invitations.scan_count IS 'Actual number of times this invitation has been scanned';
