/*
  # Add receipt support and payment decline feature

  1. New Columns
    - `payments.receipt_url` (text, nullable) - for bank transfer receipt
    - `payments.declined_reason` (text, nullable) - reason for decline
    - `payments.declined_at` (timestamptz, nullable) - when payment was declined
  
  2. Changes
    - Update existing 'confirmed' status to 'approved'
    - Update payments status check to allow 'pending', 'approved', and 'declined'
*/

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'receipt_url'
  ) THEN
    ALTER TABLE payments ADD COLUMN receipt_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'declined_reason'
  ) THEN
    ALTER TABLE payments ADD COLUMN declined_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'declined_at'
  ) THEN
    ALTER TABLE payments ADD COLUMN declined_at timestamptz;
  END IF;
END $$;

UPDATE payments SET status = 'approved' WHERE status = 'confirmed';

ALTER TABLE payments ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('pending', 'approved', 'declined'));
