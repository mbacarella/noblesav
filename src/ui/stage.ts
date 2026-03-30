import { SceneCharacter, CharacterMove } from '../data/types';

const STAGE_WIDTH = 512;
const STAGE_HEIGHT = 200;
const SPRITE_H = 24;

// YAML positions were authored for 140px height — scale to new size
const AUTHORED_HEIGHT = 140;
const Y_SCALE = STAGE_HEIGHT / AUTHORED_HEIGHT;

const BG_PALETTES: Record<string, { top: number; bottom: number; accent: number }> = {
  longhouse: { top: 0x3a2a1a, bottom: 0x2a1a0a, accent: 0x5a3a1a },
  forest:    { top: 0x1a3a1a, bottom: 0x0a2a0a, accent: 0x2a5a2a },
  river:     { top: 0x4a7090, bottom: 0x1a4a5a, accent: 0x3a90c0 },
  village:   { top: 0x6a5a3a, bottom: 0x3a2a1a, accent: 0x8a7a5a },
  field:     { top: 0x5a8a3a, bottom: 0x3a6a2a, accent: 0x8aaa4a },
  night:     { top: 0x0a0a1a, bottom: 0x050510, accent: 0x1a1a3a },
};

const SPRITE_COLORS: Record<string, string> = {
  mother:      '#c08060',
  grandmother: '#908070',
  elder:       '#908070',
  player:      '#a07050',
  child:       '#b08060',
  warrior:     '#806040',
  aunt:        '#b07050',
  default:     '#906040',
};

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function rgbStr(hex: number, alpha = 1): string {
  const [r, g, b] = hexToRgb(hex);
  return alpha < 1 ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`;
}

interface SpriteState {
  char: SceneCharacter;
  x: number;
  y: number;
}

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let currentBg: string | undefined;
let characters = new Map<string, SpriteState>();
let moveAnimations: ReturnType<typeof requestAnimationFrame>[] = [];
let stageVisible = false;

export function initStage(): void {
  canvas = document.getElementById('stage-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;
  canvas.width = STAGE_WIDTH;
  canvas.height = STAGE_HEIGHT;
  stageVisible = false;
  // Show immediately so layout is stable — canvas starts black
  canvas.parentElement!.classList.add('visible');
}

export function showStage(): void {
  stageVisible = true;
}

export function hideStage(): void {
  stageVisible = false;
}

export function updateStage(data: {
  scene?: string;
  characters?: SceneCharacter[];
  hide_characters?: string[];
}): void {
  if (data.scene) {
    drawBackground(data.scene);
  }

  if (data.hide_characters) {
    for (const id of data.hide_characters) {
      characters.delete(id);
    }
  }

  if (data.characters) {
    characters.clear();
    for (const char of data.characters) {
      characters.set(char.id, { char, x: char.x, y: char.y * Y_SCALE });
    }
  }

  redraw();
}

export function moveCharacters(moves: CharacterMove[], callback: () => void): void {
  if (moves.length === 0) {
    callback();
    return;
  }

  // Cancel any existing move animations
  for (const id of moveAnimations) cancelAnimationFrame(id);
  moveAnimations = [];

  let completed = 0;
  const total = moves.length;

  for (const move of moves) {
    const sprite = characters.get(move.id);
    if (!sprite) {
      completed++;
      if (completed >= total) callback();
      continue;
    }

    const startX = sprite.x;
    const startY = sprite.y;
    const speed = move.speed ?? 60;
    const targetY = move.to_y * Y_SCALE;
    const dx = move.to_x - startX;
    const dy = targetY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = (dist / speed) * 1000;
    const startTime = performance.now();

    // Update facing
    if (move.facing) {
      sprite.char = { ...sprite.char, facing: move.facing };
    } else if (move.to_x < startX) {
      sprite.char = { ...sprite.char, facing: 'left' };
    } else if (move.to_x > startX) {
      sprite.char = { ...sprite.char, facing: 'right' };
    }

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      sprite.x = startX + dx * t;
      sprite.y = startY + dy * t;
      redraw();

      if (t < 1) {
        const id = requestAnimationFrame(animate);
        moveAnimations.push(id);
      } else {
        completed++;
        if (completed >= total) callback();
      }
    };

    const id = requestAnimationFrame(animate);
    moveAnimations.push(id);
  }
}

export function clearStage(): void {
  characters.clear();
  currentBg = undefined;
  ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
}

function drawBackground(key: string): void {
  if (currentBg === key) return;
  currentBg = key;
}

function redraw(): void {
  ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  if (currentBg) renderBackground(currentBg);
  for (const [, sprite] of characters) {
    renderCharacter(sprite);
  }
}

function renderBackground(key: string): void {
  const palette = BG_PALETTES[key] ?? BG_PALETTES.forest;
  const [topR, topG, topB] = hexToRgb(palette.top);
  const [botR, botG, botB] = hexToRgb(palette.bottom);
  const midY = STAGE_HEIGHT * 0.6;

  // Gradient sky
  const bandH = 4;
  for (let y = 0; y < STAGE_HEIGHT; y += bandH) {
    const t = y / STAGE_HEIGHT;
    const r = Math.round(topR + (botR - topR) * t);
    const g = Math.round(topG + (botG - topG) * t);
    const b = Math.round(topB + (botB - topB) * t);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, y, STAGE_WIDTH, bandH);
  }

  // Ground line
  ctx.strokeStyle = rgbStr(palette.accent, 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(STAGE_WIDTH, midY);
  ctx.stroke();

  // Scene-specific accents
  if (key === 'longhouse') {
    ctx.fillStyle = rgbStr(palette.accent, 0.4);
    ctx.beginPath();
    ctx.moveTo(100, midY - 60);
    ctx.lineTo(400, midY - 60);
    ctx.lineTo(250, midY - 120);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rgbStr(palette.accent, 0.3);
    ctx.fillRect(100, midY - 60, 300, 60);

    ctx.fillStyle = 'rgba(204,102,34,0.15)';
    ctx.beginPath();
    ctx.arc(250, midY - 20, 30, 0, Math.PI * 2);
    ctx.fill();
  } else if (key === 'forest') {
    for (const tx of [80, 180, 320, 420]) {
      ctx.fillStyle = rgbStr(palette.accent, 0.5);
      ctx.beginPath();
      ctx.moveTo(tx - 30, midY);
      ctx.lineTo(tx + 30, midY);
      ctx.lineTo(tx, midY - 70);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(tx - 22, midY - 40);
      ctx.lineTo(tx + 22, midY - 40);
      ctx.lineTo(tx, midY - 90);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = rgbStr(0x3a2a1a, 0.5);
      ctx.fillRect(tx - 4, midY, 8, 20);
    }
  } else if (key === 'river') {
    ctx.strokeStyle = rgbStr(palette.accent, 0.4);
    ctx.lineWidth = 2;
    for (let wy = midY + 10; wy < STAGE_HEIGHT - 20; wy += 15) {
      ctx.beginPath();
      for (let wx = 0; wx <= STAGE_WIDTH; wx += 20) {
        const py = wy + Math.sin(wx * 0.03) * 5;
        if (wx === 0) ctx.moveTo(wx, py);
        else ctx.lineTo(wx, py);
      }
      ctx.stroke();
    }

    ctx.fillStyle = rgbStr(0x4a3a2a, 0.4);
    ctx.fillRect(0, midY - 5, STAGE_WIDTH, 10);
  } else if (key === 'village') {
    for (const hx of [120, 280, 400]) {
      ctx.fillStyle = rgbStr(palette.accent, 0.35);
      ctx.fillRect(hx - 20, midY - 30, 40, 30);
      ctx.beginPath();
      ctx.moveTo(hx - 25, midY - 30);
      ctx.lineTo(hx + 25, midY - 30);
      ctx.lineTo(hx, midY - 55);
      ctx.closePath();
      ctx.fill();
    }
  } else if (key === 'field') {
    ctx.strokeStyle = rgbStr(palette.accent, 0.3);
    ctx.lineWidth = 1;
    for (let fy = midY + 10; fy < STAGE_HEIGHT - 10; fy += 12) {
      ctx.beginPath();
      ctx.moveTo(40, fy);
      ctx.lineTo(STAGE_WIDTH - 40, fy);
      ctx.stroke();
    }
  } else if (key === 'night') {
    for (let i = 0; i < 30; i++) {
      const sx = Math.random() * (STAGE_WIDTH - 20) + 10;
      const sy = Math.random() * (midY - 15) + 5;
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5 + 0.2})`;
      ctx.fillRect(sx, sy, 1, 1);
    }
  }
}

function renderCharacter(sprite: SpriteState): void {
  const color = SPRITE_COLORS[sprite.char.sprite] ?? SPRITE_COLORS.default;
  const x = sprite.x;
  const y = sprite.y;

  // Head (circle)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - SPRITE_H + 6, 5, 0, Math.PI * 2);
  ctx.fill();

  // Body (rectangle)
  ctx.globalAlpha = 0.85;
  ctx.fillRect(x - 4, y - SPRITE_H + 12, 8, 10);

  // Legs
  ctx.globalAlpha = 0.7;
  ctx.fillRect(x - 4, y - SPRITE_H + 22, 3, 6);
  ctx.fillRect(x + 1, y - SPRITE_H + 22, 3, 6);

  ctx.globalAlpha = 1;
}
