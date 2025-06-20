import { Position, Tank, Bullet, Enemy } from '../types/game';

export const distance = (pos1: Position, pos2: Position): number => {
  return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
};

export const checkCollision = (
  pos1: Position,
  size1: number,
  pos2: Position,
  size2: number
): boolean => {
  return distance(pos1, pos2) < (size1 + size2) / 2;
};

export const normalizeAngle = (angle: number): number => {
  while (angle < 0) angle += 2 * Math.PI;
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
  return angle;
};

export const wrapPosition = (position: Position, canvasWidth: number, canvasHeight: number): Position => {
  let { x, y } = position;
  
  if (x < 0) x = canvasWidth;
  if (x > canvasWidth) x = 0;
  if (y < 0) y = canvasHeight;
  if (y > canvasHeight) y = 0;
  
  return { x, y };
};

export const formatTime = (milliseconds: number): string => {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const createTank = (id: number, x: number, y: number, color: string): Tank => {
  return {
    id,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    angle: 0,
    health: 100,
    maxHealth: 100,
    color,
    size: 30,
    speed: 2,
    lives: 5,
    score: 0,
    bullets: []
  };
};

export const createBullet = (tank: Tank): Bullet => {
  const bulletSpeed = 8;
  return {
    position: { 
      x: tank.position.x + Math.cos(tank.angle) * tank.size / 2,
      y: tank.position.y + Math.sin(tank.angle) * tank.size / 2
    },
    velocity: {
      x: Math.cos(tank.angle) * bulletSpeed,
      y: Math.sin(tank.angle) * bulletSpeed
    },
    angle: tank.angle,
    speed: bulletSpeed,
    damage: 25,
    owner: tank.id,
    size: 4
  };
};

export const createEnemy = (x: number, y: number): Enemy => {
  return {
    position: { x, y },
    velocity: { x: 0, y: 0 },
    health: 50,
    maxHealth: 50,
    speed: 1,
    size: 20,
    lastDirectionChange: Date.now(),
    target: null
  };
}; 