import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

// promisify picks the no-options overload, which drops the work-factor
// argument. Asserting the signature restores it
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

// scrypt rather than a native bcrypt/argon2 binding: it ships in Node, so there
// is no compiled dependency to rebuild on every deploy target.
//
// N is the work factor and also the memory cost — 2^15 with r=8 needs ~32 MB
// per hash, so maxmem has to be raised above Node's 32 MB default or the call
// throws. Higher N is stronger but every login pays for it on a small instance
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const KEY_BYTES = 64;
const SALT_BYTES = 16;
const PREFIX = "scrypt";

// The parameters travel with the hash, so raising N later does not invalidate
// every existing password — old hashes still verify against their own settings
function encode(salt: Buffer, key: Buffer): string {
  return [
    PREFIX,
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(password, salt, KEY_BYTES, PARAMS);
  return encode(salt, key);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== PREFIX) return false;

  const [, rawN, rawR, rawP, rawSalt, rawKey] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  const salt = Buffer.from(rawSalt, "base64");
  const expected = Buffer.from(rawKey, "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  let actual: Buffer;
  try {
    // A hash written with a larger N than this process allows would throw
    actual = await scryptAsync(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: PARAMS.maxmem,
    });
  } catch {
    return false;
  }

  // Constant time, so a wrong password cannot be narrowed down by how long the
  // comparison took
  return timingSafeEqual(actual, expected);
}

// A real hash of a throwaway random string, so an unknown email can be checked
// against something and cost the same CPU as a real account. Hardcoded rather
// than generated at import time, which would run a 32 MB scrypt on every boot.
// No password matches it
export const DUMMY_PASSWORD_HASH =
  "scrypt$32768$8$1$xUrb7R0SP7ZlUhu5OI5pwQ==$" +
  "OtOXt62NzuI09nH5Vo3HobLGItJYnX2UialSWtjaoqa8oKw+6F6Y4WJ/bsVUIs6Xh8+6ISZO+iB5BJehEqUrwQ==";
