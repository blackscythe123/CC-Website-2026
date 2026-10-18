import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export interface SessionData {
  token: string;
  login?: string;
  issuedAt: number;
  expiresAt: number;
}

const COOKIE_NAME = "cc_token";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function getEncryptionKey(): Buffer {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.OAUTH_GITHUB_CLIENT_SECRET;

  if (!secret) {
    throw new Error(
      "CRITICAL SECURITY CONFIGURATION ERROR: Neither SESSION_SECRET nor OAUTH_GITHUB_CLIENT_SECRET is defined in the environment. Refusing to seal/unseal sessions with an insecure fallback key."
    );
  }
  // Derive a 32-byte (256-bit) key deterministically using SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Seals session data into an AES-256-GCM encrypted and authenticated ciphertext string.
 * Format: iv.authTag.ciphertext (all hex encoded)
 */
export function sealSession(payload: { token: string; login?: string }): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const fullData: SessionData = {
    token: payload.token,
    login: payload.login,
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  const jsonString = JSON.stringify(fullData);
  const encrypted = Buffer.concat([cipher.update(jsonString, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}.${authTag.toString("hex")}.${encrypted.toString("hex")}`;
}

/**
 * Unseals and decrypts an AES-256-GCM encrypted ciphertext string.
 * If tampered with, corrupted, or expired, returns null.
 */
export function unsealSession(sealed: string): SessionData | null {
  if (!sealed || typeof sealed !== "string") return null;

  const parts = sealed.split(".");
  // Strictly require iv.authTag.ciphertext format; no raw unencrypted tokens permitted
  if (parts.length !== 3) {
    return null;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  // Strictly enforce NIST SP 800-38D AES-GCM parameters: 96-bit (12-byte) IV and 128-bit (16-byte) Auth Tag
  if (ivHex.length !== 24 || authTagHex.length !== 32 || encryptedHex.length === 0) {
    return null;
  }

  if (!/^[0-9a-fA-F]+$/.test(ivHex) || !/^[0-9a-fA-F]+$/.test(authTagHex) || !/^[0-9a-fA-F]+$/.test(encryptedHex)) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const data: SessionData = JSON.parse(decrypted.toString("utf8"));

    if (!data.token || typeof data.expiresAt !== "number" || data.expiresAt < Date.now()) {
      return null;
    }

    return data;
  } catch {
    // Authentication failed: data was tampered with or key changed
    return null;
  }
}

/**
 * Extracts and unseals the GitHub token from the request.
 * Supports encrypted HttpOnly cookie or Bearer Authorization header.
 */
export function getSessionToken(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  // Check HttpOnly cookie
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookieValue) return null;

  const session = unsealSession(cookieValue);
  return session ? session.token : null;
}

/**
 * Sets an encrypted AES-256-GCM sealed session cookie on the response.
 */
export function setSessionCookie(
  response: NextResponse,
  token: string,
  login?: string
): void {
  const sealed = sealSession({ token, login });

  response.cookies.set(COOKIE_NAME, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Clears the session cookie.
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
