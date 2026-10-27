-- Keep generated URLs in firstname.lastname form for agents who register later.
CREATE OR REPLACE FUNCTION public.create_agent_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_name text;
  name_parts text[];
  base_slug text;
  candidate_slug text;
BEGIN
  IF NEW.portal_type <> 'agent' THEN
    RETURN NEW;
  END IF;

  normalized_name := trim(regexp_replace(lower(coalesce(NEW.name, '')), '[^a-z0-9]+', ' ', 'g'));
  name_parts := regexp_split_to_array(normalized_name, '\s+');
  IF coalesce(array_length(name_parts, 1), 0) > 1 THEN
    base_slug := left(name_parts[1], 29) || '.' || left(name_parts[array_length(name_parts, 1)], 29);
  ELSE
    base_slug := left(coalesce(name_parts[1], ''), 59);
  END IF;
  IF base_slug = '' THEN
    base_slug := 'agent';
  END IF;
  candidate_slug := base_slug;

  IF EXISTS (
    SELECT 1 FROM public.public_profiles AS existing
    WHERE existing.slug = candidate_slug AND existing.user_id <> NEW.id
  ) THEN
    candidate_slug := base_slug || '.' || replace(NEW.id::text, '-', '');
  END IF;

  INSERT INTO public.public_profiles (user_id, slug, display_name, photo_url, is_published)
  VALUES (
    NEW.id,
    candidate_slug,
    CASE WHEN length(trim(coalesce(NEW.name, ''))) >= 2
      THEN left(trim(NEW.name), 100) ELSE 'Learn With Sulav Agent' END,
    NEW.avatar_url,
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_agent_public_profile() FROM PUBLIC, anon, authenticated;
