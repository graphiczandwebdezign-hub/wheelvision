import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/server/auth/crypto';

describe('Sprint 12 Authentication & Crypto', () => {
  it('hashes and verifies passwords securely', () => {
    const password = 'SecurePassword123!';
    const hash = hashPassword(password);
    expect(hash).not.toBe(password);
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword('WrongPassword', hash)).toBe(false);
  });
});
