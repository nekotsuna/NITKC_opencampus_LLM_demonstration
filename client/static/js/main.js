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

function setPendingAddition(value) {
  state.pendingAddition = value;
  renderApp(elements, state);
}

function selectMethod(method) {
  state.selectedMethod = method;
}

function chooseAdditionForSelectedMethod(table) {
  if (state.selectedMethod === "greedy") {
    return chooseGreedyToken(table);
  }

  if (state.selectedMethod === "weight") {
    return chooseWeightedToken(table);
  }

  if (state.selectedMethod === "random") {
    const startRank = Number.parseInt(elements.randomStartInput.value, 10);
    const endRank = Number.parseInt(elements.randomEndInput.value, 10);
    return chooseRandomToken(table, startRank, endRank);
  }

  // Selectはユーザーがテーブルから選ぶ方式、Inputはユーザーが直接入力する方式なので、
  // 新しい候補を取得した直後は追加予定文字列を空にします。
  return "";
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
  setPendingAddition(chooseWeightedToken(getLatestTable()));
});

elements.randomButton.addEventListener("click", () => {
  selectMethod("random");
  const startRank = Number.parseInt(elements.randomStartInput.value, 10);
  const endRank = Number.parseInt(elements.randomEndInput.value, 10);
  setPendingAddition(chooseRandomToken(getLatestTable(), startRank, endRank));
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
