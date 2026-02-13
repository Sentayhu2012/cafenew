/*
  # Allow waiters to delete pending orders

  1. Changes
    - Add DELETE policy for orders table to allow waiters to delete their own pending orders
  
  2. Security
    - Waiters can only delete their own orders
    - Orders must be in 'pending' status to be deleted
    - Prevents deletion of completed or paid orders
*/

CREATE POLICY "Waiters can delete own pending orders"
  ON orders FOR DELETE
  TO authenticated
  USING (
    waiter_id = auth.uid()
    AND status = 'pending'
  );