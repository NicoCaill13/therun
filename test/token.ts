/* eslint-disable no-var */
// eslint-disable-next-line @typescript-eslint/no-require-imports
var jwt = require('jsonwebtoken');

const token = jwt.sign(
  { sub: 'user-123', email: 'test@example.com', plan: 'FREE' },
  'DEV_ONLY_SECRET_CHANGE_ME',
  { expiresIn: '7d' },
);
console.log(token);
