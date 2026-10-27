-- Public portfolio records can be written only by MFA-verified agent accounts.
-- Candidate users do not inherit agent permissions from the shared profile table.
DROP POLICY IF EXISTS "agents create own portfolio" ON public.public_profiles;
DROP POLICY IF EXISTS "agents update own portfolio" ON public.public_profiles;

CREATE POLICY "agents create own portfolio"
ON public.public_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (SELECT auth.jwt() ->> 'aal') = 'aal2'
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.portal_type = 'agent'
  )
);

CREATE POLICY "agents update own portfolio"
ON public.public_profiles
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND (SELECT auth.jwt() ->> 'aal') = 'aal2'
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.portal_type = 'agent'
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (SELECT auth.jwt() ->> 'aal') = 'aal2'
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.portal_type = 'agent'
  )
);
