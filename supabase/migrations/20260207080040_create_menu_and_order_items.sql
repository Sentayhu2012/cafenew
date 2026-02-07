/*
  # Create menu and order items tables

  1. New Tables
    - `menu`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Menu item name/service name
      - `price` (numeric) - Price including VAT
      - `picture_url` (text, nullable) - Optional menu item image
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `menu_id` (uuid, foreign key to menu)
      - `quantity` (integer) - Number of items ordered
      - `price_at_purchase` (numeric) - Price at time of order
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Menu items are publicly viewable
    - Only cashiers can manage menu
    - Order items follow order permissions
*/

CREATE TABLE IF NOT EXISTS menu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  price numeric NOT NULL CHECK (price > 0),
  picture_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_id uuid NOT NULL REFERENCES menu(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_purchase numeric NOT NULL CHECK (price_at_purchase > 0),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_menu_id_idx ON order_items(menu_id);

ALTER TABLE menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Menu items are viewable by all authenticated users"
  ON menu FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only cashiers can create menu items"
  ON menu FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cashier'
    )
  );

CREATE POLICY "Only cashiers can update menu items"
  ON menu FOR UPDATE
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

CREATE POLICY "Only cashiers can delete menu items"
  ON menu FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cashier'
    )
  );

CREATE POLICY "Users can view order items of their orders"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.waiter_id = auth.uid() OR auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'cashier'
      ))
    )
  );

CREATE POLICY "Waiters can insert order items for their orders"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.waiter_id = auth.uid()
      AND orders.status = 'pending'
    )
  );

CREATE POLICY "Waiters can delete order items from pending orders"
  ON order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.waiter_id = auth.uid()
      AND orders.status = 'pending'
    )
  );
