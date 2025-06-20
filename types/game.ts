export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Tank {
  id: number;
  position: Position;
  velocity: Velocity;
  angle: number;
  health: number;
  maxHealth: number;
  color: string;
  size: number;
  speed: number;
  lives: number;
  score: number;
  bullets: Bullet[];
}

export interface Bullet {
  position: Position;
  velocity: Velocity;
  angle: number;
  speed: number;
  damage: number;
  owner: number;
  size: number;
}

export interface Enemy {
  position: Position;
  velocity: Velocity;
  health: number;
  maxHealth: number;
  speed: number;
  size: number;
  lastDirectionChange: number;
  target: Tank | null;
}

export interface GameState {
  tanks: Tank[];
  enemies: Enemy[];
  gameStartTime: number;
  gameEndTime: number | null;
  timeLimit: number; // 4 minutes in milliseconds
  winner: Tank | null;
  gameOver: boolean;
  paused: boolean;
}

export interface KeyState {
  [key: string]: boolean;
}

export enum GameStatus {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over'
} 