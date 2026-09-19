import { createRemoteJWKSet, jwtVerify } from 'jose';

// Cloudflare Access adds a signed token (the Cf-Access-Jwt-Assertion header) to every
// request it lets through.
//
// Enabled when CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD are set. In production
// (NODE_ENV=production) the server refuses to start without them.
export function cloudflareAccess() {
  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN?.replace(/\/+$/, ''); 
  const audience = process.env.CF_ACCESS_AUD; 

  if (!teamDomain || !audience) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD must be set in production.');
    }
    console.warn('Cloudflare Access check is off (CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD not set).');
    return (req, res, next) => next();
  }

  const keys = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));

  return async (req, res, next) => {
    const token = req.get('Cf-Access-Jwt-Assertion');
    if (!token) return res.status(403).send('Forbidden');
    try {
      await jwtVerify(token, keys, { issuer: teamDomain, audience });
      next();
    } catch {
      res.status(403).send('Forbidden');
    }
  };
}