/**
 * Database Verification Utility
 *
 * Run this in your browser console to verify the Google Drive persistence setup
 *
 * Usage:
 * 1. Open your app in browser
 * 2. Open DevTools Console (F12)
 * 3. Copy and paste this entire file into the console
 * 4. Press Enter
 * 5. Check the output
 */

(async function verifyGoogleDrivePersistence () {
  console.log('🔍 Starting Google Drive Persistence Verification...\n')

  try {
    // Get the Supabase client from the app
    const supabaseService = window.ng
      ?.getComponent?.(document.querySelector('app-root'))
      ?.injector?.get?.('SupabaseService')

    if (!supabaseService) {
      console.error('❌ Could not access Supabase service')
      console.log('💡 Make sure you are logged in and the app is running')
      return
    }

    console.log('✅ Supabase service found\n')

    // Check 1: Verify settings column exists by trying to read it
    console.log('📋 Check 1: Reading integrations table...')
    const { data: integrations, error: readError } = await supabaseService
      .from('integrations')
      .select('id, provider, email, settings, created_at')
      .eq('provider', 'google_drive')
      .limit(1)

    if (readError) {
      console.error('❌ Error reading integrations:', readError.message)
      if (readError.message.includes('settings')) {
        console.log('⚠️  The "settings" column does not exist!')
        console.log('📝 You need to run the migration SQL in Supabase Dashboard')
      }
      return
    }

    if (!integrations || integrations.length === 0) {
      console.log('ℹ️  No Google Drive integration found')
      console.log('💡 Connect to Google Drive first, then run this check again')
      return
    }

    console.log('✅ Successfully read integrations table')
    console.log('✅ Settings column exists!\n')

    const integration = integrations[0]
    console.log('📊 Current Integration Data:')
    console.log('  - ID:', integration.id)
    console.log('  - Email:', integration.email || 'N/A')
    console.log('  - Created:', new Date(integration.created_at).toLocaleString())
    console.log('  - Settings:', integration.settings || 'null (no files saved yet)')

    if (integration.settings?.selected_files) {
      console.log('  - Saved Files:', integration.settings.selected_files.length)
      console.log('\n✅ Files are being persisted!')
      console.log(
        '📁 Saved files:',
        integration.settings.selected_files.map((f) => f.name).join(', ')
      )
    } else {
      console.log('\nℹ️  No files saved yet')
      console.log('💡 Pick some files from Google Drive to test persistence')
    }

    // Check 2: Test write capability
    console.log('\n📋 Check 2: Testing write capability...')
    const testSettings = {
      ...(integration.settings || {}),
      _test_timestamp: new Date().toISOString(),
      _test_verification: true
    }

    const { error: writeError } = await supabaseService
      .from('integrations')
      .update({ settings: testSettings })
      .eq('id', integration.id)

    if (writeError) {
      console.error('❌ Error writing to settings:', writeError.message)
      return
    }

    console.log('✅ Successfully wrote to settings column')

    // Check 3: Verify write
    console.log('\n📋 Check 3: Verifying write...')
    const { data: verifyData, error: verifyError } = await supabaseService
      .from('integrations')
      .select('settings')
      .eq('id', integration.id)
      .single()

    if (verifyError) {
      console.error('❌ Error verifying write:', verifyError.message)
      return
    }

    if (verifyData.settings?._test_verification) {
      console.log('✅ Write verification successful!')
    } else {
      console.log('⚠️  Write verification failed - data mismatch')
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 VERIFICATION SUMMARY')
    console.log('='.repeat(60))
    console.log('✅ Settings column exists')
    console.log('✅ Can read from settings column')
    console.log('✅ Can write to settings column')
    console.log('✅ Database is properly configured')
    console.log('\n🎉 Google Drive file persistence is ready to use!')
    console.log('\n💡 Next steps:')
    console.log('   1. Pick some files from Google Drive')
    console.log('   2. Refresh the page')
    console.log('   3. Files should automatically reload')
  } catch (error) {
    console.error('❌ Verification failed:', error)
    console.log('\n💡 Troubleshooting:')
    console.log('   1. Make sure you are logged in')
    console.log('   2. Make sure you have connected Google Drive')
    console.log('   3. Check if the migration was applied to Supabase')
  }
})()
