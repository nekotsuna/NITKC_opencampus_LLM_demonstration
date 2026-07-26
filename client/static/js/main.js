import { generateCandidates, tokenizeText } from "./api.js";
import {
  addHistoryStep,
  createInitialState,
  moveHistory,
} from "./state.js";
import {
  chooseGreedyToken,
  chooseRandomToken,
  chooseWeightedToken,
} from "./tokenSelection.js";
import {
  getElements,
  readTopK,
  renderApp,
  setStatus,
} from "./ui.js";

const elements = getElements();
const state = createInitialState();
const METHODS_WITH_USER_INPUT = new Set(["input", "select"]);
const BEGIN_OF_TEXT_TOKEN = "<|begin_of_text|>";

function setPendingAdditionFromToken(tokenItem) {
  if (!tokenItem) {
    state.pendingAddition = "";
    state.pendingAdditionTokens = [];
    renderApp(elements, state);
    return;
  }

  state.pendingAddition = tokenItem.token;
  state.pendingAdditionTokens = [
    {
      token_id: tokenItem.token_id,
      token: tokenItem.token,
    },
  ];
  renderApp(elements, state);
}

function setPendingAdditionFromText(value) {
  state.pendingAddition = value;
  state.pendingAdditionTokens = null;
  renderApp(elements, state);
}

function selectMethod(method) {
  state.selectedMethod = method;
}

function focusAdditionInputForInputMode() {
  if (state.selectedMethod === "input") {
    elements.additionInput.focus();
  }
}

function readWeightTopPercent() {
  const parsedValue = Number.parseInt(elements.weightTopPercentInput.value, 10);
  if (Number.isNaN(parsedValue)) {
    return 100;
  }
  return Math.min(100, Math.max(1, parsedValue));
}

function readRandomRankRange() {
  return {
    startRank: Number.parseInt(elements.randomStartInput.value, 10),
    endRank: Number.parseInt(elements.randomEndInput.value, 10),
  };
}

function chooseAdditionForSelectedMethod(table) {
  const chooser = METHOD_CHOOSERS[state.selectedMethod];
  return chooser ? chooser(table) : "";
}

const METHOD_CHOOSERS = {
  greedy: (table) => chooseGreedyToken(table),
  weight: (table) => chooseWeightedToken(table, readWeightTopPercent()),
  random: (table) => {
    const { startRank, endRank } = readRandomRankRange();
    return chooseRandomToken(table, startRank, endRank);
  },
  select: () => "",
  input: () => "",
};

function updateSelectedMethodAddition() {
  if (METHODS_WITH_USER_INPUT.has(state.selectedMethod)) {
    renderApp(elements, state);
    return;
  }

  setPendingAdditionFromToken(chooseAdditionForSelectedMethod(getLatestTable()));
}

async function handlePredict() {
  const topK = readTopK(elements);
  const addedText = state.pendingAddition;

  state.isLoading = true;
  setStatus(elements, "推論中");
  renderApp(elements, state);

  try {
    const addedTokens = await resolvePendingAdditionTokens();
    const nextTokens = [...state.currentTokens, ...addedTokens];
    if (nextTokens.length === 0) {
      window.alert("追加する文字列を入力してください。");
      return;
    }

    const response = await generateCandidates(nextTokens, topK);
    addHistoryStep(state, {
      decodedText: response.decoded_text,
      tokens: response.tokens,
      table: response.table,
      addedTokens,
      addedText,
    });
    state.currentText = response.decoded_text;
    state.currentTokens = response.tokens;
    state.latestResponse = response;
    setNextPendingAddition(response.table);
    setStatus(elements, "完了");
  } catch (error) {
    window.alert(error.message);
    setStatus(elements, "エラー");
  } finally {
    state.isLoading = false;
    renderApp(elements, state);
    focusAdditionInputForInputMode();
  }
}

async function resolvePendingAdditionTokens() {
  if (state.pendingAdditionTokens !== null) {
    return state.pendingAdditionTokens;
  }

  if (!state.pendingAddition) {
    return [];
  }

  const response = await tokenizeText(state.pendingAddition);
  return dropDuplicatedBeginOfTextToken(response.tokens);
}

function dropDuplicatedBeginOfTextToken(tokens) {
  if (state.currentTokens.length === 0 || tokens.length === 0) {
    return tokens;
  }

  const [firstToken, ...remainingTokens] = tokens;
  if (firstToken.token === BEGIN_OF_TEXT_TOKEN) {
    return remainingTokens;
  }

  return tokens;
}

function setNextPendingAddition(table) {
  const tokenItem = chooseAdditionForSelectedMethod(table);
  if (tokenItem) {
    state.pendingAddition = tokenItem.token;
    state.pendingAdditionTokens = [
      {
        token_id: tokenItem.token_id,
        token: tokenItem.token,
      },
    ];
    return;
  }

  state.pendingAddition = "";
  state.pendingAdditionTokens = METHODS_WITH_USER_INPUT.has(state.selectedMethod)
    ? null
    : [];
}

function getLatestTable() {
  return state.latestResponse?.table || [];
}

elements.additionInput.addEventListener("input", (event) => {
  selectMethod("input");
  setPendingAdditionFromText(event.target.value);
});

elements.topKInput.addEventListener("change", () => {
  elements.topKInput.value = readTopK(elements);
  renderApp(elements, state);
});

elements.predictButton.addEventListener("click", () => {
  handlePredict();
});

elements.greedyButton.addEventListener("click", () => {
  selectMethod("greedy");
  setPendingAdditionFromToken(chooseGreedyToken(getLatestTable()));
});

elements.weightButton.addEventListener("click", () => {
  selectMethod("weight");
  updateSelectedMethodAddition();
});

elements.randomButton.addEventListener("click", () => {
  selectMethod("random");
  updateSelectedMethodAddition();
});

function handleWeightTopPercentChange() {
  elements.weightTopPercentInput.value = readWeightTopPercent();
  if (state.selectedMethod !== "weight") {
    return;
  }

  updateSelectedMethodAddition();
}

elements.weightTopPercentInput.addEventListener(
  "input",
  handleWeightTopPercentChange,
);
elements.weightTopPercentInput.addEventListener(
  "change",
  handleWeightTopPercentChange,
);

elements.randomStartInput.addEventListener("change", () => {
  if (state.selectedMethod !== "random") {
    return;
  }

  updateSelectedMethodAddition();
});

elements.randomEndInput.addEventListener("change", () => {
  if (state.selectedMethod !== "random") {
    return;
  }

  updateSelectedMethodAddition();
});

elements.selectButton.addEventListener("click", () => {
  selectMethod("select");
  setPendingAdditionFromToken(null);
});

elements.inputModeButton.addEventListener("click", () => {
  selectMethod("input");
  setPendingAdditionFromText(state.pendingAddition);
  elements.additionInput.focus();
});

elements.tableBody.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-token]");
  if (!row) {
    return;
  }
  selectMethod("select");
  setPendingAdditionFromToken({
    token_id: Number.parseInt(row.dataset.tokenId, 10),
    token: row.dataset.token,
  });
});

elements.previousButton.addEventListener("click", () => {
  moveHistory(state, state.currentHistoryIndex - 1);
  renderApp(elements, state);
});

elements.nextButton.addEventListener("click", () => {
  moveHistory(state, state.currentHistoryIndex + 1);
  renderApp(elements, state);
});

renderApp(elements, state);
