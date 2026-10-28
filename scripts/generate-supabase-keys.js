const { createHmac, randomBytes } = require('node:crypto');

const jwtSecret = randomBytes(48).toString('hex');
const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = 4102444800;

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createRoleKey(role) {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: 'supabase',
    ref: 'family-system',
    role,
    iat: issuedAt,
    exp: expiresAt,
  }));
  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac('sha256', jwtSecret)
    .update(unsignedToken)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsignedToken}.${signature}`;
}

console.log(`POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`SUPABASE_ANON_KEY=${createRoleKey('anon')}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${createRoleKey('service_role')}`);
