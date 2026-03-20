import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

// Derive a 32-byte AES key from SESSION_SECRET via SHA-256
function getKey(): Buffer {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set')
  return crypto.createHash('sha256').update(process.env.SESSION_SECRET).digest()
}

/**
 * Encrypts a plaintext string. Returns a colon-delimited string:
 * enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12) // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts a value produced by encrypt(). Transparently handles legacy
 * plain-text values (no 'enc:' prefix) to support migration.
 */
export function decrypt(stored: string): string {
  if (!stored.startsWith('enc:')) return stored // legacy plain text
  const parts = stored.split(':')
  // Format: enc:<iv>:<authTag>:<ciphertext> — but ciphertext may contain colons
  const [, ivHex, authTagHex, ...rest] = parts
  const key = getKey()
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(rest.join(':'), 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8',
  )
}

/**
 * Returns the first 12 chars of the decrypted value followed by bullet
 * placeholders — safe to show in the UI as a "key is set" hint.
 */
export function keyHint(stored: string): string {
  const plain = decrypt(stored)
  return `${plain.slice(0, 12)}••••••••`
}

/**
 * Returns true if the value has already been encrypted by this module.
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith('enc:')
}
