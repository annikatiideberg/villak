import "./style.css";
import type {
  GameData,
  GameState,
  Question,
  EditorState,
  CustomGame,
} from "./types";

// Theme type
type Theme = "newyear" | "halloween";

// Theme configuration
const themeConfig = {
  newyear: {
    title: "Kuldvillak",
    emoji: "🎆",
    walkingElements: ["🎇", "🥂"],
  },
  halloween: {
    title: "Kuldvillak",
    emoji: "🎃",
    walkingElements: ["🐈", "🐈"],
  },
};

// Current theme (default to new year)
let currentTheme: Theme = "newyear";

// Get theme-specific game IDs
function getThemeGameIds(): string[] {
  if (currentTheme === "halloween") {
    return ["halloween1", "halloween2"];
  }
  return ["newyear1"];
}

// Game Data - loaded from JSON files
const gameData: Record<string, GameData> = {};

// Load and apply theme
function loadTheme() {
  const saved = localStorage.getItem("kuldvillak-theme");
  if (saved === "halloween" || saved === "newyear") {
    currentTheme = saved;
  }
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", currentTheme);
  const config = themeConfig[currentTheme];

  // Update landing title
  const landingTitle = document.querySelector(".landing-title");
  if (landingTitle) {
    landingTitle.textContent = `${config.title} ${config.emoji}`;
  }

  // Update game title
  const gameTitle = document.getElementById("game-title");
  if (gameTitle) {
    gameTitle.textContent = `${config.title} ${config.emoji}`;
  }

  // Update walking elements
  const walkingElements = document.querySelectorAll(".cat");
  walkingElements.forEach((el, index) => {
    el.textContent =
      config.walkingElements[index % config.walkingElements.length];
  });

  // Update toggle button state
  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) {
    toggleBtn.textContent =
      currentTheme === "newyear" ? "🎃 Halloween" : "🎆 New Year";
  }

  // Show/hide second game card based on theme
  const game2Card = document.getElementById("game2-card");
  if (game2Card) {
    game2Card.style.display = currentTheme === "newyear" ? "none" : "flex";
  }
}

function toggleTheme() {
  currentTheme = currentTheme === "newyear" ? "halloween" : "newyear";
  localStorage.setItem("kuldvillak-theme", currentTheme);
  applyTheme();
}

// Load game data from JSON file
async function loadGameData(gameId: string): Promise<GameData | null> {
  try {
    const response = await fetch(`/${gameId}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${gameId}.json`);
    }
    gameData[gameId] = await response.json();
    return gameData[gameId];
  } catch (error) {
    console.error(`Error loading game data for ${gameId}:`, error);
    alert(
      `Failed to load game data: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return null;
  }
}

// Game State
let gameState: GameState = {
  teams: [],
  answeredQuestions: [],
  currentQuestion: null,
  selectedGame: "newyear1", // Default to newyear1
  currentTurn: 0,
  lastPicker: 0,
};

// Editor State
let editorState: EditorState = {
  gameId: null,
  title: "",
  categories: ["", "", "", "", ""],
  questions: [],
  isModified: false,
};

// Currently editing question
let editingQuestion: { categoryIndex: number; value: number } | null = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadGameState();
  generateTeamInputs();
  renderSavedGames();
  renderCustomGames();

  // Add event listeners
  document
    .getElementById("theme-toggle")
    ?.addEventListener("click", toggleTheme);
  document
    .getElementById("game1-card")
    ?.addEventListener("click", () => showTeamSetup(getThemeGameIds()[0]));
  document
    .getElementById("game2-card")
    ?.addEventListener("click", () => showTeamSetup(getThemeGameIds()[1]));
  document
    .getElementById("create-game-card")
    ?.addEventListener("click", () => showEditor());
  document
    .getElementById("team-count")
    ?.addEventListener("change", generateTeamInputs);
  document
    .getElementById("start-game-btn")
    ?.addEventListener("click", startGame);
  document
    .getElementById("back-to-landing-btn")
    ?.addEventListener("click", backToLanding);
  document
    .getElementById("show-answer-btn")
    ?.addEventListener("click", showAnswer);
  document
    .getElementById("close-modal-btn")
    ?.addEventListener("click", closeModal);
  document
    .getElementById("reset-game-btn")
    ?.addEventListener("click", resetGame);
  document
    .getElementById("back-to-menu-btn")
    ?.addEventListener("click", backToLanding);
  document
    .getElementById("game-title")
    ?.addEventListener("click", backToLanding);

  // Editor event listeners
  document
    .getElementById("editor-back-btn")
    ?.addEventListener("click", backFromEditor);
  document
    .getElementById("import-btn")
    ?.addEventListener("click", triggerImport);
  document.getElementById("export-btn")?.addEventListener("click", exportGame);
  document.getElementById("save-game-btn")?.addEventListener("click", saveGame);
  document
    .getElementById("import-file-input")
    ?.addEventListener("change", handleImport);
  document
    .getElementById("cancel-question-edit-btn")
    ?.addEventListener("click", closeQuestionEditor);
  document
    .getElementById("save-question-edit-btn")
    ?.addEventListener("click", saveQuestionEdit);

  // Add keyboard listeners for modal
  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("question-modal");
    if (!modal?.classList.contains("active")) return;

    // Escape to close modal
    if (e.key === "Escape") {
      closeModal();
    }

    // Space bar to show answer
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault(); // Prevent page scroll
      showAnswer();
    }
  });
});

// Screen Navigation
function showScreen(screenId: string) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(screenId)?.classList.add("active");
}

function showTeamSetup(gameId: string) {
  // First, update which game is selected
  gameState.selectedGame = gameId;

  // Try to load saved state for this specific game
  const key = `kuldvillak-game-state-${gameId}`;
  const saved = localStorage.getItem(key);

  if (saved) {
    try {
      const loaded = JSON.parse(saved) as any;
      // Only restore if there's an active game
      if (loaded.teams && loaded.teams.length > 0) {
        // Migrate old format to new format
        const migratedState: GameState = {
          teams: loaded.teams,
          answeredQuestions: [],
          currentQuestion: loaded.currentQuestion || null,
          selectedGame: gameId,
          currentTurn: loaded.currentTurn ?? 0,
          lastPicker: loaded.lastPicker ?? 0,
        };

        // Migrate answeredQuestions from string[] to QuestionAnswer[]
        if (Array.isArray(loaded.answeredQuestions)) {
          if (loaded.answeredQuestions.length > 0) {
            // Check if first item is a string (old format) or object (new format)
            if (typeof loaded.answeredQuestions[0] === "string") {
              // Old format: convert strings to QuestionAnswer objects
              migratedState.answeredQuestions = loaded.answeredQuestions.map(
                (qId: string) => ({
                  questionId: qId,
                  answeredBy: null,
                  isPositive: null,
                })
              );
            } else {
              // New format: ensure isPositive field exists
              migratedState.answeredQuestions = loaded.answeredQuestions.map(
                (a: any) => ({
                  questionId: a.questionId,
                  answeredBy: a.answeredBy,
                  isPositive:
                    a.isPositive ?? (a.answeredBy !== null ? true : null),
                })
              );
            }
          }
        }

        gameState = migratedState;
      } else {
        // No active game, reset to clean state
        resetGameState();
      }
    } catch (e) {
      console.error(`Error loading saved game ${gameId}:`, e);
      resetGameState();
    }
  } else {
    // No saved game, reset to clean state
    resetGameState();
  }

  // Regenerate team inputs with the loaded/reset state
  generateTeamInputs();
  showScreen("setup-screen");
}

function backToLanding() {
  // Save current game state if there's an active game
  if (gameState.teams.length > 0) {
    saveGameState();
  }

  // Reset in-memory state to default
  gameState = {
    teams: [],
    answeredQuestions: [],
    currentQuestion: null,
    selectedGame: getThemeGameIds()[0],
    currentTurn: 0,
    lastPicker: 0,
  };

  showScreen("landing-screen");
  renderSavedGames();
}

// Team Setup
function generateTeamInputs() {
  const teamCountInput = document.getElementById(
    "team-count"
  ) as HTMLInputElement;
  const count = parseInt(teamCountInput.value);
  const container = document.getElementById("team-inputs");
  if (!container) return;

  container.innerHTML = "";

  for (let i = 1; i <= count; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "setup-input";
    input.placeholder = `Tiim ${i} nimi`;
    input.id = `team-${i}`;
    input.value = gameState.teams[i - 1]?.name || `Tiim ${i}`;
    container.appendChild(input);
  }
}

async function startGame() {
  const teamCountInput = document.getElementById(
    "team-count"
  ) as HTMLInputElement;
  const count = parseInt(teamCountInput.value);

  // Reset all game state to start fresh (preserves selectedGame)
  resetGameState();

  // Build teams from inputs
  for (let i = 1; i <= count; i++) {
    const teamInput = document.getElementById(`team-${i}`) as HTMLInputElement;
    const name = teamInput?.value || `Tiim ${i}`;
    gameState.teams.push({ name, score: 0 });
  }

  // Load game data if not already loaded
  const selectedGame = gameState.selectedGame;
  if (!gameData[selectedGame]) {
    const loaded = await loadGameData(selectedGame);
    if (!loaded) {
      // Failed to load game data, don't proceed
      return;
    }
  }

  saveGameState();
  renderGame();
  showScreen("game-screen");
}

// Game Board
function renderGame() {
  renderScores();
  renderBoard();
}

function renderScores() {
  const container = document.getElementById("scores-container");
  if (!container) return;

  container.innerHTML = "";

  gameState.teams.forEach((team, index) => {
    const scoreDiv = document.createElement("div");
    scoreDiv.className = "team-score";

    // Highlight current team's turn
    if (index === gameState.currentTurn) {
      scoreDiv.classList.add("active-turn");
    }

    scoreDiv.innerHTML = `
      <div class="team-name">${team.name}</div>
      <div class="team-points">${team.score}</div>
    `;
    container.appendChild(scoreDiv);
  });
}

function renderBoard() {
  const board = document.getElementById("jeopardy-board");
  if (!board) return;

  board.innerHTML = "";

  const game = gameData[gameState.selectedGame];
  if (!game) {
    console.error("Game data not loaded for:", gameState.selectedGame);
    return;
  }

  // Render categories
  game.categories.forEach((category) => {
    const categoryCell = document.createElement("div");
    categoryCell.className = "category-cell";
    categoryCell.textContent = category;
    board.appendChild(categoryCell);
  });

  // Render questions (5 rows of values: 100, 200, 300, 400, 500)
  const values = [100, 200, 300, 400, 500];
  values.forEach((value) => {
    game.categories.forEach((_, categoryIndex) => {
      const question = game.questions.find(
        (q) => q.category === categoryIndex && q.value === value
      );
      const cell = document.createElement("div");
      cell.className = "question-cell";

      const questionId = `${categoryIndex}-${value}`;
      const answer = gameState.answeredQuestions.find(
        (a) => a.questionId === questionId
      );

      if (answer) {
        cell.classList.add("answered");
      }

      cell.textContent = value.toString();
      if (question) {
        cell.onclick = (e) =>
          openQuestion(question, questionId, e.currentTarget as HTMLElement);
      }
      board.appendChild(cell);
    });
  });
}

// Question Modal
function openQuestion(
  question: Question,
  questionId: string,
  clickedCell: HTMLElement
) {
  gameState.currentQuestion = { ...question, id: questionId };

  const modalValue = document.getElementById("modal-value");
  const modalQuestion = document.getElementById("modal-question");
  const modalAnswer = document.getElementById("modal-answer");
  const showAnswerBtn = document.getElementById("show-answer-btn");

  if (modalValue) modalValue.textContent = question.value.toString();
  if (modalQuestion) modalQuestion.textContent = question.question;
  if (modalAnswer) {
    modalAnswer.textContent = `${question.answer}`;
    modalAnswer.classList.remove("visible");
  }
  if (showAnswerBtn) (showAnswerBtn as HTMLElement).style.display = "block";

  renderTeamButtons();

  const modal = document.getElementById("question-modal");
  const modalContent = document.querySelector(".modal-content") as HTMLElement;

  // Use View Transition API if supported
  if ("startViewTransition" in document && clickedCell) {
    console.log("Using View Transition API");

    // Add transitioning class to html to disable CSS transitions
    document.documentElement.classList.add("is-transitioning");

    // OLD state: only clicked cell has view-transition-name
    clickedCell.classList.add("transitioning");

    const transition = (document as any).startViewTransition(() => {
      // NEW state: remove from cell first, then show modal and add to modal-content
      clickedCell.classList.remove("transitioning");
      modal?.classList.add("active");
      modalContent?.classList.add("transitioning");
    });

    transition.finished.finally(() => {
      // Clean up
      document.documentElement.classList.remove("is-transitioning");
    });
  } else {
    console.log("View Transition API not supported, using CSS transitions");
    modal?.classList.add("active");
  }
}

function showAnswer() {
  const modalAnswer = document.getElementById("modal-answer");
  const showAnswerBtn = document.getElementById("show-answer-btn");

  modalAnswer?.classList.add("visible");
  if (showAnswerBtn) (showAnswerBtn as HTMLElement).style.display = "none";
}

function renderTeamButtons() {
  const container = document.getElementById("team-buttons");
  if (!container) return;

  container.innerHTML = "";

  // Check if this question was already answered
  const question = gameState.currentQuestion;
  if (!question) return;

  const existingAnswer = gameState.answeredQuestions.find(
    (a) => a.questionId === question.id
  );

  // Show indicator if question was previously answered
  if (existingAnswer) {
    const indicator = document.createElement("div");
    indicator.className = "previous-answer-indicator";
    if (existingAnswer.answeredBy === null) {
      indicator.textContent = "Eelnevalt: Vastuseta";
    } else {
      const teamName =
        gameState.teams[existingAnswer.answeredBy]?.name || "Teadmata";
      const pointsType = existingAnswer.isPositive ? "✓" : "✗";
      indicator.textContent = `Eelnevalt: ${pointsType} ${teamName}`;
    }
    container.appendChild(indicator);
  }

  // Render team buttons (positive and negative for each team)
  gameState.teams.forEach((team, index) => {
    const buttonGroup = document.createElement("div");
    buttonGroup.className = "team-button-group";

    // Positive points button
    const positiveButton = document.createElement("button");
    positiveButton.className = "btn-team btn-team-positive";
    positiveButton.textContent = `✓ ${team.name}`;

    // Highlight if this team previously answered with positive points
    if (
      existingAnswer &&
      existingAnswer.answeredBy === index &&
      existingAnswer.isPositive === true
    ) {
      positiveButton.classList.add("previously-selected");
    }

    positiveButton.onclick = () => awardPoints(index);
    buttonGroup.appendChild(positiveButton);

    // Negative points button
    const negativeButton = document.createElement("button");
    negativeButton.className = "btn-team btn-team-negative";
    negativeButton.textContent = `✗ ${team.name}`;

    // Highlight if this team previously answered with negative points
    if (
      existingAnswer &&
      existingAnswer.answeredBy === index &&
      existingAnswer.isPositive === false
    ) {
      negativeButton.classList.add("previously-selected");
    }

    negativeButton.onclick = () => subtractPoints(index);
    buttonGroup.appendChild(negativeButton);

    container.appendChild(buttonGroup);
  });

  // Add "No Answer" button
  const skipButton = document.createElement("button");
  skipButton.className = "btn-team btn-skip";
  skipButton.textContent = "Vastuseta";

  // Highlight if previously skipped
  if (existingAnswer && existingAnswer.answeredBy === null) {
    skipButton.classList.add("previously-selected");
  }

  skipButton.onclick = () => skipQuestion();
  container.appendChild(skipButton);
}

function awardPoints(teamIndex: number) {
  const question = gameState.currentQuestion;
  if (!question) return;

  // Check if this question was already answered (correction mode)
  const existingAnswerIndex = gameState.answeredQuestions.findIndex(
    (a) => a.questionId === question.id
  );

  if (existingAnswerIndex !== -1) {
    // Correction mode: reverse previous points and add new points
    const previousAnswer = gameState.answeredQuestions[existingAnswerIndex];

    // Reverse the previous answer's points
    if (previousAnswer.answeredBy !== null) {
      if (previousAnswer.isPositive) {
        // Was positive, subtract to reverse
        gameState.teams[previousAnswer.answeredBy].score -= question.value;
      } else {
        // Was negative, add to reverse
        gameState.teams[previousAnswer.answeredBy].score += question.value;
      }
    }

    // Add points to new team
    gameState.teams[teamIndex].score += question.value;

    // Update the answer record
    gameState.answeredQuestions[existingAnswerIndex] = {
      questionId: question.id,
      answeredBy: teamIndex,
      isPositive: true,
    };

    // Update turn to the team that got the points
    gameState.currentTurn = teamIndex;
    gameState.lastPicker = teamIndex;
  } else {
    // First time answering: add points and record answer
    gameState.teams[teamIndex].score += question.value;
    gameState.answeredQuestions.push({
      questionId: question.id,
      answeredBy: teamIndex,
      isPositive: true,
    });

    // Update turn to the team that got the points
    gameState.currentTurn = teamIndex;
    gameState.lastPicker = teamIndex;
  }

  saveGameState();
  closeModal();
  renderGame();

  // Check if game is over
  if (
    gameState.answeredQuestions.length ===
    gameData[gameState.selectedGame].questions.length
  ) {
    setTimeout(() => showEndScreen(), 500);
  }
}

function subtractPoints(teamIndex: number) {
  const question = gameState.currentQuestion;
  if (!question) return;

  // Check if this question was already answered (correction mode)
  const existingAnswerIndex = gameState.answeredQuestions.findIndex(
    (a) => a.questionId === question.id
  );

  if (existingAnswerIndex !== -1) {
    // Correction mode: reverse previous points and subtract new points
    const previousAnswer = gameState.answeredQuestions[existingAnswerIndex];

    // Reverse the previous answer's points
    if (previousAnswer.answeredBy !== null) {
      if (previousAnswer.isPositive) {
        // Was positive, subtract to reverse
        gameState.teams[previousAnswer.answeredBy].score -= question.value;
      } else {
        // Was negative, add to reverse
        gameState.teams[previousAnswer.answeredBy].score += question.value;
      }
    }

    // Subtract points from new team (negative points)
    gameState.teams[teamIndex].score -= question.value;

    // Update the answer record
    gameState.answeredQuestions[existingAnswerIndex] = {
      questionId: question.id,
      answeredBy: teamIndex,
      isPositive: false,
    };

    // Keep turn with last picker (team doesn't get to pick next question)
    gameState.currentTurn = gameState.lastPicker;
  } else {
    // First time answering: subtract points and record answer
    gameState.teams[teamIndex].score -= question.value;
    gameState.answeredQuestions.push({
      questionId: question.id,
      answeredBy: teamIndex,
      isPositive: false,
    });

    // Keep turn with last picker (team that got wrong answer doesn't pick)
    gameState.currentTurn = gameState.lastPicker;
  }

  saveGameState();
  closeModal();
  renderGame();

  // Check if game is over
  if (
    gameState.answeredQuestions.length ===
    gameData[gameState.selectedGame].questions.length
  ) {
    setTimeout(() => showEndScreen(), 500);
  }
}

function skipQuestion() {
  const question = gameState.currentQuestion;
  if (!question) return;

  // Check if this question was already answered
  const existingAnswerIndex = gameState.answeredQuestions.findIndex(
    (a) => a.questionId === question.id
  );

  if (existingAnswerIndex !== -1) {
    // Correction mode: changing to "No Answer"
    const previousAnswer = gameState.answeredQuestions[existingAnswerIndex];

    // Reverse the previous answer's points
    if (previousAnswer.answeredBy !== null) {
      if (previousAnswer.isPositive) {
        // Was positive, subtract to reverse
        gameState.teams[previousAnswer.answeredBy].score -= question.value;
      } else {
        // Was negative, add to reverse
        gameState.teams[previousAnswer.answeredBy].score += question.value;
      }
    }

    // Update the answer record to "No Answer"
    gameState.answeredQuestions[existingAnswerIndex] = {
      questionId: question.id,
      answeredBy: null,
      isPositive: null,
    };

    // Keep the same team's turn (lastPicker remains)
  } else {
    // First time: mark as answered with no team getting points
    gameState.answeredQuestions.push({
      questionId: question.id,
      answeredBy: null,
      isPositive: null,
    });

    // Keep current turn unchanged (same team picks again)
  }

  saveGameState();
  closeModal();
  renderGame();

  // Check if game is over
  if (
    gameState.answeredQuestions.length ===
    gameData[gameState.selectedGame].questions.length
  ) {
    setTimeout(() => showEndScreen(), 500);
  }
}

function closeModal() {
  const modal = document.getElementById("question-modal");
  const modalContent = document.querySelector(".modal-content") as HTMLElement;

  // Use View Transition API if supported
  if (
    "startViewTransition" in document &&
    modalContent?.classList.contains("transitioning")
  ) {
    console.log("Closing with View Transition API");

    // Add transitioning class to html to disable CSS transitions
    document.documentElement.classList.add("is-transitioning");

    const transition = (document as any).startViewTransition(() => {
      // NEW state: hide modal and remove view-transition-name
      modal?.classList.remove("active");
      modalContent?.classList.remove("transitioning");
    });

    transition.finished.finally(() => {
      // Clean up
      document.documentElement.classList.remove("is-transitioning");
    });
  } else {
    console.log("Closing with CSS transitions");
    modal?.classList.remove("active");
    modalContent?.classList.remove("transitioning");
  }

  gameState.currentQuestion = null;
}

// End Screen
function showEndScreen() {
  const podium = document.getElementById("podium");
  if (!podium) return;

  podium.innerHTML = "";

  // Sort teams by score
  const sortedTeams = [...gameState.teams].sort((a, b) => b.score - a.score);

  // Show top 3
  const places = ["first", "second", "third"];
  const medals = ["🥇", "🥈", "🥉"];

  sortedTeams.slice(0, 3).forEach((team, index) => {
    const placeDiv = document.createElement("div");
    placeDiv.className = `podium-place ${places[index]}`;
    placeDiv.style.animationDelay = `${index * 0.3}s`;
    placeDiv.innerHTML = `
      <div class="place-number">${medals[index]}</div>
      <div class="place-team">${team.name}</div>
      <div class="place-score">${team.score} punkti</div>
    `;
    podium.appendChild(placeDiv);
  });

  showScreen("end-screen");
  createConfetti();

  // Remove completed game from saved games
  const key = `kuldvillak-game-state-${gameState.selectedGame}`;
  localStorage.removeItem(key);
}

function createConfetti() {
  const themeColors = {
    newyear: ["#4a90d9", "#ffd700", "#c0c0c0", "#1a237e", "#2dd881"],
    halloween: ["#ff6b35", "#f7b32b", "#2dd881", "#6b2d5c"],
  };
  const colors = themeColors[currentTheme];
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const confetti = document.createElement("div");
      confetti.className = "confetti";
      confetti.style.left = Math.random() * 100 + "%";
      confetti.style.background =
        colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDuration = Math.random() * 2 + 2 + "s";
      confetti.style.animationDelay = Math.random() + "s";
      document.body.appendChild(confetti);

      setTimeout(() => confetti.remove(), 5000);
    }, i * 50);
  }
}

// Reset Game
function resetGame() {
  gameState = {
    teams: [],
    answeredQuestions: [],
    currentQuestion: null,
    selectedGame: getThemeGameIds()[0],
    currentTurn: 0,
    lastPicker: 0,
  };
  saveGameState();
}

// LocalStorage
function saveGameState() {
  const key = `kuldvillak-game-state-${gameState.selectedGame}`;
  localStorage.setItem(key, JSON.stringify(gameState));
}

// Reset game state while preserving selectedGame
function resetGameState() {
  const currentGame = gameState.selectedGame;
  gameState = {
    teams: [],
    answeredQuestions: [],
    currentQuestion: null,
    selectedGame: currentGame,
    currentTurn: 0,
    lastPicker: 0,
  };
}

function loadGameState() {
  const key = `kuldvillak-game-state-${gameState.selectedGame}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    const loaded = JSON.parse(saved) as any;
    // Only restore if there's an active game
    if (loaded.teams && loaded.teams.length > 0) {
      // Migrate old format to new format
      const migratedState: GameState = {
        teams: loaded.teams,
        answeredQuestions: [],
        currentQuestion: loaded.currentQuestion || null,
        selectedGame: loaded.selectedGame || getThemeGameIds()[0],
        currentTurn: loaded.currentTurn ?? 0,
        lastPicker: loaded.lastPicker ?? 0,
      };

      // Migrate answeredQuestions from string[] to QuestionAnswer[]
      if (Array.isArray(loaded.answeredQuestions)) {
        if (loaded.answeredQuestions.length > 0) {
          // Check if first item is a string (old format) or object (new format)
          if (typeof loaded.answeredQuestions[0] === "string") {
            // Old format: convert strings to QuestionAnswer objects
            migratedState.answeredQuestions = loaded.answeredQuestions.map(
              (qId: string) => ({
                questionId: qId,
                answeredBy: null, // We don't know who answered in old format
                isPositive: null,
              })
            );
          } else {
            // New format: ensure isPositive field exists
            migratedState.answeredQuestions = loaded.answeredQuestions.map(
              (a: any) => ({
                questionId: a.questionId,
                answeredBy: a.answeredBy,
                isPositive:
                  a.isPositive ?? (a.answeredBy !== null ? true : null),
              })
            );
          }
        }
      }

      gameState = migratedState;
    }
  }
}

function getSavedGames(): Array<{ gameId: string; state: GameState }> {
  const savedGames: Array<{ gameId: string; state: GameState }> = [];

  const gameIds = getThemeGameIds();
  gameIds.forEach((gameId) => {
    const key = `kuldvillak-game-state-${gameId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const state = JSON.parse(saved) as GameState;
        // Only include if there's an active game
        if (state.teams.length > 0) {
          savedGames.push({ gameId, state });
        }
      } catch (e) {
        console.error(`Error parsing saved game ${gameId}:`, e);
      }
    }
  });

  return savedGames;
}

function deleteSavedGame(gameId: string) {
  const key = `kuldvillak-game-state-${gameId}`;
  localStorage.removeItem(key);
  renderSavedGames();
}

// Saved Games UI
function renderSavedGames() {
  const container = document.getElementById("saved-games-container");
  if (!container) return;

  const savedGames = getSavedGames();

  if (savedGames.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  container.innerHTML =
    '<h3 class="saved-games-title">Pooleliolevad mängud</h3>';

  savedGames.forEach(({ gameId, state }) => {
    const gameCard = document.createElement("div");
    gameCard.className = "saved-game-card";

    const gameIds = getThemeGameIds();
    const gameIndex = gameIds.indexOf(gameId);
    const gameName = gameIndex === 0 ? "Mäng 1" : "Mäng 2";
    const progress = `${state.answeredQuestions.length}/25`;
    const teamsInfo = state.teams
      .map((t) => `${t.name}: ${t.score}`)
      .join(" | ");

    gameCard.innerHTML = `
      <div class="saved-game-content" data-game-id="${gameId}">
        <div class="saved-game-header">
          <span class="saved-game-name">${gameName}</span>
          <span class="saved-game-progress">${progress}</span>
        </div>
        <div class="saved-game-teams">${teamsInfo}</div>
      </div>
      <button class="saved-game-delete" data-game-id="${gameId}" title="Kustuta salvestatud mäng">🗑️</button>
    `;

    // Add click handlers
    const contentDiv = gameCard.querySelector(
      ".saved-game-content"
    ) as HTMLElement;
    contentDiv.addEventListener("click", () => resumeGame(gameId));

    const deleteBtn = gameCard.querySelector(
      ".saved-game-delete"
    ) as HTMLElement;
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (
        confirm(`Kas oled kindel, et soovid kustutada mängu "${gameName}"?`)
      ) {
        deleteSavedGame(gameId);
      }
    });

    container.appendChild(gameCard);
  });
}

async function resumeGame(gameId: string) {
  const key = `kuldvillak-game-state-${gameId}`;
  const saved = localStorage.getItem(key);

  if (!saved) {
    alert("Salvestatud mängu ei leitud!");
    renderSavedGames();
    return;
  }

  try {
    const savedState = JSON.parse(saved) as GameState;
    gameState = savedState;

    // Load game data if not already loaded
    if (!gameData[gameId]) {
      const loaded = await loadGameData(gameId);
      if (!loaded) {
        return;
      }
    }

    renderGame();
    showScreen("game-screen");
  } catch (error) {
    console.error("Error resuming game:", error);
    alert("Viga mängu taasalustamisel!");
  }
}

// ============ EDITOR FUNCTIONS ============

function initializeEmptyQuestions(): Question[] {
  const questions: Question[] = [];
  const values = [100, 200, 300, 400, 500];

  for (let categoryIndex = 0; categoryIndex < 5; categoryIndex++) {
    for (const value of values) {
      questions.push({
        category: categoryIndex,
        value,
        question: "",
        answer: "",
      });
    }
  }

  return questions;
}

function showEditor(gameId: string | null = null) {
  if (gameId) {
    // Load existing custom game for editing
    const customGame = getCustomGame(gameId);
    if (customGame) {
      editorState = {
        gameId,
        title: customGame.data.title,
        categories: [...customGame.data.categories],
        questions: JSON.parse(JSON.stringify(customGame.data.questions)),
        isModified: false,
      };
    }
  } else {
    // New game
    editorState = {
      gameId: null,
      title: "",
      categories: ["", "", "", "", ""],
      questions: initializeEmptyQuestions(),
      isModified: false,
    };
  }

  renderEditor();
  showScreen("editor-screen");
}

function renderEditor() {
  // Render title input
  const titleInput = document.getElementById(
    "editor-game-title"
  ) as HTMLInputElement;
  if (titleInput) {
    titleInput.value = editorState.title;
    titleInput.addEventListener("input", () => {
      editorState.title = titleInput.value;
      editorState.isModified = true;
    });
  }

  // Render category inputs
  const categoryContainer = document.getElementById("category-inputs");
  if (categoryContainer) {
    categoryContainer.innerHTML = "";
    editorState.categories.forEach((category, index) => {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "category-input";
      input.placeholder = `Kategooria ${index + 1}`;
      input.value = category;
      input.addEventListener("input", () => {
        editorState.categories[index] = input.value;
        editorState.isModified = true;
      });
      categoryContainer.appendChild(input);
    });
  }

  // Render question grid
  renderEditorBoard();
}

function renderEditorBoard() {
  const board = document.getElementById("editor-board");
  if (!board) return;

  board.innerHTML = "";

  const values = [100, 200, 300, 400, 500];

  values.forEach((value) => {
    for (let categoryIndex = 0; categoryIndex < 5; categoryIndex++) {
      const question = editorState.questions.find(
        (q) => q.category === categoryIndex && q.value === value
      );

      const cell = document.createElement("div");
      cell.className = "editor-cell";

      const isFilled = question && question.question.trim() !== "";
      if (isFilled) {
        cell.classList.add("filled");
      }

      cell.innerHTML = `
        <span class="cell-value">${value}</span>
        <span class="cell-status">${isFilled ? "✓" : "tühi"}</span>
      `;

      cell.addEventListener("click", () =>
        openQuestionEditor(categoryIndex, value)
      );
      board.appendChild(cell);
    }
  });
}

function openQuestionEditor(categoryIndex: number, value: number) {
  editingQuestion = { categoryIndex, value };

  const question = editorState.questions.find(
    (q) => q.category === categoryIndex && q.value === value
  );

  const questionInput = document.getElementById(
    "edit-question-text"
  ) as HTMLTextAreaElement;
  const answerInput = document.getElementById(
    "edit-answer-text"
  ) as HTMLInputElement;

  if (questionInput) questionInput.value = question?.question || "";
  if (answerInput) answerInput.value = question?.answer || "";

  const modal = document.getElementById("question-editor-modal");
  modal?.classList.add("active");
}

function closeQuestionEditor() {
  const modal = document.getElementById("question-editor-modal");
  modal?.classList.remove("active");
  editingQuestion = null;
}

function saveQuestionEdit() {
  if (!editingQuestion) return;

  const questionInput = document.getElementById(
    "edit-question-text"
  ) as HTMLTextAreaElement;
  const answerInput = document.getElementById(
    "edit-answer-text"
  ) as HTMLInputElement;

  const questionIndex = editorState.questions.findIndex(
    (q) =>
      q.category === editingQuestion!.categoryIndex &&
      q.value === editingQuestion!.value
  );

  if (questionIndex !== -1) {
    editorState.questions[questionIndex] = {
      category: editingQuestion.categoryIndex,
      value: editingQuestion.value,
      question: questionInput?.value || "",
      answer: answerInput?.value || "",
    };
    editorState.isModified = true;
  }

  closeQuestionEditor();
  renderEditorBoard();
}

function backFromEditor() {
  if (editorState.isModified) {
    if (
      !confirm(
        "Sul on salvestamata muudatusi. Kas oled kindel, et soovid lahkuda?"
      )
    ) {
      return;
    }
  }
  showScreen("landing-screen");
  renderCustomGames();
}

function triggerImport() {
  const fileInput = document.getElementById(
    "import-file-input"
  ) as HTMLInputElement;
  fileInput?.click();
}

function handleImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string) as GameData;

      // Validate the data
      if (
        !data.categories ||
        !Array.isArray(data.categories) ||
        data.categories.length !== 5
      ) {
        throw new Error("Invalid categories");
      }
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error("Invalid questions");
      }

      editorState = {
        gameId: null, // Treat as new game
        title: data.title || "",
        categories: data.categories,
        questions: data.questions,
        isModified: true,
      };

      renderEditor();
      alert("Mäng imporditud edukalt!");
    } catch (error) {
      console.error("Import error:", error);
      alert("Viga faili importimisel. Kontrolli, et fail on õiges formaadis.");
    }
  };

  reader.readAsText(file);
  input.value = ""; // Reset input
}

function exportGame() {
  // Validate before export
  const titleInput = document.getElementById(
    "editor-game-title"
  ) as HTMLInputElement;
  const title = titleInput?.value || editorState.title || "Minu mäng";

  const exportData: GameData = {
    title,
    categories: editorState.categories,
    questions: editorState.questions,
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function saveGame() {
  // Validate
  const titleInput = document.getElementById(
    "editor-game-title"
  ) as HTMLInputElement;
  const title = titleInput?.value.trim();

  if (!title) {
    alert("Palun sisesta mängu pealkiri!");
    titleInput?.focus();
    return;
  }

  // Check if all categories have names
  const emptyCategories = editorState.categories.filter((c) => !c.trim());
  if (emptyCategories.length > 0) {
    alert("Palun täida kõik kategooriad!");
    return;
  }

  // Check if at least some questions are filled
  const filledQuestions = editorState.questions.filter(
    (q) => q.question.trim() !== ""
  );
  if (filledQuestions.length === 0) {
    alert("Palun lisa vähemalt üks küsimus!");
    return;
  }

  // Generate ID if new game
  const gameId = editorState.gameId || `custom-${Date.now()}`;

  const customGame: CustomGame = {
    id: gameId,
    data: {
      title,
      categories: editorState.categories,
      questions: editorState.questions,
    },
    createdAt: editorState.gameId
      ? getCustomGame(gameId)?.createdAt || Date.now()
      : Date.now(),
    updatedAt: Date.now(),
  };

  saveCustomGame(customGame);

  editorState.gameId = gameId;
  editorState.isModified = false;

  alert("Mäng salvestatud!");
  showScreen("landing-screen");
  renderCustomGames();
}

// Custom Games Storage
function getCustomGames(): CustomGame[] {
  const games: CustomGame[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("kuldvillak-custom-game-")) {
      try {
        const game = JSON.parse(localStorage.getItem(key) || "");
        games.push(game);
      } catch (e) {
        console.error("Error parsing custom game:", e);
      }
    }
  }
  return games.sort((a, b) => b.updatedAt - a.updatedAt);
}

function getCustomGame(gameId: string): CustomGame | null {
  const key = `kuldvillak-custom-game-${gameId}`;
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function saveCustomGame(game: CustomGame) {
  const key = `kuldvillak-custom-game-${game.id}`;
  localStorage.setItem(key, JSON.stringify(game));

  // Also add to gameData for playing
  gameData[game.id] = game.data;
}

function deleteCustomGame(gameId: string) {
  const key = `kuldvillak-custom-game-${gameId}`;
  localStorage.removeItem(key);

  // Also remove from gameData
  delete gameData[gameId];

  // Remove any saved game state
  const stateKey = `kuldvillak-game-state-${gameId}`;
  localStorage.removeItem(stateKey);
}

function renderCustomGames() {
  const container = document.getElementById("custom-games-container");
  if (!container) return;

  const customGames = getCustomGames();

  if (customGames.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  container.innerHTML = '<h3 class="custom-games-title">Minu mängud</h3>';

  const grid = document.createElement("div");
  grid.className = "custom-games-grid";

  customGames.forEach((game) => {
    const card = document.createElement("div");
    card.className = "custom-game-card";

    card.innerHTML = `
      <div class="custom-game-name">${game.data.title}</div>
      <div class="custom-game-actions">
        <button class="btn-play" data-id="${game.id}">Mängi</button>
        <button class="btn-edit" data-id="${game.id}">Muuda</button>
        <button class="btn-delete" data-id="${game.id}">Kustuta</button>
      </div>
    `;

    // Add event listeners
    card.querySelector(".btn-play")?.addEventListener("click", () => {
      // Load custom game data and show team setup
      const customGame = getCustomGame(game.id);
      if (customGame) {
        gameData[game.id] = customGame.data;
        showTeamSetup(game.id as any);
      }
    });

    card.querySelector(".btn-edit")?.addEventListener("click", () => {
      showEditor(game.id);
    });

    card.querySelector(".btn-delete")?.addEventListener("click", () => {
      if (
        confirm(
          `Kas oled kindel, et soovid kustutada mängu "${game.data.title}"?`
        )
      ) {
        deleteCustomGame(game.id);
        renderCustomGames();
      }
    });

    grid.appendChild(card);
  });

  container.appendChild(grid);
}
