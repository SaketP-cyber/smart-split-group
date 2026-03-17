
CREATE TABLE public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Members can create invites for their groups
CREATE POLICY "Members can create invites"
ON public.group_invites FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_invites.group_id
    AND group_members.user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Anyone authenticated can read invites (needed to join)
CREATE POLICY "Authenticated can read invites"
ON public.group_invites FOR SELECT TO authenticated
USING (true);

-- Function to join a group via invite token
CREATE OR REPLACE FUNCTION public.join_group_via_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _group_id uuid;
  _already_member boolean;
BEGIN
  SELECT group_id INTO _group_id
  FROM public.group_invites
  WHERE token = _token;

  IF _group_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite link';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = auth.uid()
  ) INTO _already_member;

  IF _already_member THEN
    RETURN _group_id;
  END IF;

  INSERT INTO public.group_members (group_id, user_id)
  VALUES (_group_id, auth.uid());

  -- Add member info to group's members jsonb
  UPDATE public.groups
  SET members = members || (
    SELECT jsonb_build_array(jsonb_build_object('initials', p.initials, 'color', p.color))
    FROM public.profiles p WHERE p.id = auth.uid()
  )
  WHERE id = _group_id;

  RETURN _group_id;
END;
$$;
