const NO_MEMORY_ANSWER = '在家庭記憶中找不到相關紀錄';

function analyze(query, memories) {
  if (!Array.isArray(memories)) {
    throw new TypeError('Memories must be an array.');
  }
  if (memories.length === 0) {
    return { answer: NO_MEMORY_ANSWER, citations: [] };
  }

  return {
    answer: `根據家庭記憶：${memories[0].content.slice(0, 200)} [引用: ${memories[0].source_file_name}]`,
    citations: memories.map((memory) => memory.id),
  };
}

module.exports = { analyze, NO_MEMORY_ANSWER };
