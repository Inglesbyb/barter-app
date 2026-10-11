-- SwitchR: Eco-Engine Database Upgrade
-- Run this in the Supabase SQL Editor

-- Add eco columns to items table
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS co2_saved_kg DECIMAL;

-- Add total carbon savings tracker to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_carbon_saved DECIMAL DEFAULT 0;
