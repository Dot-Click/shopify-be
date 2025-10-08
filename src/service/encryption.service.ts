import { env } from "@/utils/env.util";
// import crypto from "crypto";
// import { CryptoJS } from "crypto-js";
var CryptoJS = require("crypto-js");

// const ALGO = "aes-256-gcm";
// const IV_LENGTH = 16;

if (!env.ENCRYPTION_KEY || env.ENCRYPTION_KEY.length !== 64) {
  throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
}
// const ENC_KEY = Buffer.from(env.ENCRYPTION_KEY, "hex");

export function isEncrypted(val: string): boolean {
  if (typeof val !== "string" || val.trim() === "") return false;

  try {
    const bytes = CryptoJS.AES.decrypt(val, env.ENCRYPTION_KEY);
    const txt = bytes.toString(CryptoJS.enc.Utf8);
    // If decrypt yields something non-empty, we guess it was encrypted
    return txt !== "";
  } catch (err) {
    return false;
  }
}

export function encrypt(text: string) {
  if (isEncrypted(text)) {
    return text;
  }

  var ciphertext = CryptoJS.AES.encrypt(text, env.ENCRYPTION_KEY).toString();

  return ciphertext;

  // const iv = crypto.randomBytes(IV_LENGTH);
  // const cipher = crypto.createCipheriv(ALGO, ENC_KEY, iv);

  // let encrypted = cipher.update(text, "utf8", "hex");
  // encrypted += cipher.final("hex");
  // const authTag = cipher.getAuthTag().toString("hex");

  // return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encrypted: string) {
  // if (!encrypted) return encrypted;

  // const parts = encrypted.split(":");
  // if (parts.length !== 3) {
  //   return encrypted;
  // }
  if (!encrypted || typeof encrypted !== "string") return "";

  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, env.ENCRYPTION_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);

    if (originalText === "") {
      return encrypted;
    }

    console.log(originalText);
    return originalText;
  } catch (err) {
    console.error("Decrypt error:", err);
    return encrypted;
  }

  // try {
  //   const [ivHex, authTagHex, encryptedText] = parts;
  //   const iv = Buffer.from(ivHex, "hex");
  //   const authTag = Buffer.from(authTagHex, "hex");

  //   const decipher = crypto.createDecipheriv(ALGO, ENC_KEY, iv);
  //   decipher.setAuthTag(authTag);

  //   let decrypted = decipher.update(encryptedText, "hex", "utf8");
  //   decrypted += decipher.final("utf8");

  //   return decrypted;
  // } catch (err) {
  //   console.error("Decryption failed, returning raw value:", err);
  //   return encrypted; // fallback so old accounts don't break
  // }
}
