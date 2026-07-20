export async function generateCandidates(text, topK) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
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
