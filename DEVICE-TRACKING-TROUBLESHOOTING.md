# Device Tracking Troubleshooting Guide

## Understanding the PGRST116 Error

### What is PGRST116?

**Error Code**: `PGRST116`  
**Message**: "Cannot coerce the result to a single JSON object" or "The result contains 0 rows"

### What It Means:

✅ **GOOD NEWS**: This error means your query is correct and the table exists!  
⚠️ **SITUATION**: No device record was found for the user + fingerprint combination

### When It's Expected:

1. **First time login** - No device record exists yet
2. **New browser** - Different fingerprint, no record
3. **After clearing cookies** - May generate new fingerprint
4. **Incognito mode** - Usually different fingerprint

### When It's a Problem:

1. **Migration not run** - Table doesn't exist
2. **RLS policy blocking** - User can't access their own data
3. **Device registration failing** - Code not running on sign-in

---

## Step-by-Step Troubleshooting

### ✅ **Step 1: Verify Migration Was Run**

Go to your Supabase Dashboard:

1. Open **SQL Editor**
2. Run this query:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_devices'
);

-- If true, check structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_devices'
ORDER BY ordinal_position;

-- Check if any data exists
SELECT COUNT(*) FROM user_devices;
```

**Expected Results:**
- First query: `true`
- Second query: List of columns (id, user_id, fingerprint_id, etc.)
- Third query: Number (might be 0 if no logins yet)

**If table doesn't exist**: Run the migration!

```bash
# Copy contents of supabase-device-tracking.sql
# Paste into Supabase SQL Editor
# Click "Run"
```

---

### ✅ **Step 2: Check RLS Policies**

Run this in Supabase SQL Editor:

```sql
-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_devices';
```

**Expected**: You should see 4 policies:
- ✅ Users can view their own devices (SELECT)
- ✅ Users can insert their own devices (INSERT)  
- ✅ Users can update their own devices (UPDATE)
- ✅ Users can delete their own devices (DELETE)

**If no policies**: RLS is blocking access. Re-run the migration.

---

### ✅ **Step 3: Test Device Registration**

#### A. Clear your browser console
Press `F12` → Console tab → Clear

#### B. Sign out and sign in again

Watch the console for these logs:

```
🔐 [Device Tracking] Starting device registration...
   User ID: 475d9b83-3b30-406c-8220-b860c0c9a181
   Fingerprint ID: 3088259ea46b9cc06d07221fa70ed3b4
   Device Info: { ... }
   ✨ New device, creating entry...
   ✅ Device created successfully: { ... }
```

#### C. What Each Message Means:

| Log | Meaning | Action |
|-----|---------|--------|
| 🔐 Starting device registration | Service called | ✅ Good |
| User ID shown | User authenticated | ✅ Good |
| Fingerprint ID shown | Fingerprint generated | ✅ Good |
| Device Info shown | Device detected | ✅ Good |
| ✨ New device | No existing record (expected first time) | ✅ Good |
| ✅ Created successfully | Device saved to DB | ✅ Good |
| ❌ Error creating device | **PROBLEM** | See errors below |

---

### ✅ **Step 4: Manual Device Registration Test**

Open browser console and paste this:

```javascript
// Get fingerprint
import('@fingerprintjs/fingerprintjs').then(async (FingerprintJS) => {
  const fp = await FingerprintJS.default.load();
  const result = await fp.get();
  
  console.log('Your Fingerprint ID:', result.visitorId);
  console.log('Browser:', navigator.userAgent);
  console.log('Platform:', navigator.platform);
});
```

This will show your current fingerprint ID. Compare with what's in your error URL.

---

### ✅ **Step 5: Check Database Directly**

In Supabase Dashboard:

1. Go to **Table Editor**
2. Select `user_devices` table
3. Check if any rows exist

**Run this query:**

```sql
SELECT 
  id,
  user_id,
  fingerprint_id,
  device_name,
  browser_name,
  os_name,
  created_at,
  is_current
FROM user_devices
WHERE user_id = '475d9b83-3b30-406c-8220-b860c0c9a181'
ORDER BY created_at DESC;
```

**Expected**: You should see your device(s)  
**If empty**: Device registration didn't run or failed

---

## Common Issues & Fixes

### 🔴 **Issue 1: Table Doesn't Exist**

**Error**: `relation "public.user_devices" does not exist`

**Fix**:
```sql
-- Run the migration file in Supabase SQL Editor
-- Copy/paste contents of supabase-device-tracking.sql
```

---

### 🔴 **Issue 2: RLS Blocking Access**

**Error**: `row-level security policy for table "user_devices"`

**Fix**:
```sql
-- Check RLS is enabled
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Re-create policies (see migration file)
```

---

### 🔴 **Issue 3: Device Registration Not Running**

**Symptom**: No console logs, no errors

**Fix**:

1. Check sign-in component:

```typescript
// Should have this in signin.component.ts:
import { DeviceFingerprintService } from '../../../../core/services/device-fingerprint.service';

// And in the class:
private deviceFingerprint = inject(DeviceFingerprintService);

// And in onSubmit():
await this.deviceFingerprint.registerDevice(data.session.user.id);
```

2. Rebuild the app:

```bash
npm run build
# or
ng serve
```

---

### 🔴 **Issue 4: CORS Error**

**Error**: `CORS policy: No 'Access-Control-Allow-Origin'`

**Fix**: Not a device tracking issue - this is Supabase config. Check your Supabase URL and anon key.

---

### 🔴 **Issue 5: Fingerprint ID Changes**

**Symptom**: New device created every login

**Causes**:
- Incognito mode
- Browser updates
- Extensions blocking fingerprinting
- Cookie clearing

**Fix**: This is expected behavior. Use the "trust device" feature.

---

## Testing Checklist

Use this checklist to verify everything works:

- [ ] Migration ran successfully
- [ ] Table `user_devices` exists
- [ ] RLS policies are active
- [ ] Can query table in Supabase
- [ ] Console shows device registration logs
- [ ] Device appears in database after sign-in
- [ ] Device updates on subsequent logins
- [ ] Different browsers create different devices
- [ ] Can view devices in UI component

---

## Debug Commands

### Get Your Fingerprint ID
```javascript
// In browser console
import('@fingerprintjs/fingerprintjs').then(async (FP) => {
  const fp = await FP.default.load();
  const result = await fp.get();
  console.log('ID:', result.visitorId);
});
```

### Check Database
```sql
-- Count total devices
SELECT COUNT(*) FROM user_devices;

-- See all your devices
SELECT * FROM user_devices 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;

-- See devices from last 24 hours
SELECT * FROM user_devices 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Check RLS
```sql
-- Test if you can select
SELECT * FROM user_devices WHERE user_id = auth.uid();

-- Test if you can insert
INSERT INTO user_devices (user_id, fingerprint_id, device_name)
VALUES (auth.uid(), 'test-fingerprint', 'Test Device')
RETURNING *;

-- Clean up test
DELETE FROM user_devices WHERE fingerprint_id = 'test-fingerprint';
```

---

## Getting Help

### Information to Provide:

1. **Error message** (full text)
2. **Browser console logs** (all device tracking logs)
3. **Database query results** (does table exist?)
4. **RLS policy check** (do policies exist?)
5. **User ID** (from auth.uid())
6. **Fingerprint ID** (from browser console)

### Where to Look:

1. **Browser Console** (F12) - Device registration logs
2. **Network Tab** - API calls to Supabase
3. **Supabase Logs** - Database errors
4. **Table Editor** - Data inspection

---

## Quick Fixes

### Reset Everything

If nothing works, start fresh:

```sql
-- 1. Drop table (WARNING: Deletes all data!)
DROP TABLE IF EXISTS user_devices CASCADE;

-- 2. Re-run migration
-- Copy/paste supabase-device-tracking.sql

-- 3. Sign out and sign in again

-- 4. Check console logs
```

### Manually Create a Device

For testing:

```sql
INSERT INTO user_devices (
  user_id,
  fingerprint_id,
  device_name,
  device_type,
  browser_name,
  os_name,
  is_trusted,
  is_current
)
VALUES (
  'YOUR_USER_ID',
  'test-fingerprint-123',
  'Test Device',
  'desktop',
  'Chrome',
  'macOS',
  false,
  true
)
RETURNING *;
```

---

## Success Indicators

✅ **Everything is working when**:

1. Console shows device registration logs
2. No errors in browser console
3. Device appears in `user_devices` table
4. Device updates on subsequent logins
5. UI component shows your devices
6. Different browsers create different entries

---

## Still Not Working?

1. **Check this file**: `src/app/features/auth/pages/signin/signin.component.ts`
2. **Verify this line exists**: `await this.deviceFingerprint.registerDevice(data.session.user.id);`
3. **Restart dev server**: `npm run start`
4. **Clear browser cache**: Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
5. **Check Supabase dashboard**: Ensure table exists
6. **Review migration**: Compare with `supabase-device-tracking.sql`

---

## The PGRST116 Error Explained

```typescript
// This query looks for existing device
const { data: existingDevice, error: fetchError } = await supabase
  .from('user_devices')
  .select('*')
  .eq('user_id', userId)
  .eq('fingerprint_id', fingerprintId)
  .single();  // ← This expects exactly 1 row

// If 0 rows found → PGRST116 error (this is EXPECTED!)
// Our code handles it:
if (fetchError && fetchError.code !== 'PGRST116') {
  throw fetchError; // Only throw if it's NOT PGRST116
}

// PGRST116 means "no device found" - we create a new one!
```

**Bottom Line**: PGRST116 on first login is **completely normal and expected**! The code handles it automatically by creating a new device entry.
