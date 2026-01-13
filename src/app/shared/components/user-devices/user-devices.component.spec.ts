import { TestBed } from '@angular/core/testing';
import { UserDevicesComponent } from './user-devices.component';

class MockDeviceService {
  async getUserDevices() {
    return [];
  }
  async updateDeviceName() {
    return true;
  }
  async trustDevice() {
    return true;
  }
  async removeDevice() {
    return true;
  }
}
class MockAuthState {
  userId() {
    return 'user-1';
  }
}
class MockToast {
  success = jest.fn();
  error = jest.fn();
}

describe('UserDevicesComponent', () => {
  it('shows empty state when no devices', async () => {
    await TestBed.configureTestingModule({
      imports: [UserDevicesComponent],
      providers: [
        {
          provide: (await import('../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useClass: MockDeviceService,
        },
        {
          provide: (await import('../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(UserDevicesComponent);
    fixture.detectChanges();
    // wait for async loadDevices to complete
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No devices found');
  });

  it('startEdit sets editing id and name', async () => {
    await TestBed.configureTestingModule({
      imports: [UserDevicesComponent],
      providers: [
        {
          provide: (await import('../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useClass: MockDeviceService,
        },
        {
          provide: (await import('../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(UserDevicesComponent);
    const comp = fixture.componentInstance;

    const device = { id: 'd1', device_name: 'Phone' } as any;
    comp.startEdit(device);
    expect(comp.editingDeviceId()).toBe('d1');
    expect(comp.editingDeviceName).toBe('Phone');
  });

  it('loadDevices sets devices and shows actions', async () => {
    const devices = [
      {
        id: 'd1',
        device_name: 'MyPhone',
        is_trusted: false,
        is_current: false,
        browser_name: 'Chrome',
        os_name: 'iOS',
        last_seen_at: new Date().toISOString(),
        city: 'NY',
        country: 'US',
      },
    ];
    const mock: any = {
      getUserDevices: jest.fn().mockResolvedValue(devices),
      updateDeviceName: jest.fn().mockResolvedValue(true),
      trustDevice: jest.fn().mockResolvedValue(true),
      removeDevice: jest.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [UserDevicesComponent],
      providers: [
        {
          provide: (await import('../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useValue: mock,
        },
        {
          provide: (await import('../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UserDevicesComponent);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('MyPhone');
    expect(fixture.nativeElement.textContent).toContain('Trust');
    expect(fixture.nativeElement.textContent).toContain('Remove');
  });

  it('loadDevices handles error and shows toast', async () => {
    const mock: any = { getUserDevices: jest.fn().mockRejectedValue(new Error('fail')) };
    const toast = { success: jest.fn(), error: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [UserDevicesComponent],
      providers: [
        {
          provide: (await import('../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useValue: mock,
        },
        {
          provide: (await import('../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../core/services/toast.service')).ToastService,
          useValue: toast,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UserDevicesComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));

    expect(toast.error).toHaveBeenCalledWith('Failed to load devices');
    expect(comp.devices().length).toBe(0);
    expect(comp.loading()).toBe(false);
  });

  it('saveDeviceName early-returns on empty name', async () => {
    const mock: any = { updateDeviceName: jest.fn() };
    const toast = { success: jest.fn(), error: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [UserDevicesComponent],
      providers: [
        {
          provide: (await import('../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useValue: mock,
        },
        {
          provide: (await import('../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../core/services/toast.service')).ToastService,
          useValue: toast,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UserDevicesComponent);
    const comp = fixture.componentInstance;

    comp.editingDeviceId.set('d1');
    comp.editingDeviceName = '   ';

    await comp.saveDeviceName('d1');
    expect(toast.error).toHaveBeenCalledWith('Device name cannot be empty');
    expect(mock.updateDeviceName).not.toHaveBeenCalled();
  });

  it('saveDeviceName success path updates and reloads', async () => {
    const mock: any = {
      updateDeviceName: jest.fn().mockResolvedValue(true),
      getUserDevices: jest.fn().mockResolvedValue([]),
    };
    const toast = { success: jest.fn(), error: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [UserDevicesComponent],
      providers: [
        {
          provide: (await import('../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useValue: mock,
        },
        {
          provide: (await import('../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../core/services/toast.service')).ToastService,
          useValue: toast,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UserDevicesComponent);
    const comp = fixture.componentInstance;

    comp.editingDeviceId.set('d1');
    comp.editingDeviceName = 'NewName';

    await comp.saveDeviceName('d1');
    expect(toast.success).toHaveBeenCalledWith('Device name updated');
    expect(comp.editingDeviceId()).toBeNull();
    expect(comp.editingDeviceName).toBe('');
    expect(mock.getUserDevices).toHaveBeenCalled();
  });

  it('saveDeviceName failure shows toast', async () => {
    const mockFalse: any = { updateDeviceName: jest.fn().mockResolvedValue(false) };
    const toast1 = { success: jest.fn(), error: jest.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [UserDevicesComponent],
      providers: [
        {
          provide: (await import('../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useValue: mockFalse,
        },
        {
          provide: (await import('../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../core/services/toast.service')).ToastService,
          useValue: toast1,
        },
      ],
    }).compileComponents();

    const fixture1 = TestBed.createComponent(UserDevicesComponent);
    const comp1 = fixture1.componentInstance;
    comp1.editingDeviceId.set('d1');
    comp1.editingDeviceName = 'Name';
    await comp1.saveDeviceName('d1');
    expect(toast1.error).toHaveBeenCalledWith('Failed to update device name');
  });

  it('saveDeviceName exception shows toast', async () => {
    const mockErr: any = { updateDeviceName: jest.fn().mockRejectedValue(new Error('boom')) };
    const toast2 = { success: jest.fn(), error: jest.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [UserDevicesComponent],
      providers: [
        {
          provide: (await import('../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useValue: mockErr,
        },
        {
          provide: (await import('../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../core/services/toast.service')).ToastService,
          useValue: toast2,
        },
      ],
    }).compileComponents();

    const fixture2 = TestBed.createComponent(UserDevicesComponent);
    const comp2 = fixture2.componentInstance;
    comp2.editingDeviceId.set('d1');
    comp2.editingDeviceName = 'Name';
    await comp2.saveDeviceName('d1');
    expect(toast2.error).toHaveBeenCalledWith('Failed to update device name');
  });

  it('trustDevice success shows toast and reloads', async () => {
    const mockOK: any = {
      trustDevice: jest.fn().mockResolvedValue(true),
      getUserDevices: jest.fn().mockResolvedValue([]),
    };
    const toastOK = { success: jest.fn(), error: jest.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [UserDevicesComponent],
      providers: [
        {
          provide: (await import('../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useValue: mockOK,
        },
        {
          provide: (await import('../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../core/services/toast.service')).ToastService,
          useValue: toastOK,
        },
      ],
    }).compileComponents();

    const fixtureOK = TestBed.createComponent(UserDevicesComponent);
    const compOK = fixtureOK.componentInstance;
    await compOK.trustDevice('d1');
    expect(toastOK.success).toHaveBeenCalledWith('Device trusted');
    expect(mockOK.getUserDevices).toHaveBeenCalled();
  });

  it('trustDevice failure shows error toast', async () => {
    const mockFail: any = { trustDevice: jest.fn().mockResolvedValue(false) };
    const toastFail = { success: jest.fn(), error: jest.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [UserDevicesComponent],
      providers: [
        {
          provide: (await import('../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useValue: mockFail,
        },
        {
          provide: (await import('../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../core/services/toast.service')).ToastService,
          useValue: toastFail,
        },
      ],
    }).compileComponents();

    const fixtureFail = TestBed.createComponent(UserDevicesComponent);
    const compFail = fixtureFail.componentInstance;
    await compFail.trustDevice('d1');
    expect(toastFail.error).toHaveBeenCalledWith('Failed to trust device');
  });

  it('trustDevice exception shows error toast', async () => {
    const mockErr: any = { trustDevice: jest.fn().mockRejectedValue(new Error('err')) };
    const toastErr = { success: jest.fn(), error: jest.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [UserDevicesComponent],
      providers: [
        {
          provide: (await import('../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useValue: mockErr,
        },
        {
          provide: (await import('../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../core/services/toast.service')).ToastService,
          useValue: toastErr,
        },
      ],
    }).compileComponents();

    const fixtureErr = TestBed.createComponent(UserDevicesComponent);
    const compErr = fixtureErr.componentInstance;
    await compErr.trustDevice('d1');
    expect(toastErr.error).toHaveBeenCalledWith('Failed to trust device');
  });

  it('removeDevice sets confirm flags and onRemoveConfirm flows', async () => {
    const mock: any = {
      removeDevice: jest.fn().mockResolvedValue(true),
      getUserDevices: jest.fn().mockResolvedValue([]),
    };
    const toast = { success: jest.fn(), error: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [UserDevicesComponent],
      providers: [
        {
          provide: (await import('../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useValue: mock,
        },
        {
          provide: (await import('../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../core/services/toast.service')).ToastService,
          useValue: toast,
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UserDevicesComponent);
    const comp = fixture.componentInstance;

    comp.removeDevice('d1');
    expect(comp.deviceToRemoveId()).toBe('d1');
    expect(comp.showRemoveConfirm()).toBe(true);

    // success
    await comp.onRemoveConfirm();
    expect(toast.success).toHaveBeenCalledWith('Device removed');
    expect(comp.deviceToRemoveId()).toBeNull();
    expect(comp.showRemoveConfirm()).toBe(false);

    // failure
    mock.removeDevice = jest.fn().mockResolvedValue(false);
    comp.deviceToRemoveId.set('d2');
    comp.showRemoveConfirm.set(true);
    await comp.onRemoveConfirm();
    expect(toast.error).toHaveBeenCalledWith('Failed to remove device');

    // error
    mock.removeDevice = jest.fn().mockRejectedValue(new Error('boom'));
    comp.deviceToRemoveId.set('d3');
    comp.showRemoveConfirm.set(true);
    await comp.onRemoveConfirm();
    expect(toast.error).toHaveBeenCalledWith('Failed to remove device');

    // cancel
    comp.deviceToRemoveId.set('d4');
    comp.showRemoveConfirm.set(true);
    comp.onRemoveCancel();
    expect(comp.deviceToRemoveId()).toBeNull();
    expect(comp.showRemoveConfirm()).toBe(false);
  });

  it('formatDate handles multiple ranges', async () => {
    await TestBed.configureTestingModule({
      imports: [UserDevicesComponent],
      providers: [
        {
          provide: (await import('../../../core/services/device-fingerprint.service'))
            .DeviceFingerprintService,
          useClass: MockDeviceService,
        },
        {
          provide: (await import('../../../core/services/auth-state.service')).AuthStateService,
          useClass: MockAuthState,
        },
        {
          provide: (await import('../../../core/services/toast.service')).ToastService,
          useClass: MockToast,
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(UserDevicesComponent);
    const comp = fixture.componentInstance;

    expect(comp.formatDate(new Date(Date.now() - 30 * 1000).toISOString())).toBe('Just now');
    expect(comp.formatDate(new Date(Date.now() - 5 * 60 * 1000).toISOString())).toContain(
      '5 minute',
    );
    expect(comp.formatDate(new Date(Date.now() - 2 * 3600 * 1000).toISOString())).toContain(
      '2 hour',
    );
    expect(comp.formatDate(new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString())).toContain(
      '3 day',
    );

    const old = new Date(2019, 0, 15).toISOString();
    const formatted = comp.formatDate(old);
    expect(formatted).toMatch(/Jan\s+15/);
    expect(formatted).toContain('2019');
  });
});
