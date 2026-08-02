import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

type LocalUser = {
  username: string;
  email: string;
  passwordHash: string;
};

const usersPath = path.join(process.cwd(), "data", "users.json");

const SCRYPT_KEYLEN = 32;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt:${salt}:${hash.toString("hex")}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (storedHash.startsWith("scrypt:")) {
    const [, salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });
    const derivedBuf = Buffer.from(derived.toString("hex"), "hex");
    const storedBuf = Buffer.from(hash, "hex");
    return crypto.timingSafeEqual(derivedBuf, storedBuf);
  }

  // Legacy SHA-256 fallback (no salt) - migrate on next successful login
  const legacyHash = crypto.createHash("sha256").update(password).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(legacyHash, "hex"),
    Buffer.from(storedHash, "hex"),
  );
}

async function readUsers(): Promise<LocalUser[]> {
  try {
    return JSON.parse(await fs.readFile(usersPath, "utf8")) as LocalUser[];
  } catch {
    return [];
  }
}

export async function localAuth(
  action: "login" | "signup",
  username: string,
  email: string,
  password: string,
) {
  const users = await readUsers();

  if (action === "signup") {
    if (users.some((user) => user.email === email))
      return { ok: false, status: 409, message: "An account already exists for this email." };

    const user: LocalUser = {
      username,
      email,
      passwordHash: hashPassword(password),
    };
    users.push(user);
    await fs.mkdir(path.dirname(usersPath), { recursive: true });
    await fs.writeFile(usersPath, JSON.stringify(users, null, 2));
    return { ok: true, status: 200, message: "Profile created.", username: user.username };
  }

  const user = users.find((entry) => entry.email === email);
  if (!user) return { ok: false, status: 401, message: "Email or password is incorrect." };

  if (!verifyPassword(password, user.passwordHash))
    return { ok: false, status: 401, message: "Email or password is incorrect." };

  // Upgrade legacy hashes to scrypt on successful login
  if (!user.passwordHash.startsWith("scrypt:")) {
    user.passwordHash = hashPassword(password);
    await fs.writeFile(usersPath, JSON.stringify(users, null, 2));
  }

  return { ok: true, status: 200, message: "Access granted.", username: user.username };
}
