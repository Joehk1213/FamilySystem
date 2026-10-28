const fs = require('fs');
const path = require('path');

const EMBEDDING_DIMENSIONS = 384;
const MODEL_EMBEDDING_DIMENSIONS = 512;
const MAX_BATCH_SIZE = 64;
const MAX_TEXT_LENGTH = 12000;
const MODEL_NAME = 'bge-small-zh-v1.5';
const PLACEHOLDER_MODE = 'local-feature-hash-placeholder';
let embeddingMode = PLACEHOLDER_MODE;
let embeddingDimensions = EMBEDDING_DIMENSIONS;
let modelLoadPromise;

function getModelPath() {
  if (process.env.FAMILY_RAG_MODEL_PATH) {
    return path.resolve(process.env.FAMILY_RAG_MODEL_PATH);
  }

  return 'C:\\docker-data\\family-rag\\models';
}

function isPlaceholder() {
  return embeddingMode === PLACEHOLDER_MODE;
}

function getEmbeddingInfo() {
  return {
    model: MODEL_NAME,
    mode: embeddingMode,
    modelPath: getModelPath(),
    dimensions: embeddingDimensions,
    metric: 'cosine',
    maxBatchSize: MAX_BATCH_SIZE,
  };
}

function hashFeature(feature) {
  let hash = 2166136261;
  for (let index = 0; index < feature.length; index += 1) {
    hash ^= feature.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function addFeature(vector, feature, weight) {
  const hash = hashFeature(feature);
  const dimension = hash % EMBEDDING_DIMENSIONS;
  const sign = hash & 0x80000000 ? -1 : 1;
  vector[dimension] += sign * weight;
}

function normalizeVector(values, dimensions = EMBEDDING_DIMENSIONS) {
  if (values.length !== dimensions
    || values.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`The embedding must contain ${dimensions} finite values.`);
  }

  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) {
    throw new TypeError('The embedding vector must have a non-zero magnitude.');
  }
  return values.map((value) => value / magnitude);
}

function embedWithPlaceholder(text) {
  const vector = Array(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];

  for (const token of tokens) {
    if (/\p{Script=Han}/u.test(token)) {
      const characters = Array.from(token);
      for (let index = 0; index < characters.length; index += 1) {
        addFeature(vector, `zh:${characters[index]}`, 0.5);
        if (index + 1 < characters.length) {
          addFeature(vector, `zh:${characters[index]}${characters[index + 1]}`, 1);
        }
      }
    } else {
      addFeature(vector, `word:${token}`, 1);
    }
  }

  return normalizeVector(vector);
}

function reportPlaceholder(reason) {
  embeddingMode = PLACEHOLDER_MODE;
  embeddingDimensions = EMBEDDING_DIMENSIONS;
  console.warn(
    `using placeholder; bge-small-zh-v1.5 could not be loaded from ${getModelPath()}. ${reason}`,
  );
}

async function loadLocalModel() {
  if (!modelLoadPromise) {
    modelLoadPromise = (async () => {
      try {
        const modelPath = getModelPath();
        if (!fs.existsSync(modelPath) || !fs.statSync(modelPath).isDirectory()) {
          reportPlaceholder('the local model directory does not exist');
          return null;
        }

        const { env, pipeline } = await import('@xenova/transformers');
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        env.localModelPath = path.dirname(modelPath);

        const extractor = await pipeline(
          'feature-extraction',
          path.basename(modelPath),
          { pooling: 'mean', normalize: true },
        );
        const probe = await extractor('dimension check', { pooling: 'mean', normalize: true });
        normalizeVector(Array.from(probe.data), MODEL_EMBEDDING_DIMENSIONS);
        embeddingMode = 'local-bge-small-zh-v1.5';
        embeddingDimensions = MODEL_EMBEDDING_DIMENSIONS;
        return extractor;
      } catch (error) {
        reportPlaceholder(error.message || String(error));
        return null;
      }
    })();
  }
  return modelLoadPromise;
}

async function embedTexts(texts) {
  if (!Array.isArray(texts) || texts.length < 1 || texts.length > MAX_BATCH_SIZE) {
    throw new RangeError(`Embedding batches must contain between 1 and ${MAX_BATCH_SIZE} texts.`);
  }

  for (const text of texts) {
    if (typeof text !== 'string' || !text.trim()) {
      throw new TypeError('Text to embed must be a non-empty string.');
    }
    if (text.length > MAX_TEXT_LENGTH) {
      throw new RangeError(`Text to embed must be no more than ${MAX_TEXT_LENGTH} characters.`);
    }
  }

  const extractor = await loadLocalModel();
  const embeddings = [];
  for (const text of texts) {
    if (extractor) {
      try {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        embeddings.push(normalizeVector(Array.from(output.data), MODEL_EMBEDDING_DIMENSIONS));
        continue;
      } catch (error) {
        modelLoadPromise = Promise.resolve(null);
        reportPlaceholder(`Inference failed: ${error.message || String(error)}`);
      }
    }
    embeddings.push(embedWithPlaceholder(text));
  }

  return embeddings;
}

async function embedText(text) {
  const [embedding] = await embedTexts([text]);
  return embedding;
}

module.exports = {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODE: PLACEHOLDER_MODE,
  MAX_BATCH_SIZE,
  MAX_TEXT_LENGTH,
  MODEL_NAME,
  embedText,
  embedTexts,
  getEmbeddingInfo,
  getModelPath,
  isPlaceholder,
};
