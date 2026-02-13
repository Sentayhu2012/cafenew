/*
  # Allow waiters to update order items

  1. Changes
    - Add UPDATE policy for order_items table
    - Waiters can update order items in their own pending orders
  
  2. Security
    - Only the waiter who owns the order can update items
    - Only applies to orders with status 'pending'
*/

CREATE POLICY "Waiters can update order items in pending orders"
  ON order_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.waiter_id = auth.uid()
      AND orders.status = 'pending'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.waiter_id = auth.uid()
      AND orders.status = 'pending'
    )
  );
