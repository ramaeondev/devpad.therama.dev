ALTER TABLE "public"."integrations" ADD COLUMN IF NOT EXISTS "settings" jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN "public"."integrations"."settings" IS 'Stores integration-specific settings and state (e.g. selected files)';
