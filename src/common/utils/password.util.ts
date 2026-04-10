import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const BCRYPT_COST = 12;
const RANDOM_PASSWORD_BYTE_LENGTH = 16;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateRandomPassword(): string {
  return randomBytes(RANDOM_PASSWORD_BYTE_LENGTH).toString('base64url');
}
