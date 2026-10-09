// Simple obfuscation to prevent plain-text storage.
// NOTE: Client-side encryption is never 100% secure against a determined attacker with access to the browser console.
const SALT = 'OPEN_HISTORIA_SECURE_SALT_v1';

export function encryptKey(text: string): string {
  if (!text) return '';
  try {
    const textToChars = (text: string) => text.split('').map((c) => c.charCodeAt(0));
    const byteHex = (n: number) => ('0' + Number(n).toString(16)).substr(-2);
    const applySaltToChar = (code: number) => textToChars(SALT).reduce((a, b) => a ^ b, code);

    return text
      .split('')
      .map(textToChars)
      .map((a) => applySaltToChar(a[0]))
      .map(byteHex)
      .join('');
  } catch (e) {
    console.error('Encryption failed', e);
    return '';
  }
}

export function decryptKey(encoded: string): string {
  if (!encoded) return '';
  try {
    const textToChars = (text: string) => text.split('').map((c) => c.charCodeAt(0));
    const applySaltToChar = (code: number) => textToChars(SALT).reduce((a, b) => a ^ b, code);

    return (encoded.match(/.{1,2}/g) || [])
      .map((hex) => parseInt(hex, 16))
      .map(applySaltToChar)
      .map((charCode) => String.fromCharCode(charCode))
      .join('');
  } catch (e) {
    console.error('Decryption failed', e);
    return '';
  }
}
