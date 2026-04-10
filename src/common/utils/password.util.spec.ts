import { generateRandomPassword, hashPassword, verifyPassword } from './password.util';

describe('password.util', () => {
  it('hashPassword and verifyPassword roundtrip', async () => {
    const plain = 'MySecret-99';
    const hash = await hashPassword(plain);
    expect(await verifyPassword(plain, hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
    expect(hash).not.toBe(plain);
  });

  it('generateRandomPassword returns distinct non-empty strings', () => {
    const a = generateRandomPassword();
    const b = generateRandomPassword();
    expect(a.length).toBeGreaterThan(8);
    expect(a).not.toBe(b);
  });
});
