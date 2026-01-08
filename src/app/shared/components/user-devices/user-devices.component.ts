import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DeviceFingerprintService,
  UserDevice,
} from '../../../core/services/device-fingerprint.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormsModule } from '@angular/forms';
import { ConfirmModalComponent } from '../ui/dialog/confirm-modal.component';

@Component({
  selector: 'app-user-devices',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmModalComponent],
  template: `
    <div class="space-y-4">
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">Active Devices</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage devices where you're currently signed in
        </p>
      </div>

      @if (loading()) {
        <div class="text-center py-8">
          <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
          ></div>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading devices...</p>
        </div>
      } @else if (devices().length === 0) {
        <div class="text-center py-8">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No devices found</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (device of devices(); track device.id) {
            <div
              class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3">
                    <!-- Device Icon -->
                    <div class="flex-shrink-0">
                      @if (device.device_type === 'mobile') {
                        <svg
                          class="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      } @else if (device.device_type === 'tablet') {
                        <svg
                          class="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      } @else {
                        <svg
                          class="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      }
                    </div>

                    <div class="flex-1">
                      <!-- Device Name / Edit -->
                      @if (editingDeviceId() === device.id) {
                        <div class="flex items-center gap-2">
                          <input
                            type="text"
                            [(ngModel)]="editingDeviceName"
                            class="input input-sm text-sm"
                            placeholder="Device name"
                            (keyup.enter)="saveDeviceName(device.id)"
                            (keyup.escape)="cancelEdit()"
                          />
                          <button
                            (click)="saveDeviceName(device.id)"
                            class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            Save
                          </button>
                          <button
                            (click)="cancelEdit()"
                            class="text-gray-600 hover:text-gray-700 text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      } @else {
                        <div class="flex items-center gap-2">
                          <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ device.device_name || 'Unknown Device' }}
                          </h4>
                          <button
                            (click)="startEdit(device)"
                            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Edit device name"
                          >
                            <svg
                              class="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                          @if (device.is_current) {
                            <span
                              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                            >
                              Current
                            </span>
                          }
                          @if (device.is_trusted) {
                            <span
                              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            >
                              Trusted
                            </span>
                          }
                        </div>
                      }

                      <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <p>
                          {{ device.browser_name || 'Unknown' }} on
                          {{ device.os_name || 'Unknown' }}
                        </p>
                        <p class="mt-0.5">Last seen: {{ formatDate(device.last_seen_at) }}</p>
                        @if (device.country || device.city) {
                          <p class="mt-0.5">
                            Location: {{ device.city }}{{ device.city && device.country ? ', ' : ''
                            }}{{ device.country }}
                          </p>
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 ml-4">
                  @if (!device.is_trusted) {
                    <button
                      (click)="trustDevice(device.id)"
                      class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                      title="Trust this device"
                    >
                      Trust
                    </button>
                  }

                  @if (!device.is_current) {
                    <button
                      (click)="removeDevice(device.id)"
                      class="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                      title="Remove this device"
                    >
                      Remove
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    @if (showRemoveConfirm()) {
      <app-confirm-modal
        title="Remove Device"
        message="Are you sure you want to remove this device? You will need to sign in again from that device."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        (confirm)="onRemoveConfirm()"
        (cancel)="onRemoveCancel()"
      ></app-confirm-modal>
    }
  `,
  styles: [],
})
export class UserDevicesComponent implements OnInit {
  private deviceService = inject(DeviceFingerprintService);
  private authState = inject(AuthStateService);
  private toast = inject(ToastService);

  devices = signal<UserDevice[]>([]);
  loading = signal(true);
  editingDeviceId = signal<string | null>(null);
  editingDeviceName = '';

  showRemoveConfirm = signal<boolean>(false);
  deviceToRemoveId = signal<string | null>(null);

  async ngOnInit() {
    await this.loadDevices();
  }

  async loadDevices() {
    this.loading.set(true);
    try {
      const userId = this.authState.userId();
      if (userId) {
        const devices = await this.deviceService.getUserDevices(userId);
        this.devices.set(devices);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
      this.toast.error('Failed to load devices');
    } finally {
      this.loading.set(false);
    }
  }

  startEdit(device: UserDevice) {
    this.editingDeviceId.set(device.id);
    this.editingDeviceName = device.device_name || '';
  }

  cancelEdit() {
    this.editingDeviceId.set(null);
    this.editingDeviceName = '';
  }

  async saveDeviceName(deviceId: string) {
    if (!this.editingDeviceName.trim()) {
      this.toast.error('Device name cannot be empty');
      return;
    }

    try {
      const success = await this.deviceService.updateDeviceName(
        deviceId,
        this.editingDeviceName.trim(),
      );
      if (success) {
        this.toast.success('Device name updated');
        this.editingDeviceId.set(null);
        this.editingDeviceName = '';
        await this.loadDevices();
      } else {
        this.toast.error('Failed to update device name');
      }
    } catch (error) {
      console.error('Failed to update device name:', error);
      this.toast.error('Failed to update device name');
    }
  }

  async trustDevice(deviceId: string) {
    try {
      const success = await this.deviceService.trustDevice(deviceId);
      if (success) {
        this.toast.success('Device trusted');
        await this.loadDevices();
      } else {
        this.toast.error('Failed to trust device');
      }
    } catch (error) {
      console.error('Failed to trust device:', error);
      this.toast.error('Failed to trust device');
    }
  }

  removeDevice(deviceId: string) {
    this.deviceToRemoveId.set(deviceId);
    this.showRemoveConfirm.set(true);
  }

  async onRemoveConfirm() {
    const deviceId = this.deviceToRemoveId();
    if (!deviceId) return;

    try {
      const success = await this.deviceService.removeDevice(deviceId);
      if (success) {
        this.toast.success('Device removed');
        await this.loadDevices();
      } else {
        this.toast.error('Failed to remove device');
      }
    } catch (error) {
      console.error('Failed to remove device:', error);
      this.toast.error('Failed to remove device');
    } finally {
      this.showRemoveConfirm.set(false);
      this.deviceToRemoveId.set(null);
    }
  }

  onRemoveCancel() {
    this.showRemoveConfirm.set(false);
    this.deviceToRemoveId.set(null);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}
