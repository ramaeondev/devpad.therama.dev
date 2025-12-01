


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."ensure_single_current_device"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If marking this device as current, unmark all others
  IF NEW.is_current = true THEN
    UPDATE user_devices
    SET is_current = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_current_device"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_device_last_seen"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.last_seen_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_device_last_seen"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_integrations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_integrations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "parent_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "is_root" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "color" "text",
    "icon" "text"
);


ALTER TABLE "public"."folders" OWNER TO "postgres";


COMMENT ON TABLE "public"."folders" IS 'Stores folder hierarchy for organizing notes';



COMMENT ON COLUMN "public"."folders"."is_root" IS 'Flag to identify root folders in the hierarchy';



CREATE TABLE IF NOT EXISTS "public"."integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text",
    "expires_at" bigint,
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "integrations_provider_check" CHECK (("provider" = ANY (ARRAY['google_drive'::"text", 'onedrive'::"text", 'dropbox'::"text"])))
);


ALTER TABLE "public"."integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "folder_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_favorite" boolean DEFAULT false,
    "is_archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "encrypted_key" "text"
);


ALTER TABLE "public"."notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "fingerprint_id" "text" NOT NULL,
    "visitor_id" "text",
    "device_name" "text",
    "device_type" "text",
    "browser_name" "text",
    "browser_version" "text",
    "os_name" "text",
    "os_version" "text",
    "ip_address" "inet",
    "country" "text",
    "city" "text",
    "first_seen_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "last_login_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_trusted" boolean DEFAULT false,
    "is_current" boolean DEFAULT false,
    "user_agent" "text",
    "additional_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_devices" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_devices" IS 'Tracks user devices and sessions using fingerprinting';



COMMENT ON COLUMN "public"."user_devices"."fingerprint_id" IS 'Unique browser fingerprint from FingerprintJS';



COMMENT ON COLUMN "public"."user_devices"."visitor_id" IS 'FingerprintJS Pro visitor ID (optional, for Pro users)';



COMMENT ON COLUMN "public"."user_devices"."device_name" IS 'User-friendly device name';



COMMENT ON COLUMN "public"."user_devices"."is_trusted" IS 'Whether user has marked this device as trusted';



COMMENT ON COLUMN "public"."user_devices"."is_current" IS 'Whether this is the currently active device';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_root_folder_created" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text"
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_profiles" IS 'Stores user-specific profile settings and flags';



COMMENT ON COLUMN "public"."user_profiles"."is_root_folder_created" IS 'Flag to track if root folder has been created for the user';



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_user_id_provider_key" UNIQUE ("user_id", "provider");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "unique_user_root" UNIQUE ("user_id", "is_root");



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_user_id_fingerprint_id_key" UNIQUE ("user_id", "fingerprint_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_folders_is_root" ON "public"."folders" USING "btree" ("is_root");



CREATE INDEX "idx_folders_parent_id" ON "public"."folders" USING "btree" ("parent_id");



CREATE INDEX "idx_folders_user_id" ON "public"."folders" USING "btree" ("user_id");



CREATE INDEX "idx_folders_user_id_is_root" ON "public"."folders" USING "btree" ("user_id", "is_root");



CREATE INDEX "idx_integrations_user_provider" ON "public"."integrations" USING "btree" ("user_id", "provider");



CREATE INDEX "idx_notes_folder_id" ON "public"."notes" USING "btree" ("folder_id");



CREATE INDEX "idx_notes_updated_at" ON "public"."notes" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_notes_user_id" ON "public"."notes" USING "btree" ("user_id");



CREATE INDEX "idx_user_devices_fingerprint_id" ON "public"."user_devices" USING "btree" ("fingerprint_id");



CREATE INDEX "idx_user_devices_is_current" ON "public"."user_devices" USING "btree" ("user_id", "is_current");



CREATE INDEX "idx_user_devices_last_seen" ON "public"."user_devices" USING "btree" ("last_seen_at");



CREATE INDEX "idx_user_devices_user_fingerprint" ON "public"."user_devices" USING "btree" ("user_id", "fingerprint_id");



CREATE INDEX "idx_user_devices_user_id" ON "public"."user_devices" USING "btree" ("user_id");



CREATE INDEX "idx_user_profiles_user_id" ON "public"."user_profiles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "ensure_single_current_device_trigger" BEFORE INSERT OR UPDATE ON "public"."user_devices" FOR EACH ROW WHEN (("new"."is_current" = true)) EXECUTE FUNCTION "public"."ensure_single_current_device"();



CREATE OR REPLACE TRIGGER "trigger_update_integrations_updated_at" BEFORE UPDATE ON "public"."integrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_integrations_updated_at"();



CREATE OR REPLACE TRIGGER "update_folders_updated_at" BEFORE UPDATE ON "public"."folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_devices_last_seen" BEFORE UPDATE ON "public"."user_devices" FOR EACH ROW EXECUTE FUNCTION "public"."update_device_last_seen"();



CREATE OR REPLACE TRIGGER "update_user_devices_updated_at" BEFORE UPDATE ON "public"."user_devices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users can create their own notes" ON "public"."notes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own devices" ON "public"."user_devices" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own folders except root" ON "public"."folders" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("is_root" = false)));



CREATE POLICY "Users can delete their own integrations" ON "public"."integrations" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own notes" ON "public"."notes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own devices" ON "public"."user_devices" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own folders" ON "public"."folders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own integrations" ON "public"."integrations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own devices" ON "public"."user_devices" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own folders" ON "public"."folders" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own integrations" ON "public"."integrations" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notes" ON "public"."notes" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own devices" ON "public"."user_devices" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own folders" ON "public"."folders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own integrations" ON "public"."integrations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notes" ON "public"."notes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."ensure_single_current_device"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_current_device"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_current_device"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_device_last_seen"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_device_last_seen"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_device_last_seen"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_integrations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_integrations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_integrations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."folders" TO "anon";
GRANT ALL ON TABLE "public"."folders" TO "authenticated";
GRANT ALL ON TABLE "public"."folders" TO "service_role";



GRANT ALL ON TABLE "public"."integrations" TO "anon";
GRANT ALL ON TABLE "public"."integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."integrations" TO "service_role";



GRANT ALL ON TABLE "public"."notes" TO "anon";
GRANT ALL ON TABLE "public"."notes" TO "authenticated";
GRANT ALL ON TABLE "public"."notes" TO "service_role";



GRANT ALL ON TABLE "public"."user_devices" TO "anon";
GRANT ALL ON TABLE "public"."user_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."user_devices" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


  create policy "Public avatar access"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Users can delete own avatar"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND (name ~ (('^avatars/'::text || (auth.uid())::text) || '\.'::text))));



  create policy "Users can delete their own notes"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'notes'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can read their own notes"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'notes'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can update own avatar"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'avatars'::text) AND (name ~ (('^avatars/'::text || (auth.uid())::text) || '\.'::text))))
with check (((bucket_id = 'avatars'::text) AND (name ~ (('^avatars/'::text || (auth.uid())::text) || '\.'::text))));



  create policy "Users can update their own notes"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'notes'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload own avatar"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND (name ~ (('^avatars/'::text || (auth.uid())::text) || '\.'::text))));



  create policy "Users can upload their own notes"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'notes'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



