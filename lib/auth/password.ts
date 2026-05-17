import { hashSync, compareSync } from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string): string {
  return hashSync(plain, ROUNDS);
}

export function verifyPassword(plain: string, passwordHash: string): boolean {
  return compareSync(plain, passwordHash);
}
