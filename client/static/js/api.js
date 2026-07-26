export async function generateCandidates(tokens, topK) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tokens,
      top_k: topK,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const detail = errorBody.detail || `HTTPエラー: ${response.status}`;
    throw new Error(detail);
  }

  return response.json();
}

export async function tokenizeText(text) {
  const response = await fetch("/api/tokenize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const detail = errorBody.detail || `HTTPエラー: ${response.status}`;
    throw new Error(detail);
  }

  return response.json();
}
