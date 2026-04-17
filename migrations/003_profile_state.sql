-- Add state column to profiles table for state-specific bonus filtering
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text;
