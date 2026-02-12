const ITERATIONS = 100_000
const KEY_LENGTH = 32

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

const fromHex = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

const deriveHash = async (password: string, salt: Uint8Array): Promise<string> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8,
  )

  return toHex(new Uint8Array(bits))
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveHash(password, salt)
  return `${ITERATIONS}:${toHex(salt)}:${hash}`
}

export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const [iterationsRaw, saltHex, hashHex] = storedHash.split(':')
  if (!iterationsRaw || !saltHex || !hashHex) {
    return false
  }

  const iterations = Number(iterationsRaw)
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false
  }

  const salt = fromHex(saltHex)
  const calculated = await deriveHash(password, salt)
  return calculated === hashHex
}
