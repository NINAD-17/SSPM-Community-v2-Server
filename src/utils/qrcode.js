import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * Generate a QR code from the provided data
 * @param {string} data - The data to encode in the QR code
 * @returns {Promise<string>} - Base64 encoded QR code image
 */
export const generateQRCode = async (data) => {
    try {
        // Encrypt the data for added security
        const encryptedData = encryptData(data);
        
        // Generate QR code as base64
        const qrCodeBase64 = await QRCode.toDataURL(encryptedData);
        
        return qrCodeBase64;
    } catch (error) {
        console.error("Error generating QR code:", error);
        throw new Error("Failed to generate QR code");
    }
};

/**
 * Verify and decode a QR code
 * @param {string} qrData - The encrypted data from the QR code
 * @returns {object} - Decoded data object
 */
export const verifyQRCode = (qrData) => {
    try {
        // Decrypt the data
        const decryptedData = decryptData(qrData);
        
        // Parse the JSON data
        const ticketData = JSON.parse(decryptedData);
        
        return ticketData;
    } catch (error) {
        console.error("Error verifying QR code:", error);
        throw new Error("Invalid QR code");
    }
};

// Encryption key and IV - should be stored in environment variables
const ENCRYPTION_KEY = process.env.QR_ENCRYPTION_KEY || 'your-32-character-secret-key-here'; 
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt data for QR code
 * @param {string} data - The data to encrypt
 * @returns {string} - Encrypted data as string
 */
const encryptData = (data) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

/**
 * Decrypt QR code data
 * @param {string} encryptedData - The encrypted data
 * @returns {string} - Decrypted data as string
 */
const decryptData = (encryptedData) => {
    const textParts = encryptedData.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}; 