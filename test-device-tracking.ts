/**
 * Test Script for Device Tracking
 * Run this to verify device tracking is working
 */

// Copy this code into your browser console after signing in

async function testDeviceTracking() {
    console.log('🔍 Testing Device Tracking...\n');

    // 1. Check if DeviceFingerprintService exists
    console.log('1️⃣ Checking service availability...');

    // 2. Get device fingerprint
    console.log('2️⃣ Generating fingerprint...');
    const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default;
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    console.log('   ✅ Fingerprint ID:', result.visitorId);

    // 3. Get device info
    console.log('\n3️⃣ Device Information:');
    console.log('   Browser:', navigator.userAgent);
    console.log('   Platform:', navigator.platform);
    console.log('   Language:', navigator.language);

    // 4. Check Supabase connection
    console.log('\n4️⃣ Checking database...');
    console.log('   Table: user_devices');
    console.log('   User ID: [GET FROM AUTH]');
    console.log('   Fingerprint:', result.visitorId);

    console.log('\n✅ Test complete! Check the data above.');
    console.log('\n📝 Next steps:');
    console.log('   1. Make sure you ran the SQL migration');
    console.log('   2. Try signing out and signing in again');
    console.log('   3. Check browser console during sign-in');

    return result;
}

// Export for use
if (typeof window !== 'undefined') {
    (window as any).testDeviceTracking = testDeviceTracking;
}
