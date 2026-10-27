-- Give each agent a stable, public firstname.lastname portfolio address.
-- Only the deliberately public portfolio fields are populated; account contact
-- details and business records remain private.

ALTER TABLE public.public_profiles
  DROP CONSTRAINT IF EXISTS public_profiles_slug_check;

ALTER TABLE public.public_profiles
  ADD CONSTRAINT public_profiles_slug_check
  CHECK (slug ~ '^[a-z0-9]+(?:[.-][a-z0-9]+)*$');

CREATE OR REPLACE FUNCTION public.create_agent_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_slug text;
  candidate_slug text;
BEGIN
  IF NEW.portal_type <> 'agent' THEN
    RETURN NEW;
  END IF;

  base_slug := lower(regexp_replace(coalesce(NEW.name, ''), '[^a-zA-Z0-9]+', '.', 'g'));
  base_slug := trim(both '.' from base_slug);
  IF base_slug = '' THEN
    base_slug := 'agent';
  END IF;
  base_slug := left(base_slug, 80);
  candidate_slug := base_slug;

  IF EXISTS (
    SELECT 1 FROM public.public_profiles AS existing
    WHERE existing.slug = candidate_slug AND existing.user_id <> NEW.id
  ) THEN
    candidate_slug := base_slug || '.' || left(replace(NEW.id::text, '-', ''), 8);
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

DROP TRIGGER IF EXISTS create_agent_public_profile_after_insert ON public.profiles;
CREATE TRIGGER create_agent_public_profile_after_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_agent_public_profile();

-- Backfill agents who registered before this workflow was installed.
DO $$
DECLARE
  agent record;
  base_slug text;
  candidate_slug text;
BEGIN
  FOR agent IN
    SELECT p.id, p.name, p.avatar_url
    FROM public.profiles AS p
    WHERE p.portal_type = 'agent'
      AND NOT EXISTS (SELECT 1 FROM public.public_profiles AS pp WHERE pp.user_id = p.id)
    ORDER BY p.id
  LOOP
    base_slug := lower(regexp_replace(coalesce(agent.name, ''), '[^a-zA-Z0-9]+', '.', 'g'));
    base_slug := trim(both '.' from base_slug);
    IF base_slug = '' THEN
      base_slug := 'agent';
    END IF;
    base_slug := left(base_slug, 80);
    candidate_slug := base_slug;
    IF EXISTS (SELECT 1 FROM public.public_profiles AS existing WHERE existing.slug = candidate_slug) THEN
      candidate_slug := base_slug || '.' || left(replace(agent.id::text, '-', ''), 8);
    END IF;

    INSERT INTO public.public_profiles (user_id, slug, display_name, photo_url, is_published)
    VALUES (
      agent.id,
      candidate_slug,
      CASE WHEN length(trim(coalesce(agent.name, ''))) >= 2
        THEN left(trim(agent.name), 100) ELSE 'Learn With Sulav Agent' END,
      agent.avatar_url,
      true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END;
$$;
