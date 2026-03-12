import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret) throw new Error('ENCRYPTION_SECRET is not set')
  return Buffer.from(secret, 'base64')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])
  const authTag = cipher.getAuthTag()
  
  // Return iv:authTag:encrypted as base64 joined by dots
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64')
  ].join('.')
}

export function decrypt(ciphertext: string): string {
  const key = getKey()
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split('.')
  
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const encrypted = Buffer.from(encryptedB64, 'base64')
  
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  return decipher.update(encrypted) + decipher.final('utf8')
}
