
const STORAGE_KEY = "v4_terminal_data";

function loadState() {

  try {

    return JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    ) || {};

  } catch {

    return {};

  }

}

function saveState(state) {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );

}

function saveChartState(chartId, data) {

  const state = loadState();

  state[chartId] = {
    ...(state[chartId] || {}),
    ...data
  };

  saveState(state);

}

function getChartState(chartId) {

  const state = loadState();

  return state[chartId] || {};

}
