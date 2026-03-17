
CREATE OR REPLACE FUNCTION public.create_group_with_member(
  _name TEXT,
  _members JSONB
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _group_id uuid;
BEGIN
  INSERT INTO public.groups (name, members)
  VALUES (_name, _members)
  RETURNING id INTO _group_id;

  INSERT INTO public.group_members (group_id, user_id)
  VALUES (_group_id, auth.uid());

  RETURN _group_id;
END;
$$;
