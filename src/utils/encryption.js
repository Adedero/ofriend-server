require('dotenv').config();
const crypto = require('crypto');

// Ensure the algorithm is set correctly
const algorithm = process.env.CRYPTO_ALGORITHM;
if (!algorithm) {
  throw new Error("CRYPTO_ALGORITHM environment variable is not set.");
}

// This key should be stored securely and reused for decryption
const key = process.env.CRYPTO_KEY;
if (!key || key.length !== 32) {
  throw new Error("CRYPTO_KEY environment variable is not set correctly. It must be 32 bytes long.");
}

// Generate IV for each encryption
const generateIv = () => crypto.randomBytes(16);

const encrypt = (text) => {
  try {
    const iv = generateIv();
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Encryption failed.");
  }
};

const decrypt = (encryptedText) => {
  try {
    const iv = Buffer.from(encryptedText.iv, 'hex');
    const encryptedData = Buffer.from(encryptedText.encryptedData, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Decryption failed.");
  }
};

module.exports = { encrypt, decrypt };
