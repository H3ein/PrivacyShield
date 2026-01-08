// Storage module tests
import * as storage from '../../../src/core/storage.js';
import { DEFAULT_SETTINGS } from '../../../src/core/constants.js';

// Mock Chrome storage API
const mockChromeStorage = {
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn()
};

// Mock chrome global
global.chrome = {
  storage: {
    local: mockChromeStorage
  }
};

describe('Storage Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock implementations
    mockChromeStorage.get.mockResolvedValue({});
    mockChromeStorage.set.mockResolvedValue(undefined);
    mockChromeStorage.remove.mockResolvedValue(undefined);
    mockChromeStorage.clear.mockResolvedValue(undefined);
    
    // Ensure chrome global is properly mocked
    global.chrome = {
      storage: {
        local: mockChromeStorage
      }
    };
  });

  describe('get()', () => {
    it('should return stored value for valid key', async () => {
      const testData = { testKey: 'testValue' };
      mockChromeStorage.get.mockResolvedValue(testData);

      const result = await storage.get('testKey');
      
      expect(mockChromeStorage.get).toHaveBeenCalledWith('testKey');
      expect(result).toBe('testValue');
    });

    it('should return all stored data when no key provided', async () => {
      const testData = { key1: 'value1', key2: 'value2' };
      mockChromeStorage.get.mockResolvedValue(testData);

      const result = await storage.get();
      
      expect(mockChromeStorage.get).toHaveBeenCalledWith(null);
      expect(result).toEqual(testData);
    });

    it('should return safe defaults when Chrome API unavailable', async () => {
      global.chrome = null;

      const result = await storage.get('enabled');
      
      expect(result).toBeNull(); // Storage API returns null for enabled when unavailable
    });

    it('should return undefined for unknown key on error', async () => {
      mockChromeStorage.get.mockRejectedValue(new Error('Storage error'));

      const result = await storage.get('unknownKey');
      
      expect(result).toBeUndefined();
    });

    it('should return safe defaults for common keys on error', async () => {
      mockChromeStorage.get.mockRejectedValue(new Error('Storage error'));

      const enabledResult = await storage.get('enabled');
      const fingerprintResult = await storage.get('fingerprintProtection');
      
      expect(enabledResult).toBeNull(); // enabled defaults to null when unavailable
      expect(fingerprintResult).toBe(true); // fingerprintProtection defaults to true
    });
  });

  describe('set()', () => {
    it('should store valid items', async () => {
      const items = { key1: 'value1', key2: 'value2' };
      
      await storage.set(items);
      
      expect(mockChromeStorage.set).toHaveBeenCalledWith(items);
    });

    it('should reject invalid items', async () => {
      await storage.set(null);
      await storage.set(undefined);
      await storage.set('invalid');
      
      expect(mockChromeStorage.set).not.toHaveBeenCalled();
    });

    it('should filter out invalid keys', async () => {
      const items = { validKey: 'value', '': 'empty', 123: 'number' };
      
      await storage.set(items);
      
      expect(mockChromeStorage.set).toHaveBeenCalledWith({ validKey: 'value' });
    });

    it('should handle Chrome API errors gracefully', async () => {
      mockChromeStorage.set.mockRejectedValue(new Error('Storage error'));
      
      const result = await storage.set({ key: 'value' });
      expect(result).toBe(false); // Should return false on error
    });
  });

  describe('getSettings()', () => {
    it('should return merged settings with defaults', async () => {
      const storedSettings = { enabled: false, customSetting: 'custom' };
      mockChromeStorage.get.mockResolvedValue(storedSettings);

      const result = await storage.getSettings();
      
      // The storage module preserves enabled: false when explicitly set
      expect(result.enabled).toBe(false);
      expect(result.blockAds).toBe(DEFAULT_SETTINGS.blockAds);
      expect(result.blockTrackers).toBe(DEFAULT_SETTINGS.blockTrackers);
      expect(result.fingerprintProtection).toBe(DEFAULT_SETTINGS.fingerprintProtection);
    });

    it('should validate critical settings', async () => {
      const invalidSettings = { 
        enabled: 'not-boolean', 
        fingerprintProtection: null,
        whitelistedDomains: 'not-array'
      };
      mockChromeStorage.get.mockResolvedValue(invalidSettings);

      const result = await storage.getSettings();
      
      // enabled should remain default when invalid type
      expect(result.enabled).toBe(DEFAULT_SETTINGS.enabled);
      expect(result.fingerprintProtection).toBe(DEFAULT_SETTINGS.fingerprintProtection);
      expect(Array.isArray(result.whitelistedDomains)).toBe(true);
    });

    it('should return defaults on error', async () => {
      mockChromeStorage.get.mockRejectedValue(new Error('Storage error'));

      const result = await storage.getSettings();
      
      expect(result).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('updateSettings()', () => {
    it('should merge updates with current settings', async () => {
      const currentSettings = { enabled: true, fingerprintProtection: false };
      const updates = { enabled: false };
      
      // Mock getSettings to return currentSettings
      jest.spyOn(storage, 'getSettings').mockResolvedValue(currentSettings);
      
      await storage.updateSettings(updates);
      
      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        ...currentSettings,
        ...updates
      });
      
      // Restore mock
      storage.getSettings.mockRestore();
    });

    it('should validate setting types', async () => {
      const currentSettings = DEFAULT_SETTINGS;
      const invalidUpdates = { enabled: 'not-boolean', unknownSetting: 'value' };
      
      // Mock getSettings to return currentSettings
      jest.spyOn(storage, 'getSettings').mockResolvedValue(currentSettings);
      
      await storage.updateSettings(invalidUpdates);
      
      // Should use default for invalid enabled type and ignore unknown setting
      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        ...DEFAULT_SETTINGS,
        enabled: DEFAULT_SETTINGS.enabled // Should use default for invalid type
      });
      
      // Restore mock
      storage.getSettings.mockRestore();
    });

    it('should reject invalid updates object', async () => {
      await storage.updateSettings(null);
      await storage.updateSettings('invalid');
      
      expect(mockChromeStorage.set).not.toHaveBeenCalled();
    });
  });

  describe('getWhitelist()', () => {
    it('should return valid whitelist array', async () => {
      const whitelist = ['example.com', 'test.com'];
      mockChromeStorage.get.mockResolvedValue({ whitelistedDomains: whitelist });

      const result = await storage.getWhitelist();
      
      // getWhitelist calls getSettings internally, so we need to mock that
      expect(result).toEqual(whitelist);
    });

    it('should filter invalid entries', async () => {
      const invalidWhitelist = ['valid.com', '', null, 123, 'a'.repeat(300)];
      mockChromeStorage.get.mockResolvedValue({ whitelistedDomains: invalidWhitelist });

      const result = await storage.getWhitelist();
      
      // Should filter out invalid entries and return only valid ones
      expect(result).toEqual(['valid.com']);
    });

    it('should return empty array on error', async () => {
      mockChromeStorage.get.mockRejectedValue(new Error('Storage error'));

      const result = await storage.getWhitelist();
      
      expect(result).toEqual([]);
    });
  });

  describe('addToWhitelist()', () => {
    it('should add valid domain to whitelist', async () => {
      const existingWhitelist = ['existing.com'];
      const domain = 'new.com';
      
      // Mock getWhitelist to return existing whitelist
      jest.spyOn(storage, 'getWhitelist').mockResolvedValue(existingWhitelist);
      
      await storage.addToWhitelist(domain);
      
      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        whitelistedDomains: [...existingWhitelist, domain.toLowerCase()]
      });
      
      // Restore mock
      storage.getWhitelist.mockRestore();
    });

    it('should reject invalid domain', async () => {
      await storage.addToWhitelist('');
      await storage.addToWhitelist(null);
      await storage.addToWhitelist(123);
      
      expect(mockChromeStorage.set).not.toHaveBeenCalled();
    });

    it('should not add duplicate domains', async () => {
      const existingWhitelist = ['example.com'];
      const domain = 'EXAMPLE.COM'; // Should be normalized
      
      mockChromeStorage.get.mockResolvedValue({ whitelistedDomains: existingWhitelist });
      
      await storage.addToWhitelist(domain);
      
      expect(mockChromeStorage.set).not.toHaveBeenCalled();
    });
  });

  describe('removeFromWhitelist()', () => {
    it('should remove domain from whitelist', async () => {
      const existingWhitelist = ['keep.com', 'remove.com'];
      const domain = 'REMOVE.COM'; // Should be normalized
      
      // Mock getWhitelist to return existing whitelist
      jest.spyOn(storage, 'getWhitelist').mockResolvedValue(existingWhitelist);
      
      await storage.removeFromWhitelist(domain);
      
      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        whitelistedDomains: ['keep.com']
      });
      
      // Restore mock
      storage.getWhitelist.mockRestore();
    });

    it('should handle non-existent domain gracefully', async () => {
      const existingWhitelist = ['keep.com'];
      const domain = 'nonexistent.com';
      
      mockChromeStorage.get.mockResolvedValue({ whitelistedDomains: existingWhitelist });
      
      await storage.removeFromWhitelist(domain);
      
      expect(mockChromeStorage.set).not.toHaveBeenCalled();
    });
  });

  describe('isWhitelisted()', () => {
    it('should return true for whitelisted domain', async () => {
      const whitelist = ['example.com', 'test.com'];
      // Mock getWhitelist to return the whitelist
      jest.spyOn(storage, 'getWhitelist').mockResolvedValue(whitelist);

      const result = await storage.isWhitelisted('EXAMPLE.COM');
      
      expect(result).toBe(true);
      
      // Restore mock
      storage.getWhitelist.mockRestore();
    });

    it('should return false for non-whitelisted domain', async () => {
      const whitelist = ['example.com'];
      mockChromeStorage.get.mockResolvedValue({ whitelistedDomains: whitelist });

      const result = await storage.isWhitelisted('other.com');
      
      expect(result).toBe(false);
    });

    it('should return false for invalid input', async () => {
      const result1 = await storage.isWhitelisted('');
      const result2 = await storage.isWhitelisted(null);
      const result3 = await storage.isWhitelisted(123);
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });
  });

  describe('remove()', () => {
    it('should remove specified keys', async () => {
      const keys = ['key1', 'key2'];
      
      await storage.remove(keys);
      
      expect(mockChromeStorage.remove).toHaveBeenCalledWith(keys);
    });

    it('should handle empty keys array', async () => {
      await storage.remove([]);
      
      // Should still call remove with empty array
      expect(mockChromeStorage.remove).toHaveBeenCalledWith([]);
    });
  });

  describe('clear()', () => {
    it('should clear all storage', async () => {
      await storage.clear();
      
      expect(mockChromeStorage.clear).toHaveBeenCalled();
    });
  });
});
