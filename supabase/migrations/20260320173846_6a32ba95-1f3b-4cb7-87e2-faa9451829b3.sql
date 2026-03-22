-- 1. Fix profiles: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
CREATE POLICY "Authenticated can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Also restrict INSERT/UPDATE to authenticated
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 2. Fix group_members: restrict SELECT to authenticated members
DROP POLICY IF EXISTS "Members can view group membership" ON public.group_members;
CREATE POLICY "Members can view group membership"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
  ));

-- 3. Fix group_invites: restrict SELECT to group members only
DROP POLICY IF EXISTS "Authenticated can read invites" ON public.group_invites;
CREATE POLICY "Members can read group invites"
  ON public.group_invites FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_invites.group_id AND group_members.user_id = auth.uid()
  ));