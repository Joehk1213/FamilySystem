function startServer() {
  try {
    require('dotenv').config();

    const cors = require('cors');
    const express = require('express');
    const path = require('path');
    const configRouter = require('./routes/config');
    const healthRouter = require('./routes/health');
    const recordsRouter = require('./routes/records');
    const telegramRouter = require('./routes/telegram');
    const apiErrorHandler = require('./middleware/apiErrorHandler');
    const app = express();
    const port = process.env.PORT || 3002;

    app.use(cors());
    app.use(express.json());
    app.use(configRouter);
    app.use(healthRouter);
    app.use(recordsRouter);
    app.use(telegramRouter);
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
