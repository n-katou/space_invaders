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

interface Keys {
  ArrowLeft: boolean;
  ArrowRight: boolean;
}

interface GameState {
  player: Player;
  keys: Keys;
  playerBullets: Bullet[];
  invaders: Invader[];
  invaderDirection: number;
  invaderBullets: Bullet[];
}


// 定数設定
const CANVAS_WIDTH: number = 480;
const CANVAS_HEIGHT: number = 640;
const PLAYER_WIDTH: number = 50;
const PLAYER_HEIGHT: number = 30;
const PLAYER_SPEED: number = 5;
const BULLET_WIDTH: number = 5;
const BULLET_HEIGHT: number = 15;
const BULLET_SPEED: number = 7;
const INVADER_ROWS: number = 5;
const INVADER_COLS: number = 10;
const INVADER_WIDTH: number = 30;
const INVADER_HEIGHT: number = 20;
const INVADER_PADDING: number = 10;
const INVADER_GRID_WIDTH: number = (INVADER_WIDTH + INVADER_PADDING) * INVADER_COLS - INVADER_PADDING;
const INVADER_SPEED: number = 0.5;
const INVADER_DROP_HEIGHT: number = 25;
const INVADER_FIRE_RATE: number = 0.01; // 各インベーダーが1フレームに発射する確率

// プレイヤーを描画する関数
const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
  ctx.fillStyle = '#4ade80'; // 緑色
  ctx.fillRect(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
  // コックピット部分
  ctx.fillStyle = '#166534';
  ctx.fillRect(player.x + PLAYER_WIDTH / 2 - 5, player.y - 5, 10, 5);
};

// インベーダーを描画する関数
const drawInvaders = (ctx: CanvasRenderingContext2D, invaders: Invader[]) => {
  invaders.forEach(invader => {
    if (invader.alive) {
      ctx.fillStyle = '#f87171'; // 赤色
      ctx.fillRect(invader.x, invader.y, INVADER_WIDTH, INVADER_HEIGHT);
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

// スコアとメッセージを描画する関数
const drawUI = (ctx: CanvasRenderingContext2D, score: number, gameOver: boolean, gameWon: boolean) => {
  ctx.fillStyle = 'white';
  ctx.font = '20px "Press Start 2P", system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${score}`, 20, 30);

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
  }
};


export default function SpaceInvadersGame(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);

  // ゲームの状態をuseRefで管理。これにより、requestAnimationFrameのコールバック内で常に最新の状態を参照できる
  const gameState = useRef<GameState>({
    player: { x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2, y: CANVAS_HEIGHT - PLAYER_HEIGHT - 20 },
    keys: { ArrowLeft: false, ArrowRight: false },
    playerBullets: [],
    invaders: [],
    invaderDirection: 1, // 1: 右, -1: 左
    invaderBullets: [],
  });

  // ゲームの初期化
  const initializeGame = () => {
    // インベーダーのグリッドを生成
    const newInvaders: Invader[] = [];
    for (let row = 0; row < INVADER_ROWS; row++) {
      for (let col = 0; col < INVADER_COLS; col++) {
        newInvaders.push({
          x: col * (INVADER_WIDTH + INVADER_PADDING) + (CANVAS_WIDTH - INVADER_GRID_WIDTH) / 2,
          y: row * (INVADER_HEIGHT + INVADER_PADDING) + 50,
          alive: true,
        });
      }
    }
    gameState.current = {
      ...gameState.current,
      player: { x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2, y: CANVAS_HEIGHT - PLAYER_HEIGHT - 20 },
      playerBullets: [],
      invaders: newInvaders,
      invaderDirection: 1,
      invaderBullets: [],
    };
    setScore(0);
    setGameOver(false);
    setGameWon(false);
  };

  useEffect(() => {
    initializeGame();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        gameState.current.keys[e.key as keyof Keys] = true;
      }
      if (e.key === ' ' && !gameOver) {
        // 弾の発射（クールダウンなしのシンプルな実装）
        gameState.current.playerBullets.push({
          x: gameState.current.player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: gameState.current.player.y,
        });
      }
      if (e.key === 'r' && gameOver) {
        initializeGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        gameState.current.keys[e.key as keyof Keys] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationFrameId: number;

    const gameLoop = () => {
      const context = canvasRef.current?.getContext('2d');
      if (!context) return;

      if (gameOver) {
        drawUI(context, score, true, gameWon);
        return;
      };

      // 状態の更新
      update();

      // 描画
      draw(context);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameOver]); // gameOver状態が変わった時にuseEffectを再実行してループを止めたり、再初期化できるようにする

  const update = () => {
    const { player, keys, invaders } = gameState.current;

    // プレイヤーの移動
    if (keys.ArrowLeft && player.x > 0) {
      player.x -= PLAYER_SPEED;
    }
    if (keys.ArrowRight && player.x < CANVAS_WIDTH - PLAYER_WIDTH) {
      player.x += PLAYER_SPEED;
    }

    // プレイヤーの弾の移動
    gameState.current.playerBullets = gameState.current.playerBullets
      .filter(b => b.y > 0)
      .map(b => ({ ...b, y: b.y - BULLET_SPEED }));

    // インベーダーの弾の移動
    gameState.current.invaderBullets = gameState.current.invaderBullets
      .filter(b => b.y < CANVAS_HEIGHT)
      .map(b => ({ ...b, y: b.y + BULLET_SPEED / 2 }));


    // インベーダーの移動
    let edgeReached = false;
    invaders.forEach(invader => {
      if (invader.alive) {
        invader.x += INVADER_SPEED * gameState.current.invaderDirection;
        if (invader.x <= 0 || invader.x >= CANVAS_WIDTH - INVADER_WIDTH) {
          edgeReached = true;
        }
        // インベーダーが最下部に到達したらゲームオーバー
        if (invader.y + INVADER_HEIGHT >= player.y) {
          setGameOver(true);
          setGameWon(false);
        }
      }
    });

    if (edgeReached) {
      gameState.current.invaderDirection *= -1;
      invaders.forEach(invader => {
        invader.y += INVADER_DROP_HEIGHT;
      });
    }

    // インベーダーの発射
    invaders.forEach(invader => {
      if (invader.alive && Math.random() < INVADER_FIRE_RATE) {
        gameState.current.invaderBullets.push({
          x: invader.x + INVADER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: invader.y + INVADER_HEIGHT
        });
      }
    });

    // 衝突判定: プレイヤーの弾 vs インベーダー
    gameState.current.playerBullets.forEach((bullet, bulletIndex, bullets) => {
      invaders.forEach((invader) => {
        if (
          invader.alive &&
          bullet.x < invader.x + INVADER_WIDTH &&
          bullet.x + BULLET_WIDTH > invader.x &&
          bullet.y < invader.y + INVADER_HEIGHT &&
          bullet.y + BULLET_HEIGHT > invader.y
        ) {
          invader.alive = false;
          bullets.splice(bulletIndex, 1);
          setScore(prev => prev + 10);
        }
      });
    });

    // 衝突判定: インベーダーの弾 vs プレイヤー
    gameState.current.invaderBullets.forEach((bullet, bulletIndex, bullets) => {
      if (
        bullet.x < player.x + PLAYER_WIDTH &&
        bullet.x + BULLET_WIDTH > player.x &&
        bullet.y < player.y + PLAYER_HEIGHT &&
        bullet.y + BULLET_HEIGHT > player.y
      ) {
        bullets.splice(bulletIndex, 1);
        setGameOver(true);
        setGameWon(false);
      }
    });

    // 勝利条件の判定
    const allInvadersDead = invaders.every(invader => !invader.alive);
    if (invaders.length > 0 && allInvadersDead) {
      setGameOver(true);
      setGameWon(true);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // 背景をクリア
    ctx.fillStyle = '#0f172a'; // ダークブルー
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 各要素を描画
    drawPlayer(ctx, gameState.current.player);
    drawInvaders(ctx, gameState.current.invaders);
    drawBullets(ctx, gameState.current.playerBullets, '#a78bfa'); // 紫色
    drawBullets(ctx, gameState.current.invaderBullets, '#fca5a5'); // 薄い赤色
    drawUI(ctx, score, gameOver, gameWon);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-800 text-white font-mono p-4">
      <h1 className="text-4xl font-bold mb-4 text-emerald-400" style={{ fontFamily: '"Press Start 2P", system-ui' }}>
        スペースインベーダー
      </h1>
      <div className="relative border-4 border-slate-600 rounded-lg shadow-2xl shadow-cyan-500/20">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="bg-slate-900 rounded"
        />
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60">
            <button
              onClick={initializeGame}
              className="mt-8 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors text-lg"
              style={{ fontFamily: '"Press Start 2P", system-ui' }}
            >
              もう一度プレイ
            </button>
          </div>
        )}
      </div>
      <div className="mt-6 text-center text-slate-400">
        <p className="text-lg">操作方法</p>
        <p><span className="font-bold text-cyan-400">← →</span> キーで移動</p>
        <p><span className="font-bold text-cyan-400">スペースキー</span>で発射</p>
        {gameOver && <p className="mt-2"><span className="font-bold text-cyan-400">'R'</span>キーでリスタート</p>}
      </div>
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
            `}</style>
    </div>
  );
}
