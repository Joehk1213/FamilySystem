function startServer() {
  try {
    require('dotenv').config({
      path: process.env.DOTENV_CONFIG_PATH || '.env',
    });

    const cors = require('cors');
    const express = require('express');
    const { createClient } = require('@supabase/supabase-js');
    const path = require('path');
    const configRouter = require('./routes/config');
    const healthRouter = require('./routes/health');
    const memoriesRouter = require('./routes/memories');
    const recordsRouter = require('./routes/records');
    const remindersRouter = require('./routes/reminders');
    const { startReminderScheduler } = require('./jobs/reminderScheduler');
    const telegramRouter = require('./routes/telegram');
    const apiErrorHandler = require('./middleware/apiErrorHandler');
    const app = express();
    const port = process.env.PORT || 3000;

    // Origins come from the environment allowlist; reserved .invalid test origins are forbidden.
    const configuredCorsOrigins = (process.env.CORS_ALLOWED_ORIGIN || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const defaultCorsOrigins = [
      'http://127.0.0.1:3002',
      'http://joe-server:3002',
    ];
    const httpLoopbackOrigins = new Set([
      'http://localhost:3002',
      'http://localhost:3000',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3000',
    ]);
    const isTailscaleIpv4 = (hostname) => {
      const octets = hostname.split('.').map(Number);
      return octets.length === 4
        && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
        && octets[0] === 100
        && octets[1] >= 64
        && octets[1] <= 127;
    };
    const isAllowedCorsOrigin = (origin) => {
      try {
        const parsedOrigin = new URL(origin);
        const hostname = parsedOrigin.hostname.toLowerCase();
        if (hostname.endsWith('.invalid')) {
          return false;
        }

        if (parsedOrigin.protocol === 'http:') {
          if (
            ['localhost', '127.0.0.1'].includes(hostname)
            && ['3000', '3002'].includes(parsedOrigin.port)
            && httpLoopbackOrigins.has(origin)
          ) {
            return true;
          }

          return parsedOrigin.origin === origin
            && ['3002', '8000'].includes(parsedOrigin.port)
            && (
              hostname === 'joe-server'
              || isTailscaleIpv4(hostname)
              || hostname.endsWith('.ts.net')
            );
        }

        return parsedOrigin.protocol === 'https:'
          && parsedOrigin.origin === origin;
      } catch {
        return false;
      }
    };
    const isAllowedUnconfiguredNetworkOrigin = (origin) => {
      try {
        const parsedOrigin = new URL(origin);
        const hostname = parsedOrigin.hostname.toLowerCase();
        if (hostname.endsWith('.invalid')) {
          return false;
        }

        if (parsedOrigin.protocol === 'https:') {
          return hostname.endsWith('.ts.net') && parsedOrigin.origin === origin;
        }

        return parsedOrigin.protocol === 'http:'
          && parsedOrigin.origin === origin
          && ['3002', '8000'].includes(parsedOrigin.port)
          && (
            hostname === 'joe-server'
            || isTailscaleIpv4(hostname)
            || hostname.endsWith('.ts.net')
          );
      } catch {
        return false;
      }
    };
    const corsAllowedOrigins = new Set(
      [...defaultCorsOrigins, ...configuredCorsOrigins]
        .filter(isAllowedCorsOrigin),
    );

    app.use(cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, false);
        }
        if (corsAllowedOrigins.has(origin) || isAllowedUnconfiguredNetworkOrigin(origin)) {
          return callback(null, true);
        }

        const error = new Error('Origin is not allowed by CORS.');
        error.status = 403;
        return callback(error);
      },
      credentials: true,
    }));
    app.use(express.json());
    app.use(configRouter);
    app.use(healthRouter);
    app.use(memoriesRouter);
    app.use(recordsRouter);
    app.use(remindersRouter);
    app.use(telegramRouter);
    app.get(['/login', '/today', '/record/new', '/approve', '/chat'], (req, res, next) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'), (error) => {
        if (error) {
          next(error);
        }
      });
    });
    app.use(express.static(path.join(__dirname, '..', 'public')));
    app.use(apiErrorHandler);

    const server = app.listen(port, () => {
      console.log(`Family Calendar API listening on port ${port}`);
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY
        || SUPABASE_SERVICE_ROLE_KEY === SUPABASE_ANON_KEY) {
        console.error('Reminder scheduler not started: server-side Supabase credentials are missing or unsafe.');
        return;
      }

      try {
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: false,
          },
        });
        startReminderScheduler(supabaseAdmin);
      } catch (error) {
        console.error('Reminder scheduler startup failed:', error);
      }
    });

    server.on('error', (error) => {
      console.error('Failed to start server:', error);
      process.exitCode = 1;
    });

    return server;
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exitCode = 1;
    return null;
  }
}

startServer();
