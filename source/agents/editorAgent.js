function validateAndFormat(analystResult, memories) {
  if (!analystResult || typeof analystResult.answer !== 'string' || !Array.isArray(memories)) {
    throw new TypeError('A valid analyst result and memory list are required.');
  }

  if (!analystResult.answer.includes('[引用:') && !analystResult.answer.includes('引用:')) {
    return {
      blocked: true,
      answer: 'AI嘗試老作，已阻擋',
      reason: 'missing citation',
    };
  }

  return { blocked: false, answer: analystResult.answer };
}

module.exports = { validateAndFormat };
