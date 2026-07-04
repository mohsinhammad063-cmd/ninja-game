const WEAPONS = [
    { id: 'ninja_star', name: 'Ninja Star', icon: '🥷', damage: 10, speed: 10, sharpness: 5, durability: 20, cost: 0 },
    { id: 'double_star', name: 'Double Ninja Star', icon: '🌀', damage: 20, speed: 12, sharpness: 10, durability: 30, cost: 100 },
    { id: 'throwing_knife', name: 'Throwing Knife', icon: '🗡️', damage: 30, speed: 15, sharpness: 20, durability: 40, cost: 300 },
    { id: 'small_axe', name: 'Small Axe', icon: '🪓', damage: 50, speed: 8, sharpness: 15, durability: 60, cost: 600 },
    { id: 'battle_axe', name: 'Battle Axe', icon: '⚒️', damage: 80, speed: 7, sharpness: 25, durability: 100, cost: 1200 },
    { id: 'sword', name: 'Sword', icon: '🤺', damage: 60, speed: 12, sharpness: 40, durability: 80, cost: 2000 },
    { id: 'samurai_sword', name: 'Samurai Sword', icon: '🗡️', damage: 90, speed: 14, sharpness: 60, durability: 120, cost: 3500 },
    { id: 'katana', name: 'Katana', icon: '⚔️', damage: 120, speed: 16, sharpness: 80, durability: 150, cost: 6000 },
    { id: 'golden_katana', name: 'Golden Katana', icon: '✨', damage: 200, speed: 18, sharpness: 100, durability: 250, cost: 12000 },
    { id: 'shadow_katana', name: 'Shadow Katana', icon: '🌑', damage: 350, speed: 20, sharpness: 150, durability: 400, cost: 25000 }
];

const MATERIALS = [
    { name: 'Paper', icon: '📄', hp: 5, score: 10, coins: 1, color: '#eee' },
    { name: 'Cardboard', icon: '📦', hp: 15, score: 20, coins: 2, color: '#cda975' },
    { name: 'Plastic bottle', icon: '🍾', hp: 30, score: 35, coins: 4, color: '#88ccff' },
    { name: 'Foam block', icon: '🧊', hp: 50, score: 50, coins: 6, color: '#aaffaa' },
    { name: 'Thin wood', icon: '🪵', hp: 80, score: 75, coins: 10, color: '#d2b48c' },
    { name: 'Thick wood', icon: '🪵', hp: 150, score: 120, coins: 15, color: '#8b4513' },
    { name: 'Brick', icon: '🧱', hp: 250, score: 200, coins: 25, color: '#b22222' },
    { name: 'Metal sheet', icon: '🪚', hp: 400, score: 350, coins: 40, color: '#aaaaaa' },
    { name: 'Stone block', icon: '🪨', hp: 700, score: 600, coins: 70, color: '#555555' }
];

const STATES = {
    START: 0,
    SHOP: 1,
    POWER_SELECT: 2,
    PLAYING: 3,
    GAMEOVER: 4
};

// Game State Variables
let currentState = STATES.START;
let canvas, ctx;
let lastTime = 0;

// Player Data (Loaded from LocalStorage)
let playerData = {
    coins: 0,
    unlockedWeapons: ['ninja_star'],
    selectedWeaponId: 'ninja_star',
    bestScore: 0
};

function loadData() {
    const saved = localStorage.getItem('ninjaStarBreakerData');
    if (saved) {
        playerData = JSON.parse(saved);
        // Ensure default array exists in case of old save formats
        if (!playerData.unlockedWeapons) playerData.unlockedWeapons = ['ninja_star'];
        if (!playerData.selectedWeaponId) playerData.selectedWeaponId = 'ninja_star';
    }
}

function saveData() {
    localStorage.setItem('ninjaStarBreakerData', JSON.stringify(playerData));
}

// Run Data
let run = {
    score: 0,
    coins: 0,
    broken: 0,
    powerMultiplier: 0,
    combo: 0
};

// Particles and Objects
let particles = [];
let targetObjects = [];
let weaponObj = null;

let cameraY = 0;

// Initialization function
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    loadData();
    updateUI();
    bindEvents();
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function drawBackground(deltaTime) {
    // Simple scrolling starfield or abstract shapes
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw some subtle grid lines tracking movement
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    const gridSize = 100;
    const offsetY = cameraY % gridSize;

    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    for (let y = offsetY; y <= canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
}

function drawWeapon() {
    if (!weaponObj || currentState < STATES.PLAYING) return;

    ctx.save();
    ctx.translate(weaponObj.x, weaponObj.y - cameraY);
    ctx.rotate(weaponObj.rotation);

    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(weaponObj.icon, 0, 0);

    // Draw glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#0ff';
    ctx.fillText(weaponObj.icon, 0, 0);

    ctx.restore();
}

function drawObjects() {
    targetObjects.forEach(obj => {
        const drawY = obj.y - cameraY;
        // Optimization: don't draw offscreen objects
        if (drawY > canvas.height + 100 || drawY < -100) return;

        ctx.save();
        ctx.translate(obj.x, drawY);

        // Shake effect when hit
        if (obj.hitTimer > 0) {
            ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
            obj.hitTimer -= 16; // approx 1 frame
        }

        // Draw Health Bar
        if (obj.hp < obj.maxHp) {
            ctx.fillStyle = '#f00';
            ctx.fillRect(-40, -40, 80, 5);
            ctx.fillStyle = '#0f0';
            const hpRatio = Math.max(0, obj.hp / obj.maxHp);
            ctx.fillRect(-40, -40, 80 * hpRatio, 5);
        }

        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.icon, 0, 0);

        // Draw object material color glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = obj.color;
        ctx.fillText(obj.icon, 0, 0);

        ctx.restore();
    });
}

function drawParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * deltaTime * 60;
        p.y += p.vy * deltaTime * 60;
        p.life -= deltaTime;

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.translate(p.x, p.y - cameraY);
        if (p.text) {
            ctx.font = `${p.size}px Arial`;
            ctx.fillStyle = p.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.text, 0, 0);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

function updateUI() {
    // Start Screen
    document.getElementById('best-score-display').innerText = playerData.bestScore;
    document.getElementById('start-coins-display').innerText = playerData.coins;

    // Shop Screen
    document.getElementById('shop-coins').innerText = playerData.coins;
    renderShop();

    // UI Game screen (updated during gameplay, but static info here)
    const currentWeapon = WEAPONS.find(w => w.id === playerData.selectedWeaponId);
    document.getElementById('ui-weapon-name').innerText = currentWeapon.name;
}

function changeState(newState) {
    currentState = newState;

    // Hide all screens
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('shop-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('power-bar-container').classList.add('hidden');

    // Show appropriate screen
    switch(newState) {
        case STATES.START:
            document.getElementById('start-screen').classList.remove('hidden');
            updateUI();
            break;
        case STATES.SHOP:
            document.getElementById('shop-screen').classList.remove('hidden');
            updateUI();
            break;
        case STATES.POWER_SELECT:
            document.getElementById('game-ui').classList.remove('hidden');
            document.getElementById('power-bar-container').classList.remove('hidden');
            startPowerSelection();
            break;
        case STATES.PLAYING:
            document.getElementById('game-ui').classList.remove('hidden');
            break;
        case STATES.GAMEOVER:
            document.getElementById('game-over-screen').classList.remove('hidden');
            showGameOver();
            break;
    }
}

let powerBarValue = 0;
let powerBarDir = 1;

function bindEvents() {
    document.getElementById('play-btn').addEventListener('click', () => {
        changeState(STATES.POWER_SELECT);
    });

    document.getElementById('shop-btn-start').addEventListener('click', () => {
        changeState(STATES.SHOP);
    });

    document.getElementById('shop-btn-go').addEventListener('click', () => {
        changeState(STATES.SHOP);
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        changeState(STATES.START);
    });

    document.getElementById('retry-btn').addEventListener('click', () => {
        changeState(STATES.POWER_SELECT);
    });

    // Handle throwing
    const handleThrow = (e) => {
        if (e.target.tagName === 'BUTTON') return; // Ignore button clicks

        if (currentState === STATES.POWER_SELECT) {
            throwWeapon();
        }
    };

    window.addEventListener('mousedown', handleThrow);
    window.addEventListener('touchstart', handleThrow, {passive: false});
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            handleThrow(e);
        }
    });
}

function renderShop() {
    const grid = document.getElementById('weapons-grid');
    grid.innerHTML = '';

    WEAPONS.forEach(w => {
        const isUnlocked = playerData.unlockedWeapons.includes(w.id);
        const isSelected = playerData.selectedWeaponId === w.id;

        const card = document.createElement('div');
        card.className = `weapon-card ${isUnlocked ? 'unlocked' : ''} ${isSelected ? 'selected' : ''}`;

        card.innerHTML = `
            <div class="weapon-icon">${w.icon}</div>
            <div class="weapon-name">${w.name}</div>
            <div class="weapon-stats">
                DMG: ${w.damage}<br>
                SPD: ${w.speed}<br>
                SHP: ${w.sharpness}<br>
                DUR: ${w.durability}
            </div>
        `;

        const btn = document.createElement('button');
        if (isSelected) {
            btn.className = 'weapon-action-btn btn-selected';
            btn.innerText = 'Selected';
        } else if (isUnlocked) {
            btn.className = 'weapon-action-btn btn-select';
            btn.innerText = 'Select';
            btn.onclick = () => {
                playerData.selectedWeaponId = w.id;
                saveData();
                updateUI();
            };
        } else {
            btn.className = 'weapon-action-btn btn-buy';
            btn.innerText = `${w.cost} Coins`;
            if (playerData.coins < w.cost) {
                btn.disabled = true;
            } else {
                btn.onclick = () => {
                    playerData.coins -= w.cost;
                    playerData.unlockedWeapons.push(w.id);
                    playerData.selectedWeaponId = w.id;
                    saveData();
                    updateUI();
                };
            }
        }

        card.appendChild(btn);
        grid.appendChild(card);
    });
}

function startPowerSelection() {
    // Reset Run
    run = {
        score: 0,
        coins: 0,
        broken: 0,
        powerMultiplier: 0,
        combo: 0
    };

    // Reset UI
    document.getElementById('ui-score').innerText = '0';
    document.getElementById('ui-coins').innerText = '0';
    document.getElementById('ui-broken').innerText = '0';
    document.getElementById('combo-display').classList.add('hidden');
    document.getElementById('perfect-cut-display').classList.add('hidden');

    powerBarValue = 0;
    powerBarDir = 1;

    // Setup weapon at start position
    const selectedWeapon = WEAPONS.find(w => w.id === playerData.selectedWeaponId);
    document.getElementById('ui-weapon-name').innerText = selectedWeapon.name;

    weaponObj = {
        ...selectedWeapon,
        x: canvas.width / 2,
        y: canvas.height * 0.8,
        rotation: 0,
        vy: 0,
        spin: 0,
        energy: selectedWeapon.durability
    };

    cameraY = 0;
    particles = [];
    targetObjects = [];

    // Spawn initial objects
    let yPos = weaponObj.y - 300;
    for(let i=0; i<3; i++) {
        spawnObject(yPos);
        yPos -= (300 + Math.random() * 200);
    }
}

function updatePowerBar(deltaTime) {
    powerBarValue += powerBarDir * deltaTime * 150;
    if (powerBarValue > 100) {
        powerBarValue = 100;
        powerBarDir = -1;
    } else if (powerBarValue < 0) {
        powerBarValue = 0;
        powerBarDir = 1;
    }

    document.getElementById('power-bar-fill').style.width = `${powerBarValue}%`;
}

function throwWeapon() {
    document.getElementById('power-bar-container').classList.add('hidden');

    // Calculate power based on how close to 80-90% sweet spot
    const sweetSpot = 85;
    const diff = Math.abs(powerBarValue - sweetSpot);
    // Multiplier between 0.5 (bad) and 1.5 (perfect)
    run.powerMultiplier = Math.max(0.5, 1.5 - (diff * 0.02));

    weaponObj.vy = weaponObj.speed * run.powerMultiplier;
    weaponObj.spin = weaponObj.speed * 0.5 * run.powerMultiplier;
    weaponObj.energy = weaponObj.durability * run.powerMultiplier;

    changeState(STATES.PLAYING);
}

function showGameOver() {
    document.getElementById('go-score').innerText = run.score;
    document.getElementById('go-broken').innerText = run.broken;
    document.getElementById('go-coins').innerText = run.coins;

    playerData.coins += run.coins;
    if (run.score > playerData.bestScore) {
        playerData.bestScore = run.score;
    }

    saveData();
}
function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground(deltaTime);

    if (currentState === STATES.POWER_SELECT) {
        updatePowerBar(deltaTime);
    } else if (currentState === STATES.PLAYING) {
        updatePhysics(deltaTime);
    }

    drawObjects();
    drawWeapon();
    drawParticles(deltaTime);

    requestAnimationFrame(gameLoop);
}

function spawnObject(yPos) {
    // Difficulty curve based on objects broken
    let maxMaterialIndex = Math.min(MATERIALS.length - 1, Math.floor(run.broken / 3) + 1);

    // Slight randomness, but mostly progressive
    let matIndex = Math.floor(Math.random() * maxMaterialIndex);
    // Bias towards harder materials as we progress
    if (Math.random() > 0.5) matIndex = maxMaterialIndex - 1;
    if (matIndex < 0) matIndex = 0;

    const mat = MATERIALS[matIndex];
    targetObjects.push({
        ...mat,
        maxHp: mat.hp,
        x: canvas.width / 2,
        y: yPos,
        hitTimer: 0
    });
}

function createBreakParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 0.5 + Math.random() * 0.5,
            maxLife: 1,
            size: Math.random() * 8 + 4,
            color: color
        });
    }
}

function updatePhysics(deltaTime) {
    if (!weaponObj || weaponObj.energy <= 0) return;

    // Move weapon
    weaponObj.y -= weaponObj.vy * deltaTime * 60;
    weaponObj.rotation += weaponObj.spin * deltaTime * 60;

    // Update camera to follow weapon (keep weapon near bottom of screen)
    const targetCameraY = weaponObj.y - (canvas.height * 0.7);
    cameraY += (targetCameraY - cameraY) * 0.1; // Smooth follow

    // Collision detection
    // Only check the object at the bottom of the list (closest to weapon)
    if (targetObjects.length > 0) {
        let target = targetObjects[0];

        // If weapon reached the target
        if (weaponObj.y <= target.y + 40) { // 40 is roughly hit radius

            // Apply damage based on sharpness and energy
            const damage = weaponObj.damage * weaponObj.sharpness * 0.1 * run.powerMultiplier;
            target.hp -= damage * deltaTime * 60;
            target.hitTimer = 50;

            // Lose energy/durability while cutting
            weaponObj.energy -= (target.maxHp * 0.05) * deltaTime * 60;

            // Create sparks while cutting
            if (Math.random() > 0.5) {
                particles.push({
                    x: weaponObj.x + (Math.random() - 0.5) * 40,
                    y: weaponObj.y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: Math.random() * 5,
                    life: 0.3,
                    maxLife: 0.3,
                    size: 3,
                    color: '#ff0'
                });
            }

            if (target.hp <= 0) {
                // Object Broken!
                createBreakParticles(target.x, target.y, target.color);

                run.score += target.score;
                run.coins += target.coins;
                run.broken++;
                run.combo++;

                // Show floating text
                particles.push({
                    x: target.x,
                    y: target.y,
                    vx: 0,
                    vy: -2,
                    life: 1,
                    maxLife: 1,
                    size: 30,
                    color: '#0f0',
                    text: `+${target.score}`
                });

                // Update UI visually
                document.getElementById('ui-score').innerText = run.score;
                document.getElementById('ui-coins').innerText = run.coins;
                document.getElementById('ui-broken').innerText = run.broken;

                if (run.combo > 1) {
                    const comboEl = document.getElementById('combo-display');
                    document.getElementById('ui-combo').innerText = run.combo;
                    comboEl.classList.remove('hidden');
                    // Reset animation
                    comboEl.style.animation = 'none';
                    comboEl.offsetHeight; // trigger reflow
                    comboEl.style.animation = null;
                }

                if (run.combo >= 5) {
                     const perfectEl = document.getElementById('perfect-cut-display');
                     perfectEl.classList.remove('hidden');
                     perfectEl.style.animation = 'none';
                     perfectEl.offsetHeight;
                     perfectEl.style.animation = null;
                }

                // Remove object and spawn a new one further up
                targetObjects.shift();

                // Spawn 1 or 2 new objects to keep the path populated
                const lastObjY = targetObjects.length > 0 ? targetObjects[targetObjects.length - 1].y : weaponObj.y;
                spawnObject(lastObjY - (300 + Math.random() * 200));

            } else if (weaponObj.energy <= 0) {
                // Weapon stopped without breaking object
                weaponObj.energy = 0;
                weaponObj.vy = 0;

                // Small bounce back
                weaponObj.y += 20;

                setTimeout(() => {
                    changeState(STATES.GAMEOVER);
                }, 1000);
            }
        }
    }
}

window.onload = init;
