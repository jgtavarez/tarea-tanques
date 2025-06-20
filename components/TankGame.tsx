import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Tank, GameState, KeyState, GameStatus } from '../types/game';
import { 
  checkCollision, 
  createTank, 
  createBullet, 
  createEnemy, 
  formatTime,
  wrapPosition,
  distance 
} from '../utils/gameUtils';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;
const GAME_TIME_LIMIT = 4 * 60 * 1000; // 4 minutes

interface TankGameProps {}

const TankGame: React.FC<TankGameProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const lastShotTime = useRef<{[key: number]: number}>({});
  const [gameState, setGameState] = useState<GameState>({
    tanks: [],
    enemies: [],
    gameStartTime: 0,
    gameEndTime: null,
    timeLimit: GAME_TIME_LIMIT,
    winner: null,
    gameOver: false,
    paused: false
  });
  
  const keysRef = useRef<KeyState>({});
  const animationFrameRef = useRef<number>();

  // Initialize game
  const initializeGame = useCallback(() => {
    const player1 = createTank(1, 100, 100, '#3498db');
    const player2 = createTank(2, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 100, '#e74c3c');
    
    const enemies = [
      createEnemy(CANVAS_WIDTH / 2, 100),
      createEnemy(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 100),
      createEnemy(200, CANVAS_HEIGHT / 2),
      createEnemy(CANVAS_WIDTH - 200, CANVAS_HEIGHT / 2)
    ];

    setGameState({
      tanks: [player1, player2],
      enemies,
      gameStartTime: Date.now(),
      gameEndTime: null,
      timeLimit: GAME_TIME_LIMIT,
      winner: null,
      gameOver: false,
      paused: false
    });
    
    setGameStatus(GameStatus.PLAYING);
    
    // Start background music
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      
      // Pause game
      if (e.code === 'Escape' && gameStatus === GameStatus.PLAYING) {
        setGameStatus(GameStatus.PAUSED);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStatus]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameStatus !== GameStatus.PLAYING) return;

    setGameState(prevState => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - prevState.gameStartTime;
      
      // Check time limit
      if (elapsedTime >= prevState.timeLimit) {
        return {
          ...prevState,
          gameOver: true,
          gameEndTime: currentTime,
          winner: null // Both lose
        };
      }

      const newState = { ...prevState };
      
      // Update tanks
      newState.tanks = newState.tanks.map(tank => {
        const newTank = { ...tank };
        
        // Reset velocity for direct movement
        newTank.velocity.x = 0;
        newTank.velocity.y = 0;
        
        // Tank movement based on player
        if (tank.id === 1) {
          // Player 1 controls (WASD + Space)
          if (keysRef.current['KeyW']) {
            newTank.velocity.x = Math.cos(tank.angle) * tank.speed;
            newTank.velocity.y = Math.sin(tank.angle) * tank.speed;
          }
          if (keysRef.current['KeyS']) {
            newTank.velocity.x = -Math.cos(tank.angle) * tank.speed * 0.7;
            newTank.velocity.y = -Math.sin(tank.angle) * tank.speed * 0.7;
          }
          if (keysRef.current['KeyA']) {
            newTank.angle -= 0.08;
          }
          if (keysRef.current['KeyD']) {
            newTank.angle += 0.08;
          }
          if (keysRef.current['Space'] && tank.bullets.length < 3) {
            const now = Date.now();
            if (!lastShotTime.current[tank.id] || now - lastShotTime.current[tank.id] > 200) {
              newTank.bullets.push(createBullet(tank));
              lastShotTime.current[tank.id] = now;
            }
          }
        } else if (tank.id === 2) {
          // Player 2 controls (Arrow keys + Enter)
          if (keysRef.current['ArrowUp']) {
            newTank.velocity.x = Math.cos(tank.angle) * tank.speed;
            newTank.velocity.y = Math.sin(tank.angle) * tank.speed;
          }
          if (keysRef.current['ArrowDown']) {
            newTank.velocity.x = -Math.cos(tank.angle) * tank.speed * 0.7;
            newTank.velocity.y = -Math.sin(tank.angle) * tank.speed * 0.7;
          }
          if (keysRef.current['ArrowLeft']) {
            newTank.angle -= 0.08;
          }
          if (keysRef.current['ArrowRight']) {
            newTank.angle += 0.08;
          }
          if (keysRef.current['Enter'] && tank.bullets.length < 3) {
            const now = Date.now();
            if (!lastShotTime.current[tank.id] || now - lastShotTime.current[tank.id] > 200) {
              newTank.bullets.push(createBullet(tank));
              lastShotTime.current[tank.id] = now;
            }
          }
        }
        
        // Update position directly
        newTank.position.x += newTank.velocity.x;
        newTank.position.y += newTank.velocity.y;
        
        // Wrap around screen
        newTank.position = wrapPosition(newTank.position, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Update bullets
        newTank.bullets = newTank.bullets
          .map(bullet => ({
            ...bullet,
            position: {
              x: bullet.position.x + bullet.velocity.x,
              y: bullet.position.y + bullet.velocity.y
            }
          }))
          .filter(bullet => 
            bullet.position.x > 0 && bullet.position.x < CANVAS_WIDTH &&
            bullet.position.y > 0 && bullet.position.y < CANVAS_HEIGHT
          );
          
        return newTank;
      });

      // Update enemies
      newState.enemies = newState.enemies.map(enemy => {
        const newEnemy = { ...enemy };
        
        // Simple AI: change direction periodically and chase nearest tank
        if (currentTime - enemy.lastDirectionChange > 2000) {
          const nearestTank = newState.tanks.reduce((nearest, tank) => {
            const distToEnemy = distance(enemy.position, tank.position);
            const distToNearest = nearest ? distance(enemy.position, nearest.position) : Infinity;
            return distToEnemy < distToNearest ? tank : nearest;
          }, null as Tank | null);
          
          if (nearestTank) {
            const angle = Math.atan2(
              nearestTank.position.y - enemy.position.y,
              nearestTank.position.x - enemy.position.x
            );
            newEnemy.velocity.x = Math.cos(angle) * enemy.speed;
            newEnemy.velocity.y = Math.sin(angle) * enemy.speed;
          }
          
          newEnemy.lastDirectionChange = currentTime;
        }
        
        newEnemy.position.x += newEnemy.velocity.x;
        newEnemy.position.y += newEnemy.velocity.y;
        
        // Wrap around screen
        newEnemy.position = wrapPosition(newEnemy.position, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        return newEnemy;
      });

      // Check collisions
      newState.tanks.forEach(tank => {
        // Bullet vs tank collisions
        newState.tanks.forEach(otherTank => {
          if (tank.id !== otherTank.id) {
            tank.bullets.forEach((bullet, bulletIndex) => {
              if (checkCollision(bullet.position, bullet.size, otherTank.position, otherTank.size)) {
                otherTank.health -= bullet.damage;
                tank.bullets.splice(bulletIndex, 1);
                tank.score += 10;
                
                if (otherTank.health <= 0) {
                  otherTank.lives--;
                  otherTank.health = otherTank.maxHealth;
                  tank.score += 100;
                  
                  if (otherTank.lives <= 0) {
                    newState.gameOver = true;
                    newState.gameEndTime = currentTime;
                    newState.winner = tank;
                  }
                }
              }
            });
          }
        });
        
        // Bullet vs enemy collisions
        tank.bullets.forEach((bullet, bulletIndex) => {
          newState.enemies.forEach((enemy, enemyIndex) => {
            if (checkCollision(bullet.position, bullet.size, enemy.position, enemy.size)) {
              enemy.health -= bullet.damage;
              tank.bullets.splice(bulletIndex, 1);
              tank.score += 5;
              
              if (enemy.health <= 0) {
                newState.enemies.splice(enemyIndex, 1);
                tank.score += 50;
              }
            }
          });
        });
        
        // Tank vs enemy collisions
        newState.enemies.forEach(enemy => {
          if (checkCollision(tank.position, tank.size, enemy.position, enemy.size)) {
            tank.health -= 1; // Damage over time when touching enemy
            
            if (tank.health <= 0) {
              tank.lives--;
              tank.health = tank.maxHealth;
              
              if (tank.lives <= 0) {
                newState.gameOver = true;
                newState.gameEndTime = currentTime;
                const otherTank = newState.tanks.find(t => t.id !== tank.id);
                newState.winner = otherTank || null;
              }
            }
          }
        });
      });

      return newState;
    });
  }, [gameStatus]);

  // Rendering
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (gameStatus === GameStatus.PLAYING) {
      // Draw tanks
      gameState.tanks.forEach(tank => {
        ctx.save();
        ctx.translate(tank.position.x, tank.position.y);
        ctx.rotate(tank.angle);
        
        // Tank body
        ctx.fillStyle = tank.color;
        ctx.fillRect(-tank.size/2, -tank.size/2, tank.size, tank.size);
        
        // Tank barrel
        ctx.fillStyle = '#34495e';
        ctx.fillRect(0, -3, tank.size/2, 6);
        
        ctx.restore();
        
        // Health bar
        const barWidth = tank.size;
        const barHeight = 4;
        const healthPercentage = tank.health / tank.maxHealth;
        
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(tank.position.x - barWidth/2, tank.position.y - tank.size/2 - 10, barWidth, barHeight);
        
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(tank.position.x - barWidth/2, tank.position.y - tank.size/2 - 10, barWidth * healthPercentage, barHeight);
        
        // Draw bullets
        tank.bullets.forEach(bullet => {
          ctx.fillStyle = '#f39c12';
          ctx.beginPath();
          ctx.arc(bullet.position.x, bullet.position.y, bullet.size, 0, 2 * Math.PI);
          ctx.fill();
        });
      });

      // Draw enemies
      gameState.enemies.forEach(enemy => {
        ctx.fillStyle = '#8e44ad';
        ctx.beginPath();
        ctx.arc(enemy.position.x, enemy.position.y, enemy.size, 0, 2 * Math.PI);
        ctx.fill();
        
        // Enemy health bar
        const barWidth = enemy.size * 2;
        const barHeight = 3;
        const healthPercentage = enemy.health / enemy.maxHealth;
        
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(enemy.position.x - barWidth/2, enemy.position.y - enemy.size - 8, barWidth, barHeight);
        
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(enemy.position.x - barWidth/2, enemy.position.y - enemy.size - 8, barWidth * healthPercentage, barHeight);
      });
    }
  }, [gameState, gameStatus]);

  // Combined game loop and rendering
  const animate = useCallback(() => {
    if (gameStatus === GameStatus.PLAYING) {
      gameLoop();
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [gameStatus, gameLoop, render]);

  // Start animation loop
  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING) {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [gameStatus, animate]);

  // Check for game over
  useEffect(() => {
    if (gameState.gameOver) {
      setGameStatus(GameStatus.GAME_OVER);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [gameState.gameOver]);

  const currentTime = Date.now();
  const elapsedTime = gameStatus === GameStatus.PLAYING ? currentTime - gameState.gameStartTime : 0;
  const remainingTime = Math.max(0, gameState.timeLimit - elapsedTime);

  return (
    <div className="game-container">
      <div className="game-header">
        <div className="student-info">
          <div><strong>Juan Gabriel</strong></div>
          <div>Matrícula: 1200221</div>
        </div>
      </div>

      {/* Background Audio */}
      <audio ref={audioRef} loop>
        <source src="/audio/funeral-march.mp3" type="audio/mpeg" />
      </audio>

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas"
      />

      {/* Game UI */}
      {gameStatus === GameStatus.PLAYING && (
        <>
          <div className="game-ui">
            <div className="timer">
              Tiempo: {formatTime(remainingTime)}
            </div>
            <div className="lives">
              Jugador 1 Vidas: {gameState.tanks[0]?.lives || 0}
            </div>
            <div className="lives">
              Jugador 2 Vidas: {gameState.tanks[1]?.lives || 0}
            </div>
            <div className="lives">
              Jugador 1 Score: {gameState.tanks[0]?.score || 0}
            </div>
            <div className="lives">
              Jugador 2 Score: {gameState.tanks[1]?.score || 0}
            </div>
          </div>
          
          <div className="controls">
            <h3>Controles</h3>
            <p><strong>Jugador 1:</strong> WASD + Space</p>
            <p><strong>Jugador 2:</strong> Arrow Keys + Enter</p>
            <p><strong>ESC:</strong> Pausar Juego</p>
          </div>
        </>
      )}

      {/* Menu Screen */}
      {gameStatus === GameStatus.MENU && (
        <div className="modal">
          <div className="modal-content">
            <h2>Tarea Tanques</h2>
            <p>¡Lucha contra tu oponente y tus enemigos!</p>
            <p>El primer jugador en perder 5 vidas pierde el juego.</p>
            <p>El juego termina después de 4 minutos si no hay ganador.</p>
            <button className="btn" onClick={initializeGame}>
              Iniciar Juego
            </button>
          </div>
        </div>
      )}

      {/* Pause Screen */}
      {gameStatus === GameStatus.PAUSED && (
        <div className="modal">
          <div className="modal-content">
            <h2>Juego Pausado</h2>
            <button className="btn" onClick={() => setGameStatus(GameStatus.PLAYING)}>
              Reanudar
            </button>
            <button className="btn" onClick={() => {
              setGameStatus(GameStatus.MENU);
              if (audioRef.current) {
                audioRef.current.pause();
              }
            }}>
              Menú Principal
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameStatus === GameStatus.GAME_OVER && (
        <div className="modal">
          <div className="modal-content">
            <h2>¡Juego Terminado!</h2>
            {gameState.winner ? (
              <>
                <p><strong>Ganador: Jugador {gameState.winner.id}</strong></p>
                <p>Score Final: {gameState.winner.score}</p>
                <p>Tiempo Jugado: {formatTime((gameState.gameEndTime || 0) - gameState.gameStartTime)}</p>
              </>
            ) : (
              <>
                <p><strong>¡Tiempo Agotado!</strong></p>
                <p>Ambos jugadores pierden!</p>
                <p>Player 1 Score: {gameState.tanks[0]?.score || 0}</p>
                <p>Player 2 Score: {gameState.tanks[1]?.score || 0}</p>
              </>
            )}
            <button className="btn" onClick={() => {
              setGameStatus(GameStatus.MENU);
              setGameState({
                tanks: [],
                enemies: [],
                gameStartTime: 0,
                gameEndTime: null,
                timeLimit: GAME_TIME_LIMIT,
                winner: null,
                gameOver: false,
                paused: false
              });
            }}>
              Jugar de Nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TankGame; 