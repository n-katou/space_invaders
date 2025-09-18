"use client";

import React, { useState, useEffect, useRef, JSX } from 'react';

// 型定義
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


// 定数設定
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

// 敵の攻撃頻度を調整
const INVADER_BASE_FIRE_RATE: number = 0.001;
const INVADER_FIRE_RATE_INCREASE: number = 0.003;

// シールド設定
const SHIELD_ROWS = 3;
const SHIELD_COLS = 7;
const SHIELD_BLOCK_SIZE = 8;
const SHIELD_COUNT = 4;
const SHIELD_Y_POSITION = CANVAS_HEIGHT - 120;
const SHIELD_BLOCK_MAX_HP = 4;


// プレイヤーを描画する関数 (リアルな船に更新)
const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player, isShieldActive: boolean, isMoving: boolean) => {
  // メインボディ
  ctx.fillStyle = '#4ade80'; // 緑色
  ctx.fillRect(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
  // コックピット
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.moveTo(player.x + PLAYER_WIDTH / 2 - 10, player.y);
  ctx.lineTo(player.x + PLAYER_WIDTH / 2 + 10, player.y);
  ctx.lineTo(player.x + PLAYER_WIDTH / 2 + 5, player.y - 10);
  ctx.lineTo(player.x + PLAYER_WIDTH / 2 - 5, player.y - 10);
  ctx.closePath();
  ctx.fill();
  // 翼
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

  // スラスター炎
  if (isMoving) {
    ctx.fillStyle = `rgba(255, 150, 0, ${Math.random() * 0.8 + 0.2})`;
    ctx.beginPath();
    ctx.moveTo(player.x + PLAYER_WIDTH * 0.2, player.y + PLAYER_HEIGHT);
    ctx.lineTo(player.x + PLAYER_WIDTH * 0.8, player.y + PLAYER_HEIGHT);
    ctx.lineTo(player.x + PLAYER_WIDTH * 0.5, player.y + PLAYER_HEIGHT + 10);
    ctx.closePath();
    ctx.fill();
  }

  // シールドが有効な場合、半透明のシールドを描画
  if (isShieldActive) {
    ctx.fillStyle = 'rgba(100, 149, 237, 0.5)';
    ctx.beginPath();
    ctx.arc(player.x + PLAYER_WIDTH / 2, player.y + PLAYER_HEIGHT / 2, 40, 0, Math.PI * 2);
    ctx.fill();
  }
};

// インベーダーを描画する関数 (リアルなエイリアンに更新)
const drawInvaders = (ctx: CanvasRenderingContext2D, invaders: Invader[]) => {
  invaders.forEach(invader => {
    if (invader.alive) {
      // メインボディ
      ctx.fillStyle = '#f87171'; // 赤色
      ctx.fillRect(invader.x, invader.y, INVADER_WIDTH, INVADER_HEIGHT);
      // 目
      ctx.fillStyle = '#fee2e2'; // 薄い赤色
      ctx.fillRect(invader.x + 5, invader.y + 5, 5, 5);
      ctx.fillRect(invader.x + INVADER_WIDTH - 10, invader.y + 5, 5, 5);
      // 脚
      ctx.fillStyle = '#f87171';
      ctx.fillRect(invader.x + 5, invader.y + INVADER_HEIGHT, 5, 5);
      ctx.fillRect(invader.x + INVADER_WIDTH - 10, invader.y + INVADER_HEIGHT, 5, 5);
    }
  });
};

// 弾を描画する関数
const drawBullets = (ctx: CanvasRenderingContext2D, bullets: Bullet[], color: string) => {
  ctx.fillStyle = color;
  bullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT);
  });
};

// シールドを描画する関数
const drawShields = (ctx: CanvasRenderingContext2D, shields: ShieldBlock[][]) => {
  shields.forEach(shield => {
    shield.forEach(block => {
      if (block.hp > 0) {
        // HPに応じて色を変える
        ctx.fillStyle = `rgba(5, 150, 105, ${block.hp / SHIELD_BLOCK_MAX_HP})`;
        ctx.fillRect(block.x, block.y, SHIELD_BLOCK_SIZE, SHIELD_BLOCK_SIZE);
      }
    });
  });
};

// パワーアップアイテムを描画する関数
const drawPowerUps = (ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) => {
  powerUps.forEach(pu => {
    let color = '';
    switch (pu.type) {
      case 'multishot':
        color = '#fde047'; // 黄色
        break;
      case 'shield':
        color = '#60a5fa'; // 青色
        break;
      case 'speedup':
        color = '#f43f5e'; // 赤ピンク
        break;
    }
    ctx.fillStyle = color;
    ctx.fillRect(pu.x, pu.y, 20, 20);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(pu.x, pu.y, 20, 20);
  });
};

// 爆発のパーティクルを描画する関数
const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
  particles.forEach(p => {
    ctx.fillStyle = `rgba(255, 165, 0, ${p.life / 60})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });
};

// スコアの浮遊テキストを描画する関数
const drawFloatingTexts = (ctx: CanvasRenderingContext2D, floatingTexts: FloatingText[]) => {
  ctx.font = '12px "Press Start 2P", system-ui';
  ctx.textAlign = 'center';
  floatingTexts.forEach(text => {
    ctx.fillStyle = `rgba(255, 255, 255, ${text.life / 60})`;
    ctx.fillText(text.text, text.x, text.y);
  });
};

// 星を描画する関数
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

// UIを描画する関数
const drawUI = (ctx: CanvasRenderingContext2D, score: number, lives: number, level: number, gameOver: boolean, gameWon: boolean) => {
  ctx.fillStyle = 'white';
  ctx.font = '16px "Press Start 2P", system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${score}`, 20, 30);
  ctx.fillText(`LEVEL: ${level}`, CANVAS_WIDTH - 150, 30);


  // ライフを描画
  for (let i = 0; i < lives; i++) {
    const playerMock = { x: 20 + i * (PLAYER_WIDTH * 0.5 + 10), y: CANVAS_HEIGHT - 25 };
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(playerMock.x, playerMock.y, PLAYER_WIDTH * 0.5, PLAYER_HEIGHT * 0.5);
  }

  if (gameOver) {
    ctx.textAlign = 'center';
    ctx.font = '40px "Press Start 2P", system-ui';
    if (gameWon) {
      ctx.fillStyle = '#60a5fa'; // 青色
      ctx.fillText('YOU WIN!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
    } else {
      ctx.fillStyle = '#ef4444'; // 濃い赤色
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
    }
    ctx.font = '16px "Press Start 2P", system-ui';
    ctx.fillText("Press 'R' to Restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
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

  // タッチ操作用の状態
  const [isTouchMovingLeft, setIsTouchMovingLeft] = useState(false);
  const [isTouchMovingRight, setIsTouchMovingRight] = useState(false);

  // 星の初期化
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
          // U字型にくり抜く
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
    // レベルに応じて開始Y座標を下げる
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

  // ゲームの完全な初期化
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

  useEffect(() => {
    initializeGame();
    initializeStars();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') gameState.current.keys.ArrowLeft = true;
      if (e.key === 'ArrowRight') gameState.current.keys.ArrowRight = true;
      if (e.key === ' ' && !gameOver) {
        if (!gameState.current.isMultishotActive) {
          if (gameState.current.playerBullets.length < 3) {
            gameState.current.playerBullets.push({
              x: gameState.current.player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
              y: gameState.current.player.y,
            });
          }
        } else {
          // マルチショット
          gameState.current.playerBullets.push({
            x: gameState.current.player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH * 3 - 5,
            y: gameState.current.player.y,
          });
          gameState.current.playerBullets.push({
            x: gameState.current.player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
            y: gameState.current.player.y,
          });
          gameState.current.playerBullets.push({
            x: gameState.current.player.x + PLAYER_WIDTH / 2 + BULLET_WIDTH * 3 + 5,
            y: gameState.current.player.y,
          });
        }
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
  }, []);

  useEffect(() => {
    if (!gameOver && level > 1) {
      startLevel(level);
    }
  }, [level, gameOver]);

  // ライフが減ったときに画面を揺らす
  useEffect(() => {
    if (lives < PLAYER_INITIAL_LIVES && lives >= 0 && !gameOver) {
      setIsShaking(true);
      const shakeTimeout = setTimeout(() => {
        setIsShaking(false);
      }, 200);
      return () => clearTimeout(shakeTimeout);
    }
  }, [lives]);

  const handleFire = () => {
    if (gameOver) return;
    if (!gameState.current.isMultishotActive) {
      if (gameState.current.playerBullets.length < 3) {
        gameState.current.playerBullets.push({
          x: gameState.current.player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: gameState.current.player.y,
        });
      }
    } else {
      // マルチショット
      gameState.current.playerBullets.push({
        x: gameState.current.player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH * 3 - 5,
        y: gameState.current.player.y,
      });
      gameState.current.playerBullets.push({
        x: gameState.current.player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
        y: gameState.current.player.y,
      });
      gameState.current.playerBullets.push({
        x: gameState.current.player.x + PLAYER_WIDTH / 2 + BULLET_WIDTH * 3 + 5,
        y: gameState.current.player.y,
      });
    }
  };

  const update = () => {
    const { player, invaders, shields } = gameState.current;
    if (gameOver) return;

    // プレイヤーの移動
    const currentSpeed = gameState.current.isSpeedupActive ? PLAYER_SPEED * 1.5 : PLAYER_SPEED;
    if (gameState.current.keys.ArrowLeft || isTouchMovingLeft) {
      if (player.x > 0) player.x -= currentSpeed;
    }
    if (gameState.current.keys.ArrowRight || isTouchMovingRight) {
      if (player.x < CANVAS_WIDTH - PLAYER_WIDTH) player.x += currentSpeed;
    }

    // 弾の移動
    gameState.current.playerBullets = gameState.current.playerBullets.filter(b => b.y > 0).map(b => ({ ...b, y: b.y - BULLET_SPEED }));
    gameState.current.invaderBullets = gameState.current.invaderBullets.filter(b => b.y < CANVAS_HEIGHT).map(b => ({ ...b, y: b.y + BULLET_SPEED / 2 }));

    // パワーアップアイテムの移動
    gameState.current.powerUps = gameState.current.powerUps.filter(pu => pu.y < CANVAS_HEIGHT).map(pu => ({ ...pu, y: pu.y + 2 }));

    // 星の移動
    gameState.current.stars.forEach(star => {
      star.y += star.size;
      if (star.y > CANVAS_HEIGHT) {
        star.y = 0;
        star.x = Math.random() * CANVAS_WIDTH;
      }
    });


    // インベーダーの移動ロジック
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

    // インベーダーの発射 (発射頻度を調整)
    const fireRate = INVADER_BASE_FIRE_RATE + (level - 1) * INVADER_FIRE_RATE_INCREASE;
    aliveInvaders.forEach(invader => {
      if (Math.random() < fireRate) {
        gameState.current.invaderBullets.push({
          x: invader.x + INVADER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: invader.y + INVADER_HEIGHT
        });
      }
    });

    // 衝突判定: 弾 vs シールド
    const checkBulletShieldCollision = (bullets: Bullet[]) => {
      bullets.forEach((bullet, bulletIndex) => {
        shields.forEach(shield => {
          shield.forEach(block => {
            if (block.hp > 0 &&
              bullet.x < block.x + SHIELD_BLOCK_SIZE &&
              bullet.x + BULLET_WIDTH > block.x &&
              bullet.y < block.y + SHIELD_BLOCK_SIZE &&
              bullet.y + BULLET_HEIGHT > block.y) {
              block.hp--;
              bullets.splice(bulletIndex, 1);
            }
          });
        });
      });
    };

    // プレイヤーの弾はシールドにダメージを与えないように修正
    checkBulletShieldCollision(gameState.current.invaderBullets);

    // 衝突判定: プレイヤーの弾 vs インベーダー
    gameState.current.playerBullets.forEach((bullet, bulletIndex, bullets) => {
      aliveInvaders.forEach((invader) => {
        if (bullet.x < invader.x + INVADER_WIDTH && bullet.x + BULLET_WIDTH > invader.x &&
          bullet.y < invader.y + INVADER_HEIGHT && bullet.y + BULLET_HEIGHT > invader.y) {

          // 爆発と浮遊テキストを追加
          for (let i = 0; i < 15; i++) {
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
          bullets.splice(bulletIndex, 1);
          setScore(prev => prev + 10);

          // 確率でパワーアップをドロップ
          if (Math.random() < 0.1) {
            const types = ['multishot', 'shield', 'speedup'];
            const randomType = types[Math.floor(Math.random() * types.length)] as PowerUp['type'];
            gameState.current.powerUps.push({ x: invader.x, y: invader.y, type: randomType });
          }
        }
      });
    });

    // 衝突判定: インベーダーの弾 vs プレイヤー
    gameState.current.invaderBullets.forEach((bullet, bulletIndex, bullets) => {
      if (bullet.x < player.x + PLAYER_WIDTH && bullet.x + BULLET_WIDTH > player.x &&
        bullet.y < player.y + PLAYER_HEIGHT && bullet.y + BULLET_HEIGHT > player.y) {
        if (!gameState.current.isShieldActive) {
          bullets.splice(bulletIndex, 1);
          setLives(prev => prev - 1);
          if (lives - 1 <= 0) {
            setGameOver(true);
            setGameWon(false);
          }
        } else {
          bullets.splice(bulletIndex, 1);
          gameState.current.isShieldActive = false;
        }
      }
    });

    // 衝突判定: パワーアップ vs プレイヤー
    gameState.current.powerUps.forEach((pu, puIndex, powerUps) => {
      if (pu.x < player.x + PLAYER_WIDTH && pu.x + 20 > player.x &&
        pu.y < player.y + PLAYER_HEIGHT && pu.y + 20 > player.y) {
        powerUps.splice(puIndex, 1);
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
    });

    // パーティクルの更新
    gameState.current.particles = gameState.current.particles.filter(p => p.life > 0).map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      life: p.life - 1,
    }));

    // 浮遊テキストの更新
    gameState.current.floatingTexts = gameState.current.floatingTexts.filter(text => text.life > 0).map(text => ({ ...text, y: text.y - 1, life: text.life - 1 }));

    // 勝利条件の判定
    if (aliveInvaders.length === 0 && invaders.length > 0) {
      setLevel(prev => prev + 1);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 画面揺れ効果を適用
    let shakeX = 0;
    let shakeY = 0;
    if (isShaking) {
      shakeX = (Math.random() - 0.5) * 5;
      shakeY = (Math.random() - 0.5) * 5;
      ctx.translate(shakeX, shakeY);
    }

    drawStars(ctx, gameState.current.stars);
    drawPlayer(ctx, gameState.current.player, gameState.current.isShieldActive, gameState.current.keys.ArrowLeft || gameState.current.keys.ArrowRight || isTouchMovingLeft || isTouchMovingRight);
    drawInvaders(ctx, gameState.current.invaders);
    drawShields(ctx, gameState.current.shields);
    drawBullets(ctx, gameState.current.playerBullets, '#a78bfa');
    drawBullets(ctx, gameState.current.invaderBullets, '#fca5a5');
    drawPowerUps(ctx, gameState.current.powerUps);
    drawParticles(ctx, gameState.current.particles);
    drawFloatingTexts(ctx, gameState.current.floatingTexts);
    drawUI(ctx, score, lives, level, gameOver, gameWon);

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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60">
            {/* GAMEOVERのUIはdrawUIで描画するのでボタンは不要かも */}
          </div>
        )}
      </div>
      <div className="mt-6 text-center text-slate-400 w-full max-w-md">
        <p className="text-lg hidden md:block">操作方法</p>
        <p className="hidden md:block"><span className="font-bold text-cyan-400">← →</span> キーで移動</p>
        <p className="hidden md:block"><span className="font-bold text-cyan-400">スペースキー</span>で発射</p>
        {gameOver && <p className="mt-2 hidden md:block"><span className="font-bold text-cyan-400">'R'</span>キーでリスタート</p>}
      </div>

      <div className="mt-6 w-full max-w-sm flex justify-around md:hidden">
        <button
          className="p-4 bg-gray-700 text-white rounded-lg shadow-lg active:bg-gray-500"
          onTouchStart={() => setIsTouchMovingLeft(true)}
          onTouchEnd={() => setIsTouchMovingLeft(false)}
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
          onTouchStart={() => setIsTouchMovingRight(true)}
          onTouchEnd={() => setIsTouchMovingRight(false)}
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
