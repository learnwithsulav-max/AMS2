-- Normalize existing public links to firstname.lastname while keeping them
-- unique when two agents share the same name.
DO $$
DECLARE
  agent record;
  normalized_name text;
  name_parts text[];
  base_slug text;
  candidate_slug text;
BEGIN
  -- Free legacy/custom values inside this transaction before assigning the
  -- canonical values, so the existing unique slug constraint stays enabled.
  UPDATE public.public_profiles AS pp
  SET slug = 'tmp.' || replace(pp.user_id::text, '-', '')
  WHERE EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = pp.user_id AND p.portal_type = 'agent'
  );

  FOR agent IN
    SELECT p.id, p.name
    FROM public.profiles AS p
    WHERE p.portal_type = 'agent'
    ORDER BY p.id
  LOOP
    normalized_name := trim(regexp_replace(lower(coalesce(agent.name, '')), '[^a-z0-9]+', ' ', 'g'));
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
      WHERE existing.slug = candidate_slug AND existing.user_id <> agent.id
    ) THEN
      candidate_slug := base_slug || '.' || replace(agent.id::text, '-', '');
    END IF;

    UPDATE public.public_profiles
    SET slug = candidate_slug
    WHERE user_id = agent.id;
  END LOOP;
END;
$$;
