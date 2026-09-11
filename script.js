const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score');
const energyEl = document.querySelector('#energy');
const distanceEl = document.querySelector('#distance');
const messageEl = document.querySelector('#message');
const keys = new Set();

const world = { width: 5200, ground: 0 };
let cameraX = 0;
let lastTime = 0;
let gameState = 'playing';
let score = 0;
let energy = 3;
let collectibles = [];
let enemies = [];
let platforms = [];
let player;

function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    world.ground = rect.height - 52;
}

function resetGame() {
    score = 0; energy = 3; cameraX = 0; gameState = 'playing';
    player = { x: 90, y: 0, w: 27, h: 40, vx: 0, vy: 0, facing: 1, grounded: false, attack: 0, invincible: 0 };
    platforms = [
        { x: 0, y: 0, w: 820, h: 52 }, { x: 940, y: 0, w: 620, h: 52 },
        { x: 1690, y: 0, w: 700, h: 52 }, { x: 2520, y: 0, w: 860, h: 52 },
        { x: 3610, y: 0, w: 700, h: 52 }, { x: 4480, y: 0, w: 720, h: 52 }
    ];
    platforms.push({ x: 500, y: -105, w: 145, h: 16 }, { x: 1090, y: -125, w: 160, h: 16 },
        { x: 1900, y: -95, w: 180, h: 16 }, { x: 2800, y: -125, w: 150, h: 16 },
        { x: 3850, y: -105, w: 170, h: 16 });
    collectibles = [230, 400, 550, 760, 1050, 1190, 1430, 1810, 1980, 2220, 2700, 2900, 3200, 3700, 3950, 4150, 4600, 4800].map((x, i) => ({ x, y: world.ground - (i % 3 ? 70 : 105), taken: false }));
    enemies = [650, 1120, 1460, 1830, 2280, 2740, 3130, 3740, 4060, 4680].map((x, i) => ({ x, y: 0, w: 30, h: 32, vx: i % 2 ? -.5 : .5, alive: true }));
    messageEl.classList.add('is-hidden');
    updateHud();
}

function updateHud() {
    scoreEl.textContent = String(score).padStart(6, '0');
    energyEl.textContent = '♥'.repeat(energy) + '·'.repeat(3 - energy);
    distanceEl.textContent = `${Math.min(100, Math.round((player.x / (world.width - 120)) * 100))}%`;
}

function isDown(...names) { return names.some(name => keys.has(name)); }
function jump() { if (player.grounded && gameState === 'playing') { player.vy = -11; player.grounded = false; } }
function attack() { if (gameState === 'playing') player.attack = .22; }

window.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', ' ', 'a', 'd', 'j', 'A', 'D', 'J'].includes(e.key)) e.preventDefault();
    if (!e.repeat && [' ', 'w', 'ArrowUp'].includes(e.key)) jump();
    if (!e.repeat && ['j', 'J', 'x', 'X'].includes(e.key)) attack();
    keys.add(e.key);
    if (e.key === 'Enter' && gameState !== 'playing') resetGame();
});
window.addEventListener('keyup', e => keys.delete(e.key));
document.querySelectorAll('.control-button').forEach(button => {
    const key = button.dataset.key;
    button.addEventListener('pointerdown', e => { e.preventDefault(); keys.add(key); if (key === 'jump') jump(); if (key === 'attack') attack(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(type => button.addEventListener(type, () => keys.delete(key)));
});
document.querySelector('#restartButton').addEventListener('click', resetGame);
window.addEventListener('resize', resize);

function update(dt) {
    if (gameState !== 'playing') return;
    const left = isDown('ArrowLeft', 'a', 'A', 'left');
    const right = isDown('ArrowRight', 'd', 'D', 'right');
    if (left) { player.vx -= .45; player.facing = -1; }
    if (right) { player.vx += .45; player.facing = 1; }
    player.vx *= Math.pow(.78, dt * 60);
    player.vx = Math.max(-5, Math.min(5, player.vx));
    player.vy += .58 * dt * 60;
    player.x += player.vx * dt * 60;
    player.y += player.vy * dt * 60;
    player.x = Math.max(0, Math.min(world.width - 80, player.x));
    player.grounded = false;
    for (const p of platforms) {
        const top = world.ground + p.y;
        if (player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h >= top && player.y + player.h - player.vy * dt * 60 <= top && player.vy >= 0) {
            player.y = top - player.h; player.vy = 0; player.grounded = true;
        }
    }
    player.attack = Math.max(0, player.attack - dt);
    player.invincible = Math.max(0, player.invincible - dt);
    collectibles.forEach(item => {
        if (!item.taken && Math.hypot(player.x + player.w / 2 - item.x, player.y + player.h / 2 - item.y) < 28) { item.taken = true; score += 100; }
    });
    enemies.forEach(enemy => {
        if (!enemy.alive) return;
        enemy.x += enemy.vx * dt * 60;
        if (Math.abs(enemy.x - player.x) > 210) enemy.vx *= -1;
        const hitbox = player.attack > 0 ? { x: player.x + (player.facing > 0 ? player.w : -28), y: player.y + 9, w: 34, h: 22 } : null;
        if (hitbox && hitbox.x < enemy.x + enemy.w && hitbox.x + hitbox.w > enemy.x && hitbox.y < world.ground + enemy.y && hitbox.y + hitbox.h > world.ground + enemy.y - enemy.h) { enemy.alive = false; score += 250; }
        if (player.invincible <= 0 && player.x < enemy.x + enemy.w && player.x + player.w > enemy.x && player.y < world.ground + enemy.y && player.y + player.h > world.ground + enemy.y - enemy.h) {
            energy--; player.invincible = 1.25; player.vy = -7; player.vx = player.x < enemy.x ? -6 : 6;
            if (energy <= 0) finish(false);
        }
    });
    if (player.x > world.width - 160) finish(true);
    cameraX += (player.x - cameraX - canvas.clientWidth * .35) * .08;
    cameraX = Math.max(0, Math.min(world.width - canvas.clientWidth, cameraX));
    updateHud();
}

function finish(won) {
    gameState = won ? 'won' : 'lost';
    messageEl.innerHTML = `<h2>${won ? 'MISSION CLEAR' : 'SYSTEM DOWN'}</h2><p>${won ? '出口に到達しました。' : 'ENERGYが尽きました。'}　ENTERキーまたはリスタートで再挑戦</p>`;
    messageEl.classList.remove('is-hidden');
}

function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#172344'); sky.addColorStop(1, '#0d1426'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(-cameraX, 0);
    drawBackground(w, h);
    platforms.forEach(p => { ctx.fillStyle = p.h > 20 ? '#222f4d' : '#33466f'; ctx.fillRect(p.x, world.ground + p.y, p.w, p.h); ctx.fillStyle = '#47e8d4'; ctx.fillRect(p.x, world.ground + p.y, p.w, 3); });
    collectibles.forEach(item => { if (!item.taken) { ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#ffd166'; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 14; ctx.fillRect(-7, -7, 14, 14); ctx.restore(); } });
    enemies.forEach(enemy => { if (enemy.alive) drawEnemy(enemy); });
    drawExit(); drawPlayer();
    ctx.restore();
}

function drawBackground(w, h) {
    ctx.fillStyle = 'rgba(103, 124, 179, .13)';
    for (let x = -200; x < world.width; x += 180) { const offset = (x * .08) % 80; ctx.beginPath(); ctx.moveTo(x, world.ground - 40); ctx.lineTo(x + 70, world.ground - 170 - offset); ctx.lineTo(x + 165, world.ground - 40); ctx.fill(); }
    ctx.strokeStyle = 'rgba(71, 232, 212, .08)'; ctx.lineWidth = 1;
    for (let x = 0; x < world.width; x += 80) { ctx.beginPath(); ctx.moveTo(x, world.ground); ctx.lineTo(x + 180, 0); ctx.stroke(); }
}
function drawPlayer() {
    if (player.invincible > 0 && Math.floor(player.invincible * 14) % 2 === 0) return;
    ctx.fillStyle = '#47e8d4'; ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = '#08131d'; ctx.fillRect(player.x + (player.facing > 0 ? 17 : 4), player.y + 9, 6, 5);
    ctx.fillStyle = '#9b8cff'; ctx.fillRect(player.x + 5, player.y + 31, 17, 6);
    if (player.attack > 0) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4; ctx.beginPath(); const start = player.facing > 0 ? player.x + 22 : player.x + 5; ctx.arc(start + player.facing * 11, player.y + 20, 19, player.facing > 0 ? -.9 : 2.2, player.facing > 0 ? .9 : 4, player.facing < 0); ctx.stroke(); }
}
function drawEnemy(enemy) { ctx.fillStyle = '#f45b69'; ctx.fillRect(enemy.x, world.ground + enemy.y - enemy.h, enemy.w, enemy.h); ctx.fillStyle = '#241526'; ctx.fillRect(enemy.x + 6, world.ground + enemy.y - 22, 6, 5); ctx.fillRect(enemy.x + 19, world.ground + enemy.y - 22, 6, 5); }
function drawExit() { const x = world.width - 105; ctx.fillStyle = '#9b8cff'; ctx.fillRect(x, world.ground - 116, 68, 116); ctx.fillStyle = '#0e1423'; ctx.fillRect(x + 10, world.ground - 101, 48, 101); ctx.fillStyle = '#47e8d4'; ctx.fillRect(x + 21, world.ground - 72, 26, 3); ctx.fillRect(x + 21, world.ground - 61, 26, 3); }

function loop(time) {
    const dt = Math.min(.033, (time - lastTime) / 1000 || .016); lastTime = time;
    update(dt); draw(); requestAnimationFrame(loop);
}
resize(); resetGame(); requestAnimationFrame(loop);
