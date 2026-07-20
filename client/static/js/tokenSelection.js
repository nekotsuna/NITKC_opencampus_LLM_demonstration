export function chooseGreedyToken(table) {
  return table.length > 0 ? table[0].token : "";
}

export function chooseWeightedToken(table) {
  const totalWeight = table.reduce((sum, row) => sum + row.probability, 0);
  if (totalWeight <= 0) {
    return chooseGreedyToken(table);
  }

  let threshold = Math.random() * totalWeight;
  for (const row of table) {
    threshold -= row.probability;
    if (threshold <= 0) {
      return row.token;
    }
  }

  return table[table.length - 1]?.token || "";
}

export function chooseRandomToken(table, startRank, endRank) {
  const normalizedStart = Math.max(1, Math.min(startRank, endRank));
  const normalizedEnd = Math.min(table.length, Math.max(startRank, endRank));
  const candidates = table.filter((row) => {
    return row.rank >= normalizedStart && row.rank <= normalizedEnd;
  });

  if (candidates.length === 0) {
    return "";
  }

  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index].token;
}
