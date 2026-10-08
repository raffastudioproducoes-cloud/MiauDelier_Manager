-- Defense in depth: Gemini keys are available only to the Edge Function service role.
CREATE POLICY "No direct client access to Gemini keys"
ON public.user_gemini_keys
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
