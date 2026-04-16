/**
 * Encryption and decryption utilities for preset data using AES-256-GCM.
 * The encryption key is derived from the user's authentication session.
 */

export const PBKDF2_ITERATIONS = 100000;
export const SALT_LENGTH = 16;
export const IV_LENGTH = 12;

/**
 * Error thrown when cryptographic operations fail.
 */
export class CryptoError extends Error {
	constructor(
		message: string,
		public readonly originalError?: unknown,
	) {
		super(message);
		this.name = "CryptoError";
	}
}

/**
 * Derives an encryption key from a session token using PBKDF2.
 * @param sessionToken The user's active authentication session token.
 * @param salt A salt for the key derivation process.
 * @returns A CryptoKey object for AES-GCM.
 */
export async function deriveKeyFromSession(
	sessionToken: string,
	salt: Uint8Array,
): Promise<CryptoKey> {
	try {
		const encoder = new TextEncoder();
		const keyMaterial = await crypto.subtle.importKey(
			"raw",
			encoder.encode(sessionToken),
			"PBKDF2",
			false,
			["deriveKey"],
		);

		const pbkdf2Salt = new Uint8Array(salt.byteLength);
		pbkdf2Salt.set(salt);

		return crypto.subtle.deriveKey(
			{
				name: "PBKDF2",
				salt: pbkdf2Salt,
				iterations: PBKDF2_ITERATIONS,
				hash: "SHA-256",
			},
			keyMaterial,
			{
				name: "AES-GCM",
				length: 256,
			},
			false,
			["encrypt", "decrypt"],
		);
	} catch (error) {
		throw new CryptoError("Failed to derive key from session", error);
	}
}

/**
 * Encrypts preset data using AES-256-GCM.
 * @param data The stringified preset data to encrypt.
 * @param key The derived CryptoKey.
 * @param salt The salt used to derive the key.
 * @returns A Base64 encoded string containing [salt][iv][ciphertext].
 */
export async function encryptPresetData(
	data: string,
	key: CryptoKey,
	salt: Uint8Array,
): Promise<string> {
	try {
		const encoder = new TextEncoder();
		const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
		const encodedData = encoder.encode(data);

		const encryptedContent = await crypto.subtle.encrypt(
			{
				name: "AES-GCM",
				iv,
			},
			key,
			encodedData,
		);

		const encryptedDataArray = new Uint8Array(encryptedContent);

		// Combine salt, iv, and encrypted data for storage
		const combined = new Uint8Array(
			salt.length + iv.length + encryptedDataArray.length,
		);
		combined.set(salt, 0);
		combined.set(iv, salt.length);
		combined.set(encryptedDataArray, salt.length + iv.length);

		return btoa(String.fromCharCode(...combined));
	} catch (error) {
		throw new CryptoError("Failed to encrypt data", error);
	}
}

/**
 * Decrypts preset data using AES-256-GCM.
 * @param encryptedPayload The Base64 encoded payload containing [salt][iv][ciphertext].
 * @param sessionToken The user's active authentication session token.
 * @returns The decrypted string data.
 */
export async function decryptPresetData(
	encryptedPayload: string,
	sessionToken: string,
): Promise<string> {
	try {
		const decoder = new TextDecoder();
		const combined = new Uint8Array(
			atob(encryptedPayload)
				.split("")
				.map((c) => c.charCodeAt(0)),
		);

		if (combined.length < SALT_LENGTH + IV_LENGTH) {
			throw new Error("Invalid encrypted payload length");
		}

		const salt = combined.slice(0, SALT_LENGTH);
		const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
		const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

		// Re-derive the key using the salt extracted from the payload
		const key = await deriveKeyFromSession(sessionToken, salt);

		const decryptedContent = await crypto.subtle.decrypt(
			{
				name: "AES-GCM",
				iv,
			},
			key,
			ciphertext,
		);

		return decoder.decode(decryptedContent);
	} catch (error) {
		throw new CryptoError("Failed to decrypt data", error);
	}
}
