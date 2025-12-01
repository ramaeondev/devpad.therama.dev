
const crypto = require('crypto');
const { Buffer } = require('buffer');

const IV_LENGTH = 16;

function encryptSymmetricKey(key, secret) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const keyBytes = Buffer.from(secret, 'utf-8').slice(0, 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBytes, iv);
    let encrypted = cipher.update(key, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return `${Buffer.from(iv).toString('base64')}:${encrypted}`;
}

function decryptSymmetricKey(encrypted, secret) {
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
        throw new Error(`Invalid encrypted format. Parts: ${parts.length}`);
    }
    const [ivBase64, encryptedKey] = parts;

    if (encryptedKey.length % 4 !== 0) {
        console.log(`WARNING: Invalid base64 length: ${encryptedKey.length}`);
    }

    const iv = Buffer.from(ivBase64, 'base64');
    const keyBytes = Buffer.from(secret, 'utf-8').slice(0, 32);

    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBytes, iv);
    let decrypted = decipher.update(encryptedKey, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

try {
    const longSecret = '12345678901234567890123456789012'; // 32 chars
    const inputKey = 'a'.repeat(64); // 64 chars
    console.log('Input length:', inputKey.length);

    const encrypted = encryptSymmetricKey(inputKey, longSecret);
    console.log('Encrypted:', encrypted);
    console.log('Encrypted length:', encrypted.length);

    const [iv, cipherText] = encrypted.split(':');
    console.log('Ciphertext length:', cipherText.length);

    const decrypted = decryptSymmetricKey(encrypted, longSecret);
    console.log('Decrypted:', decrypted);

    if (inputKey === decrypted) {
        console.log('SUCCESS');
    } else {
        console.log('FAILURE');
    }

} catch (e) {
    console.error('Error during test:', e);
}
