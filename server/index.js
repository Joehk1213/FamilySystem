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

    app.use(cors());
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
