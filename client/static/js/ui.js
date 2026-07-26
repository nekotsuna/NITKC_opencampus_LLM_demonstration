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
    weightTopPercentInput: document.querySelector("#weight-top-percent-input"),
    randomButton: document.querySelector("#random-button"),
    methodProperties: document.querySelector("#method-properties"),
    methodPropertyPanels: document.querySelectorAll("[data-property-panel]"),
    randomStartInput: document.querySelector("#random-start-input"),
    randomEndInput: document.querySelector("#random-end-input"),
    selectButton: document.querySelector("#select-button"),
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
  renderSelectedMethod(elements, state.selectedMethod);
  elements.tableTitle.textContent = `Top-${readTopK(elements)}`;
  elements.additionInput.value = state.pendingAddition;
  elements.predictButton.disabled = state.isLoading;
}

export function renderTokenDisplay(elements, state) {
  elements.tokenDisplay.replaceChildren();

  const committedTokens = state.currentTokens;
  const currentStep = state.history[state.currentHistoryIndex];
  const addedTokenStartIndex = findAddedTokenStartIndexFromStep(
    committedTokens,
    currentStep,
  );

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
    if (index >= addedTokenStartIndex) {
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
    tr.dataset.tokenId = row.token_id;
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

function renderSelectedMethod(elements, selectedMethod) {
  const methodButtons = {
    greedy: elements.greedyButton,
    weight: elements.weightButton,
    random: elements.randomButton,
    select: elements.selectButton,
    input: elements.inputModeButton,
  };

  Object.entries(methodButtons).forEach(([method, button]) => {
    const isSelected = method === selectedMethod;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  let hasVisiblePanel = false;
  elements.methodPropertyPanels.forEach((panel) => {
    const isSelectedPanel = panel.dataset.propertyPanel === selectedMethod;
    panel.hidden = !isSelectedPanel;
    hasVisiblePanel = hasVisiblePanel || isSelectedPanel;
  });
  elements.methodProperties.hidden = !hasVisiblePanel;
}

function findAddedTokenStartIndexFromStep(tokens, step) {
  if (!step || tokens.length === 0) {
    return tokens.length;
  }

  if (step.addedTokens?.length > 0) {
    return Math.max(0, tokens.length - step.addedTokens.length);
  }

  const addedText = step.addedText || "";
  if (!addedText) {
    return tokens.length;
  }

  const trimmedAddedText = addedText.trim();
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const suffixTokens = tokens.slice(index).map((tokenItem) => tokenItem.token);

    // 実際のTokenizerは空白を含むトークンを返すことがあります。
    // Dummy tokenizerは空白区切りの入力を単語トークンとして返すため、
    // 連結一致と空白区切り一致の両方で追加範囲を判定します。
    if (
      suffixTokens.join("") === addedText ||
      suffixTokens.join(" ") === trimmedAddedText
    ) {
      return index;
    }
  }

  return tokens.length - 1;
}
