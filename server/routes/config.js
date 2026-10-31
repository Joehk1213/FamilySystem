const express = require('express');

const router = express.Router();

const isTailscaleIpv4 = (hostname) => {
  const octets = hostname.split('.').map(Number);
  return octets.length === 4
    && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
    && octets[0] === 100
    && octets[1] >= 64
    && octets[1] <= 127;
};

const getPublicSupabaseUrl = (req) => {
  if (process.env.PUBLIC_SUPABASE_URL) {
    return process.env.PUBLIC_SUPABASE_URL;
  }

  const requestHost = req.get('host');
  if (requestHost) {
    try {
      const parsedHost = new URL(`http://${requestHost}`);
      const hostname = parsedHost.hostname.toLowerCase();
      const isPublicServiceHost =
        hostname === 'joe-server'
        || isTailscaleIpv4(hostname)
        || hostname.endsWith('.ts.net');

      if (
        isPublicServiceHost
        && !parsedHost.username
        && !parsedHost.password
        && parsedHost.pathname === '/'
        && !parsedHost.search
        && !parsedHost.hash
      ) {
        if (hostname.endsWith('.ts.net') && req.protocol === 'https') {
          return `https://${hostname}`;
        }
        return `http://${hostname}:8000`;
      }
    } catch {
      return process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    }
  }

  return process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
};

router.get('/api/config', (req, res) => {
  try {
    const supabaseUrl = getPublicSupabaseUrl(req);
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const familyId = process.env.FAMILY_ID;

    if (!supabaseUrl || !supabaseAnonKey || !familyId) {
      console.error(
        'Public app configuration is incomplete. Configure SUPABASE_URL or PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, and FAMILY_ID.',
      );
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Application configuration is unavailable.',
      });
    }

    const parsedUrl = new URL(supabaseUrl);
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const hostname = parsedUrl.hostname.toLowerCase();
    const isLocalHttp =
      parsedUrl.protocol === 'http:'
      && (
        ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
        || (hostname === 'joe-server' && parsedUrl.port === '8000')
        || (isTailscaleIpv4(hostname) && parsedUrl.port === '8000')
        || (hostname.endsWith('.ts.net') && parsedUrl.port === '8000')
      );
    const isSecureUrl =
      parsedUrl.protocol === 'https:'
      || isLocalHttp;

    if (
      !isSecureUrl
      || parsedUrl.username
      || parsedUrl.password
      || !uuidPattern.test(familyId)
      || supabaseAnonKey === process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error('Public app configuration contains an invalid URL or family UUID.');
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Application configuration is unavailable.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        supabaseUrl,
        supabaseAnonKey,
        familyId,
      },
      message: 'Application configuration loaded',
    });
  } catch (error) {
    console.error('Failed to load public app configuration:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Application configuration is unavailable.',
    });
  }
});

module.exports = router;
