import { Injectable, signal } from '@angular/core';

/**
 * Automatic Hybrid Encryption Service
 * - Receives 256-bit key material from server (derived from user email + master secret)
 * - Encrypts/decrypts notes and files using AES-256-GCM
 * - No user interaction required (transparent encryption)
 */
@Injectable({ providedIn: 'root' })
export class EncryptionService {
  private crypto = typeof window !== 'undefined' ? window.crypto : (undefined as unknown as Crypto);
  private key: CryptoKey | null = null;
  private hasKeySig = signal<boolean>(false);

  hasKey(): boolean {
    return this.hasKeySig();
  }

  clearKey(): void {
    this.key = null;
    this.hasKeySig.set(false);
  }

  /**
   * Import a 256-bit key from base64-encoded key material
   * Key is derived server-side from user email + master secret
   */
  async setKeyFromDerivedMaterial(base64Key: string): Promise<void> {
    const rawKey = this.base64ToArrayBuffer(base64Key);
    this.key = await this.subtle().importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    this.hasKeySig.set(true);
  }

  async encryptText(plaintext: string): Promise<string> {
    if (!this.key) throw new Error('Encryption key not set');
    const iv = new Uint8Array(12);
    this.getCrypto().getRandomValues(iv);
    const enc = new TextEncoder().encode(plaintext);
    const cipher = await this.subtle().encrypt({ name: 'AES-GCM', iv }, this.key, enc);
    const packed = this.pack(iv, new Uint8Array(cipher));
    return `enc:v1:${this.arrayBufferToBase64(packed.buffer as ArrayBuffer)}`;
  }

  async decryptText(payload: string): Promise<string> {
    if (!this.key) throw new Error('Encryption key not set');
    const { version, raw } = this.parsePayload(payload);
    if (version !== 'v1') throw new Error(`Unsupported encryption version: ${version}`);
    const bytes = new Uint8Array(this.base64ToArrayBuffer(raw));
    const iv = bytes.slice(0, 12);
    const cipher = bytes.slice(12);
    const plainBuf = await this.subtle().decrypt({ name: 'AES-GCM', iv }, this.key, cipher);
    return new TextDecoder().decode(plainBuf);
  }

  async encryptBlob(blob: Blob): Promise<Blob> {
    if (!this.key) throw new Error('Encryption key not set');
    const iv = new Uint8Array(12);
    this.getCrypto().getRandomValues(iv);
    const data = new Uint8Array(await blob.arrayBuffer());
    const cipher = await this.subtle().encrypt({ name: 'AES-GCM', iv }, this.key, data);
    const packed = this.pack(iv, new Uint8Array(cipher));
    return new Blob([packed.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  }

  async decryptBlob(encrypted: Blob): Promise<Blob> {
    if (!this.key) throw new Error('Encryption key not set');
    const bytes = new Uint8Array(await encrypted.arrayBuffer());
    const iv = bytes.slice(0, 12);
    const cipher = bytes.slice(12);
    const plain = await this.subtle().decrypt({ name: 'AES-GCM', iv }, this.key, cipher);
    return new Blob([plain]);
  }

  // Helpers
  private pack(iv: Uint8Array, cipher: Uint8Array): Uint8Array {
    const out = new Uint8Array(iv.length + cipher.length);
    out.set(iv, 0);
    out.set(cipher, iv.length);
    return out;
  }

  private parsePayload(payload: string): { version: string; raw: string } {
    if (payload.startsWith('enc:')) {
      const parts = payload.split(':');
      if (parts.length !== 3) throw new Error('Invalid encrypted payload format');
      return { version: parts[1], raw: parts[2] };
    }
    return { version: 'v1', raw: payload };
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = '';
    const bytes = new Uint8Array(buffer as ArrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes.buffer;
  }

  private subtle(): SubtleCrypto {
    const s = this.getCrypto().subtle || (this.getCrypto() as any).webkitSubtle;
    if (!s) throw new Error('Web Crypto Subtle API not available');
    return s;
  }

  private getCrypto(): Crypto {
    if (!this.crypto) throw new Error('Web Crypto API not available');
    return this.crypto;
  }
}
