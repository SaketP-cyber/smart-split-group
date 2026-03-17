
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  initials TEXT NOT NULL DEFAULT 'XX',
  color TEXT NOT NULL DEFAULT 'bg-blue-100 text-blue-700',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _initials TEXT;
  _colors TEXT[] := ARRAY[
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700'
  ];
  _color TEXT;
BEGIN
  _initials := UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'XX'), 2));
  _color := _colors[1 + floor(random() * array_length(_colors, 1))::int];
  INSERT INTO public.profiles (id, email, display_name, initials, color)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    _initials,
    _color
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Group members table
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group membership" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert membership" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can delete own membership" ON public.group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Update groups RLS to only show groups user is member of
DROP POLICY "Allow all access to groups" ON public.groups;
CREATE POLICY "Members can view their groups" ON public.groups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid()));
CREATE POLICY "Authenticated users can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Members can update their groups" ON public.groups FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid()));

-- Update messages RLS
DROP POLICY "Allow all access to messages" ON public.messages;
CREATE POLICY "Members can view group messages" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = messages.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "Members can insert messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = messages.group_id AND group_members.user_id = auth.uid()));

-- Update receipts RLS
DROP POLICY "Allow all access to receipts" ON public.receipts;
CREATE POLICY "Members can view group receipts" ON public.receipts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = receipts.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "Members can insert receipts" ON public.receipts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = receipts.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "Members can update receipts" ON public.receipts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = receipts.group_id AND group_members.user_id = auth.uid()));
