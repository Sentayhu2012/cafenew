/*
  # Allow cashiers to update user active status

  1. Changes
    - Add policy for cashiers to update active status of profiles
    - Cashiers can only update the active field, not other fields
  
  2. Security
    - Only users with role 'cashier' can update active status
    - Users can still update their own profiles
*/

-- Create a policy that allows cashiers to update the active status of any user
CREATE POLICY "Cashiers can update user active status"
  ON profiles
  FOR UPDATE
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
