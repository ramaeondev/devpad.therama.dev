import { TestBed } from '@angular/core/testing';
import { UserDevicesComponent } from './user-devices.component';

class MockDeviceService {
  async getUserDevices() { return []; }
  async updateDeviceName() { return true; }
  async trustDevice() { return true; }
  async removeDevice() { return true; }
}
class MockAuthState { userId() { return 'user-1'; } }
class MockToast { success = jest.fn(); error = jest.fn(); }

describe('UserDevicesComponent', () => {
  it('shows empty state when no devices', async () => {
    await TestBed.configureTestingModule({ imports: [UserDevicesComponent], providers: [ { provide: (await import('../../../core/services/device-fingerprint.service')).DeviceFingerprintService, useClass: MockDeviceService }, { provide: (await import('../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuthState }, { provide: (await import('../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(UserDevicesComponent);
    fixture.detectChanges();
    // wait for async loadDevices to complete
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No devices found');
  });

  it('startEdit sets editing id and name', async () => {
    await TestBed.configureTestingModule({ imports: [UserDevicesComponent], providers: [ { provide: (await import('../../../core/services/device-fingerprint.service')).DeviceFingerprintService, useClass: MockDeviceService }, { provide: (await import('../../../core/services/auth-state.service')).AuthStateService, useClass: MockAuthState }, { provide: (await import('../../../core/services/toast.service')).ToastService, useClass: MockToast } ] }).compileComponents();
    const fixture = TestBed.createComponent(UserDevicesComponent);
    const comp = fixture.componentInstance;

    const device = { id: 'd1', device_name: 'Phone' } as any;
    comp.startEdit(device);
    expect(comp.editingDeviceId()).toBe('d1');
    expect(comp.editingDeviceName).toBe('Phone');
  });
});