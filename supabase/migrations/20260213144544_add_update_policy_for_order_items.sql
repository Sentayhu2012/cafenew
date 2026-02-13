/*
  # Add UPDATE policy for order items

  1. Changes
    - Add UPDATE policy for order_items table to allow waiters to update quantities on pending orders
  
  2. Security
    - Waiters can only update order items for their own pending orders
    - Prevents updates to completed or paid orders
*/

CREATE POLICY "Waiters can update order items for pending orders"
  ON order_items FOR UPDATE
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