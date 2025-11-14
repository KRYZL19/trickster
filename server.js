const path = require("path");
const fs = require("fs");
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/question-categories", (_req, res) => {
  res.json({ categories: getPublicCategoryList() });
});

const QUESTIONS_PATH = path.join(__dirname, "data", "questions.json");
const DEFAULT_CATEGORY_ID = "freestart";
const QUESTION_CATEGORY_CONFIG = [
  {
    id: DEFAULT_CATEGORY_ID,
    label: "FreeSet/Start",
    description: "Perfekter Allround-Mix für euren Start.",
    file: QUESTIONS_PATH,
  },
  {
    id: "spicy",
    label: "Ü18 / Spicy",
    description: "Würzige Fragen mit Augenzwinkern.",
    file: path.join(__dirname, "data", "questions_spicy.json"),
  },
  {
    id: "what-about-you",
    label: "What about you?",
    description: "Persönliche Fragen für echte Gespräche.",
    file: path.join(__dirname, "data", "questions_what_about_you.json"),
  },
];

function loadQuestionsFromFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .filter((entry) => entry && typeof entry.prompt === "string" && entry.prompt.trim())
        .map((entry) => ({
          title: typeof entry.title === "string" ? entry.title : undefined,
          prompt: entry.prompt.trim(),
        }));
    }
  } catch (error) {
    console.warn(`Fragen konnten nicht aus ${filePath} geladen werden:`, error.message);
  }
  return [];
}

function buildQuestionCategories() {
  const categories = new Map();
  for (const category of QUESTION_CATEGORY_CONFIG) {
    const questions = loadQuestionsFromFile(category.file);
    if (questions.length === 0) continue;
    categories.set(category.id, {
      id: category.id,
      label: category.label,
      description: category.description ?? "",
      questions,
    });
  }
  if (categories.size === 0) {
    categories.set(DEFAULT_CATEGORY_ID, {
      id: DEFAULT_CATEGORY_ID,
      label: "Fallback",
      description: "Fallback-Fragen",
      questions: [
        {
          title: "Fallback",
          prompt: "Wie lautet dein Lieblingsurlaubsland?",
        },
      ],
    });
  } else if (!categories.has(DEFAULT_CATEGORY_ID)) {
    const [firstCategory] = categories.values();
    if (firstCategory) {
      categories.set(DEFAULT_CATEGORY_ID, firstCategory);
    }
  }
  return categories;
}

const QUESTION_CATEGORIES = buildQuestionCategories();

function sanitizeQuestionCategory(value) {
  if (typeof value !== "string") return DEFAULT_CATEGORY_ID;
  const normalized = value.trim().toLowerCase();
  return QUESTION_CATEGORIES.has(normalized) ? normalized : DEFAULT_CATEGORY_ID;
}

function getCategoryById(categoryId) {
  return QUESTION_CATEGORIES.get(categoryId) ?? QUESTION_CATEGORIES.get(DEFAULT_CATEGORY_ID);
}

function getPublicCategoryList() {
  return Array.from(QUESTION_CATEGORIES.values()).map((category) => ({
    id: category.id,
    label: category.label,
    description: category.description,
    questionCount: category.questions.length,
  }));
}

function serializeCustomQuestionProgress(room) {
  if (!room || room.mode !== "custom") return [];
  const required = room.customQuestionLimit ?? room.rounds ?? 0;
  return Array.from(room.players.values()).map((player) => {
    const submissions = room.customQuestions.get(player.id) ?? [];
    return {
      playerId: player.id,
      playerName: player.name,
      submitted: submissions.length,
      required,
    };
  });
}

function broadcastCustomQuestionProgress(room) {
  if (!room || room.mode !== "custom") return;
  const progress = serializeCustomQuestionProgress(room);
  broadcast(room, {
    type: "custom_questions_progress",
    progress,
    required: room.customQuestionLimit ?? room.rounds ?? 0,
  });
}

function hasEnoughCustomQuestions(room) {
  if (!room || room.mode !== "custom") return true;
  const required = room.customQuestionLimit ?? room.rounds ?? 0;
  if (required <= 0) return true;
  for (const playerId of room.players.keys()) {
    const submissions = room.customQuestions.get(playerId) ?? [];
    if (submissions.length < required) {
      return false;
    }
  }
  return true;
}

function buildCustomQuestionDeck(room) {
  if (!room || room.mode !== "custom") return [];
  const result = [];
  for (const [playerId, submissions] of room.customQuestions.entries()) {
    const player = room.players.get(playerId);
    const authorName = player ? player.name : "Community";
    (submissions ?? []).forEach((prompt, index) => {
      if (typeof prompt === "string" && prompt.trim()) {
        result.push({
          title: `${authorName} · Frage ${index + 1}`,
          prompt: prompt.trim(),
          author: authorName,
        });
      }
    });
  }
  return result;
}

const REVEAL_DURATION_MS = 15_000;
const LEADERBOARD_DURATION_MS = 5_000;

const rooms = new Map();

function generateLobbyCode() {
  let code;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms.has(code));
  return code;
}

function sanitizeDuration(value, fallback, min, max) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  const clamped = Math.max(min, Math.min(max, Math.floor(value)));
  return clamped;
}

function sanitizeMode(value) {
  return value === "custom" ? "custom" : "normal";
}

function createRoom(hostClient, name, rounds, answerDuration, voteDuration, modeValue, questionCategoryValue) {
  const mode = sanitizeMode(modeValue);
  const requestedRounds = Math.max(1, Math.floor(rounds));
  const categoryId = sanitizeQuestionCategory(mode === "normal" ? questionCategoryValue : DEFAULT_CATEGORY_ID);
  const category = getCategoryById(categoryId);
  const questionBank = mode === "normal" ? category.questions : [];
  const maxAvailableRounds = mode === "normal" ? questionBank.length || 1 : requestedRounds;
  const sanitizedRounds = mode === "normal"
    ? Math.max(1, Math.min(requestedRounds, maxAvailableRounds))
    : requestedRounds;
  const sanitizedAnswerDuration = sanitizeDuration(answerDuration, 90, 15, 300);
  const sanitizedVoteDuration = sanitizeDuration(voteDuration, 20, 5, 120);
  if (mode === "normal" && questionBank.length === 0) {
    throw new Error("Keine Fragen für die gewählte Kategorie verfügbar.");
  }
  const code = generateLobbyCode();
  const questionDeck = mode === "normal" ? shuffleArray([...questionBank]).slice(0, sanitizedRounds) : [];
  const room = {
    code,
    hostId: hostClient.id,
    rounds: sanitizedRounds,
    players: new Map(),
    phase: "lobby",
    currentTricksterIndex: 0,
    tricksterOrder: [],
    questionDeck,
    questionIndex: 0,
    countdownInterval: null,
    revealTimeout: null,
    leaderboardTimeout: null,
    answerTimeout: null,
    voteTimeout: null,
    awaitingReady: new Set(),
    answers: new Map(),
    votes: new Map(),
    answerDuration: sanitizedAnswerDuration,
    voteDuration: sanitizedVoteDuration,
    currentVotingOrder: [],
    mode,
    questionBank: mode === "normal" ? questionBank : [],
    questionCategoryId: category.id,
    questionCategoryLabel: category.label,
    customQuestionLimit: sanitizedRounds,
    customQuestions: new Map(),
  };

  room.players.set(hostClient.id, {
    id: hostClient.id,
    name,
    score: 0,
    isHost: true,
    ws: hostClient.ws,
  });

  rooms.set(code, room);
  hostClient.roomCode = code;
  if (mode === "custom") {
    room.customQuestions.set(hostClient.id, []);
  }
  return room;
}

function joinRoom(client, room, name) {
  room.players.set(client.id, {
    id: client.id,
    name,
    score: 0,
    isHost: false,
    ws: client.ws,
  });
  client.roomCode = room.code;
  if (room.mode === "custom" && !room.customQuestions.has(client.id)) {
    room.customQuestions.set(client.id, []);
  }
}

function resetRoomGameState(room) {
  clearInterval(room.countdownInterval);
  clearTimeout(room.revealTimeout);
  clearTimeout(room.leaderboardTimeout);
  clearTimeout(room.answerTimeout);
  clearTimeout(room.voteTimeout);
  room.phase = "lobby";
  room.currentTricksterIndex = 0;
  room.tricksterOrder = [];
  room.awaitingReady.clear();
  room.answers.clear();
  room.votes.clear();
  room.countdownInterval = null;
  room.revealTimeout = null;
  room.leaderboardTimeout = null;
  room.answerTimeout = null;
  room.voteTimeout = null;
  room.currentVotingOrder = [];
}

function leaveRoom(client) {
  const { roomCode } = client;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  room.players.delete(client.id);
  client.roomCode = null;
  if (room.mode === "custom") {
    room.customQuestions.delete(client.id);
  }

  if (room.players.size === 0) {
    resetRoomGameState(room);
    rooms.delete(roomCode);
    return;
  }

  if (client.id === room.hostId) {
    const [newHost] = room.players.values();
    if (newHost) {
      newHost.isHost = true;
      room.hostId = newHost.id;
    }
  }

  adjustTricksterOrder(room, client.id);
  room.answers.delete(client.id);
  room.votes.delete(client.id);
  room.awaitingReady.delete(client.id);

  if (room.phase !== "lobby" && room.players.size < 3) {
    broadcast(room, { type: "error", message: "Zu wenige Spieler. Spiel wird zurückgesetzt." });
    resetRoomGameState(room);
    resetScores(room);
  }

  if (room.phase === "trickster_reveal" && room.awaitingReady.size === 0) {
    startQuestionPhase(room);
  } else if (room.phase === "question" && room.answers.size === room.players.size && room.players.size >= 3) {
    startVotingPhase(room);
  } else if (room.phase === "voting" && room.votes.size === room.players.size && room.players.size >= 3) {
    resolveVoting(room);
  } else if (room.tricksterOrder.length === 0 && room.phase !== "lobby") {
    finishGame(room);
  }

  broadcast(room, {
    type: "player_left",
    message: "Ein Spieler hat die Lobby verlassen.",
    players: serializePlayers(room),
  });
  if (room.mode === "custom") {
    broadcastCustomQuestionProgress(room);
  }
}

function resetScores(room) {
  for (const player of room.players.values()) {
    player.score = 0;
  }
}

function buildVotingSnapshot(room) {
  const snapshot = [];
  for (const [playerId, submission] of room.answers.entries()) {
    const votes = [];
    for (const [voterId, answerId] of room.votes.entries()) {
      if (answerId === submission.answerId) {
        const voter = room.players.get(voterId);
        votes.push({
          playerId: voterId,
          playerName: voter ? voter.name : "Unbekannt",
        });
      }
    }
    snapshot.push({
      answerId: submission.answerId,
      playerId,
      authorName: room.players.get(playerId)?.name ?? "Unbekannt",
      text: submission.text,
      votes,
    });
  }
  if (room.currentVotingOrder && room.currentVotingOrder.length) {
    snapshot.sort((a, b) => {
      const indexA = room.currentVotingOrder.indexOf(a.answerId);
      const indexB = room.currentVotingOrder.indexOf(b.answerId);
      return indexA - indexB;
    });
  }
  return snapshot;
}

function sendVotingProgress(room) {
  const tricksterId = room.tricksterOrder[room.currentTricksterIndex];
  const trickster = room.players.get(tricksterId);
  if (!trickster) return;
  sendToClient(trickster.ws, {
    type: "voting_update",
    answers: buildVotingSnapshot(room),
  });
}

function startGame(room) {
  resetScores(room);
  room.phase = "countdown";
  room.tricksterOrder = buildTricksterOrder(room);
  room.currentTricksterIndex = 0;
  room.questionIndex = 0;
  room.answers.clear();
  room.votes.clear();
  if (room.mode === "normal") {
    room.questionDeck = shuffleArray([...room.questionBank]).slice(0, room.rounds);
  } else {
    room.questionBank = buildCustomQuestionDeck(room);
    room.questionDeck = shuffleArray([...room.questionBank]).slice(0, room.rounds);
  }
  room.questionIndex = 0;

  broadcast(room, {
    type: "game_starting",
    totalRounds: room.rounds,
    players: serializePlayers(room),
    answerDuration: room.answerDuration,
    voteDuration: room.voteDuration,
    mode: room.mode,
    questionCategoryId: room.questionCategoryId,
    questionCategoryLabel: room.questionCategoryLabel,
  });

  beginCountdown(room);
}

function beginCountdown(room) {
  clearInterval(room.countdownInterval);
  const { currentRound, totalRounds } = getRoundInfo(room);
  let value = 3;

  const sendTick = () => {
    broadcast(room, {
      type: "countdown_tick",
      value,
      currentRound,
      totalRounds,
    });
  };

  sendTick();

  room.countdownInterval = setInterval(() => {
    value -= 1;
    if (value > 0) {
      sendTick();
    } else {
      clearInterval(room.countdownInterval);
      revealTrickster(room);
    }
  }, 1000);
}

function revealTrickster(room) {
  if (room.currentTricksterIndex >= room.tricksterOrder.length) {
    finishGame(room);
    return;
  }

  room.phase = "trickster_reveal";
  const tricksterId = room.tricksterOrder[room.currentTricksterIndex];
  const trickster = room.players.get(tricksterId);

  if (!trickster) {
    advanceToNextTrickster(room);
    return;
  }

  room.awaitingReady = new Set(room.players.keys());

  const { currentRound, totalRounds } = getRoundInfo(room);

  broadcast(room, {
    type: "trickster_reveal",
    tricksterId,
    tricksterName: trickster.name,
    currentRound,
    totalRounds,
  });
}

function startQuestionPhase(room) {
  if (room.players.size === 0) return;
  clearTimeout(room.answerTimeout);
  room.phase = "question";
  room.answers.clear();
  room.votes.clear();

  const question = getNextQuestion(room);
  if (!question) {
    finishGame(room);
    return;
  }
  room.currentQuestion = question;
  const tricksterId = room.tricksterOrder[room.currentTricksterIndex];
  const trickster = room.players.get(tricksterId);
  const { currentRound, totalRounds } = getRoundInfo(room);

  broadcast(room, {
    type: "question_phase",
    prompt: question.prompt,
    tricksterName: trickster ? trickster.name : "???",
    currentRound,
    totalRounds,
    answerDuration: room.answerDuration,
    mode: room.mode,
    questionTitle: question.title,
    questionAuthor: question.author,
  });

  room.answerTimeout = setTimeout(() => {
    if (room.phase === "question") {
      startVotingPhase(room);
    }
  }, room.answerDuration * 1000);
}

function startVotingPhase(room) {
  clearTimeout(room.answerTimeout);
  if (room.phase === "finished" || room.players.size === 0) return;
  room.phase = "voting";
  room.votes.clear();

  const tricksterId = room.tricksterOrder[room.currentTricksterIndex];
  const snapshot = shuffleArray(buildVotingSnapshot(room));
  room.currentVotingOrder = snapshot.map((answer) => answer.answerId);
  const { currentRound, totalRounds } = getRoundInfo(room);

  for (const player of room.players.values()) {
    const isTrickster = player.id === tricksterId;
    const answersForPlayer = isTrickster
      ? snapshot
      : snapshot
          .filter((answer) => answer.playerId !== player.id)
          .map(({ votes, ...rest }) => rest);
    sendToClient(player.ws, {
      type: "voting_phase",
      answers: answersForPlayer,
      currentRound,
      totalRounds,
      voteDuration: room.voteDuration,
      isTrickster,
    });
  }

  room.voteTimeout = setTimeout(() => {
    if (room.phase === "voting") {
      resolveVoting(room);
    }
  }, room.voteDuration * 1000);
}

function resolveVoting(room) {
  clearTimeout(room.voteTimeout);
  room.voteTimeout = null;
  room.phase = "reveal";
  const tricksterId = room.tricksterOrder[room.currentTricksterIndex];
  const answerLookup = new Map();
  for (const [playerId, submission] of room.answers.entries()) {
    answerLookup.set(submission.answerId, { playerId, text: submission.text });
  }

  for (const [voterId, answerId] of room.votes.entries()) {
    const voter = room.players.get(voterId);
    const target = answerLookup.get(answerId);
    if (!voter || !target) continue;

    if (target.playerId === tricksterId) {
      voter.score += 10;
    }

    const owner = room.players.get(target.playerId);
    if (owner) {
      owner.score += 10;
    }
  }

  const revealList = buildVotingSnapshot(room).map((answer) => ({
    answerId: answer.answerId,
    playerId: answer.playerId,
    authorName: answer.authorName,
    text: answer.text,
    votes: answer.votes,
    isTricksterAnswer: answer.playerId === tricksterId,
  }));

  broadcast(room, {
    type: "reveal_phase",
    tricksterId,
    tricksterName: room.players.get(tricksterId)?.name ?? "???",
    answers: revealList,
    duration: REVEAL_DURATION_MS / 1000,
    players: serializePlayers(room),
  });

  room.revealTimeout = setTimeout(() => {
    sendLeaderboard(room);
  }, REVEAL_DURATION_MS);
}

function sendLeaderboard(room) {
  const { currentRound, totalRounds } = getRoundInfo(room);
  broadcast(room, {
    type: "leaderboard_phase",
    leaderboard: serializePlayers(room),
    duration: LEADERBOARD_DURATION_MS / 1000,
    currentRound,
    totalRounds,
  });

  room.leaderboardTimeout = setTimeout(() => {
    advanceToNextTrickster(room);
  }, LEADERBOARD_DURATION_MS);
}

function advanceToNextTrickster(room) {
  clearTimeout(room.answerTimeout);
  clearTimeout(room.voteTimeout);
  room.answerTimeout = null;
  room.voteTimeout = null;
  room.currentTricksterIndex += 1;
  if (room.currentTricksterIndex >= room.tricksterOrder.length) {
    finishGame(room);
    return;
  }
  room.phase = "countdown";
  beginCountdown(room);
}

function finishGame(room) {
  clearInterval(room.countdownInterval);
  clearTimeout(room.revealTimeout);
  clearTimeout(room.leaderboardTimeout);
  clearTimeout(room.answerTimeout);
  clearTimeout(room.voteTimeout);
  room.countdownInterval = null;
  room.revealTimeout = null;
  room.leaderboardTimeout = null;
  room.answerTimeout = null;
  room.voteTimeout = null;
  room.phase = "finished";
  broadcast(room, {
    type: "game_over",
    leaderboard: serializePlayers(room).sort((a, b) => b.score - a.score),
  });
  resetRoomGameState(room);
}

function adjustTricksterOrder(room, removedPlayerId) {
  room.tricksterOrder = room.tricksterOrder.filter((id) => id !== removedPlayerId);
  if (room.currentTricksterIndex >= room.tricksterOrder.length) {
    room.currentTricksterIndex = Math.max(0, room.tricksterOrder.length - 1);
  }
}

function getRoundInfo(room) {
  const playersPerCycle = Math.max(1, room.players.size);
  const currentRound = Math.floor(room.currentTricksterIndex / playersPerCycle) + 1;
  return {
    currentRound: Math.min(currentRound, room.rounds),
    totalRounds: room.rounds,
  };
}

function getNextQuestion(room) {
  if (!Array.isArray(room.questionDeck) || room.questionDeck.length === 0) {
    return null;
  }
  if (room.questionIndex >= room.questionDeck.length) {
    return null;
  }
  const nextQuestion = room.questionDeck[room.questionIndex];
  room.questionIndex += 1;
  return nextQuestion;
}

function buildTricksterOrder(room) {
  const playerIds = Array.from(room.players.keys());
  const order = [];
  for (let cycle = 0; cycle < room.rounds; cycle += 1) {
    order.push(...playerIds);
  }
  return order;
}

function broadcast(room, payload) {
  const data = JSON.stringify(payload);
  for (const player of room.players.values()) {
    if (player.ws.readyState === 1) {
      player.ws.send(data);
    }
  }
}

function sendToClient(ws, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

function serializePlayers(room) {
  return Array.from(room.players.values()).map(({ id, name, score, isHost }) => ({
    id,
    name,
    score,
    isHost,
  }));
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createAnswerId() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * WebSocket handling
 */
let clientCounter = 0;

wss.on("connection", (ws) => {
  const client = { id: `player-${++clientCounter}`, ws, roomCode: null };

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      sendToClient(ws, { type: "error", message: "Ungültiges Nachrichtenformat." });
      return;
    }

    const { type } = data;

    switch (type) {
      case "create_room": {
        const { name, rounds, answerDuration, voteDuration, mode, questionCategory } = data;
        if (typeof name !== "string" || !name.trim() || typeof rounds !== "number") {
          sendToClient(ws, { type: "error", message: "Ungültige Daten für Lobbyerstellung." });
          return;
        }
        try {
          const room = createRoom(client, name.trim(), rounds, answerDuration, voteDuration, mode, questionCategory);
          const payload = {
            type: "room_created",
            code: room.code,
            playerId: client.id,
            rounds: room.rounds,
            players: serializePlayers(room),
            answerDuration: room.answerDuration,
            voteDuration: room.voteDuration,
            mode: room.mode,
            questionCategoryId: room.questionCategoryId,
            questionCategoryLabel: room.questionCategoryLabel,
          };
          if (room.mode === "custom") {
            payload.customQuestionRequired = room.customQuestionLimit;
            payload.customQuestionProgress = serializeCustomQuestionProgress(room);
            payload.customQuestionsForPlayer = room.customQuestions.get(client.id) ?? [];
          }
          sendToClient(ws, payload);
          if (room.mode === "custom") {
            broadcastCustomQuestionProgress(room);
          }
        } catch (error) {
          sendToClient(ws, { type: "error", message: error.message });
          return;
        }
        break;
      }
      case "join_room": {
        const { name, code } = data;
        const room = rooms.get(code);
        if (!room) {
          sendToClient(ws, { type: "error", message: "Lobby wurde nicht gefunden." });
          return;
        }
        if (room.phase !== "lobby") {
          sendToClient(ws, { type: "error", message: "Das Spiel läuft bereits." });
          return;
        }
        const sanitizedName = typeof name === "string" ? name.trim() : "";
        if (!sanitizedName) {
          sendToClient(ws, { type: "error", message: "Name darf nicht leer sein." });
          return;
        }
        if ([...room.players.values()].some((player) => player.name.toLowerCase() === sanitizedName.toLowerCase())) {
          sendToClient(ws, { type: "error", message: "Name ist bereits vergeben." });
          return;
        }
        joinRoom(client, room, sanitizedName);
        const payload = {
          type: "join_success",
          code: room.code,
          rounds: room.rounds,
          playerId: client.id,
          isHost: client.id === room.hostId,
          players: serializePlayers(room),
          answerDuration: room.answerDuration,
          voteDuration: room.voteDuration,
          mode: room.mode,
          questionCategoryId: room.questionCategoryId,
          questionCategoryLabel: room.questionCategoryLabel,
        };
        if (room.mode === "custom") {
          payload.customQuestionRequired = room.customQuestionLimit;
          payload.customQuestionProgress = serializeCustomQuestionProgress(room);
          payload.customQuestionsForPlayer = room.customQuestions.get(client.id) ?? [];
        }
        sendToClient(ws, payload);
        broadcast(room, {
          type: "lobby_update",
          players: serializePlayers(room),
        });
        if (room.mode === "custom") {
          broadcastCustomQuestionProgress(room);
        }
        break;
      }
      case "start_game": {
        const { lobbyCode } = data;
        const room = rooms.get(lobbyCode);
        if (!room) {
          sendToClient(ws, { type: "error", message: "Lobby existiert nicht mehr." });
          return;
        }
        if (client.id !== room.hostId) {
          sendToClient(ws, { type: "error", message: "Nur der Host kann das Spiel starten." });
          return;
        }
        if (room.players.size < 3) {
          sendToClient(ws, { type: "error", message: "Mindestens 3 Spieler erforderlich." });
          return;
        }
        if (!hasEnoughCustomQuestions(room)) {
          sendToClient(ws, {
            type: "error",
            message: "Alle Spieler müssen erst ihre Custom-Fragen einreichen.",
          });
          return;
        }
        startGame(room);
        break;
      }
      case "trickster_ready": {
        const { lobbyCode } = data;
        const room = rooms.get(lobbyCode);
        if (!room || room.phase !== "trickster_reveal") return;
        room.awaitingReady.delete(client.id);
        if (room.awaitingReady.size === 0) {
          startQuestionPhase(room);
        }
        break;
      }
      case "submit_answer": {
        const { lobbyCode, answer } = data;
        const room = rooms.get(lobbyCode);
        if (!room || room.phase !== "question") return;
        if (typeof answer !== "string" || !answer.trim()) {
          sendToClient(ws, { type: "error", message: "Antwort darf nicht leer sein." });
          return;
        }
        if (room.answers.has(client.id)) {
          sendToClient(ws, { type: "error", message: "Antwort bereits gesendet." });
          return;
        }
        room.answers.set(client.id, { text: answer.trim(), answerId: createAnswerId() });
        if (room.answers.size === room.players.size) {
          startVotingPhase(room);
        }
        break;
      }
      case "submit_vote": {
        const { lobbyCode, answerId } = data;
        const room = rooms.get(lobbyCode);
        if (!room || room.phase !== "voting") return;
        if (!answerId || typeof answerId !== "string") return;

        if (room.votes.has(client.id)) {
          sendToClient(ws, { type: "error", message: "Du hast bereits abgestimmt." });
          return;
        }

        const entry = Array.from(room.answers.values()).find((ans) => ans.answerId === answerId);
        if (!entry) {
          sendToClient(ws, { type: "error", message: "Ungültige Antwort zur Abstimmung." });
          return;
        }
        if (room.answers.get(client.id)?.answerId === answerId) {
          sendToClient(ws, { type: "error", message: "Du kannst nicht für deine eigene Antwort stimmen." });
          return;
        }

        room.votes.set(client.id, answerId);
        const eligibleVoters = Math.max(room.players.size - 1, 0);
        const totalVotes = room.votes.size;
        if (totalVotes >= eligibleVoters) {
          resolveVoting(room);
        } else {
          sendVotingProgress(room);
        }
        break;
      }
      case "leave_room": {
        leaveRoom(client);
        sendToClient(ws, { type: "state_reset" });
        break;
      }
      case "custom_submit_questions": {
        const { lobbyCode, questions } = data;
        const room = rooms.get(lobbyCode);
        if (!room || room.mode !== "custom") return;
        if (room.phase !== "lobby") {
          sendToClient(ws, { type: "error", message: "Fragen können nur in der Lobby eingereicht werden." });
          return;
        }
        const list = Array.isArray(questions) ? questions : [];
        const limit = room.customQuestionLimit ?? room.rounds ?? 0;
        const sanitized = [];
        for (const entry of list) {
          if (typeof entry !== "string") continue;
          const trimmed = entry.trim();
          if (!trimmed) continue;
          sanitized.push(trimmed);
          if (sanitized.length >= limit) break;
        }
        if (!room.customQuestions.has(client.id)) {
          room.customQuestions.set(client.id, []);
        }
        room.customQuestions.set(client.id, sanitized);
        sendToClient(ws, {
          type: "custom_questions_saved",
          questions: sanitized,
          required: limit,
        });
        broadcastCustomQuestionProgress(room);
        break;
      }
      default:
        sendToClient(ws, { type: "error", message: "Unbekannter Nachrichtentyp." });
    }
  });

  ws.on("close", () => {
    leaveRoom(client);
  });
});

server.listen(PORT, () => {
  console.log(`Trickster Server läuft auf Port ${PORT} (IPv4 & IPv6 erreichbar)`);
});

