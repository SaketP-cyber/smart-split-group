
CREATE TABLE public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  from_user text NOT NULL,
  to_user text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group settlements"
  ON public.settlements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = settlements.group_id
      AND group_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can insert settlements"
  ON public.settlements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = settlements.group_id
      AND group_members.user_id = auth.uid()
  ));
