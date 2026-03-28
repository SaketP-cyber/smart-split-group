
-- Allow group members to delete groups they belong to
CREATE POLICY "Members can delete their groups"
ON public.groups
FOR DELETE
TO authenticated
USING (is_group_member(id, auth.uid()));

-- Create a function to delete a group and all related data
CREATE OR REPLACE FUNCTION public.delete_group_cascade(_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is a member
  IF NOT is_group_member(_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  -- Delete related data
  DELETE FROM public.settlements WHERE group_id = _group_id;
  DELETE FROM public.receipts WHERE group_id = _group_id;
  DELETE FROM public.messages WHERE group_id = _group_id;
  DELETE FROM public.group_invites WHERE group_id = _group_id;
  DELETE FROM public.group_members WHERE group_id = _group_id;
  DELETE FROM public.groups WHERE id = _group_id;
END;
$$;
