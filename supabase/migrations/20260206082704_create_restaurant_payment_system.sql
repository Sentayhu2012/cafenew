/*
  # Restaurant Payment Management System

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `role` (text) - either 'waiter' or 'cashier'
      - `created_at` (timestamp)
    
    - `orders`
      - `id` (uuid, primary key)
      - `waiter_id` (uuid, references profiles)
      - `table_number` (text)
      - `total_amount` (numeric)
      - `status` (text) - 'pending', 'paid', 'confirmed'
      - `created_at` (timestamp)
    
    - `payments`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references orders)
      - `payment_method` (text) - 'cash' or 'bank_transfer'
      - `amount` (numeric)
      - `tip_amount` (numeric)
      - `transfer_screenshot_url` (text, nullable)
      - `status` (text) - 'pending', 'confirmed'
      - `submitted_at` (timestamp)
      - `confirmed_at` (timestamp, nullable)
      - `confirmed_by` (uuid, nullable, references profiles)

  2. Storage
    - Create bucket for transfer screenshots

  3. Security
    - Enable RLS on all tables
    - Add policies for waiters to create orders and payments
    - Add policies for cashiers to view and confirm payments
    - Add policies for storage bucket access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('waiter', 'cashier')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waiter_id uuid NOT NULL REFERENCES profiles(id),
  table_number text NOT NULL,
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'confirmed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer')),
  amount numeric NOT NULL CHECK (amount >= 0),
  tip_amount numeric DEFAULT 0 CHECK (tip_amount >= 0),
  transfer_screenshot_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  submitted_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES profiles(id)
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for orders
CREATE POLICY "Waiters can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'waiter'
    )
    AND waiter_id = auth.uid()
  );

CREATE POLICY "Waiters can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    waiter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cashier'
    )
  );

CREATE POLICY "Waiters can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (waiter_id = auth.uid())
  WITH CHECK (waiter_id = auth.uid());

-- RLS Policies for payments
CREATE POLICY "Waiters can create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.waiter_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.waiter_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cashier'
    )
  );

CREATE POLICY "Cashiers can update payments"
  ON payments FOR UPDATE
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

-- Create storage bucket for transfer screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('transfer-screenshots', 'transfer-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload screenshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'transfer-screenshots');

CREATE POLICY "Authenticated users can view screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'transfer-screenshots');
