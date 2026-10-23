const express = require('express');

const router = express.Router();

router.get('/api/config', (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const familyId = process.env.FAMILY_ID;

    if (!supabaseUrl || !supabaseAnonKey || !familyId) {
      console.error(
        'Public app configuration is incomplete. Configure SUPABASE_URL, SUPABASE_ANON_KEY, and FAMILY_ID.',
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

    const isLocalHttp =
      parsedUrl.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]'].includes(parsedUrl.hostname);
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
