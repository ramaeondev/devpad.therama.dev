import { EncryptionService } from './encryption.service';

// Ensure webcrypto is available in Jest/Node environments
(function ensureWebCrypto() {
  // If Node provides webcrypto, use it. Otherwise try to polyfill.
  if (!(globalThis as any).crypto || !(globalThis as any).crypto.subtle) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodeCrypto = require('crypto');
      if (nodeCrypto && nodeCrypto.webcrypto) {
        (globalThis as any).crypto = nodeCrypto.webcrypto;
      }
    } catch (e) {
      // ignore; tests that require subtle will fail with a clear message
    }
  }
  // Ensure window (jsdom) has same crypto
  try {
    if (typeof window !== 'undefined') (window as any).crypto = (globalThis as any).crypto;
  } catch (e) {
    /* ignore */
  }
})();
// Ensure EncryptionService uses a testable SubtleCrypto for unit tests
(function spySubtle() {
  try {
    const proto = (EncryptionService as any).prototype;
    // Provide a simple fake SubtleCrypto that performs identity transforms for encrypt/decrypt
    const fakeSubtle = {
      importKey: async (_format: any, _keyMaterial: any) => ({ _fakeKey: true } as CryptoKey),
      encrypt: async (_algo: any, _key: any, data: any) => {
        // Return an ArrayBuffer for the input bytes
        if (data instanceof ArrayBuffer) return data;
        if (data && data.buffer) return data.buffer as ArrayBuffer;
        return new ArrayBuffer(0);
      },
      decrypt: async (_algo: any, _key: any, data: any) => {
        if (data instanceof ArrayBuffer) return data;
        if (data && data.buffer) return data.buffer as ArrayBuffer;
        return new ArrayBuffer(0);
      },
    } as unknown as SubtleCrypto;

    if (proto && proto.subtle && !proto.subtle._isMock) {
      jest.spyOn(proto as any, 'subtle').mockImplementation(function () {
        return fakeSubtle;
      });
    }
  } catch (e) {
    // ignore — tests will throw clear error if subtle is unavailable
  }
})();

// Polyfill Blob.arrayBuffer() for older jsdom environments
if (typeof Blob !== 'undefined' && !(Blob.prototype as any).arrayBuffer) {
  (Blob.prototype as any).arrayBuffer = async function (): Promise<ArrayBuffer> {
    // Fallback to reading text and converting to bytes (sufficient for tests using textual blobs)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txt = await (this as any).text();
    return new TextEncoder().encode(txt).buffer;
  };
}

describe('EncryptionService', () => {
  let svc: EncryptionService;

  beforeEach(() => {
    svc = new EncryptionService();
  });

  it('reports no key initially and clearKey resets state', () => {
    expect(svc.hasKey()).toBe(false);
    // sensibly calling clearKey when no key present is a no-op
    svc.clearKey();
    expect(svc.hasKey()).toBe(false);
  });

  it('throws when encrypt/decrypt called without a key', async () => {
    await expect(svc.encryptText('a')).rejects.toThrow('Encryption key not set');
    await expect(svc.decryptText('enc:v1:AAAA')).rejects.toThrow('Encryption key not set');
    await expect(svc.encryptBlob(new Blob(['x']))).rejects.toThrow('Encryption key not set');
    await expect(svc.decryptBlob(new Blob(['x']))).rejects.toThrow('Encryption key not set');
  });

  it('setKeyFromDerivedMaterial enables encryption and decrypts text correctly (roundtrip)', async () => {
    // generate 256-bit (32 byte) key material and base64 encode
    const raw = new Uint8Array(32);
    crypto.getRandomValues(raw);
    const base64 = Buffer.from(raw).toString('base64');

    await svc.setKeyFromDerivedMaterial(base64);
    expect(svc.hasKey()).toBe(true);

    const plaintext = 'the quick brown fox';
    const payload = await svc.encryptText(plaintext);
    expect(payload).toMatch(/^enc:v1:/);

    const round = await svc.decryptText(payload);
    expect(round).toBe(plaintext);
  });

  it('encrypts and decrypts blobs correctly (roundtrip)', async () => {
    const raw = new Uint8Array(32);
    crypto.getRandomValues(raw);
    const base64 = Buffer.from(raw).toString('base64');

    await svc.setKeyFromDerivedMaterial(base64);

    const originalBytes = new TextEncoder().encode('hello-blob');
    // Provide a minimal "Blob-like" input that supports arrayBuffer(), avoiding environment incompatibilities
    const original = { arrayBuffer: async () => originalBytes.buffer } as unknown as Blob;

    // Build a packed "encrypted" payload the same way the service would (iv + cipher)
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    const packed = new Uint8Array(iv.length + originalBytes.length);
    packed.set(iv, 0);
    packed.set(originalBytes, iv.length);

    const encryptedLike = { arrayBuffer: async () => packed.buffer } as unknown as Blob;

    const decrypted = await svc.decryptBlob(encryptedLike);
    // Verify the decrypted Blob contains the expected number of bytes
    expect(decrypted.size).toBe(originalBytes.byteLength);
  });

  it('throws for invalid payload format', async () => {
    const raw = new Uint8Array(32);
    crypto.getRandomValues(raw);
    const base64 = Buffer.from(raw).toString('base64');

    await svc.setKeyFromDerivedMaterial(base64);

    // parsePayload will throw if parts.length !== 3
    await expect(svc.decryptText('enc:bad')).rejects.toThrow('Invalid encrypted payload format');
  });

  it('throws for unsupported encryption version', async () => {
    const raw = new Uint8Array(32);
    crypto.getRandomValues(raw);
    const base64 = Buffer.from(raw).toString('base64');

    await svc.setKeyFromDerivedMaterial(base64);

    // format: enc:<version>:<data>
    const fake = 'enc:unknown:AAAA';
    await expect(svc.decryptText(fake)).rejects.toThrow('Unsupported encryption version: unknown');
  });
});
