import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'waiter' | 'cashier';
  active?: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  waiter_id: string;
  table_number: string;
  total_amount: number;
  status: 'pending' | 'paid' | 'confirmed';
  created_at: string;
};

export type Payment = {
  id: string;
  order_id: string;
  payment_method: 'cash' | 'bank_transfer';
  amount: number;
  tip_amount: number;
  transfer_screenshot_url?: string;
  receipt_url?: string;
  bank_id?: string;
  status: 'pending' | 'approved' | 'declined';
  submitted_at: string;
  confirmed_at?: string;
  confirmed_by?: string;
  declined_reason?: string;
  declined_at?: string;
};

export type Bank = {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  active: boolean;
};

export type Menu = {
  id: string;
  name: string;
  price: number;
  picture_url?: string;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_id: string;
  quantity: number;
  price_at_purchase: number;
  created_at: string;
};
