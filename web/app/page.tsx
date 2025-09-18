"use client";

import React, { useState, useEffect, useRef, JSX } from 'react';

// Type definitions
interface Player {
  x: number;
  y: number;
}

interface Bullet {
  x: number;
  y: number;
}

interface Invader {
  x: number;
  y: number;
  alive: boolean;
}

interface ShieldBlock {
  x: number;
  y: number;
  hp: number;
}

interface Keys {
  ArrowLeft: boolean;
  ArrowRight: boolean;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'multishot' | 'shield' | 'speedup';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
}

interface GameState {
  player: Player;
  keys: Keys;
  playerBullets: Bullet[];
  invaders: Invader[];
  invaderDirection: number;
  invaderBullets: Bullet[];
  shields: ShieldBlock[][];
  powerUps: PowerUp[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  isShieldActive: boolean;
  isMultishotActive: boolean;
  isSpeedupActive: boolean;
  stars: Star[];
}


// Constants
const CANVAS_WIDTH: number = 480;
const CANVAS_HEIGHT: number = 640;
const PLAYER_WIDTH: number = 50;
const PLAYER_HEIGHT: number = 30;
const PLAYER_SPEED: number = 5;
const PLAYER_INITIAL_LIVES: number = 3;
const BULLET_WIDTH: number = 5;
const BULLET_HEIGHT: number = 15;
const BULLET_SPEED: number = 7;
const INVADER_ROWS: number = 5;
const INVADER_COLS: number = 10;
const INVADER_WIDTH: number = 30;
const INVADER_HEIGHT: number = 20;
const INVADER_PADDING: number = 10;
const INVADER_GRID_WIDTH: number = (INVADER_WIDTH + INVADER_PADDING) * INVADER_COLS - INVADER_PADDING;
const INVADER_BASE_SPEED: number = 0.3;
const INVADER_DROP_HEIGHT: number = 20;

// Adjust enemy fire rate
const INVADER_BASE_FIRE_RATE: number = 0.001;
const INVADER_FIRE_RATE_INCREASE: number = 0.003;

// Shield settings
const SHIELD_ROWS = 3;
const SHIELD_COLS = 7;
const SHIELD_BLOCK_SIZE = 8;
const SHIELD_COUNT = 4;
const SHIELD_Y_POSITION = CANVAS_HEIGHT - 120;
const SHIELD_BLOCK_MAX_HP = 4;


// Function to draw the player (updated to be more realistic)
const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player, isShieldActive: boolean, isMoving: boolean) => {
  // Main body
  ctx.fillStyle = '#4ade80'; // Green
  ctx.fillRect(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
  // Cockpit
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.moveTo(player.x + PLAYER_WIDTH / 2 - 10, player.y);
  ctx.lineTo(player.x + PLAYER_WIDTH / 2 + 10, player.y);
  ctx.lineTo(player.x + PLAYER_WIDTH / 2 + 5, player.y - 10);
  ctx.lineTo(player.x + PLAYER_WIDTH / 2 - 5, player.y - 10);
  ctx.closePath();
  ctx.fill();
  // Wings
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.moveTo(player.x, player.y + PLAYER_HEIGHT / 2);
  ctx.lineTo(player.x - 10, player.y + PLAYER_HEIGHT / 2 + 10);
  ctx.lineTo(player.x, player.y + PLAYER_HEIGHT);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(player.x + PLAYER_WIDTH, player.y + PLAYER_HEIGHT / 2);
  ctx.lineTo(player.x + PLAYER_WIDTH + 10, player.y + PLAYER_HEIGHT / 2 + 10);
  ctx.lineTo(player.x + PLAYER_WIDTH, player.y + PLAYER_HEIGHT);
  ctx.closePath();
  ctx.fill();

  // Thruster flame
  if (isMoving) {
    ctx.fillStyle = `rgba(255, 150, 0, ${Math.random() * 0.8 + 0.2})`;
    ctx.beginPath();
    ctx.moveTo(player.x + PLAYER_WIDTH * 0.2, player.y + PLAYER_HEIGHT);
    ctx.lineTo(player.x + PLAYER_WIDTH * 0.8, player.y + PLAYER_HEIGHT);
    ctx.lineTo(player.x + PLAYER_WIDTH * 0.5, player.y + PLAYER_HEIGHT + 10);
    ctx.closePath();
    ctx.fill();
  }

  // Draw a semi-transparent shield if active
  if (isShieldActive) {
    ctx.fillStyle = 'rgba(100, 149, 237, 0.5)';
    ctx.beginPath();
    ctx.arc(player.x + PLAYER_WIDTH / 2, player.y + PLAYER_HEIGHT / 2, 40, 0, Math.PI * 2);
    ctx.fill();
  }
};

// Function to draw invaders (updated to be more realistic)
const drawInvaders = (ctx: CanvasRenderingContext2D, invaders: Invader[]) => {
  invaders.forEach(invader => {
    if (invader.alive) {
      // Main body
      ctx.fillStyle = '#f87171'; // Red
      ctx.fillRect(invader.x, invader.y, INVADER_WIDTH, INVADER_HEIGHT);
      // Eyes
      ctx.fillStyle = '#fee2e2'; // Pale red
      ctx.fillRect(invader.x + 5, invader.y + 5, 5, 5);
      ctx.fillRect(invader.x + INVADER_WIDTH - 10, invader.y + 5, 5, 5);
      // Legs
      ctx.fillStyle = '#f87171';
      ctx.fillRect(invader.x + 5, invader.y + INVADER_HEIGHT, 5, 5);
      ctx.fillRect(invader.x + INVADER_WIDTH - 10, invader.y + INVADER_HEIGHT, 5, 5);
    }
  });
};

// Function to draw bullets
const drawBullets = (ctx: CanvasRenderingContext2D, bullets: Bullet[], color: string) => {
  ctx.fillStyle = color;
  bullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT);
  });
};

// Function to draw shields
const drawShields = (ctx: CanvasRenderingContext2D, shields: ShieldBlock[][]) => {
  shields.forEach(shield => {
    shield.forEach(block => {
      if (block.hp > 0) {
        // Change color based on HP
        ctx.fillStyle = `rgba(5, 150, 105, ${block.hp / SHIELD_BLOCK_MAX_HP})`;
        ctx.fillRect(block.x, block.y, SHIELD_BLOCK_SIZE, SHIELD_BLOCK_SIZE);
      }
    });
  });
};

// Function to draw power-up items
const drawPowerUps = (ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) => {
  powerUps.forEach(pu => {
    ctx.save();
    ctx.translate(pu.x + 10, pu.y + 10);
    ctx.rotate(Date.now() / 200);

    let color = '';
    let text = '';
    let iconPath = '';
    switch (pu.type) {
      case 'multishot':
        color = '#fde047'; // Yellow
        text = 'x3';
        break;
      case 'shield':
        color = '#60a5fa'; // Blue
        iconPath = 'M10 2a8 8 0 100 16 8 8 0 000-16zM6 9a2 2 0 114 0 2 2 0 01-4 0zM10 14a2 2 0 114 0 2 2 0 01-4 0z';
        break;
      case 'speedup':
        color = '#f43f5e'; // Pink-red
        iconPath = 'M10 4a1 1 0 00-1 1v6.586l-2.293-2.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 10-1.414-1.414L11 11.586V5a1 1 0 00-1-1z';
        break;
    }

    // Draw background shape
    ctx.fillStyle = color;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -10, 20, 20);

    // Draw icon or text
    if (text) {
      ctx.fillStyle = 'white';
      ctx.font = '10px "Press Start 2P", system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(text, 0, 4);
    } else if (iconPath) {
      const path = new Path2D(iconPath);
      ctx.fillStyle = 'white';
      ctx.fill(path);
    }

    ctx.restore();
  });
};

// Function to draw explosion particles
const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
  particles.forEach(p => {
    ctx.fillStyle = `rgba(255, 165, 0, ${p.life / 60})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });
};

// Function to draw floating score texts
const drawFloatingTexts = (ctx: CanvasRenderingContext2D, floatingTexts: FloatingText[]) => {
  ctx.font = '12px "Press Start 2P", system-ui';
  ctx.textAlign = 'center';
  floatingTexts.forEach(text => {
    ctx.fillStyle = `rgba(255, 255, 255, ${text.life / 60})`;
    ctx.fillText(text.text, text.x, text.y);
  });
};

// Function to draw stars
const drawStars = (ctx: CanvasRenderingContext2D, stars: Star[]) => {
  ctx.fillStyle = 'white';
  stars.forEach(star => {
    ctx.globalAlpha = star.size;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
};

// Function to draw UI elements
const drawUI = (ctx: CanvasRenderingContext2D, score: number, lives: number, level: number) => {
  ctx.fillStyle = 'white';
  ctx.font = '16px "Press Start 2P", system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${score}`, 20, 30);
  ctx.fillText(`LEVEL: ${level}`, CANVAS_WIDTH - 150, 30);

  // Draw lives
  for (let i = 0; i < lives; i++) {
    const playerMock = { x: 20 + i * (PLAYER_WIDTH * 0.5 + 10), y: CANVAS_HEIGHT - 25 };
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(playerMock.x, playerMock.y, PLAYER_WIDTH * 0.5, PLAYER_HEIGHT * 0.5);
  }
};


export default function SpaceInvadersGame(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(PLAYER_INITIAL_LIVES);
  const [level, setLevel] = useState<number>(1);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const gameState = useRef<GameState>({
    player: { x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2, y: CANVAS_HEIGHT - PLAYER_HEIGHT - 40 },
    keys: { ArrowLeft: false, ArrowRight: false },
    playerBullets: [],
    invaders: [],
    invaderDirection: 1,
    invaderBullets: [],
    shields: [],
    powerUps: [],
    particles: [],
    floatingTexts: [],
    isShieldActive: false,
    isMultishotActive: false,
    isSpeedupActive: false,
    stars: [],
  });

  // Initialize stars
  const initializeStars = () => {
    const newStars: Star[] = [];
    for (let i = 0; i < 100; i++) {
      newStars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2,
      });
    }
    gameState.current.stars = newStars;
  };

  const initializeShields = () => {
    const newShields: ShieldBlock[][] = [];
    const shieldWidth = SHIELD_COLS * SHIELD_BLOCK_SIZE;
    const spacing = (CANVAS_WIDTH - (SHIELD_COUNT * shieldWidth)) / (SHIELD_COUNT + 1);
    for (let i = 0; i < SHIELD_COUNT; i++) {
      const shield: ShieldBlock[] = [];
      const startX = spacing * (i + 1) + shieldWidth * i;
      for (let r = 0; r < SHIELD_ROWS; r++) {
        for (let c = 0; c < SHIELD_COLS; c++) {
          // Cut out a U-shape
          if (r === SHIELD_ROWS - 1 && c > 1 && c < SHIELD_COLS - 2) {
            continue;
          }
          shield.push({
            x: startX + c * SHIELD_BLOCK_SIZE,
            y: SHIELD_Y_POSITION + r * SHIELD_BLOCK_SIZE,
            hp: SHIELD_BLOCK_MAX_HP,
          });
        }
      }
      newShields.push(shield);
    }
    gameState.current.shields = newShields;
  };

  const startLevel = (currentLevel: number) => {
    const newInvaders: Invader[] = [];
    // Lower starting Y position based on level
    const startY = 50 + (currentLevel - 1) * 10;
    for (let row = 0; row < INVADER_ROWS; row++) {
      for (let col = 0; col < INVADER_COLS; col++) {
        newInvaders.push({
          x: col * (INVADER_WIDTH + INVADER_PADDING) + (CANVAS_WIDTH - INVADER_GRID_WIDTH) / 2,
          y: row * (INVADER_HEIGHT + INVADER_PADDING) + startY,
          alive: true,
        });
      }
    }
    gameState.current.invaders = newInvaders;
    gameState.current.invaderBullets = [];
    gameState.current.playerBullets = [];
    gameState.current.invaderDirection = 1;
  };

  // Complete game initialization
  const initializeGame = () => {
    setScore(0);
    setLives(PLAYER_INITIAL_LIVES);
    setLevel(1);
    setGameOver(false);
    setGameWon(false);
    initializeShields();
    startLevel(1);
    gameState.current.powerUps = [];
    gameState.current.particles = [];
    gameState.current.floatingTexts = [];
    gameState.current.isShieldActive = false;
    gameState.current.isMultishotActive = false;
    gameState.current.isSpeedupActive = false;
  };

  // Handle player fire
  const handleFire = () => {
    if (gameOver) return;
    if (!gameState.current.isMultishotActive) {
      // Check if player bullets are already on screen to limit them
      if (gameState.current.playerBullets.length < 3) {
        gameState.current.playerBullets.push({
          x: gameState.current.player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: gameState.current.player.y,
        });
      }
    } else {
      // Multishot
      gameState.current.playerBullets.push({
        x: gameState.current.player.x + PLAYER_WIDTH * 0.25 - BULLET_WIDTH / 2,
        y: gameState.current.player.y,
      });
      gameState.current.playerBullets.push({
        x: gameState.current.player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
        y: gameState.current.player.y,
      });
      gameState.current.playerBullets.push({
        x: gameState.current.player.x + PLAYER_WIDTH * 0.75 - BULLET_WIDTH / 2,
        y: gameState.current.player.y,
      });
    }
  };

  useEffect(() => {
    initializeGame();
    initializeStars();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') gameState.current.keys.ArrowLeft = true;
      if (e.key === 'ArrowRight') gameState.current.keys.ArrowRight = true;
      if (e.key === ' ' && !gameOver) {
        handleFire();
      }
      if (e.key === 'r' && gameOver) {
        initializeGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') gameState.current.keys.ArrowLeft = false;
      if (e.key === 'ArrowRight') gameState.current.keys.ArrowRight = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationFrameId: number;
    const gameLoop = () => {
      const context = canvasRef.current?.getContext('2d');
      if (!context) return;
      if (gameOver) {
        draw(context);
        return;
      };
      update();
      draw(context);
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    gameLoop();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameOver]); // Add gameOver as a dependency to restart the loop


  useEffect(() => {
    if (!gameOver && level > 1) {
      startLevel(level);
    }
  }, [level, gameOver]);

  // Shake the screen when a life is lost
  useEffect(() => {
    if (lives < PLAYER_INITIAL_LIVES && lives >= 0 && !gameOver) {
      setIsShaking(true);
      const shakeTimeout = setTimeout(() => {
        setIsShaking(false);
      }, 500); // Increased shake duration for better visibility
      return () => clearTimeout(shakeTimeout);
    }
  }, [lives]);

  const update = () => {
    const { player, invaders, shields } = gameState.current;
    if (gameOver) return;

    // Player movement
    const currentSpeed = gameState.current.isSpeedupActive ? PLAYER_SPEED * 1.5 : PLAYER_SPEED;
    if (gameState.current.keys.ArrowLeft) {
      if (player.x > 0) player.x -= currentSpeed;
    }
    if (gameState.current.keys.ArrowRight) {
      if (player.x < CANVAS_WIDTH - PLAYER_WIDTH) player.x += currentSpeed;
    }

    // Bullet movement
    gameState.current.playerBullets = gameState.current.playerBullets.filter(b => b.y > 0).map(b => ({ ...b, y: b.y - BULLET_SPEED }));
    gameState.current.invaderBullets = gameState.current.invaderBullets.filter(b => b.y < CANVAS_HEIGHT).map(b => ({ ...b, y: b.y + BULLET_SPEED / 2 }));

    // Power-up movement
    gameState.current.powerUps = gameState.current.powerUps.filter(pu => pu.y < CANVAS_HEIGHT).map(pu => ({ ...pu, y: pu.y + 2 }));

    // Star movement
    gameState.current.stars.forEach(star => {
      star.y += star.size;
      if (star.y > CANVAS_HEIGHT) {
        star.y = 0;
        star.x = Math.random() * CANVAS_WIDTH;
      }
    });

    // Invader movement logic
    const aliveInvaders = invaders.filter(i => i.alive);
    const invaderSpeed = INVADER_BASE_SPEED + (invaders.length - aliveInvaders.length) * 0.02 + (level - 1) * 0.1;

    let edgeReached = false;
    aliveInvaders.forEach(invader => {
      invader.x += invaderSpeed * gameState.current.invaderDirection;
      if (invader.x <= 0 || invader.x >= CANVAS_WIDTH - INVADER_WIDTH) edgeReached = true;
      if (invader.y + INVADER_HEIGHT >= player.y) { setGameOver(true); setGameWon(false); }
    });

    if (edgeReached) {
      gameState.current.invaderDirection *= -1;
      invaders.forEach(invader => invader.y += INVADER_DROP_HEIGHT);
    }

    // Invader firing (adjusting fire rate)
    const fireRate = INVADER_BASE_FIRE_RATE + (level - 1) * INVADER_FIRE_RATE_INCREASE;
    aliveInvaders.forEach(invader => {
      if (Math.random() < fireRate) {
        gameState.current.invaderBullets.push({
          x: invader.x + INVADER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: invader.y + INVADER_HEIGHT
        });
      }
    });

    // Collision detection: Bullet vs Shield (corrected loop)
    const checkBulletShieldCollision = (bullets: Bullet[], canDamage: boolean) => {
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        for (let j = 0; j < shields.length; j++) {
          const shield = shields[j];
          for (let k = 0; k < shield.length; k++) {
            const block = shield[k];
            if (block.hp > 0 &&
              bullet.x < block.x + SHIELD_BLOCK_SIZE &&
              bullet.x + BULLET_WIDTH > block.x &&
              bullet.y < block.y + SHIELD_BLOCK_SIZE &&
              bullet.y + BULLET_HEIGHT > block.y) {
              if (canDamage) {
                block.hp--;
              }
              bullets.splice(i, 1);
              break;
            }
          }
        }
      }
    };

    // Invader bullets damage shields, player bullets do not
    checkBulletShieldCollision(gameState.current.invaderBullets, true);
    checkBulletShieldCollision(gameState.current.playerBullets, false);

    // Collision detection: Player's bullet vs Invaders (FIXED LOGIC)
    for (let i = gameState.current.playerBullets.length - 1; i >= 0; i--) {
      const bullet = gameState.current.playerBullets[i];
      // Find the invader in the MAIN invaders array to update it correctly
      const invaderIndex = gameState.current.invaders.findIndex(invader => {
        return (
          invader.alive &&
          bullet.x < invader.x + INVADER_WIDTH &&
          bullet.x + BULLET_WIDTH > invader.x &&
          bullet.y < invader.y + INVADER_HEIGHT &&
          bullet.y + BULLET_HEIGHT > invader.y
        );
      });
      if (invaderIndex !== -1) {
        const invader = gameState.current.invaders[invaderIndex];

        // Add explosion and floating text
        for (let k = 0; k < 15; k++) {
          gameState.current.particles.push({
            x: invader.x + INVADER_WIDTH / 2,
            y: invader.y + INVADER_HEIGHT / 2,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            radius: Math.random() * 3,
            life: 60,
          });
        }
        gameState.current.floatingTexts.push({ x: invader.x + INVADER_WIDTH / 2, y: invader.y, text: '+10', life: 60 });

        invader.alive = false;
        gameState.current.playerBullets.splice(i, 1);
        setScore(prev => prev + 10);

        // Probability of dropping a power-up
        if (Math.random() < 0.1) {
          const types = ['multishot', 'shield', 'speedup'];
          const randomType = types[Math.floor(Math.random() * types.length)] as PowerUp['type'];
          gameState.current.powerUps.push({ x: invader.x, y: invader.y, type: randomType });
        }
      }
    }

    // Collision detection: Invader's bullet vs Player (FIXED LOGIC)
    for (let i = gameState.current.invaderBullets.length - 1; i >= 0; i--) {
      const bullet = gameState.current.invaderBullets[i];
      if (bullet.x < player.x + PLAYER_WIDTH && bullet.x + BULLET_WIDTH > player.x &&
        bullet.y < player.y + PLAYER_HEIGHT && bullet.y + BULLET_HEIGHT > player.y) {
        if (!gameState.current.isShieldActive) {
          gameState.current.invaderBullets.splice(i, 1);
          setLives(prevLives => {
            const newLives = prevLives - 1;
            if (newLives <= 0) {
              setGameOver(true);
              setGameWon(false);
            }
            return newLives;
          });
          // Add floating text for hit feedback
          gameState.current.floatingTexts.push({ x: player.x + PLAYER_WIDTH / 2, y: player.y, text: 'ヒット！', life: 60 });
        } else {
          gameState.current.invaderBullets.splice(i, 1);
          gameState.current.isShieldActive = false;
        }
      }
    }

    // Collision detection: Power-up vs Player (corrected loop)
    for (let i = gameState.current.powerUps.length - 1; i >= 0; i--) {
      const pu = gameState.current.powerUps[i];
      if (pu.x < player.x + PLAYER_WIDTH && pu.x + 20 > player.x &&
        pu.y < player.y + PLAYER_HEIGHT && pu.y + 20 > player.y) {
        gameState.current.powerUps.splice(i, 1);
        switch (pu.type) {
          case 'multishot':
            gameState.current.isMultishotActive = true;
            setTimeout(() => gameState.current.isMultishotActive = false, 10000);
            break;
          case 'shield':
            gameState.current.isShieldActive = true;
            setTimeout(() => gameState.current.isShieldActive = false, 10000);
            break;
          case 'speedup':
            gameState.current.isSpeedupActive = true;
            setTimeout(() => gameState.current.isSpeedupActive = false, 10000);
            break;
        }
      }
    }

    // Update particles
    gameState.current.particles = gameState.current.particles.filter(p => p.life > 0).map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      life: p.life - 1,
    }));

    // Update floating texts
    gameState.current.floatingTexts = gameState.current.floatingTexts.filter(text => text.life > 0).map(text => ({ ...text, y: text.y - 1, life: text.life - 1 }));

    // Check win condition
    if (aliveInvaders.length === 0 && invaders.length > 0) {
      setLevel(prev => prev + 1);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Apply screen shake effect
    let shakeX = 0;
    let shakeY = 0;
    if (isShaking) {
      shakeX = (Math.random() - 0.5) * 5;
      shakeY = (Math.random() - 0.5) * 5;
      ctx.translate(shakeX, shakeY);
    }

    drawStars(ctx, gameState.current.stars);
    // プレイヤーが動いているかをキー状態から判定する
    const isPlayerMoving = gameState.current.keys.ArrowLeft || gameState.current.keys.ArrowRight;
    drawPlayer(ctx, gameState.current.player, gameState.current.isShieldActive, isPlayerMoving);
    drawInvaders(ctx, gameState.current.invaders);
    drawShields(ctx, gameState.current.shields);
    drawBullets(ctx, gameState.current.playerBullets, '#a78bfa');
    drawBullets(ctx, gameState.current.invaderBullets, '#fca5a5');
    drawPowerUps(ctx, gameState.current.powerUps);
    drawParticles(ctx, gameState.current.particles);
    drawFloatingTexts(ctx, gameState.current.floatingTexts);
    drawUI(ctx, score, lives, level);

    if (isShaking) {
      ctx.translate(-shakeX, -shakeY);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-800 text-white p-4">
      <h1 className="text-4xl font-bold mb-4 text-emerald-400" style={{ fontFamily: '"Press Start 2P", system-ui' }}>
        スペースインベーダー
      </h1>
      <div className="relative border-4 border-slate-600 rounded-lg shadow-2xl shadow-cyan-500/20 max-w-full">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-slate-900 rounded" />
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80">
            <h2 className="text-6xl font-bold mb-8 text-white" style={{ fontFamily: '"Press Start 2P", system-ui' }}>
              {gameWon ? 'クリア！' : 'ゲームオーバー'}
            </h2>
            <button
              className="px-8 py-4 bg-emerald-500 text-white text-2xl font-bold rounded-lg shadow-lg hover:bg-emerald-600 transition-colors"
              style={{ fontFamily: '"Press Start 2P", system-ui' }}
              onClick={initializeGame}
            >
              もう一度
            </button>
          </div>
        )}
      </div>
      <div className="mt-6 text-center text-slate-400 w-full max-w-md hidden md:block">
        <p className="text-lg">操作方法</p>
        <p><span className="font-bold text-cyan-400">← →</span> キーで移動</p>
        <p><span className="font-bold text-cyan-400">スペースキー</span>で発射</p>
      </div>

      {/* モバイル用ボタンを修正 */}
      <div className="mt-6 w-full max-w-sm flex justify-around md:hidden">
        <button
          className="p-4 bg-gray-700 text-white rounded-lg shadow-lg active:bg-gray-500"
          onTouchStart={(e) => { e.preventDefault(); gameState.current.keys.ArrowLeft = true; }}
          onTouchEnd={() => gameState.current.keys.ArrowLeft = false}
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
        </button>
        <button
          className="p-4 bg-red-600 text-white rounded-full shadow-lg active:bg-red-500"
          onTouchStart={handleFire}
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a2 2 0 00-2 2v4a2 2 0 104 0V4a2 2 0 00-2-2zM4 10a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6z"></path></svg>
        </button>
        <button
          className="p-4 bg-gray-700 text-white rounded-lg shadow-lg active:bg-gray-500"
          onTouchStart={(e) => { e.preventDefault(); gameState.current.keys.ArrowRight = true; }}
          onTouchEnd={() => gameState.current.keys.ArrowRight = false}
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        canvas {
          background-color: #0f172a;
          display: block;
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );
}
