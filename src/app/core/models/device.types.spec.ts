import { DEVICE_CONSTANTS, isValidDeviceType, isUserDevice } from './device.types';

describe('device.types', () => {
  describe('DEVICE_CONSTANTS', () => {
    it('exposes expected numeric constants and arrays', () => {
      expect(DEVICE_CONSTANTS.MAX_DEVICES_PER_USER).toBe(10);
      expect(DEVICE_CONSTANTS.DEVICE_TYPES).toEqual(['mobile', 'tablet', 'desktop']);
      expect(DEVICE_CONSTANTS.BROWSERS).toContain('Chrome');
      expect(DEVICE_CONSTANTS.RISK_LEVELS.LOW).toBe('low');
    });
  });

  describe('isValidDeviceType', () => {
    it('returns true for valid device types', () => {
      expect(isValidDeviceType('mobile')).toBe(true);
      expect(isValidDeviceType('tablet')).toBe(true);
      expect(isValidDeviceType('desktop')).toBe(true);
    });

    it('returns false for invalid types', () => {
      expect(isValidDeviceType('phone')).toBe(false);
      expect(isValidDeviceType('')).toBe(false);
      expect(isValidDeviceType('undefined' as unknown as string)).toBe(false);
    });
  });

  describe('isUserDevice', () => {
    it('returns true for a valid UserDevice-like object', () => {
      const valid = {
        id: '1',
        user_id: 'u1',
        fingerprint_id: 'f1',
        is_trusted: false,
        is_current: true,
      };
      expect(isUserDevice(valid)).toBe(true);
    });

    it('returns false for missing or wrong typed properties', () => {
      const missing = { id: '1', user_id: 'u1' };
      expect(isUserDevice(missing)).toBe(false);

      const wrongTypes = {
        id: 1,
        user_id: 'u1',
        fingerprint_id: 'f1',
        is_trusted: 'no',
        is_current: 'yes',
      };
      expect(isUserDevice(wrongTypes)).toBe(false);

      expect(isUserDevice(null)).toBe(false);
      expect(isUserDevice(undefined)).toBe(false);
    });
  });
});
