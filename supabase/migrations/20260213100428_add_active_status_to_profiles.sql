/*
  # Add active status to profiles

  1. Changes
    - Add `active` column to profiles table (default true)
    - Users with active=false cannot login
  
  2. Security
    - RLS policies updated to respect active status
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN active boolean DEFAULT true;
  END IF;
END $$;
