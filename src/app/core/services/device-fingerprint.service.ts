import { Injectable, inject } from '@angular/core';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { SupabaseService } from './supabase.service';

export interface DeviceInfo {
    fingerprint_id: string;
    device_name?: string;
    device_type?: string;
    browser_name?: string;
    browser_version?: string;
    os_name?: string;
    os_version?: string;
    user_agent?: string;
    additional_data?: any;
}

export interface UserDevice {
    id: string;
    user_id: string;
    fingerprint_id: string;
    visitor_id?: string;
    device_name?: string;
    device_type?: string;
    browser_name?: string;
    browser_version?: string;
    os_name?: string;
    os_version?: string;
    ip_address?: string;
    country?: string;
    city?: string;
    first_seen_at: string;
    last_seen_at: string;
    last_login_at: string;
    is_trusted: boolean;
    is_current: boolean;
    user_agent?: string;
    additional_data?: any;
    created_at: string;
    updated_at: string;
}

@Injectable({
    providedIn: 'root',
})
export class DeviceFingerprintService {
    private supabase = inject(SupabaseService);
    private fingerprintPromise: Promise<any> | null = null;
    private currentFingerprint: string | null = null;

    constructor() { }

    /**
     * Initialize FingerprintJS and get the device fingerprint
     */
    async getDeviceFingerprint(): Promise<string> {
        // Return cached fingerprint if available
        if (this.currentFingerprint) {
            return this.currentFingerprint;
        }

        // If fingerprint generation is in progress, wait for it
        if (this.fingerprintPromise) {
            const result = await this.fingerprintPromise;
            return result.visitorId;
        }

        try {
            // Initialize FingerprintJS
            this.fingerprintPromise = FingerprintJS.load();
            const fp = await this.fingerprintPromise;

            // Get the visitor identifier
            const result = await fp.get();
            this.currentFingerprint = result.visitorId;

            return result.visitorId;
        } catch (error) {
            console.error('Error generating device fingerprint:', error);
            // Fallback to a random ID if fingerprinting fails
            this.currentFingerprint = this.generateFallbackId();
            return this.currentFingerprint;
        } finally {
            this.fingerprintPromise = null;
        }
    }

    /**
     * Get detailed device information including fingerprint
     */
    async getDeviceInfo(): Promise<DeviceInfo> {
        const fingerprintId = await this.getDeviceFingerprint();
        const userAgent = navigator.userAgent;

        return {
            fingerprint_id: fingerprintId,
            device_type: this.detectDeviceType(),
            browser_name: this.detectBrowser(),
            os_name: this.detectOS(),
            user_agent: userAgent,
            additional_data: {
                screen_resolution: `${window.screen.width}x${window.screen.height}`,
                color_depth: window.screen.colorDepth,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language,
                platform: navigator.platform,
            },
        };
    }

    /**
     * Register or update device for the current user
     */
    async registerDevice(userId: string, deviceInfo?: Partial<DeviceInfo>): Promise<UserDevice | null> {
        try {
            console.log('🔐 [Device Tracking] Starting device registration...');
            console.log('   User ID:', userId);

            const info = deviceInfo || (await this.getDeviceInfo());
            const fingerprintId = info.fingerprint_id || (await this.getDeviceFingerprint());

            console.log('   Fingerprint ID:', fingerprintId);
            console.log('   Device Info:', info);

            // Check if device already exists
            const { data: existingDevice, error: fetchError } = await this.supabase
                .from('user_devices')
                .select('*')
                .eq('user_id', userId)
                .eq('fingerprint_id', fingerprintId)
                .single();

            // Handle the case where no device exists (PGRST116 is expected)
            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('   ❌ Error checking for existing device:', fetchError);
                throw fetchError;
            }

            if (existingDevice) {
                console.log('   ✅ Device exists, updating...');
                // Update existing device
                const { data, error } = await this.supabase
                    .from('user_devices')
                    .update({
                        last_login_at: new Date().toISOString(),
                        is_current: true,
                        ...info,
                    })
                    .eq('id', existingDevice.id)
                    .select()
                    .single();

                if (error) throw error;
                console.log('   ✅ Device updated successfully:', data);
                return data;
            } else {
                console.log('   ✨ New device, creating entry...');
                // Create new device entry
                const { data, error } = await this.supabase
                    .from('user_devices')
                    .insert({
                        user_id: userId,
                        fingerprint_id: fingerprintId,
                        device_name: this.generateDeviceName(),
                        is_current: true,
                        is_trusted: false,
                        ...info,
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('   ❌ Error creating device:', error);
                    throw error;
                }
                console.log('   ✅ Device created successfully:', data);
                return data;
            }
        } catch (error) {
            console.error('❌ [Device Tracking] Error registering device:', error);
            return null;
        }
    }

    /**
     * Get all devices for a user
     */
    async getUserDevices(userId: string): Promise<UserDevice[]> {
        try {
            const { data, error } = await this.supabase
                .from('user_devices')
                .select('*')
                .eq('user_id', userId)
                .order('last_seen_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching user devices:', error);
            return [];
        }
    }

    /**
     * Get the current device
     */
    async getCurrentDevice(userId: string): Promise<UserDevice | null> {
        try {
            const fingerprintId = await this.getDeviceFingerprint();

            const { data, error } = await this.supabase
                .from('user_devices')
                .select('*')
                .eq('user_id', userId)
                .eq('fingerprint_id', fingerprintId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
            return data;
        } catch (error) {
            console.error('Error fetching current device:', error);
            return null;
        }
    }

    /**
     * Trust a device
     */
    async trustDevice(deviceId: string): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('user_devices')
                .update({ is_trusted: true })
                .eq('id', deviceId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error trusting device:', error);
            return false;
        }
    }

    /**
     * Remove a device
     */
    async removeDevice(deviceId: string): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('user_devices')
                .delete()
                .eq('id', deviceId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error removing device:', error);
            return false;
        }
    }

    /**
     * Update device name
     */
    async updateDeviceName(deviceId: string, name: string): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('user_devices')
                .update({ device_name: name })
                .eq('id', deviceId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating device name:', error);
            return false;
        }
    }

    /**
     * Check if current device is trusted
     */
    async isCurrentDeviceTrusted(userId: string): Promise<boolean> {
        const device = await this.getCurrentDevice(userId);
        return device?.is_trusted || false;
    }

    // Helper methods for device detection

    private detectDeviceType(): string {
        const ua = navigator.userAgent.toLowerCase();
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return 'tablet';
        }
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return 'mobile';
        }
        return 'desktop';
    }

    private detectBrowser(): string {
        const ua = navigator.userAgent;
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Edg')) return 'Edge';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
        if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
        return 'Unknown';
    }

    private detectOS(): string {
        const ua = navigator.userAgent;
        if (ua.includes('Win')) return 'Windows';
        if (ua.includes('Mac')) return 'macOS';
        if (ua.includes('Linux')) return 'Linux';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
        return 'Unknown';
    }

    private generateDeviceName(): string {
        const browser = this.detectBrowser();
        const os = this.detectOS();
        const deviceType = this.detectDeviceType();
        return `${browser} on ${os} (${deviceType})`;
    }

    private generateFallbackId(): string {
        // Generate a random fallback ID if fingerprinting fails
        return `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
}
