function apiErrorHandler(error, req, res, next) {
  try {
    if (res.headersSent) {
      return next(error);
    }

    console.error('Unhandled API request error:', error);

    if (error.type === 'entity.too.large') {
      return res.status(413).json({
        success: false,
        data: null,
        message: 'The uploaded file exceeds the 10 MB limit.',
      });
    }

    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'The request body contains invalid JSON.',
      });
    }

    const status = Number.isInteger(error.status) && error.status >= 400
      ? error.status
      : 500;
    return res.status(status).json({
      success: false,
      data: null,
      message: 'The request could not be completed.',
    });
  } catch (handlerError) {
    console.error('API error response failed:', handlerError);
    return res.status(500).json({
      success: false,
      data: null,
      message: 'The request could not be completed.',
    });
  }
}

module.exports = apiErrorHandler;
