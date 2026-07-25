export function chooseGreedyToken(table) {
  return table.length > 0 ? table[0].token : "";
}

export function chooseWeightedToken(table, topPercent = 100) {
  const candidates = filterTopCumulativeProbability(table, topPercent);
  const totalWeight = candidates.reduce((sum, row) => sum + row.probability, 0);
  if (totalWeight <= 0) {
    return chooseGreedyToken(candidates);
  }

  let threshold = Math.random() * totalWeight;
  for (const row of candidates) {
    threshold -= row.probability;
    if (threshold <= 0) {
      return row.token;
    }
  }

  return candidates[candidates.length - 1]?.token || "";
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

function filterTopCumulativeProbability(table, topPercent) {
  if (table.length === 0) {
    return [];
  }

  const normalizedPercent = Math.min(100, Math.max(1, topPercent));
  const probabilityLimit = normalizedPercent / 100;
  const candidates = [];
  let cumulativeProbability = 0;

  for (const row of table) {
    candidates.push(row);
    cumulativeProbability += row.probability;
    if (cumulativeProbability >= probabilityLimit) {
      break;
    }
  }

  return candidates;
}
