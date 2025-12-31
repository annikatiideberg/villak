export interface Question {
  category: number;
  value: number;
  question: string;
  answer: string;
}

export interface GameData {
  title: string;
  categories: string[];
  questions: Question[];
}

export interface Team {
  name: string;
  score: number;
}

export interface QuestionAnswer {
  questionId: string;
  answeredBy: number | null; // team index or null for "No Answer"
  isPositive: boolean | null; // true = +points, false = -points, null = skipped
}

export interface GameState {
  teams: Team[];
  answeredQuestions: QuestionAnswer[];
  currentQuestion: (Question & { id: string }) | null;
  selectedGame: string;
  currentTurn: number; // which team's turn to pick next question
  lastPicker: number; // last team to pick a question
}

export interface EditorState {
  gameId: string | null; // null for new game, id for editing
  title: string;
  categories: string[];
  questions: Question[];
  isModified: boolean;
}

export interface CustomGame {
  id: string;
  data: GameData;
  createdAt: number;
  updatedAt: number;
}
