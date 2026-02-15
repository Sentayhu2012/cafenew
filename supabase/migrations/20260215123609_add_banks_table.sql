/*
  # Add Banks Management System

  1. New Tables
    - `banks`
      - `id` (uuid, primary key)
      - `name` (text, bank name)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references profiles)
      - `active` (boolean, default true)

  2. Changes to Existing Tables
    - `payments`
      - Add `bank_id` (uuid, nullable, references banks)
      - This is nullable to support existing payments and cash payments

  3. Security
    - Enable RLS on `banks` table
    - Cashiers can create and manage banks
    - Waiters can view active banks
    - All authenticated users can view active banks

  4. Important Notes
    - Bank selection is required for bank transfers
    - Cash payments don't need a bank selection
    - Screenshot becomes optional for bank transfers
*/

-- Create banks table
CREATE TABLE IF NOT EXISTS banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  active boolean DEFAULT true
);

-- Add bank_id to payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'bank_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN bank_id uuid REFERENCES banks(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- Cashiers can view all banks
CREATE POLICY "Cashiers can view all banks"
  ON banks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cashier'
    )
  );

-- Waiters can view active banks
CREATE POLICY "Waiters can view active banks"
  ON banks FOR SELECT
  TO authenticated
  USING (
    active = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'waiter'
    )
  );

-- Cashiers can insert banks
CREATE POLICY "Cashiers can insert banks"
  ON banks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cashier'
    )
  );

-- Cashiers can update banks
CREATE POLICY "Cashiers can update banks"
  ON banks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cashier'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cashier'
    )
  );

-- Cashiers can delete banks
CREATE POLICY "Cashiers can delete banks"
  ON banks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cashier'
    )
  );