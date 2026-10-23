const express = require('express');

const router = express.Router();

router.get('/api/health', (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
      message: 'Health check successful',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'Health check failed',
    });
  }
});

module.exports = router;
