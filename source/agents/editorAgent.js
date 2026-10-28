function validateAndFormat(analystResult, memories) {
  if (!analystResult || typeof analystResult.answer !== 'string' || !Array.isArray(memories)) {
    throw new TypeError('A valid analyst result and memory list are required.');
  }

  if (!analystResult.answer.includes('[引用:') && !analystResult.answer.includes('引用:')) {
    return {
      blocked: true,
      answer: 'AI嘗試老作，已阻擋',
      reason: 'missing citation',
      final: '',
    };
  }

  return {
    blocked: false,
    final: analystResult.answer,
    citations: analystResult.citations || [],
  };
}

module.exports = { validateAndFormat };
