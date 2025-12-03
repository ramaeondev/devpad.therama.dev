# Device Fingerprinting Integration Guide

## Overview

This application now integrates **FingerprintJS** to track and manage user devices and sessions. This provides enhanced security, better session management, and improved user experience.

## Features

### 🔐 Security
- Track all devices where a user is logged in
- Detect suspicious logins from new devices
- Allow users to trust specific devices
- Remote device session management

### 📱 Device Management
- Automatic device detection (mobile, tablet, desktop)
- Browser and OS identification
- Device naming and customization
- Last seen timestamp tracking
- Current device highlighting

### 🎯 Use Cases
1. **Security Monitoring**: Alert users when logging in from a new device
2. **Session Management**: View and revoke access from specific devices
3. **Device Trust**: Mark frequently used devices as trusted
4. **Analytics**: Understand which devices users prefer

## Database Schema

### `user_devices` Table

```sql
CREATE TABLE user_devices (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Fingerprint
  fingerprint_id TEXT NOT NULL,
  visitor_id TEXT,
  
  -- Device Info
  device_name TEXT,
  device_type TEXT,  -- mobile, tablet, desktop
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  os_version TEXT,
  
  -- Location (optional)
  ip_address INET,
  country TEXT,
  city TEXT,
  
  -- Session
  first_seen_at TIMESTAMP,
  last_seen_at TIMESTAMP,
  last_login_at TIMESTAMP,
  
  -- Security
  is_trusted BOOLEAN DEFAULT false,
  is_current BOOLEAN DEFAULT false,
  
  -- Metadata
  user_agent TEXT,
  additional_data JSONB,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE(user_id, fingerprint_id)
);
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @fingerprintjs/fingerprintjs
```

### 2. Run Database Migration

Execute the SQL migration to create the `user_devices` table:

```bash
# In your Supabase dashboard:
# SQL Editor > New Query > Paste contents of supabase-device-tracking.sql
```

Or use the Supabase CLI:

```bash
supabase db push
```

### 3. Integration Points

The device fingerprinting is automatically integrated in:

- ✅ **Sign In** (`signin.component.ts`) - Registers device on login
- ✅ **Sign Up** (`signup.component.ts`) - Registers device on account creation
- ✅ **App Initialization** - Can be added to check device trust level

## Usage

### In Your Components

#### 1. Get Device Fingerprint

```typescript
import { DeviceFingerprintService } from '@core/services/device-fingerprint.service';

export class MyComponent {
  private deviceService = inject(DeviceFingerprintService);
  
  async checkDevice() {
    const fingerprint = await this.deviceService.getDeviceFingerprint();
    console.log('Device fingerprint:', fingerprint);
  }
}
```

#### 2. Register a Device

```typescript
async onLogin(userId: string) {
  // Automatically registers or updates device
  const device = await this.deviceService.registerDevice(userId);
  
  if (device && !device.is_trusted) {
    // Show "New device detected" warning
    this.showNewDeviceWarning();
  }
}
```

#### 3. Get User Devices

```typescript
async loadDevices(userId: string) {
  const devices = await this.deviceService.getUserDevices(userId);
  console.log('User has', devices.length, 'devices');
}
```

#### 4. Check Current Device Trust

```typescript
async checkTrust(userId: string) {
  const isTrusted = await this.deviceService.isCurrentDeviceTrusted(userId);
  
  if (!isTrusted) {
    // Require additional verification
    this.requireTwoFactorAuth();
  }
}
```

#### 5. Trust a Device

```typescript
async trustThisDevice(deviceId: string) {
  await this.deviceService.trustDevice(deviceId);
  this.toast.success('Device marked as trusted');
}
```

#### 6. Remove a Device

```typescript
async removeDevice(deviceId: string) {
  await this.deviceService.removeDevice(deviceId);
  this.toast.success('Device removed');
}
```

### Using the User Devices Component

Add the device management UI to your settings page:

```typescript
import { UserDevicesComponent } from '@shared/components/user-devices/user-devices.component';

@Component({
  imports: [UserDevicesComponent],
  template: `
    <div class="settings-section">
      <app-user-devices></app-user-devices>
    </div>
  `
})
export class SettingsComponent {}
```

## Advanced Features

### 1. Device Detection Methods

The service automatically detects:

```typescript
// Device Type
detectDeviceType(): 'mobile' | 'tablet' | 'desktop'

// Browser
detectBrowser(): 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Opera'

// Operating System
detectOS(): 'Windows' | 'macOS' | 'Linux' | 'Android' | 'iOS'
```

### 2. Additional Device Info

Get comprehensive device information:

```typescript
const deviceInfo = await this.deviceService.getDeviceInfo();

console.log(deviceInfo);
// {
//   fingerprint_id: "abc123...",
//   device_type: "desktop",
//   browser_name: "Chrome",
//   os_name: "macOS",
//   user_agent: "Mozilla/5.0...",
//   additional_data: {
//     screen_resolution: "1920x1080",
//     color_depth: 24,
//     timezone: "America/New_York",
//     language: "en-US",
//     platform: "MacIntel"
//   }
// }
```

### 3. Custom Device Naming

```typescript
// Update device name
await this.deviceService.updateDeviceName(deviceId, "My MacBook Pro");
```

### 4. Get Current Device

```typescript
const currentDevice = await this.deviceService.getCurrentDevice(userId);

if (currentDevice) {
  console.log('Current device:', currentDevice.device_name);
  console.log('Is trusted:', currentDevice.is_trusted);
}
```

## Security Best Practices

### 1. New Device Alerts

Notify users when they log in from a new device:

```typescript
async onLogin(userId: string) {
  const device = await this.deviceService.registerDevice(userId);
  
  if (device && !device.is_trusted) {
    // Send email notification
    await this.emailService.sendNewDeviceAlert(userId, device);
    
    // Show in-app notification
    this.toast.warning('New device detected. Please verify this login.');
  }
}
```

### 2. Require Trust for Sensitive Actions

```typescript
async performSensitiveAction(userId: string) {
  const isTrusted = await this.deviceService.isCurrentDeviceTrusted(userId);
  
  if (!isTrusted) {
    throw new Error('This action requires a trusted device');
  }
  
  // Proceed with sensitive action
}
```

### 3. Auto-expire Old Devices

Create a scheduled job to remove devices not seen in 90 days:

```sql
-- Remove devices not seen in 90 days
DELETE FROM user_devices
WHERE last_seen_at < NOW() - INTERVAL '90 days'
  AND is_trusted = false;
```

### 4. Device Limit per User

Implement a maximum device limit:

```typescript
async registerDevice(userId: string) {
  const devices = await this.getUserDevices(userId);
  
  if (devices.length >= MAX_DEVICES_PER_USER) {
    throw new Error('Maximum device limit reached. Please remove an old device.');
  }
  
  // Register new device
}
```

## API Reference

### DeviceFingerprintService Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getDeviceFingerprint()` | Get unique device fingerprint | `Promise<string>` |
| `getDeviceInfo()` | Get detailed device information | `Promise<DeviceInfo>` |
| `registerDevice(userId, deviceInfo?)` | Register or update device | `Promise<UserDevice \| null>` |
| `getUserDevices(userId)` | Get all user devices | `Promise<UserDevice[]>` |
| `getCurrentDevice(userId)` | Get current device | `Promise<UserDevice \| null>` |
| `trustDevice(deviceId)` | Mark device as trusted | `Promise<boolean>` |
| `removeDevice(deviceId)` | Remove device | `Promise<boolean>` |
| `updateDeviceName(deviceId, name)` | Update device name | `Promise<boolean>` |
| `isCurrentDeviceTrusted(userId)` | Check if current device is trusted | `Promise<boolean>` |

## Troubleshooting

### Issue: Fingerprint changes on browser updates

**Solution**: FingerprintJS generates stable fingerprints, but major browser updates might change them. Consider:
- Using FingerprintJS Pro for more stable fingerprints
- Implementing a grace period for fingerprint changes
- Allowing users to re-verify their device

### Issue: Fingerprinting fails

**Solution**: The service has a fallback mechanism that generates a random ID if fingerprinting fails. This ensures the app continues to work even if FingerprintJS is blocked.

### Issue: Privacy concerns

**Solution**: 
- Be transparent in your Privacy Policy
- Allow users to opt out of device tracking
- Only collect necessary device information
- Regularly clean up old device data

## Privacy Considerations

1. **Transparency**: Inform users about device tracking in your Privacy Policy
2. **Data Minimization**: Only collect necessary device information
3. **User Control**: Allow users to view and delete their device data
4. **Secure Storage**: All device data is protected with RLS policies
5. **Regular Cleanup**: Implement data retention policies

## Future Enhancements

Consider implementing:

1. **Two-Factor Authentication**: Require 2FA for new devices
2. **Geolocation**: Add location-based security checks
3. **Risk Scoring**: Calculate device risk based on behavior
4. **Session Management**: Track multiple concurrent sessions
5. **Device Notifications**: Push notifications on device changes
6. **FingerprintJS Pro**: Upgrade for more accurate fingerprints

## Resources

- [FingerprintJS Documentation](https://dev.fingerprintjs.com/docs)
- [FingerprintJS Pro](https://fingerprint.com/) - More accurate, server-side identification
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Support

For issues or questions:
1. Check the device fingerprint service logs
2. Verify the database migration was successful
3. Ensure FingerprintJS is properly loaded
4. Review browser console for errors
