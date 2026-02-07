/*
  # Fix profiles table RLS policy for signup

  1. Add INSERT policy to profiles table
    - Allow newly created users to insert their own profile
    - Required for signup functionality
*/

CREATE POLICY "Users can insert own profile on signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
