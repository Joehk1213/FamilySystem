const { createClient } = require('@supabase/supabase-js');

async function requireSupabaseUser(req, res, next) {
  try {
    const authorization = req.get('authorization') || '';
    const tokenMatch = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!tokenMatch) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Sign in is required.',
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (
      !supabaseUrl
      || !supabaseAnonKey
      || supabaseAnonKey === process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error('Authenticated API Supabase configuration is incomplete or unsafe.');
      return res.status(500).json({
        success: false,
        data: null,
        message: 'The records service is not configured.',
      });
    }

    const token = tokenMatch[1];
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    const { data, error } = await supabase.auth.getUser(token);

    if (error) {
      if ([401, 403].includes(error.status)) {
        return res.status(401).json({
          success: false,
          data: null,
          message: 'Your sign-in session is invalid or expired.',
        });
      }

      console.error('Could not verify Supabase user token:', error);
      return res.status(502).json({
        success: false,
        data: null,
        message: 'Could not verify your sign-in session. Please try again.',
      });
    }

    if (!data.user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Your sign-in session is invalid or expired.',
      });
    }

    req.supabase = supabase;
    req.user = data.user;
    return next();
  } catch (error) {
    console.error('Supabase authentication middleware failed:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Could not authenticate this request.',
    });
  }
}

module.exports = requireSupabaseUser;
