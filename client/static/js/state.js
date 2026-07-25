export function createInitialState() {
  return {
    currentText: "",
    pendingAddition: "",
    selectedMethod: "input",
    latestResponse: null,
    history: [],
    currentHistoryIndex: -1,
    isLoading: false,
  };
}

export function trimFutureHistory(state) {
  // 巻き戻し後に新しい推論をした場合、仕様どおり未来の履歴を削除します。
  if (state.currentHistoryIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.currentHistoryIndex + 1);
  }
}

export function addHistoryStep(state, step) {
  trimFutureHistory(state);
  state.history.push(step);
  state.currentHistoryIndex = state.history.length - 1;
}

export function moveHistory(state, nextIndex) {
  const step = state.history[nextIndex];
  if (!step) {
    return;
  }

  state.currentHistoryIndex = nextIndex;
  state.currentText = step.inputText;
  state.pendingAddition = "";
  state.latestResponse = {
    tokens: step.tokens,
    table: step.table,
  };
}
