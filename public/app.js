const elements = {
  views: {
    home: document.getElementById("view-home"),
    create: document.getElementById("view-create"),
    join: document.getElementById("view-join"),
    lobby: document.getElementById("view-lobby"),
    countdown: document.getElementById("view-countdown"),
    trickster: document.getElementById("view-trickster"),
    question: document.getElementById("view-question"),
    voting: document.getElementById("view-voting"),
    reveal: document.getElementById("view-reveal"),
    leaderboard: document.getElementById("view-leaderboard"),
    gameover: document.getElementById("view-gameover"),
  },
  nameInput: document.getElementById("playerName"),
  roundInput: document.getElementById("roundCount"),
  modeInputs: document.querySelectorAll("input[name='modeOptions']"),
  answerTimeInput: document.getElementById("answerTime"),
  voteTimeInput: document.getElementById("voteTime"),
  joinCodeInput: document.getElementById("joinCode"),
  lobbyCode: document.getElementById("lobbyCode"),
  roundInfo: document.getElementById("roundInfo"),
  modeInfo: document.getElementById("modeInfo"),
  playersNeeded: document.getElementById("playersNeeded"),
  playerList: document.getElementById("playerList"),
  startGameBtn: document.getElementById("startGameBtn"),
  leaveLobbyBtn: document.getElementById("leaveLobbyBtn"),
  countdownValue: document.getElementById("countdownValue"),
  currentRound: document.getElementById("currentRound"),
  totalRounds: document.getElementById("totalRounds"),
  tricksterName: document.getElementById("tricksterName"),
  tricksterContinueBtn: document.getElementById("tricksterContinueBtn"),
  questionTitle: document.getElementById("questionTitle"),
  questionPrompt: document.getElementById("questionPrompt"),
  questionInstruction: document.getElementById("questionInstruction"),
  instructionTrickster: document.getElementById("instructionTrickster"),
  answerTimerDisplay: document.getElementById("answerTimer"),
  roundLabel: document.getElementById("roundLabel"),
  roundTotalLabel: document.getElementById("roundTotalLabel"),
  answerInput: document.getElementById("answerInput"),
  submitAnswerBtn: document.getElementById("submitAnswerBtn"),
  questionWaitingBtn: document.getElementById("questionWaitingBtn"),
  voteRoundLabel: document.getElementById("voteRoundLabel"),
  voteRoundTotal: document.getElementById("voteRoundTotal"),
  voteTimerDisplay: document.getElementById("voteTimer"),
  voteOptions: document.getElementById("voteOptions"),
  voteStatus: document.getElementById("voteStatus"),
  revealList: document.getElementById("revealList"),
  leaderboard: document.getElementById("leaderboard"),
  leaderboardRound: document.getElementById("leaderboardRound"),
  leaderboardFooter: document.getElementById("leaderboardFooter"),
  podiumFirst: document.getElementById("podium-first"),
  podiumSecond: document.getElementById("podium-second"),
  podiumThird: document.getElementById("podium-third"),
  podiumRest: document.getElementById("podium-rest"),
  backToHomeBtn: document.getElementById("backToHomeBtn"),
  toastContainer: document.getElementById("toastContainer"),
  categorySection: document.getElementById("categorySection"),
  categoryOptions: document.getElementById("categoryOptions"),
  categoryHint: document.getElementById("categoryHint"),
  customLobbySection: document.getElementById("customLobbySection"),
  customInstruction: document.getElementById("customInstruction"),
  customQuestionInputs: document.getElementById("customQuestionInputs"),
  customQuestionSubmitBtn: document.getElementById("customQuestionSubmitBtn"),
  customSubmitStatus: document.getElementById("customSubmitStatus"),
  customProgressList: document.getElementById("customProgressList"),
};

const viewButtons = document.querySelectorAll("[data-target-view]");
const startCreateBtn = document.getElementById("startCreateBtn");
const joinCodeBtn = document.getElementById("joinCodeBtn");

const DEFAULT_CATEGORY_ID = "freestart";
const DEFAULT_CATEGORY_LABEL = "FreeSet/Start";
const FALLBACK_CATEGORIES = [
  {
    id: DEFAULT_CATEGORY_ID,
    label: DEFAULT_CATEGORY_LABEL,
    description: "Perfekter Mix für den Einstieg.",
  },
  {
    id: "spicy",
    label: "Ü18 / Spicy",
    description: "Würzige Fragen für mutige Runden.",
  },
  {
    id: "what-about-you",
    label: "What about you?",
    description: "Persönliche Fragen für tiefe Gespräche.",
  },
];

const state = {
  ws: null,
  connected: false,
  playerId: null,
  isHost: false,
  mode: "normal",
  isTrickster: false,
  lobbyCode: null,
  roundCount: null,
  players: [],
  phase: "home",
  roundCurrent: 0,
  tricksterId: null,
  tricksterName: null,
  awaitingAcknowledgements: new Set(),
  answers: [],
  voteOptions: [],
  voteSubmitted: false,
  answerSubmitted: false,
  answerDuration: 90,
  voteDuration: 20,
  answerTimerInterval: null,
  voteTimerInterval: null,
  answerTimeLeft: 0,
  voteTimeLeft: 0,
  questionCategoryId: DEFAULT_CATEGORY_ID,
  questionCategoryLabel: DEFAULT_CATEGORY_LABEL,
  availableCategories: [...FALLBACK_CATEGORIES],
  customQuestionProgress: [],
  customQuestionsRequired: 0,
  customQuestionsSaved: [],
  customQuestionDrafts: [],
  customSubmitInFlight: false,
};

if (elements.categoryOptions) {
  elements.categoryOptions.addEventListener("change", (event) => {
    const target = event.target;
    if (target && target.matches("input[name='questionCategory']")) {
      handleCategoryChange(target.value, target.dataset.label || "");
    }
  });
}

function showView(viewKey) {
  Object.entries(elements.views).forEach(([key, view]) => {
    view.classList.toggle("active", key === viewKey);
  });
  state.phase = viewKey;
  if (viewKey !== "lobby") {
    updateCustomLobbySectionVisibility();
  }
}

function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host || `${window.location.hostname}:${window.location.port || 3000}`;
  const wsUrl = `${protocol}//${host}`;
  const ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    state.connected = true;
    showToast("Mit Spielserver verbunden.", "success");
  });

  ws.addEventListener("close", () => {
    state.connected = false;
    showToast("Verbindung zum Server verloren.", "danger");
    resetClientState();
    showView("home");
  });

  ws.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    } catch (error) {
      console.error("Ungültige Servernachricht", error);
    }
  });

  state.ws = ws;
}

function sendMessage(type, payload = {}) {
  if (!state.connected || state.ws?.readyState !== WebSocket.OPEN) {
    showToast("Keine Verbindung zum Server.", "danger");
    return;
  }
  state.ws.send(JSON.stringify({ type, ...payload }));
}

function showToast(message, type = "info") {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body text-white">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  const toastEl = wrapper.firstElementChild;
  elements.toastContainer.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3200 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

function requireName() {
  const name = elements.nameInput.value.trim();
  if (!name) {
    showToast("Bitte gib zuerst deinen Spielernamen ein.", "warning");
    elements.nameInput.focus();
    return null;
  }
  return name;
}

function resetClientState() {
  stopAnswerTimer();
  stopVoteTimer();
  state.playerId = null;
  state.isHost = false;
  state.mode = "normal";
  state.isTrickster = false;
  state.lobbyCode = null;
  state.roundCount = null;
  state.players = [];
  state.roundCurrent = 0;
  state.tricksterId = null;
  state.tricksterName = null;
  state.awaitingAcknowledgements = new Set();
  state.answers = [];
  state.voteOptions = [];
  state.voteSubmitted = false;
  state.answerSubmitted = false;
  state.answerDuration = 90;
  state.voteDuration = 20;
  state.answerTimeLeft = 0;
  state.voteTimeLeft = 0;

  elements.lobbyCode.textContent = "----";
  elements.roundInfo.textContent = "Runden: -- · Antwort: --s · Voting: --s";
  elements.playerList.innerHTML = "";
  elements.playersNeeded.textContent = "Mind. 3 Spieler";
  elements.countdownValue.textContent = "3";
  elements.currentRound.textContent = "1";
  elements.totalRounds.textContent = "1";
  elements.roundLabel.textContent = "1";
  elements.roundTotalLabel.textContent = "1";
  elements.voteRoundLabel.textContent = "1";
  elements.voteRoundTotal.textContent = "1";
  elements.voteOptions.innerHTML = "";
  elements.revealList.innerHTML = "";
  elements.leaderboard.innerHTML = "";
  elements.leaderboardRound.textContent = "Runde 1";
  elements.leaderboardFooter.textContent = "Nächster Trickster wird vorbereitet...";
  resetPodiumView();
  elements.answerTimerDisplay.textContent = "--";
  elements.answerInput.value = "";
  elements.answerInput.disabled = false;
  elements.submitAnswerBtn.disabled = false;
  elements.questionWaitingBtn.classList.add("d-none");
  elements.voteTimerDisplay.textContent = "--";
  elements.voteStatus.textContent = "";
  elements.voteSubmitted = false;
  elements.answerSubmitted = false;
  updateStartButton();
  if (elements.modeInputs) {
    elements.modeInputs.forEach((input) => {
      input.checked = input.value === "normal";
    });
  }
  if (elements.modeInfo) {
    elements.modeInfo.textContent = "Modus: --";
  }
  const defaultCategory = getCategoryMeta(DEFAULT_CATEGORY_ID) ?? state.availableCategories[0] ?? FALLBACK_CATEGORIES[0];
  state.questionCategoryId = defaultCategory?.id ?? DEFAULT_CATEGORY_ID;
  state.questionCategoryLabel = defaultCategory?.label ?? DEFAULT_CATEGORY_LABEL;
  selectCategoryInput(state.questionCategoryId);
  updateCategoryHintText(state.questionCategoryId);
  updateCategorySectionVisibility();
  updateModeInfoBadge();
  state.customQuestionProgress = [];
  state.customQuestionsRequired = 0;
  state.customQuestionsSaved = [];
  state.customQuestionDrafts = [];
  state.customSubmitInFlight = false;
  if (elements.customQuestionInputs) {
    elements.customQuestionInputs.innerHTML = "";
  }
  if (elements.customProgressList) {
    elements.customProgressList.innerHTML = "";
  }
  if (elements.customSubmitStatus) {
    elements.customSubmitStatus.textContent = "";
  }
  updateCustomLobbySectionVisibility();
}

function renderPlayers() {
  elements.playerList.innerHTML = "";
  state.players.forEach((player) => {
    const badge = document.createElement("span");
    badge.className = "pill-badge";
    const hostBadge = player.isHost ? '<span class="badge bg-danger">Host</span>' : "";
    const selfSuffix = player.id === state.playerId ? " (Du)" : "";
    badge.innerHTML = `<span>${player.name}${selfSuffix}</span>${hostBadge}`;
    elements.playerList.appendChild(badge);
  });

  const self = state.players.find((p) => p.id === state.playerId);
  state.isHost = Boolean(self?.isHost);
  const playersCount = state.players.length;
  const label = playersCount >= 3 ? `${playersCount} Spieler bereit` : `Noch ${3 - playersCount} Spieler`;
  elements.playersNeeded.textContent = label;
  updateStartButton();
}

function renderCustomLobbyState() {
  updateCustomLobbySectionVisibility();
  if (state.mode !== "custom" || state.phase !== "lobby") {
    return;
  }
  ensureCustomDraftSize();
  renderCustomQuestionInputs();
  renderCustomProgressList();
  updateCustomInstructionText();
  updateCustomSubmitStatus();
  updateCustomSubmitButtonState();
  updateStartButton();
}

function updateCustomLobbySectionVisibility() {
  if (!elements.customLobbySection) return;
  const shouldShow = state.mode === "custom" && state.phase === "lobby";
  elements.customLobbySection.hidden = !shouldShow;
  if (!shouldShow && elements.customQuestionSubmitBtn) {
    elements.customQuestionSubmitBtn.disabled = true;
  } else if (shouldShow) {
    updateCustomSubmitButtonState();
  }
}

function ensureCustomDraftSize() {
  if (state.mode !== "custom") {
    state.customQuestionDrafts = [];
    return;
  }
  const required = Math.max(state.customQuestionsRequired || state.roundCount || 0, 0);
  const drafts = Array.isArray(state.customQuestionDrafts) ? state.customQuestionDrafts.slice(0, required) : [];
  while (drafts.length < required) {
    const savedValue = state.customQuestionsSaved?.[drafts.length] ?? "";
    drafts.push(savedValue);
  }
  state.customQuestionDrafts = drafts;
}

function renderCustomQuestionInputs() {
  if (!elements.customQuestionInputs) return;
  if (state.mode !== "custom") {
    elements.customQuestionInputs.innerHTML = "";
    return;
  }
  elements.customQuestionInputs.innerHTML = "";
  const drafts = state.customQuestionDrafts;
  if (!Array.isArray(drafts) || drafts.length === 0) {
    const placeholder = document.createElement("div");
    placeholder.className = "text-sm text-gray-600";
    placeholder.textContent = "Noch keine Fragen – beginne mit dem ersten Feld!";
    elements.customQuestionInputs.appendChild(placeholder);
    return;
  }
  drafts.forEach((value, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "flex flex-col gap-2";
    const label = document.createElement("label");
    label.className = "text-sm font-semibold text-gray-800";
    label.textContent = `Frage ${index + 1}`;
    const textarea = document.createElement("textarea");
    textarea.className =
      "w-full bg-white text-gray-900 placeholder:text-gray-400 rounded-xxl px-4 py-3 shadow-md border border-aqua-200 focus:outline-none focus:border-aqua-500 focus:ring-4 focus:ring-aqua-300/40 transition resize-none";
    textarea.rows = 2;
    textarea.dataset.index = String(index);
    textarea.value = value ?? "";
    textarea.addEventListener("input", handleCustomQuestionDraftInput);
    wrapper.appendChild(label);
    wrapper.appendChild(textarea);
    elements.customQuestionInputs.appendChild(wrapper);
  });
}

function handleCustomQuestionDraftInput(event) {
  const target = event.target;
  if (!target) return;
  const index = Number(target.dataset.index);
  if (Number.isNaN(index) || index < 0) return;
  state.customQuestionDrafts[index] = target.value;
  updateCustomSubmitButtonState();
}

function renderCustomProgressList() {
  if (!elements.customProgressList) return;
  if (state.mode !== "custom") {
    elements.customProgressList.innerHTML = "";
    return;
  }
  const progress = Array.isArray(state.customQuestionProgress) ? state.customQuestionProgress : [];
  elements.customProgressList.innerHTML = "";
  if (progress.length === 0) {
    const item = document.createElement("div");
    item.className = "text-sm text-gray-600";
    item.textContent = "Noch keine Einreichungen.";
    elements.customProgressList.appendChild(item);
    return;
  }
  progress.forEach((entry) => {
    const row = document.createElement("div");
    row.className =
      "flex items-center justify-between rounded-2xl bg-white/90 border border-aqua-100 px-3 py-2 text-sm";
    const name = document.createElement("span");
    name.className = "font-medium text-gray-800";
    name.textContent = `${entry.playerName}${entry.playerId === state.playerId ? " (Du)" : ""}`;
    const badge = document.createElement("span");
    const complete = entry.submitted >= entry.required && entry.required > 0;
    badge.className = `px-2 py-0.5 rounded-full text-xs font-semibold ${
      complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-900"
    }`;
    badge.textContent = `${entry.submitted}/${entry.required}`;
    row.appendChild(name);
    row.appendChild(badge);
    elements.customProgressList.appendChild(row);
  });
}

function updateCustomInstructionText() {
  if (!elements.customInstruction) return;
  if (state.mode !== "custom") {
    elements.customInstruction.textContent = "";
    return;
  }
  const required = Math.max(state.customQuestionsRequired || state.roundCount || 0, 0);
  if (required <= 0) {
    elements.customInstruction.textContent =
      "Jede Person kann eigene Fragen einreichen, sobald Runden festgelegt wurden.";
    return;
  }
  const saved = state.customQuestionsSaved.length;
  const remaining = Math.max(required - saved, 0);
  elements.customInstruction.textContent =
    remaining > 0
      ? `Du benötigst ${required} Fragen. Es fehlen noch ${remaining}.`
      : `Du hast alle ${required} Fragen gespeichert.`;
}

function updateCustomSubmitStatus() {
  if (!elements.customSubmitStatus) return;
  if (state.mode !== "custom") {
    elements.customSubmitStatus.textContent = "";
    return;
  }
  const required = Math.max(state.customQuestionsRequired || state.roundCount || 0, 0);
  const saved = state.customQuestionsSaved.length;
  let text = `Gespeichert: ${saved}/${required} Fragen`;
  if (required > 0) {
    text += saved >= required ? " – bereit!" : " – bitte vervollständigen.";
  }
  elements.customSubmitStatus.textContent = text;
}

function updateCustomSubmitButtonState() {
  if (!elements.customQuestionSubmitBtn) return;
  const shouldDisable =
    state.mode !== "custom" ||
    state.phase !== "lobby" ||
    !state.lobbyCode ||
    state.customSubmitInFlight;
  elements.customQuestionSubmitBtn.disabled = shouldDisable;
}

function applySavedCustomQuestions(questions = [], { skipRender = false } = {}) {
  if (state.mode !== "custom") {
    state.customSubmitInFlight = false;
    updateCustomSubmitButtonState();
    return;
  }
  const required = Math.max(state.customQuestionsRequired || state.roundCount || 0, 0);
  const sanitized = [];
  if (Array.isArray(questions)) {
    questions.forEach((entry, index) => {
      if (required > 0 && index >= required) return;
      if (typeof entry !== "string") return;
      const trimmed = entry.trim();
      if (!trimmed) return;
      sanitized.push(trimmed);
    });
  }
  state.customQuestionsSaved = sanitized;
  ensureCustomDraftSize();
  state.customQuestionDrafts = state.customQuestionDrafts.map((value, index) => sanitized[index] ?? value ?? "");
  state.customSubmitInFlight = false;
  if (!skipRender) {
    renderCustomLobbyState();
  }
}

function submitCustomQuestions() {
  if (state.mode !== "custom") return;
  if (!state.lobbyCode) {
    showToast("Keine aktive Lobby gefunden.", "warning");
    return;
  }
  if (!state.connected || state.ws?.readyState !== WebSocket.OPEN) {
    showToast("Keine Verbindung zum Server.", "danger");
    return;
  }
  const required = Math.max(state.customQuestionsRequired || state.roundCount || 0, 0);
  const payload = [];
  state.customQuestionDrafts.forEach((value, index) => {
    if (required > 0 && index >= required) return;
    const trimmed = (value ?? "").trim();
    if (trimmed) {
      payload.push(trimmed);
    }
  });
  state.customSubmitInFlight = true;
  updateCustomSubmitButtonState();
  sendMessage("custom_submit_questions", {
    lobbyCode: state.lobbyCode,
    questions: payload,
  });
}

function allCustomQuestionsReady() {
  if (state.mode !== "custom") return true;
  const required = Math.max(state.customQuestionsRequired || state.roundCount || 0, 0);
  if (required <= 0) return false;
  if (!Array.isArray(state.customQuestionProgress) || state.customQuestionProgress.length === 0) {
    return false;
  }
  return state.customQuestionProgress.every((entry) => {
    if (!entry) return false;
    return (entry.submitted ?? 0) >= required;
  });
}


function renderLobby({
  code,
  rounds,
  mode,
  questionCategoryId,
  questionCategoryLabel,
  customQuestionRequired,
  customQuestionProgress,
  customQuestionsForPlayer,
}) {
  if (code) {
    elements.lobbyCode.textContent = code;
    state.lobbyCode = code;
  }
  if (rounds) {
    elements.totalRounds.textContent = String(rounds);
    elements.roundTotalLabel.textContent = String(rounds);
    elements.voteRoundTotal.textContent = String(rounds);
    state.roundCount = rounds;
  }
  const roundSummary = `Runden: ${state.roundCount ?? "--"} · Antwort: ${state.answerDuration ?? "--"}s · Voting: ${state.voteDuration ?? "--"}s`;
  elements.roundInfo.textContent = roundSummary;
  if (mode) {
    state.mode = mode;
  }
  if (questionCategoryId) {
    state.questionCategoryId = questionCategoryId;
  }
  if (questionCategoryLabel) {
    state.questionCategoryLabel = questionCategoryLabel;
  } else if (questionCategoryId) {
    const meta = getCategoryMeta(questionCategoryId);
    if (meta) {
      state.questionCategoryLabel = meta.label;
    }
  }
  if (elements.modeInfo) {
    updateModeInfoBadge();
  }
  if (elements.modeInputs) {
    elements.modeInputs.forEach((input) => {
      input.checked = input.value === state.mode;
    });
  }
  if (state.mode === "normal") {
    selectCategoryInput(state.questionCategoryId);
    updateCategoryHintText(state.questionCategoryId);
  }
  if (typeof customQuestionRequired === "number" && !Number.isNaN(customQuestionRequired)) {
    state.customQuestionsRequired = Math.max(0, Math.floor(customQuestionRequired));
  } else if (state.mode === "custom") {
    state.customQuestionsRequired = state.roundCount ?? state.customQuestionsRequired ?? 0;
  } else {
    state.customQuestionsRequired = 0;
  }
  if (Array.isArray(customQuestionProgress)) {
    state.customQuestionProgress = customQuestionProgress;
  } else if (state.mode !== "custom") {
    state.customQuestionProgress = [];
  }
  if (Array.isArray(customQuestionsForPlayer)) {
    applySavedCustomQuestions(customQuestionsForPlayer, { skipRender: true });
  } else if (state.mode !== "custom") {
    state.customQuestionsSaved = [];
    state.customQuestionDrafts = [];
  } else {
    ensureCustomDraftSize();
  }
  updateCategorySectionVisibility();
  showView("lobby");
  renderPlayers();
  renderCustomLobbyState();
}

function updateModeInfoBadge() {
  if (!elements.modeInfo) return;
  if (!state.mode) {
    elements.modeInfo.textContent = "Modus: --";
    return;
  }
  const label = modeLabel(state.mode);
  if (state.mode === "normal" && state.questionCategoryLabel) {
    elements.modeInfo.textContent = `Modus: ${label} · ${state.questionCategoryLabel}`;
  } else {
    elements.modeInfo.textContent = `Modus: ${label}`;
  }
}

function updateCategorySectionVisibility() {
  if (!elements.categorySection) return;
  const shouldShow = getSelectedMode() === "normal" && state.availableCategories.length > 0;
  elements.categorySection.hidden = !shouldShow;
}

function getCategoryMeta(categoryId) {
  if (!categoryId) return null;
  return state.availableCategories.find((category) => category.id === categoryId) ?? null;
}

function selectCategoryInput(categoryId) {
  if (!elements.categoryOptions) return;
  const inputs = elements.categoryOptions.querySelectorAll("input[name='questionCategory']");
  inputs.forEach((input) => {
    input.checked = input.value === categoryId;
  });
}

function updateCategoryHintText(categoryId) {
  if (!elements.categoryHint) return;
  const meta = getCategoryMeta(categoryId);
  if (!meta) {
    elements.categoryHint.textContent = "Wähle, welche Themen euch erwarten.";
    return;
  }
  const countPart = typeof meta.questionCount === "number" ? ` • ${meta.questionCount} Fragen` : "";
  elements.categoryHint.textContent = `Aktuell ausgewählt: ${meta.label}${countPart}`;
}

function handleCategoryChange(categoryId, providedLabel = "") {
  if (!categoryId) return;
  state.questionCategoryId = categoryId;
  const meta = getCategoryMeta(categoryId);
  state.questionCategoryLabel = providedLabel || meta?.label || state.questionCategoryLabel || DEFAULT_CATEGORY_LABEL;
  updateCategoryHintText(categoryId);
  updateModeInfoBadge();
}

function getSelectedQuestionCategory() {
  if (!elements.categoryOptions) {
    return state.questionCategoryId ?? DEFAULT_CATEGORY_ID;
  }
  const active = elements.categoryOptions.querySelector("input[name='questionCategory']:checked");
  if (active) {
    return active.value;
  }
  return state.questionCategoryId ?? DEFAULT_CATEGORY_ID;
}

function buildCategoryOptions(categories) {
  if (!elements.categoryOptions) return;
  elements.categoryOptions.innerHTML = "";
  const fragment = document.createDocumentFragment();
  categories.forEach((category, index) => {
    if (!category?.id) return;
    const safeId = category.id.replace(/[^a-z0-9-]/gi, "");
    const inputId = `questionCategory-${safeId || index}`;
    const input = document.createElement("input");
    input.type = "radio";
    input.className = "btn-check hidden";
    input.name = "questionCategory";
    input.id = inputId;
    input.value = category.id;
    input.dataset.label = category.label;
    if (typeof category.questionCount === "number") {
      input.dataset.count = String(category.questionCount);
    }
    if (category.id === state.questionCategoryId || (!state.questionCategoryId && index === 0)) {
      input.checked = true;
    }
    fragment.appendChild(input);

    const label = document.createElement("label");
    label.className = "btn-mode flex-1";
    label.setAttribute("for", inputId);
    const titleSpan = document.createElement("span");
    titleSpan.className = "mode-title block";
    titleSpan.textContent = category.label;
    const subtitleSpan = document.createElement("span");
    subtitleSpan.className = "mode-subtitle block";
    subtitleSpan.textContent = category.description ?? "";
    label.appendChild(titleSpan);
    label.appendChild(subtitleSpan);
    fragment.appendChild(label);
  });
  elements.categoryOptions.appendChild(fragment);
}

function applyCategoryData(categories) {
  const seen = new Set();
  const normalized = [];
  categories.forEach((category) => {
    if (!category) return;
    const id = typeof category.id === "string" ? category.id.trim().toLowerCase() : "";
    const safeId = id || DEFAULT_CATEGORY_ID;
    if (seen.has(safeId)) return;
    seen.add(safeId);
    normalized.push({
      id: safeId,
      label:
        typeof category.label === "string" && category.label.trim()
          ? category.label.trim()
          : DEFAULT_CATEGORY_LABEL,
      description: typeof category.description === "string" ? category.description.trim() : "",
      questionCount: typeof category.questionCount === "number" ? category.questionCount : undefined,
    });
  });
  const nextCategories = normalized.length ? normalized : [...FALLBACK_CATEGORIES];
  state.availableCategories = nextCategories;
  const currentMeta = getCategoryMeta(state.questionCategoryId);
  if (!currentMeta) {
    const fallback = nextCategories[0] ?? FALLBACK_CATEGORIES[0];
    state.questionCategoryId = fallback.id;
    state.questionCategoryLabel = fallback.label;
  } else {
    state.questionCategoryLabel = currentMeta.label;
  }
  buildCategoryOptions(state.availableCategories);
  selectCategoryInput(state.questionCategoryId);
  updateCategoryHintText(state.questionCategoryId);
  updateCategorySectionVisibility();
  updateModeInfoBadge();
}

async function fetchQuestionCategories() {
  try {
    const response = await fetch("/api/question-categories");
    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }
    const data = await response.json();
    if (data && Array.isArray(data.categories) && data.categories.length > 0) {
      applyCategoryData(data.categories);
      return;
    }
  } catch (error) {
    console.warn("Fragenkategorien konnten nicht geladen werden:", error);
  }
  applyCategoryData(FALLBACK_CATEGORIES);
}

function handleCountdownTick({ value, currentRound, totalRounds }) {
  elements.countdownValue.textContent = String(value);
  elements.currentRound.textContent = String(currentRound);
  elements.roundLabel.textContent = String(currentRound);
  elements.voteRoundLabel.textContent = String(currentRound);
  state.roundCurrent = currentRound;
  elements.totalRounds.textContent = String(totalRounds);
  elements.roundTotalLabel.textContent = String(totalRounds);
  elements.voteRoundTotal.textContent = String(totalRounds);
  showView("countdown");
}

function handleTricksterReveal({ tricksterId, tricksterName, currentRound, totalRounds }) {
  stopAnswerTimer();
  stopVoteTimer();
  state.tricksterId = tricksterId;
  state.tricksterName = tricksterName;
  elements.tricksterName.textContent = tricksterName;
  elements.tricksterContinueBtn.disabled = false;
  elements.roundLabel.textContent = String(currentRound);
  elements.voteRoundLabel.textContent = String(currentRound);
  elements.roundTotalLabel.textContent = String(totalRounds);
  elements.voteRoundTotal.textContent = String(totalRounds);
  showView("trickster");
  state.awaitingAcknowledgements = new Set(state.players.map((p) => p.id));
  setTimeout(() => {
    if (state.phase === "trickster") {
      sendMessage("trickster_ready", { lobbyCode: state.lobbyCode });
    }
  }, 3000);
}

function handleQuestionPhase({ prompt, tricksterName, currentRound, totalRounds, answerDuration, questionTitle }) {
  stopVoteTimer();
  stopAnswerTimer();
  if (elements.questionTitle) {
    elements.questionTitle.textContent = questionTitle ?? "Frage";
  }
  elements.questionPrompt.textContent = prompt;
  elements.instructionTrickster.textContent = tricksterName;
  elements.roundLabel.textContent = String(currentRound);
  elements.roundTotalLabel.textContent = String(totalRounds);
  const duration = answerDuration ?? state.answerDuration ?? 90;
  state.answerDuration = duration;
  elements.answerInput.value = "";
  elements.answerInput.disabled = false;
  elements.submitAnswerBtn.disabled = false;
  elements.questionWaitingBtn.classList.add("d-none");
  state.answerSubmitted = false;
  showView("question");
  startAnswerTimer(duration);
}

function handleVotingPhase({ answers = [], currentRound, totalRounds, voteDuration, isTrickster }) {
  stopAnswerTimer();
  stopVoteTimer();
  state.voteOptions = answers ?? [];
  state.voteSubmitted = false;
  elements.voteRoundLabel.textContent = String(currentRound);
  elements.voteRoundTotal.textContent = String(totalRounds);
  const duration = voteDuration ?? state.voteDuration ?? 20;
  state.voteDuration = duration;
  state.isTrickster = Boolean(isTrickster);
  renderVotingOptions({ answers: state.voteOptions, isTrickster: state.isTrickster });

  showView("voting");
  startVoteTimer(duration);
}

function handleRevealPhase({ tricksterId, tricksterName, answers, duration }) {
  stopAnswerTimer();
  stopVoteTimer();
  state.isTrickster = false;
  renderRevealLayout(elements.revealList, answers, tricksterId);
  elements.voteStatus.textContent = "";
  showView("reveal");
  if (duration) {
    elements.voteStatus.textContent = `Nächste Übersicht in ${duration}s`;
  }
}

function handleLeaderboardPhase({ leaderboard, duration, currentRound, totalRounds }) {
  stopAnswerTimer();
  stopVoteTimer();
  const sorted = leaderboard.slice().sort((a, b) => b.score - a.score);
  const maxScore = sorted.length ? Math.max(...sorted.map((entry) => entry.score), 1) : 1;
  elements.leaderboard.innerHTML = "";
  elements.leaderboardRound.textContent = `Runde ${currentRound}/${totalRounds}`;

  sorted.forEach((entry, index) => {
    const item = document.createElement("div");
    item.className = "leaderboard-item";
    if (entry.playerId === state.playerId) {
      item.classList.add("self");
    }
    const bar = document.createElement("div");
    bar.className = "leaderboard-bar";
    const ratio = Math.max(entry.score / maxScore, 0);
    bar.style.transform = `scaleX(${ratio || 0.05})`;
    item.appendChild(bar);

    const pos = document.createElement("div");
    pos.className = "leaderboard-position";
    pos.textContent = `#${index + 1}`;
    item.appendChild(pos);

    const details = document.createElement("div");
    details.className = "leaderboard-details";
    const nameEl = document.createElement("div");
    nameEl.className = "leaderboard-name";
    nameEl.textContent = `${entry.name}${entry.playerId === state.playerId ? " (Du)" : ""}`;
    const scoreEl = document.createElement("div");
    scoreEl.className = "leaderboard-score";
    scoreEl.textContent = `${entry.score} Punkte`;
    details.appendChild(nameEl);
    details.appendChild(scoreEl);
    item.appendChild(details);

    elements.leaderboard.appendChild(item);
  });

  elements.leaderboardFooter.textContent = duration
    ? `Nächster Trickster in ${duration}s`
    : "Nächster Trickster wird vorbereitet...";

  showView("leaderboard");
}

function handleGameOver({ leaderboard }) {
  stopAnswerTimer();
  stopVoteTimer();
  const sorted = leaderboard.slice().sort((a, b) => b.score - a.score);
  populatePodium(sorted);
  showView("gameover");
}

function updateStartButton() {
  if (!elements.startGameBtn) return;
  let ready = state.isHost && state.players.length >= 3 && state.phase === "lobby";
  if (ready && state.mode === "custom") {
    ready = allCustomQuestionsReady();
  }
  elements.startGameBtn.disabled = !ready;
}

function submitVote(answerId) {
  if (state.voteSubmitted || !state.lobbyCode) return;
  state.voteSubmitted = true;
  sendMessage("submit_vote", { lobbyCode: state.lobbyCode, answerId });
  elements.voteStatus.textContent = "Stimme abgegeben. Warte auf die anderen...";
  Array.from(elements.voteOptions.children).forEach((option) => {
    option.classList.add("disabled");
    option.querySelector("button").disabled = true;
  });
}

function handleServerMessage(message) {
  switch (message.type) {
    case "room_created":
      state.playerId = message.playerId;
      state.players = message.players;
      state.roundCount = message.rounds;
      state.isHost = true;
      state.mode = message.mode ?? "normal";
      if (elements.modeInputs) {
        elements.modeInputs.forEach((input) => {
          input.checked = input.value === state.mode;
        });
      }
      state.answerDuration = message.answerDuration ?? state.answerDuration;
      state.voteDuration = message.voteDuration ?? state.voteDuration;
      renderLobby({
        code: message.code,
        rounds: message.rounds,
        mode: state.mode,
        questionCategoryId: message.questionCategoryId,
        questionCategoryLabel: message.questionCategoryLabel,
        customQuestionRequired: message.customQuestionRequired,
        customQuestionProgress: message.customQuestionProgress,
        customQuestionsForPlayer: message.customQuestionsForPlayer,
      });
      showToast(`Lobby erstellt! Code: ${message.code}`, "success");
      break;
    case "join_success":
      state.playerId = message.playerId;
      state.players = message.players;
      state.roundCount = message.rounds;
      state.isHost = message.isHost;
      state.mode = message.mode ?? "normal";
      state.answerDuration = message.answerDuration ?? state.answerDuration;
      state.voteDuration = message.voteDuration ?? state.voteDuration;
      renderLobby({
        code: message.code,
        rounds: message.rounds,
        mode: state.mode,
        questionCategoryId: message.questionCategoryId,
        questionCategoryLabel: message.questionCategoryLabel,
        customQuestionRequired: message.customQuestionRequired,
        customQuestionProgress: message.customQuestionProgress,
        customQuestionsForPlayer: message.customQuestionsForPlayer,
      });
      showToast(`Lobby ${message.code} beigetreten.`, "success");
      break;
    case "lobby_update":
      state.players = message.players;
      renderPlayers();
      break;
    case "player_left":
      state.players = message.players;
      renderPlayers();
      showToast(message.message, "warning");
      break;
    case "error":
      showToast(message.message, "danger");
      if (state.customSubmitInFlight) {
        state.customSubmitInFlight = false;
        updateCustomSubmitButtonState();
      }
      break;
    case "game_starting":
      if (Array.isArray(message.players)) {
        state.players = message.players;
        renderPlayers();
      }
      state.roundCount = message.totalRounds;
      state.mode = message.mode ?? state.mode;
      if (state.mode === "custom") {
        state.customQuestionsRequired = message.totalRounds ?? state.customQuestionsRequired;
      } else {
        state.customQuestionsRequired = 0;
      }
      updateCategorySectionVisibility();
      if (message.questionCategoryId) {
        state.questionCategoryId = message.questionCategoryId;
      }
      if (message.questionCategoryLabel) {
        state.questionCategoryLabel = message.questionCategoryLabel;
      }
      state.answerDuration = message.answerDuration ?? state.answerDuration;
      state.voteDuration = message.voteDuration ?? state.voteDuration;
      elements.roundTotalLabel.textContent = String(message.totalRounds);
      elements.voteRoundTotal.textContent = String(message.totalRounds);
      updateModeInfoBadge();
      showView("countdown");
      break;
    case "countdown_tick":
      handleCountdownTick(message);
      break;
    case "trickster_reveal":
      handleTricksterReveal(message);
      break;
    case "question_phase":
      state.answers = [];
      handleQuestionPhase(message);
      break;
    case "voting_phase":
      handleVotingPhase(message);
      break;
    case "voting_update":
      if (state.isTrickster && state.phase === "voting") {
        state.voteOptions = message.answers ?? [];
        renderVotingOptions({ answers: state.voteOptions, isTrickster: true });
      }
      break;
    case "reveal_phase":
      if (Array.isArray(message.players)) {
        state.players = message.players;
        renderPlayers();
      }
      handleRevealPhase(message);
      break;
    case "leaderboard_phase":
      if (Array.isArray(message.leaderboard)) {
        state.players = message.leaderboard;
        renderPlayers();
      }
      handleLeaderboardPhase(message);
      break;
    case "game_over":
      if (Array.isArray(message.leaderboard)) {
        state.players = message.leaderboard;
        renderPlayers();
      }
      handleGameOver(message);
      break;
    case "custom_questions_progress":
      if (Array.isArray(message.progress)) {
        state.customQuestionProgress = message.progress;
      }
      if (typeof message.required === "number" && !Number.isNaN(message.required)) {
        state.customQuestionsRequired = Math.max(0, Math.floor(message.required));
      }
      renderCustomLobbyState();
      updateStartButton();
      break;
    case "custom_questions_saved":
      if (typeof message.required === "number" && !Number.isNaN(message.required)) {
        state.customQuestionsRequired = Math.max(0, Math.floor(message.required));
      }
      applySavedCustomQuestions(Array.isArray(message.questions) ? message.questions : []);
      showToast("Custom-Fragen gespeichert.", "success");
      break;
    case "state_reset":
      resetClientState();
      showView("home");
      break;
    default:
      console.warn("Unbekannter Nachrichtentyp", message);
  }
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.targetView;
    if (!target) return;
    if (target === "create" || target === "join") {
      if (!requireName()) return;
    }
    showView(target);
  });
});

if (elements.modeInputs) {
  elements.modeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      state.mode = getSelectedMode();
      updateCategorySectionVisibility();
      updateModeInfoBadge();
    });
  });
}

startCreateBtn.addEventListener("click", () => {
  const name = requireName();
  if (!name) return;

  const rounds = parseInt(elements.roundInput.value, 10);
  if (Number.isNaN(rounds) || rounds < 1) {
    showToast("Bitte gib eine gültige Rundenzahl ein.", "warning");
    return;
  }

  const answerDuration = parseInt(elements.answerTimeInput.value, 10);
  if (Number.isNaN(answerDuration) || answerDuration < 15) {
    showToast("Antwortzeit muss mindestens 15 Sekunden betragen.", "warning");
    return;
  }

  const voteDuration = parseInt(elements.voteTimeInput.value, 10);
  if (Number.isNaN(voteDuration) || voteDuration < 5) {
    showToast("Votingzeit muss mindestens 5 Sekunden betragen.", "warning");
    return;
  }

  const mode = getSelectedMode();

  const questionCategory = mode === "normal" ? getSelectedQuestionCategory() : undefined;

  sendMessage("create_room", {
    name,
    rounds,
    answerDuration,
    voteDuration,
    mode,
    questionCategory,
  });
});

joinCodeBtn.addEventListener("click", () => {
  const name = requireName();
  if (!name) return;
  const code = elements.joinCodeInput.value.trim();
  if (!/^[0-9]{4}$/.test(code)) {
    showToast("Bitte gib einen gültigen 4-stelligen Code ein.", "warning");
    return;
  }
  sendMessage("join_room", { name, code });
});

elements.startGameBtn.addEventListener("click", () => {
  if (!state.isHost) {
    showToast("Nur der Host kann das Spiel starten.", "danger");
    return;
  }
  if (state.players.length < 3) {
    showToast("Mindestens 3 Spieler zum Start erforderlich.", "warning");
    return;
  }
  sendMessage("start_game", { lobbyCode: state.lobbyCode });
});

elements.leaveLobbyBtn.addEventListener("click", () => {
  if (!state.lobbyCode) return;
  sendMessage("leave_room", { lobbyCode: state.lobbyCode });
  resetClientState();
  showView("home");
});

elements.tricksterContinueBtn.addEventListener("click", () => {
  if (!state.lobbyCode) return;
  sendMessage("trickster_ready", { lobbyCode: state.lobbyCode });
  elements.tricksterContinueBtn.disabled = true;
});

elements.submitAnswerBtn.addEventListener("click", () => {
  if (state.answerSubmitted) return;
  const answer = elements.answerInput.value.trim();
  if (!answer) {
    showToast("Bitte gib eine Antwort ein.", "warning");
    return;
  }
  state.answerSubmitted = true;
  elements.answerInput.disabled = true;
  elements.submitAnswerBtn.disabled = true;
  elements.questionWaitingBtn.classList.remove("d-none");
  sendMessage("submit_answer", { lobbyCode: state.lobbyCode, answer });
});

elements.backToHomeBtn.addEventListener("click", () => {
  resetClientState();
  showView("home");
});

elements.nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const name = requireName();
    if (name) showView("create");
  }
});

elements.joinCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    joinCodeBtn.click();
  }
});

if (elements.customQuestionSubmitBtn) {
  elements.customQuestionSubmitBtn.addEventListener("click", submitCustomQuestions);
}

applyCategoryData(FALLBACK_CATEGORIES);
fetchQuestionCategories();
updateCategorySectionVisibility();
initWebSocket();

function renderVotingOptions({ answers = [], isTrickster = false }) {
  elements.voteOptions.innerHTML = "";
  elements.voteOptions.classList.remove("reveal-grid");
  if (isTrickster) {
    if (answers.length === 0) {
      elements.voteStatus.textContent = "Noch keine Stimmen abgegeben.";
    } else {
      const highlightId =
        state.tricksterId ??
        (answers.find((entry) => entry.isTricksterAnswer)?.playerId ?? null);
      renderRevealLayout(elements.voteOptions, answers, highlightId);
      elements.voteStatus.textContent = "Live-Übersicht der Stimmen";
    }
    return;
  }

  answers.forEach((answer) => {
    const card = document.createElement("div");
    card.className = "vote-option";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = answer.text ?? "";
    btn.addEventListener("click", () => submitVote(answer.answerId));
    card.appendChild(btn);
    elements.voteOptions.appendChild(card);
  });
  if (!answers.length) {
    elements.voteStatus.textContent = "Keine Antworten verfügbar – warte auf die Auswertung.";
  } else if (!state.voteSubmitted) {
    elements.voteStatus.textContent = "Wähle die Trickster-Antwort.";
  }
}

function renderRevealLayout(targetElement, answers = [], highlightPlayerId) {
  targetElement.innerHTML = "";
  targetElement.classList.add("reveal-grid");
  if (!answers.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder-panel text-start";
    placeholder.textContent = "Noch keine Antworten vorhanden.";
    targetElement.appendChild(placeholder);
    return;
  }
  const highlight = answers.find((entry) =>
    highlightPlayerId !== undefined && highlightPlayerId !== null
      ? entry.playerId === highlightPlayerId
      : entry.isTricksterAnswer
  );
  const others = highlight ? answers.filter((entry) => entry !== highlight) : answers.slice();

  if (highlight) {
    targetElement.appendChild(buildRevealCard(highlight, { highlight: true }));
  }

  if (highlight && others.length > 0) {
    const heading = document.createElement("div");
    heading.className = "reveal-section-title";
    heading.textContent = "Antworten der Spieler";
    targetElement.appendChild(heading);
    others.forEach((entry) => {
      targetElement.appendChild(buildRevealCard(entry));
    });
  } else if (!highlight && answers.length > 0) {
    answers.forEach((entry) => {
      targetElement.appendChild(buildRevealCard(entry));
    });
  }
}

function buildRevealCard(answer, { highlight = false } = {}) {
  const card = document.createElement("div");
  card.className = `reveal-card${highlight ? " trickster-highlight" : ""}`;
  const isSelf = answer.playerId === state.playerId;
  const safeAuthor = escapeHtml(answer.authorName ?? "Unbekannt");
  const safeBody = escapeHtml(answer.text ?? "").replace(/\n/g, "<br />");
  const votes = Array.isArray(answer.votes) ? answer.votes : [];
  const labelMarkup = highlight ? '<span class="reveal-label">Trickster</span>' : "";
  const nameLine = `${safeAuthor}${highlight ? " 🎭" : ""}${isSelf ? " (Du)" : ""}`;
  const votesMarkup =
    votes.length > 0
      ? votes
          .map((vote) => {
            const selfVote = vote.playerId === state.playerId;
            return `<span class="vote-chip${selfVote ? " vote-chip-self" : ""}">${escapeHtml(
              vote.playerName
            )}${selfVote ? " (Du)" : ""}</span>`;
          })
          .join("")
      : '<span class="vote-chip vote-chip-empty">Keine Stimmen</span>';

  card.innerHTML = `
    ${labelMarkup}
    <div class="reveal-meta">${nameLine}</div>
    <div class="reveal-bubble">
      <div class="reveal-content">${safeBody}</div>
    </div>
    <div class="votes">
      ${votesMarkup}
    </div>
  `;

  return card;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (match) => {
    switch (match) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return match;
    }
  });
}

function resetPodiumView() {
  ["podiumFirst", "podiumSecond", "podiumThird"].forEach((key) => {
    const column = elements[key];
    if (!column) return;
    const nameEl = column.querySelector(".podium-name");
    const scoreEl = column.querySelector(".podium-score");
    if (nameEl) nameEl.textContent = "---";
    if (scoreEl) scoreEl.textContent = "--";
  });
  if (elements.podiumRest) {
    elements.podiumRest.innerHTML = "";
  }
}

function populatePodium(sorted) {
  resetPodiumView();
  const [first, second, third, ...rest] = sorted;

  const assignColumn = (columnEl, entry) => {
    if (!columnEl) return;
    const nameEl = columnEl.querySelector(".podium-name");
    const scoreEl = columnEl.querySelector(".podium-score");
    if (nameEl) {
      nameEl.textContent = entry
        ? `${entry.name}${entry.playerId === state.playerId ? " (Du)" : ""}`
        : "---";
    }
    if (scoreEl) {
      scoreEl.textContent = entry ? `${entry.score} Punkte` : "--";
    }
  };

  assignColumn(elements.podiumFirst, first);
  assignColumn(elements.podiumSecond, second);
  assignColumn(elements.podiumThird, third);

  if (elements.podiumRest) {
    elements.podiumRest.innerHTML = "";
    rest.forEach((entry, index) => {
      const chip = document.createElement("div");
      chip.className = "podium-chip";
      chip.textContent = `#${index + 4} ${entry.name} • ${entry.score}`;
      elements.podiumRest.appendChild(chip);
    });
  }
}

function stopAnswerTimer() {
  if (state.answerTimerInterval) {
    clearInterval(state.answerTimerInterval);
    state.answerTimerInterval = null;
  }
}

function stopVoteTimer() {
  if (state.voteTimerInterval) {
    clearInterval(state.voteTimerInterval);
    state.voteTimerInterval = null;
  }
}

function startAnswerTimer(duration) {
  stopAnswerTimer();
  state.answerTimeLeft = duration;
  updateAnswerTimerDisplay();
  state.answerTimerInterval = setInterval(() => {
    state.answerTimeLeft -= 1;
    if (state.answerTimeLeft <= 0) {
      state.answerTimeLeft = 0;
      stopAnswerTimer();
    }
    updateAnswerTimerDisplay();
  }, 1000);
}

function startVoteTimer(duration) {
  stopVoteTimer();
  state.voteTimeLeft = duration;
  updateVoteTimerDisplay();
  state.voteTimerInterval = setInterval(() => {
    state.voteTimeLeft -= 1;
    if (state.voteTimeLeft <= 0) {
      state.voteTimeLeft = 0;
      stopVoteTimer();
    }
    updateVoteTimerDisplay();
  }, 1000);
}

function updateAnswerTimerDisplay() {
  elements.answerTimerDisplay.textContent = formatSeconds(Math.max(0, state.answerTimeLeft ?? 0));
}

function updateVoteTimerDisplay() {
  elements.voteTimerDisplay.textContent = formatSeconds(Math.max(0, state.voteTimeLeft ?? 0));
}

function formatSeconds(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes <= 0) {
    return `${remainder}s`;
  }
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function modeLabel(mode) {
  switch (mode) {
    case "custom":
      return "Custom (Beta)";
    case "normal":
    default:
      return "Normal";
  }
}

function getSelectedMode() {
  if (!elements.modeInputs) return "normal";
  const active = Array.from(elements.modeInputs).find((input) => input.checked);
  return active ? active.value : "normal";
}

