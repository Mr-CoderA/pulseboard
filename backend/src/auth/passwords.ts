import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 32;
const DEFAULT_COST = 16_384;
const ENCODING = "base64url";

interface ScryptOptions {
  readonly N: number;
  readonly r: number;
  readonly p: number;
}

function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
}

interface ScryptParts {
  readonly cost: number;
  readonly r: number;
  readonly p: number;
  readonly salt: Buffer;
  readonly hash: Buffer;
}

const HASH_PATTERN = /^scrypt\$N=(\d+),r=(\d+),p=(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/;

function parseScrypt(passwordHash: string): ScryptParts | undefined {
  const match = HASH_PATTERN.exec(passwordHash);
  if (match === null) {
    return undefined;
  }
  const cost = Number(match[1]);
  const r = Number(match[2]);
  const p = Number(match[3]);
  const saltRaw = match[4];
  const hashRaw = match[5];
  if (
    !Number.isInteger(cost) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    saltRaw === undefined ||
    hashRaw === undefined
  ) {
    return undefined;
  }
  return {
    cost,
    r,
    p,
    salt: Buffer.from(saltRaw, ENCODING),
    hash: Buffer.from(hashRaw, ENCODING),
  };
}

export function createScryptHasher(options?: { readonly cost?: number }): PasswordHasher {
  const cost = options?.cost ?? DEFAULT_COST;
  if (!Number.isInteger(cost) || cost < 2 || (cost & (cost - 1)) !== 0) {
    throw new Error("scrypt cost must be a power of two >= 2");
  }

  return {
    async hash(password: string): Promise<string> {
      const salt = randomBytes(16);
      const derived = await scrypt(password, salt, KEY_LENGTH, { N: cost, r: 8, p: 1 });
      return `scrypt$N=${cost},r=8,p=1$${salt.toString(ENCODING)}$${derived.toString(ENCODING)}`;
    },

    async verify(password: string, passwordHash: string): Promise<boolean> {
      const parsed = parseScrypt(passwordHash);
      if (parsed === undefined) {
        return false;
      }
      const derived = await scrypt(password, parsed.salt, KEY_LENGTH, {
        N: parsed.cost,
        r: parsed.r,
        p: parsed.p,
      });
      if (derived.length !== parsed.hash.length) {
        return false;
      }
      return timingSafeEqual(derived, parsed.hash);
    },
  };
}
