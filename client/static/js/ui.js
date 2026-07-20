export function getElements() {
  return {
    tokenDisplay: document.querySelector("#token-display"),
    topKInput: document.querySelector("#top-k-input"),
    additionInput: document.querySelector("#addition-input"),
    predictButton: document.querySelector("#predict-button"),
    tableTitle: document.querySelector("#table-title"),
    statusMessage: document.querySelector("#status-message"),
    tableBody: document.querySelector("#candidate-table-body"),
    greedyButton: document.querySelector("#greedy-button"),
    weightButton: document.querySelector("#weight-button"),
    randomButton: document.querySelector("#random-button"),
    randomStartInput: document.querySelector("#random-start-input"),
    randomEndInput: document.querySelector("#random-end-input"),
    inputModeButton: document.querySelector("#input-mode-button"),
    previousButton: document.querySelector("#previous-button"),
    nextButton: document.querySelector("#next-button"),
    historyPosition: document.querySelector("#history-position"),
  };
}

export function readTopK(elements) {
  const parsedValue = Number.parseInt(elements.topKInput.value, 10);
  if (Number.isNaN(parsedValue)) {
    return 10;
  }
  return Math.min(256, Math.max(1, parsedValue));
}

export function renderApp(elements, state) {
  renderTokenDisplay(elements, state);
  renderCandidateTable(elements, state.latestResponse?.table || []);
  renderHistoryPosition(elements, state);
  elements.tableTitle.textContent = `Top-${readTopK(elements)}`;
  elements.additionInput.value = state.pendingAddition;
  elements.predictButton.disabled = state.isLoading;
}

export function renderTokenDisplay(elements, state) {
  elements.tokenDisplay.replaceChildren();

  const committedTokens = state.latestResponse?.tokens || textToDisplayTokens(state.currentText);
  if (committedTokens.length === 0 && !state.pendingAddition) {
    const placeholder = document.createElement("span");
    placeholder.className = "placeholder";
    placeholder.textContent = "入力待ち";
    elements.tokenDisplay.append(placeholder);
    return;
  }

  committedTokens.forEach((tokenItem, index) => {
    const tokenElement = document.createElement("span");
    tokenElement.className = "token";
    tokenElement.textContent = tokenItem.token;
    if (index === committedTokens.length - 1) {
      tokenElement.classList.add("token-added");
    }
    elements.tokenDisplay.append(tokenElement);
  });

  if (state.pendingAddition) {
    const previewElement = document.createElement("span");
    previewElement.className = "token token-preview";
    previewElement.textContent = state.pendingAddition;
    elements.tokenDisplay.append(previewElement);
  }
}

export function renderCandidateTable(elements, table) {
  elements.tableBody.replaceChildren();

  table.forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = "selectable-row";
    tr.dataset.token = row.token;

    const rankCell = document.createElement("td");
    rankCell.textContent = row.rank;

    const tokenCell = document.createElement("td");
    tokenCell.textContent = row.token;

    const probabilityCell = document.createElement("td");
    probabilityCell.textContent = `${(row.probability * 100).toFixed(2)}%`;

    tr.append(rankCell, tokenCell, probabilityCell);
    elements.tableBody.append(tr);
  });
}

export function renderHistoryPosition(elements, state) {
  const current = state.currentHistoryIndex + 1;
  const total = state.history.length;
  elements.historyPosition.textContent = `${current} / ${total}`;
  elements.previousButton.disabled = state.currentHistoryIndex <= 0;
  elements.nextButton.disabled = state.currentHistoryIndex >= total - 1;
}

export function setStatus(elements, message) {
  elements.statusMessage.textContent = message;
}

function textToDisplayTokens(text) {
  if (!text) {
    return [];
  }

  const pieces = text.trim().includes(" ") ? text.trim().split(/\s+/) : Array.from(text);
  return pieces.map((token, index) => ({
    token_id: index + 1,
    token,
  }));
}
