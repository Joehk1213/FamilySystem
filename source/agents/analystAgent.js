const NO_MEMORY_ANSWER = '在家庭記憶中找不到相關紀錄，請先在 /chat 儲存。';

function analyze(query, memories) {
  if (!Array.isArray(memories)) {
    throw new TypeError('Memories must be an array.');
  }
  if (memories.length === 0) {
    return {
      answer: NO_MEMORY_ANSWER,
      citations: [],
      usedMemoryIds: [],
    };
  }

  const firstMemory = memories[0];
  const sourceFile = firstMemory.source_file || '家庭記憶';
  const usedMemoryIds = memories.map((memory) => memory.id);
  return {
    answer: `根據家庭記憶：${firstMemory.content.slice(0, 200)} [引用: ${sourceFile}]`,
    citations: usedMemoryIds,
    usedMemoryIds,
  };
}

module.exports = { analyze, NO_MEMORY_ANSWER };
