import { execSync } from 'node:child_process';
import * as path from 'node:path';

describe('Prisma schema (issue #117)', () => {
  it('validates without errors', () => {
    const root = path.resolve(__dirname, '../..');
    execSync('npx prisma validate', { cwd: root, stdio: 'pipe' });
  });
});
