
-- Create a security definer function to check group membership without recursion
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id
  )
$$;

-- Fix group_members SELECT policy (was self-referencing causing infinite recursion)
DROP POLICY IF EXISTS "Members can view group membership" ON public.group_members;
CREATE POLICY "Members can view group membership"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_group_member(group_id, auth.uid()));

-- Fix groups SELECT policy to use the function
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;
CREATE POLICY "Members can view their groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (public.is_group_member(id, auth.uid()));

-- Fix groups UPDATE policy
DROP POLICY IF EXISTS "Members can update their groups" ON public.groups;
CREATE POLICY "Members can update their groups"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (public.is_group_member(id, auth.uid()));

-- Fix messages policies
DROP POLICY IF EXISTS "Members can view group messages" ON public.messages;
CREATE POLICY "Members can view group messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members can insert messages" ON public.messages;
CREATE POLICY "Members can insert messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (public.is_group_member(group_id, auth.uid()));

-- Fix receipts policies
DROP POLICY IF EXISTS "Members can view group receipts" ON public.receipts;
CREATE POLICY "Members can view group receipts"
  ON public.receipts FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members can insert receipts" ON public.receipts;
CREATE POLICY "Members can insert receipts"
  ON public.receipts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members can update receipts" ON public.receipts;
CREATE POLICY "Members can update receipts"
  ON public.receipts FOR UPDATE
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

-- Fix settlements policies
DROP POLICY IF EXISTS "Members can view group settlements" ON public.settlements;
CREATE POLICY "Members can view group settlements"
  ON public.settlements FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members can insert settlements" ON public.settlements;
CREATE POLICY "Members can insert settlements"
  ON public.settlements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_group_member(group_id, auth.uid()));

-- Fix group_invites policies
DROP POLICY IF EXISTS "Members can read group invites" ON public.group_invites;
CREATE POLICY "Members can read group invites"
  ON public.group_invites FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members can create invites" ON public.group_invites;
CREATE POLICY "Members can create invites"
  ON public.group_invites FOR INSERT
  TO authenticated
  WITH CHECK (public.is_group_member(group_id, auth.uid()) AND created_by = auth.uid());
