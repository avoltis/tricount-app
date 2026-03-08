-- ============================================
-- TRICOUNT APP - SUPABASE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- Stores user profile information
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- GROUPS TABLE
-- Expense sharing groups
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MEMBERS TABLE
-- Group members (can be registered users or just names)
-- ============================================
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_members_group_id ON members(group_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);

-- ============================================
-- EXPENSES TABLE
-- Individual expenses in a group
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Store in cents
  paid_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);

-- ============================================
-- EXPENSE SPLITS TABLE
-- How each expense is split between members
-- ============================================
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL -- Store in cents
);

-- Enable RLS
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_member_id ON expense_splits(member_id);

-- ============================================
-- SETTLEMENTS TABLE
-- When someone pays back their debt
-- ============================================
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_member UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_member UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Store in cents
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON settlements(group_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Helper function to check if user is a member of a group
CREATE OR REPLACE FUNCTION is_group_member(group_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members 
    WHERE group_id = group_uuid 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Groups: Members can view their groups
CREATE POLICY "Members can view groups"
  ON groups FOR SELECT
  USING (is_group_member(id) OR created_by = auth.uid());

-- Groups: Authenticated users can create groups
CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Groups: Members can update groups
CREATE POLICY "Members can update groups"
  ON groups FOR UPDATE
  USING (is_group_member(id));

-- Groups: Creator can delete groups
CREATE POLICY "Creator can delete groups"
  ON groups FOR DELETE
  USING (created_by = auth.uid());

-- Members: Group members can view members
CREATE POLICY "Group members can view members"
  ON members FOR SELECT
  USING (is_group_member(group_id));

-- Members: Group members can add members
CREATE POLICY "Group members can add members"
  ON members FOR INSERT
  WITH CHECK (is_group_member(group_id) OR NOT EXISTS (SELECT 1 FROM members WHERE group_id = members.group_id));

-- Members: Group members can update members
CREATE POLICY "Group members can update members"
  ON members FOR UPDATE
  USING (is_group_member(group_id));

-- Members: Group members can remove members
CREATE POLICY "Group members can remove members"
  ON members FOR DELETE
  USING (is_group_member(group_id));

-- Expenses: Group members can view expenses
CREATE POLICY "Group members can view expenses"
  ON expenses FOR SELECT
  USING (is_group_member(group_id));

-- Expenses: Group members can add expenses
CREATE POLICY "Group members can add expenses"
  ON expenses FOR INSERT
  WITH CHECK (is_group_member(group_id));

-- Expenses: Group members can update expenses
CREATE POLICY "Group members can update expenses"
  ON expenses FOR UPDATE
  USING (is_group_member(group_id));

-- Expenses: Group members can delete expenses
CREATE POLICY "Group members can delete expenses"
  ON expenses FOR DELETE
  USING (is_group_member(group_id));

-- Expense Splits: Group members can view splits
CREATE POLICY "Group members can view expense splits"
  ON expense_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expenses 
      WHERE expenses.id = expense_splits.expense_id 
      AND is_group_member(expenses.group_id)
    )
  );

-- Expense Splits: Group members can add splits
CREATE POLICY "Group members can add expense splits"
  ON expense_splits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses 
      WHERE expenses.id = expense_splits.expense_id 
      AND is_group_member(expenses.group_id)
    )
  );

-- Expense Splits: Group members can delete splits
CREATE POLICY "Group members can delete expense splits"
  ON expense_splits FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM expenses 
      WHERE expenses.id = expense_splits.expense_id 
      AND is_group_member(expenses.group_id)
    )
  );

-- Settlements: Group members can view settlements
CREATE POLICY "Group members can view settlements"
  ON settlements FOR SELECT
  USING (is_group_member(group_id));

-- Settlements: Group members can add settlements
CREATE POLICY "Group members can add settlements"
  ON settlements FOR INSERT
  WITH CHECK (is_group_member(group_id));

-- Settlements: Group members can delete settlements
CREATE POLICY "Group members can delete settlements"
  ON settlements FOR DELETE
  USING (is_group_member(group_id));

-- ============================================
-- TRIGGER: Update updated_at on groups
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TRIGGER: Update group updated_at when expense added
-- ============================================
CREATE OR REPLACE FUNCTION update_group_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE groups SET updated_at = NOW() WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expense_update_group
  AFTER INSERT OR UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_group_timestamp();
