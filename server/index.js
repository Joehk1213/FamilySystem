function startServer() {
  try {
    const hasPublicSupabaseConfig = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'FAMILY_ID',
    ].every((key) => process.env[key]);
    if (!hasPublicSupabaseConfig) {
      require('dotenv').config({
        path: process.env.DOTENV_CONFIG_PATH || '.env',
      });
    }

    const cors = require('cors');
    const express = require('express');
    const path = require('path');
    const configRouter = require('./routes/config');
    const healthRouter = require('./routes/health');
    const memoriesRouter = require('./routes/memories');
    const recordsRouter = require('./routes/records');
    const remindersRouter = require('./routes/reminders');
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
