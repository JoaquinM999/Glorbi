/**
 * cryptoService.js
 *
 * Cifra/descifra las API keys de Binance antes de guardarlas en SQLite.
 * Usa AES-256-GCM (autenticado — detecta si el dato fue alterado).
 *
 * La clave de cifrado (ENCRYPTION_KEY) vive SOLO en server/.env, nunca en
 * la base de datos ni en el código. Si alguien roba el archivo glorbi.db
 * sin la ENCRYPTION_KEY, no puede leer las API keys — están cifradas.
 */
const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12  // recomendado para GCM
const AUTH_TAG_LENGTH = 16

function getKey() {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY no está configurada en server/.env. ' +
      'Generar una con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  const key = Buffer.from(raw, 'hex')
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY debe ser una cadena hex de 64 caracteres (32 bytes)')
  }
  return key
}

/**
 * Cifra un string. Devuelve un string único combinando iv + authTag + ciphertext
 * en base64, separados por ":" — fácil de guardar en una sola columna TEXT.
 */
function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') return null

  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

/**
 * Descifra un string generado por encrypt(). Devuelve null si el input
 * es null/vacío, y lanza error si el dato fue alterado (auth tag inválido).
 */
function decrypt(ciphertextCombined) {
  if (!ciphertextCombined) return null

  const [ivB64, authTagB64, dataB64] = ciphertextCombined.split(':')
  if (!ivB64 || !authTagB64 || !dataB64) {
    // No tiene el formato esperado — puede ser un valor viejo sin cifrar
    // (dato legacy pre-cifrado). Se devuelve tal cual para no romper nada,
    // pero se debería re-guardar cifrado la próxima vez que el usuario
    // actualice sus keys.
    return ciphertextCombined
  }

  const key = getKey()
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}

module.exports = { encrypt, decrypt }
