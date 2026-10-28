const ENCRYPTION_KEY_ENV = 'FAMILY_ENCRYPTION_KEY';
let modeLogged = false;

function validateEncryptionKey(value) {
  if (typeof value !== 'string' || !value) {
    throw new Error(`[ENCRYPTION] Missing ${ENCRYPTION_KEY_ENV} in .env.docker`);
  }

  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== 32 || decoded.toString('base64') !== value) {
    throw new Error(`[ENCRYPTION] ${ENCRYPTION_KEY_ENV} must be a base64-encoded 32-byte key.`);
  }

  return value;
}

function logEncryptionMode() {
  if (modeLogged) {
    return;
  }
  modeLogged = true;

  try {
    validateEncryptionKey(process.env[ENCRYPTION_KEY_ENV]);
    console.info('[ENCRYPTION] Using pgcrypto real encryption');
  } catch (error) {
    console.error(error.message);
    console.warn('[ENCRYPTION] Placeholder mode; private record writes fail closed.');
  }
}

function getEncryptionKey() {
  logEncryptionMode();
  return validateEncryptionKey(process.env[ENCRYPTION_KEY_ENV]);
}

function isEncrypted(ciphertext) {
  return typeof ciphertext === 'string' && /^\\x[0-9a-f]+$/i.test(ciphertext);
}

async function encryptContent(supabase, plaintext) {
  if (plaintext === null || plaintext === undefined) {
    return null;
  }
  if (typeof plaintext !== 'string') {
    throw new TypeError('Private record content must be text.');
  }

  const { data, error } = await supabase.rpc('encrypt_private_content', {
    p_plaintext: plaintext,
    p_passphrase: getEncryptionKey(),
  });
  if (error) {
    console.error('[ENCRYPTION] pgcrypto encryption failed:', {
      code: error.code || null,
    });
    throw new Error('Could not encrypt private record content.');
  }
  if (!isEncrypted(data)) {
    console.error('[ENCRYPTION] pgcrypto returned an invalid ciphertext value.');
    throw new Error('Could not verify encrypted private record content.');
  }

  return data;
}

async function decryptContent(supabase, ciphertext) {
  if (ciphertext === null || ciphertext === undefined) {
    return null;
  }
  if (!isEncrypted(ciphertext)) {
    throw new TypeError('Private record ciphertext is invalid.');
  }

  const { data, error } = await supabase.rpc('decrypt_private_content', {
    p_ciphertext: ciphertext,
    p_passphrase: getEncryptionKey(),
  });
  if (error) {
    console.error('[ENCRYPTION] pgcrypto decryption failed:', {
      code: error.code || null,
    });
    throw new Error('Could not decrypt private record content.');
  }
  if (typeof data !== 'string') {
    console.error('[ENCRYPTION] pgcrypto returned an invalid plaintext value.');
    throw new Error('Could not verify decrypted private record content.');
  }

  return data;
}

logEncryptionMode();

module.exports = {
  decryptContent,
  encryptContent,
  getEncryptionKey,
  isEncrypted,
};
