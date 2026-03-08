-- ============================================
-- FIX MEMBERS INSERT POLICY
-- Allow group creators to add members when creating a group
-- ============================================

-- Drop the old insert policy
DROP POLICY IF EXISTS "Group members can add members" ON members;

-- Create a better policy that allows:
-- 1. Group members to add other members
-- 2. Group creators to add initial members
CREATE POLICY "Group members can add members"
  ON members FOR INSERT
  WITH CHECK (
    -- Allow if user is already a member
    EXISTS (
      SELECT 1 FROM members 
      WHERE group_id = members.group_id 
      AND user_id = auth.uid()
    )
    -- OR if user is the group creator
    OR EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = members.group_id 
      AND groups.created_by = auth.uid()
    )
  );

-- Update the helper function to include group creators
-- Using CREATE OR REPLACE to avoid dropping dependencies
CREATE OR REPLACE FUNCTION is_group_member(group_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members 
    WHERE group_id = group_uuid 
    AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM groups
    WHERE id = group_uuid
    AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
