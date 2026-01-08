# Supabase Manual User Data Deletion

This guide provides safe, copy‑paste SQL you can run manually in the Supabase SQL editor after a user explicitly consents to delete their own account and data.

It removes:

- Database rows in `notes`, `folders`, and `user_profiles` for a specific user
- Storage objects in the `notes` and `avatars` buckets belonging to that user
- Optionally, the auth user (requires service role in SQL context)

> Replace `REPLACE_WITH_USER_ID` with the target user's UUID before running.

---

## 1) Dry‑Run Preview (Counts Only)

Run this first to see what will be deleted.

```sql
-- Replace with the target user
with params as (select 'REPLACE_WITH_USER_ID'::uuid as user_id)
select
  (select count(*) from notes n join params p on n.user_id = p.user_id) as notes_count,
  (select count(*) from folders f join params p on f.user_id = p.user_id) as folders_count,
  (select count(*) from user_profiles up join params p on up.user_id = p.user_id) as profiles_count,
  -- Storage objects (notes bucket: notes/<user_id>/...)
  (select count(*) from storage.objects o join params p on true
     where o.bucket_id = 'notes' and o.name like p.user_id::text || '/%') as note_files_count,
  -- Storage objects (avatars bucket; match multiple path styles)
  (select count(*) from storage.objects o join params p on true
     where o.bucket_id = 'avatars'
       and (
         o.name like p.user_id::text || '/%'
         or o.name like 'avatars/' || p.user_id::text || '.%'
         or o.name like p.user_id::text || '.%'
       )
  ) as avatar_files_count;
```

---

## 2) Full Deletion (Storage + Database)

Run this to delete the user's data. The script is idempotent (safe to re-run).

```sql
DO $$
DECLARE
  v_user uuid := 'REPLACE_WITH_USER_ID';
  v_notes_deleted int := 0;
  v_folders_deleted int := 0;
  v_profiles_deleted int := 0;
  v_objects_notes int := 0;
  v_objects_avatars int := 0;
BEGIN
  -- 1) Storage: delete note files (notes/<user_id>/...)
  DELETE FROM storage.objects
   WHERE bucket_id = 'notes'
     AND name LIKE v_user::text || '/%';
  GET DIAGNOSTICS v_objects_notes = ROW_COUNT;

  -- 2) Storage: delete avatar files (support multiple path styles)
  DELETE FROM storage.objects
   WHERE bucket_id = 'avatars'
     AND (
       name LIKE v_user::text || '/%'
       OR name LIKE 'avatars/' || v_user::text || '.%'
       OR name LIKE v_user::text || '.%'
     );
  GET DIAGNOSTICS v_objects_avatars = ROW_COUNT;

  -- 3) DB rows: delete notes, then folders, then profile
  DELETE FROM notes WHERE user_id = v_user;
  GET DIAGNOSTICS v_notes_deleted = ROW_COUNT;

  DELETE FROM folders WHERE user_id = v_user;
  GET DIAGNOSTICS v_folders_deleted = ROW_COUNT;

  DELETE FROM user_profiles WHERE user_id = v_user;
  GET DIAGNOSTICS v_profiles_deleted = ROW_COUNT;

  RAISE NOTICE 'Deleted: % notes, % folders, % profile(s), % note files, % avatar files',
    v_notes_deleted, v_folders_deleted, v_profiles_deleted, v_objects_notes, v_objects_avatars;

  -- 4) OPTIONAL: Delete the auth user (requires service role)
  -- Uncomment if you intend to remove the auth user entirely as well:
  -- PERFORM auth.admin_delete_user(v_user);
  -- RAISE NOTICE 'Auth user deleted: %', v_user;
END $$;
```

---

## Expected Schema/Buckets

This script assumes the following exist in your project:

- Tables: `user_profiles`, `folders`, `notes` (each row has `user_id`)
- Buckets: `notes` (paths like `notes/<user_id>/<note_id>.md`) and `avatars` (paths like `avatars/<user_id>.<ext>`)

If your pathing differs, adjust the `LIKE` patterns accordingly.

---

## How To Run

1. Open Supabase Dashboard → SQL Editor.
2. Paste the Dry‑Run (Counts) SQL, replace the user id, and run it to confirm scope.
3. Paste the Full Deletion block, replace the user id, and run it.
4. Optionally run the `auth.admin_delete_user` line if you also want to remove the auth account (requires a service role context in SQL).

---

## Safety Notes

- This action is destructive. Ensure you have explicit user consent and necessary approvals.
- The script is idempotent. Re-running will report `0` for already‑deleted records/objects.
- Consider exporting user data before deletion if your policy requires it.
