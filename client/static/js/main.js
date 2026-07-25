import { generateCandidates } from "./api.js";
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

function setPendingAddition(value) {
  state.pendingAddition = value;
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

  setPendingAddition(chooseAdditionForSelectedMethod(getLatestTable()));
}

async function handlePredict() {
  const topK = readTopK(elements);
  const nextText = `${state.currentText}${state.pendingAddition}`;
  const addedText = state.pendingAddition;

  if (!nextText) {
    window.alert("追加する文字列を入力してください。");
    return;
  }

  state.isLoading = true;
  setStatus(elements, "推論中");
  renderApp(elements, state);

  try {
    const response = await generateCandidates(nextText, topK);
    addHistoryStep(state, {
      inputText: nextText,
      tokens: response.tokens,
      table: response.table,
      addedText,
    });
    state.currentText = nextText;
    state.latestResponse = response;
    state.pendingAddition = chooseAdditionForSelectedMethod(response.table);
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

function getLatestTable() {
  return state.latestResponse?.table || [];
}

elements.additionInput.addEventListener("input", (event) => {
  selectMethod("input");
  state.pendingAddition = event.target.value;
  renderApp(elements, state);
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
  setPendingAddition(chooseGreedyToken(getLatestTable()));
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
  setPendingAddition("");
});

elements.inputModeButton.addEventListener("click", () => {
  selectMethod("input");
  renderApp(elements, state);
  elements.additionInput.focus();
});

elements.tableBody.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-token]");
  if (!row) {
    return;
  }
  selectMethod("select");
  setPendingAddition(row.dataset.token);
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
