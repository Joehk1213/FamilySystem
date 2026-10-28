import json
import os
import sys
from pathlib import Path

MAX_BATCH_SIZE = 64
MAX_TEXT_LENGTH = 12000
EMBEDDING_DIMENSIONS = 512
DEFAULT_MODEL_PATH = Path(
    r"C:\docker-data\family\rag\models\bge-small-zh-v1.5"
)


def read_texts():
    request = json.load(sys.stdin)
    texts = request.get("texts") if isinstance(request, dict) else request
    if not isinstance(texts, list) or not 1 <= len(texts) <= MAX_BATCH_SIZE:
        raise ValueError(f"Provide between 1 and {MAX_BATCH_SIZE} texts.")
    for text in texts:
        if not isinstance(text, str) or not text.strip():
            raise ValueError("Each text must be a non-empty string.")
        if len(text) > MAX_TEXT_LENGTH:
            raise ValueError(f"Each text must be no more than {MAX_TEXT_LENGTH} characters.")
    return texts


def main():
    texts = read_texts()
    model_path = Path(os.environ.get("FAMILY_RAG_MODEL_PATH", str(DEFAULT_MODEL_PATH)))
    if not model_path.is_dir():
        raise FileNotFoundError(f"Local BGE model directory does not exist: {model_path}")

    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(
        str(model_path),
        device="cpu",
        model_kwargs={"local_files_only": True},
    )
    vectors = model.encode(
        texts,
        batch_size=min(len(texts), MAX_BATCH_SIZE),
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    if vectors.shape != (len(texts), EMBEDDING_DIMENSIONS):
        raise ValueError(
            f"The local model must return {EMBEDDING_DIMENSIONS} dimensions per text."
        )
    json.dump(vectors.tolist(), sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Embedding worker failed: {error}", file=sys.stderr)
        sys.exit(1)
