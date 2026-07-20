// --- CONSTANTS & DATA ---

const WEAPONS = [
    { id: 'ninja_star', name: 'Basic Shuriken', icon: '🥷', damage: 10, power: 100, cost: 0, color: 0x4444ff, shape: 'star', trail: 'blue' },
    { id: 'steel_star', name: 'Steel Shuriken', icon: '⚙️', damage: 25, power: 150, cost: 50, color: 0xaaaaaa, shape: 'star', trail: 'silver' },
    { id: 'fire_star', name: 'Fire Shuriken', icon: '🔥', damage: 50, power: 250, cost: 200, color: 0xff4400, shape: 'star', trail: 'orange' },
    { id: 'lightning_star', name: 'Lightning Shuriken', icon: '⚡', damage: 80, power: 400, cost: 500, color: 0x00ffff, shape: 'star', trail: 'cyan' },
    { id: 'shadow_blade', name: 'Shadow Blade', icon: '🌑', damage: 150, power: 600, cost: 1000, color: 0x8800ff, shape: 'katana', trail: 'purple' }
];

const MATERIALS = [
    { name: 'Wooden Crate', hp: 30, color: 0x8b4513, score: 10, coins: 1, shape: 'box' },
    { name: 'Barrel', hp: 60, color: 0x5c4033, score: 20, coins: 2, shape: 'cylinder' },
    { name: 'Stone Block', hp: 150, color: 0x888888, score: 40, coins: 5, shape: 'box' },
    { name: 'Target Dummy', hp: 300, color: 0xddaa77, score: 80, coins: 10, shape: 'cylinder' },
    { name: 'Crystal Block', hp: 600, color: 0x00ffff, score: 150, coins: 20, shape: 'dodecahedron' },
    { name: 'BOSS', hp: 2000, color: 0xff0000, score: 500, coins: 50, shape: 'boss' }
];

const POWERUPS = [
    { type: 'coin', name: 'Golden Crate', color: 0xffd700, shape: 'box' },
    { type: 'damage', name: 'Red Target', color: 0xff0000, shape: 'cylinder' },
    { type: 'slow', name: 'Blue Target', color: 0x0000ff, shape: 'cylinder' }
];

const STATES = {
    START: 0,
    PLAYING: 1,
    GAMEOVER: 2,
    SHOP: 3
};

// --- AUDIO SYSTEM (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    switch(type) {
        case 'throw':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'hit':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        case 'break':
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.2);
            gainNode.gain.setValueAtTime(0.5, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        case 'coin':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.setValueAtTime(1500, now + 0.05);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'buy':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(600, now + 0.1);
            osc.frequency.setValueAtTime(800, now + 0.2);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
    }
}

// --- GLOBAL VARIABLES ---

let currentState = STATES.START;

// Three.js
let scene, camera, renderer;
let lane, weaponMesh;
let activeObjects = [];
let particles = [];
let projectiles = [];
let clock = new THREE.Clock();

// Input / Aiming
let aim = { x: 0, y: 0 }; // Normalized device coordinates (-1 to +1)
let isDragging = false;

// Game State
let playerData = {
    coins: 0,
    unlockedWeapons: ['ninja_star'],
    selectedWeaponId: 'ninja_star',
    bestScore: 0
};

let run = {
    score: 0,
    coins: 0,
    power: 0,
    maxPower: 0,
    speed: 40,
    distanceTraveled: 0,
    objectsBroken: 0,
    wave: 1,
    combo: 0,
    comboTimer: 0,
    damageMultiplier: 1,
    speedMultiplier: 1,
    powerupTimer: 0
};

// --- INITIALIZATION ---

function init() {
    loadData();
    initThreeJS();
    initUI();
    bindEvents();

    // Start render loop
    renderer.setAnimationLoop(gameLoop);
}

function loadData() {
    const saved = localStorage.getItem('ninjaStarBreaker3D');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            playerData = { ...playerData, ...parsed };
        } catch (e) {
            console.error("Failed to parse save data", e);
        }
    }
}

function saveData() {
    localStorage.setItem('ninjaStarBreaker3D', JSON.stringify(playerData));
}

function initThreeJS() {
    const container = document.getElementById('game-container');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205);
    scene.fog = new THREE.FogExp2(0x020205, 0.015);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 2, -20);

    // Renderer
    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    container.appendChild(canvas);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x4466ff, 1);
    mainLight.position.set(20, 30, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xff00ff, 0.5);
    fillLight.position.set(-20, 10, -20);
    scene.add(fillLight);

    // Lane/Platform
    const laneGeom = new THREE.PlaneGeometry(30, 1000);
    const laneMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a1a,
        roughness: 0.9,
        metalness: 0.1
    });
    lane = new THREE.Mesh(laneGeom, laneMat);
    lane.rotation.x = -Math.PI / 2;
    lane.position.y = 0;
    lane.position.z = -400;
    lane.receiveShadow = true;
    scene.add(lane);

    // Decorative pillars
    const pillarGeom = new THREE.BoxGeometry(1, 10, 1);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x111122, emissive: 0x00ffff, emissiveIntensity: 0.2 });

    for(let i = 0; i < 20; i++) {
        let p1 = new THREE.Mesh(pillarGeom, pillarMat);
        p1.position.set(-15, 5, -i * 50);
        p1.castShadow = true;
        p1.receiveShadow = true;
        scene.add(p1);

        let p2 = new THREE.Mesh(pillarGeom, pillarMat);
        p2.position.set(15, 5, -i * 50);
        p2.castShadow = true;
        p2.receiveShadow = true;
        scene.add(p2);
    }

    // Grid helper for ninja aesthetic
    const grid = new THREE.GridHelper(30, 60, 0x00ffff, 0x002222);
    grid.position.y = 0.01;
    scene.add(grid);

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- MODELS & SHAPES ---

function createWeaponMesh(weaponData) {
    if (weaponMesh) {
        scene.remove(weaponMesh);
        weaponMesh.geometry.dispose();
        weaponMesh.material.dispose();
    }

    let geometry;
    const material = new THREE.MeshStandardMaterial({
        color: weaponData.color,
        metalness: 0.8,
        roughness: 0.2
    });

    switch(weaponData.shape) {
        case 'star':
            // Simple 4-point star using cylinder with 4 radial segments
            geometry = new THREE.CylinderGeometry(0, 1, 0.2, 4);
            break;
        case 'knife':
            geometry = new THREE.BoxGeometry(0.2, 2, 0.5);
            break;
        case 'axe':
            geometry = new THREE.BoxGeometry(1.5, 0.2, 1);
            break;
        case 'sword':
            geometry = new THREE.BoxGeometry(0.3, 3, 0.1);
            break;
        case 'katana':
            geometry = new THREE.CylinderGeometry(0.1, 0.2, 4, 8);
            break;
        default:
            geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    weaponMesh = new THREE.Mesh(geometry, material);
    weaponMesh.position.set(0, 1.5, 0); // Start position
    scene.add(weaponMesh);

    return weaponMesh;
}

function createObjectMesh(materialData) {
    let geometry;
    const material = new THREE.MeshStandardMaterial({
        color: materialData.color,
        roughness: 0.6,
        metalness: 0.1
    });

    const size = 1.5 + (materialData.hp / 200); // Scale up slightly based on hp

    switch(materialData.shape) {
        case 'plane':
            geometry = new THREE.BoxGeometry(size, size, 0.1);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(size/2, size/2, size, 16);
            break;
        case 'box':
            geometry = new THREE.BoxGeometry(size, size, size);
            break;
        case 'dodecahedron':
            geometry = new THREE.DodecahedronGeometry(size/1.5);
            break;
        default:
            geometry = new THREE.BoxGeometry(size, size, size);
    }

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

// --- UI & EVENTS ---

function initUI() {
    document.getElementById('best-score-display').innerText = playerData.bestScore;
    document.getElementById('start-coins-display').innerText = playerData.coins;

    // Create weapons grid for shop
    renderShop();
}

function bindEvents() {
    document.getElementById('play-btn').addEventListener('click', startGame);
    document.getElementById('retry-btn').addEventListener('click', startGame);

    document.getElementById('shop-btn-start').addEventListener('click', openShop);
    document.getElementById('shop-btn-go').addEventListener('click', openShop);
    document.getElementById('back-btn').addEventListener('click', closeShop);

    // In-game buttons
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    document.getElementById('resume-btn').addEventListener('click', togglePause);
    document.getElementById('restart-btn').addEventListener('click', startGame);
    document.getElementById('quit-btn').addEventListener('click', () => {
        currentState = STATES.START;
        switchScreen('start-screen');
    });

    // Touch / Mouse Aiming
    const touchArea = document.getElementById('mobile-control-area');

    touchArea.addEventListener('pointerdown', (e) => {
        if(currentState !== STATES.PLAYING) return;
        isDragging = true;
        updateAim(e);
        throwProjectile();
    });

    touchArea.addEventListener('pointermove', (e) => {
        if(!isDragging || currentState !== STATES.PLAYING) return;
        updateAim(e);
    });

    touchArea.addEventListener('pointerup', () => {
        isDragging = false;
    });
}

function updateAim(event) {
    // Convert screen pixel to normalized -1 to +1
    aim.x = (event.clientX / window.innerWidth) * 2 - 1;
    aim.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function togglePause() {
    if(currentState === STATES.PLAYING) {
        currentState = STATES.PAUSED;
        switchScreen('pause-screen');
    } else if (currentState === STATES.PAUSED) {
        currentState = STATES.PLAYING;
        switchScreen('game-ui');
    }
}

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    if (screenId) {
        document.getElementById(screenId).classList.remove('hidden');
    }
}

// --- GAME STATE FLOW ---

function startGame() {
    currentState = STATES.PLAYING;
    switchScreen('game-ui');

    // Reset Run
    run = {
        score: 0,
        coins: 0,
        distanceTraveled: 0,
        objectsBroken: 0,
        speed: 40,
        wave: 1,
        combo: 0,
        comboTimer: 0,
        damageMultiplier: 1,
        speedMultiplier: 1,
        powerupTimer: 0
    };

    // Get Selected Weapon
    const weaponData = WEAPONS.find(w => w.id === playerData.selectedWeaponId);
    run.power = weaponData.power;
    run.maxPower = weaponData.power;

    document.getElementById('ui-wave').innerText = '1';
    document.getElementById('ui-score').innerText = '0';
    document.getElementById('ui-coins').innerText = '0';
    document.getElementById('ui-weapon-name').innerText = weaponData.name;
    document.getElementById('boss-warning').classList.add('hidden');
    document.getElementById('combo-display').classList.add('hidden');

    // Setup Scene
    createWeaponMesh(weaponData);
    weaponMesh.position.set(0, 1.5, 0);
    camera.position.set(0, 5, 10);

    // Clear old objects
    activeObjects.forEach(obj => scene.remove(obj.mesh));
    activeObjects = [];

    // Spawn initial objects
    spawnObject(-30);
    spawnObject(-60);
    spawnObject(-90);
}

function gameOver() {
    currentState = STATES.GAMEOVER;
    switchScreen('game-over-screen');

    document.getElementById('go-score').innerText = run.score;
    document.getElementById('go-coins').innerText = run.coins;

    playerData.coins += run.coins;
    if (run.score > playerData.bestScore) {
        playerData.bestScore = run.score;
    }

    saveData();

    document.getElementById('best-score-display').innerText = playerData.bestScore;
    document.getElementById('start-coins-display').innerText = playerData.coins;
}

// --- SHOP ---

function openShop() {
    currentState = STATES.SHOP;
    switchScreen('shop-screen');
    renderShop();
}

function closeShop() {
    currentState = STATES.START;
    switchScreen('start-screen');
}

function renderShop() {
    const grid = document.getElementById('weapons-grid');
    grid.innerHTML = '';
    document.getElementById('shop-coins').innerText = playerData.coins;

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
                PWR: ${w.power}
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
                renderShop(); // Refresh
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
                    renderShop(); // Refresh
                };
            }
        }

        card.appendChild(btn);
        grid.appendChild(card);
    });
}

// --- PROJECTILE SYSTEM ---

function throwProjectile() {
    if (run.power <= 0 || currentState !== STATES.PLAYING) return;

    playSound('throw');

    const weaponData = WEAPONS.find(w => w.id === playerData.selectedWeaponId);

    // Reduce power slightly for throwing
    run.power -= 2;

    // Create a projectile mesh identical to weapon mesh
    const projMesh = weaponMesh.clone();
    projMesh.material = weaponMesh.material.clone(); // so we can manipulate opacity if needed

    // Raycast to find target world position based on screen aim
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(aim, camera);

    // We want the projectile to travel forward but angled towards where user tapped.
    // Let's create a plane far away and intersect it.
    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 100);
    const targetPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(targetPlane, targetPoint);

    // Calculate direction from camera to target
    const direction = new THREE.Vector3().subVectors(targetPoint, camera.position).normalize();

    // Start slightly in front of camera
    projMesh.position.copy(camera.position);
    projMesh.position.y -= 1; // Start a bit lower

    scene.add(projMesh);

    projectiles.push({
        mesh: projMesh,
        direction: direction,
        speed: 150,
        damage: weaponData.damage * run.damageMultiplier,
        life: 2.0, // seconds
        color: weaponData.color,
        trailColor: getTrailColor(weaponData.trail)
    });
}

function getTrailColor(trailName) {
    switch(trailName) {
        case 'blue': return 0x4444ff;
        case 'silver': return 0xaaaaaa;
        case 'orange': return 0xffaa00;
        case 'cyan': return 0x00ffff;
        case 'purple': return 0xaa00ff;
        default: return 0xffffff;
    }
}

// --- GAMEPLAY MECHANICS ---

function spawnObject(zPos) {
    let objData;
    let isBoss = false;
    let isPowerup = false;

    // Check for Boss Wave
    if (run.objectsBroken > 0 && run.objectsBroken % 15 === 0) {
        // Every 15 objects is a "Wave", spawn Boss
        objData = MATERIALS.find(m => m.name === 'BOSS');
        isBoss = true;
        run.wave++;
        document.getElementById('ui-wave').innerText = run.wave;

        // Show boss warning
        const warning = document.getElementById('boss-warning');
        warning.classList.remove('hidden');
        setTimeout(() => warning.classList.add('hidden'), 2000);

        // Increase base speed slightly every wave
        run.speed = Math.min(80, 40 + (run.wave * 2));
    } else if (Math.random() < 0.1) {
        // 10% chance for powerup
        isPowerup = true;
        objData = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
    } else {
        // Normal object scaling based on wave
        let maxIndex = Math.min(MATERIALS.length - 2, Math.floor(run.wave / 2)); // -2 to exclude BOSS
        let matIndex = Math.floor(Math.random() * (maxIndex + 1));

        // Favor harder objects in later waves
        if (Math.random() > 0.5) matIndex = maxIndex;

        objData = MATERIALS[matIndex];
    }

    const mesh = createObjectMesh(objData);

    // Random X position for variety
    const xPos = (Math.random() - 0.5) * 8;
    mesh.position.set(xPos, isBoss ? 3 : 1.5, zPos);

    if(isBoss) mesh.scale.set(3, 3, 3);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Apply wave difficulty multipliers to HP
    let hp = objData.hp || 1;
    if(!isPowerup) {
        hp *= (1 + (run.wave * 0.2));
    }

    activeObjects.push({
        data: objData,
        mesh: mesh,
        hp: hp,
        z: zPos,
        x: xPos,
        isPowerup: isPowerup,
        isBoss: isBoss
    });
}

function createBreakParticles(position, color) {
    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const material = new THREE.MeshBasicMaterial({ color: color });

    for (let i = 0; i < 20; i++) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.position.x += (Math.random() - 0.5) * 2;
        mesh.position.y += (Math.random() - 0.5) * 2;
        scene.add(mesh);

        particles.push({
            mesh: mesh,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                Math.random() * 15,
                (Math.random() - 0.5) * 15
            ),
            life: 1.0
        });
    }
}

// Camera Shake
let shakeTime = 0;
let shakeMagnitude = 0;

function applyCameraShake(magnitude, time) {
    shakeMagnitude = magnitude;
    shakeTime = time;
}

// --- MAIN LOOP ---

function gameLoop() {
    const delta = clock.getDelta();

    if (currentState === STATES.PLAYING) {
        updateGameplay(delta);
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.life -= delta;

        if (p.life <= 0) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
            particles.splice(i, 1);
        } else {
            p.mesh.position.addScaledVector(p.velocity, delta);
            if(p.hasGravity) p.velocity.y -= 20 * delta; // Gravity
            p.mesh.rotation.x += delta * 10;
            p.mesh.rotation.y += delta * 10;
            p.mesh.scale.setScalar(p.life / p.maxLife);
        }
    }

    // Apply Camera Shake
    if (shakeTime > 0) {
        shakeTime -= delta;
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * shakeMagnitude,
            (Math.random() - 0.5) * shakeMagnitude,
            0
        );
        camera.position.add(offset);
        // Will be roughly reset by follow logic in updateGameplay
    }

    renderer.render(scene, camera);
}

function updateGameplay(delta) {
    if (run.power <= 0) {
        gameOver();
        return;
    }

    // Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let proj = projectiles[i];
        proj.life -= delta;

        if (proj.life <= 0) {
            scene.remove(proj.mesh);
            proj.mesh.geometry.dispose();
            proj.mesh.material.dispose();
            projectiles.splice(i, 1);
            continue;
        }

        // Move projectile
        proj.mesh.position.addScaledVector(proj.direction, proj.speed * delta);
        proj.mesh.rotation.x += 10 * delta;
        proj.mesh.rotation.z += 20 * delta;

        // Add trail particles
        if(Math.random() > 0.5) {
            createParticle(proj.mesh.position, proj.trailColor, 0.5, false);
        }

        // Check Collision with active objects
        for (let j = 0; j < activeObjects.length; j++) {
            let target = activeObjects[j];
            let dist = proj.mesh.position.distanceTo(target.mesh.position);

            let collisionRadius = target.isBoss ? 4 : 2;

            if (dist < collisionRadius) {
                // Hit!
                playSound('hit');
                createParticle(proj.mesh.position, proj.trailColor, 1.0, true, 5); // Sparks

                if (target.isPowerup) {
                    target.hp = 0;
                    applyPowerup(target.data.type);
                    showFloatingText(target.data.name, 'score');
                    playSound('coin');
                } else {
                    target.hp -= proj.damage;
                    target.mesh.position.x = target.x + (Math.random() - 0.5) * 0.5; // Shake
                }

                // Check Destroy
                if (target.hp <= 0) {
                    playSound('break');
                    createBreakParticles(target.mesh.position, target.data.color);
                    applyCameraShake(target.isBoss ? 1.0 : 0.4, 0.2);

                    if (!target.isPowerup) {
                        run.combo++;
                        run.comboTimer = 2.0;
                        if (run.combo > 1) {
                            const comboDisplay = document.getElementById('combo-display');
                            comboDisplay.classList.remove('hidden');
                            document.getElementById('ui-combo').innerText = run.combo;
                        }
                    }

                    const comboMult = Math.max(1, run.combo);
                    const scoreGained = (target.data.score || 0) * comboMult;
                    const coinsGained = target.data.coins || 0;

                    run.score += scoreGained;
                    run.coins += coinsGained;
                    run.objectsBroken++;

                    if (scoreGained > 0) showFloatingText(`+${scoreGained}`, 'score');
                    if (coinsGained > 0) {
                        setTimeout(() => showFloatingText(`+${coinsGained} Coins`, 'coin'), 200);
                        if(coinsGained > 1) playSound('coin');
                    }

                    document.getElementById('ui-score').innerText = run.score;
                    document.getElementById('ui-coins').innerText = run.coins;

                    scene.remove(target.mesh);
                    target.mesh.geometry.dispose();
                    target.mesh.material.dispose();
                    activeObjects.splice(j, 1);
                }

                // Remove Projectile
                scene.remove(proj.mesh);
                proj.mesh.geometry.dispose();
                proj.mesh.material.dispose();
                projectiles.splice(i, 1);
                break; // Stop checking this projectile against other objects
            }
        }
    }

    // Handle Powerups timer
    if (run.powerupTimer > 0) {
        run.powerupTimer -= delta;
        if (run.powerupTimer <= 0) {
            run.damageMultiplier = 1;
            run.speedMultiplier = 1;
        }
    }

    // Handle Combo timer
    if (run.combo > 0) {
        run.comboTimer -= delta;
        if (run.comboTimer <= 0) {
            run.combo = 0;
            document.getElementById('combo-display').classList.add('hidden');
        }
    }

    // Advance world (objects move towards player now, since we throw projectiles)
    const currentSpeed = run.speed * run.speedMultiplier;

    // Spawn objects periodically instead of waiting for break
    if(activeObjects.length === 0 || activeObjects[activeObjects.length -1].z > -100) {
        const lastZ = activeObjects.length > 0 ? activeObjects[activeObjects.length - 1].z : -50;
        spawnObject(lastZ - (40 + Math.random() * 20));
    }

    // Move objects towards camera
    for (let i = activeObjects.length - 1; i >= 0; i--) {
        let obj = activeObjects[i];
        obj.z += currentSpeed * delta;
        obj.mesh.position.z = obj.z;

        // If object passed player, remove it and penalize power
        if (obj.z > 10) {
            if (!obj.isPowerup) {
                run.power -= obj.hp * 0.2; // Lose power for missing
                run.combo = 0; // Reset combo
                document.getElementById('combo-display').classList.add('hidden');
                showFloatingText("Miss!", "damage");
            }
            scene.remove(obj.mesh);
            obj.mesh.geometry.dispose();
            obj.mesh.material.dispose();
            activeObjects.splice(i, 1);
        }
    }

    // Bobbing animation for held weapon mesh
    weaponMesh.position.copy(camera.position);
    weaponMesh.position.x += 1.5; // Bottom right corner
    weaponMesh.position.y -= 1.5;
    weaponMesh.position.z -= 3;

    weaponMesh.rotation.z += 1 * delta;
    weaponMesh.rotation.y += 0.5 * delta;

    // Extend Lane towards camera to simulate movement
    lane.position.z += currentSpeed * delta;
    if (lane.position.z > 0) {
        lane.position.z -= 400;
    }

    // Update UI Power Bar
    const powerPercent = Math.max(0, (run.power / run.maxPower) * 100);
    document.getElementById('power-bar-fill').style.width = `${powerPercent}%`;
}

function createParticle(position, color, life, hasGravity, count = 1) {
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshBasicMaterial({ color: color });

    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.position.x += (Math.random() - 0.5) * 0.5;
        mesh.position.y += (Math.random() - 0.5) * 0.5;
        scene.add(mesh);

        particles.push({
            mesh: mesh,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            ),
            life: life,
            maxLife: life,
            hasGravity: hasGravity
        });
    }

}

function applyPowerup(type) {
    switch(type) {
        case 'coin':
            run.coins += 25;
            break;
        case 'damage':
            run.damageMultiplier = 2.0;
            run.powerupTimer = 5.0; // 5 seconds
            break;
        case 'slow':
            run.speedMultiplier = 0.5;
            run.powerupTimer = 5.0; // 5 seconds
            break;
    }
}

function showFloatingText(text, typeClass) {
    const container = document.getElementById('floating-text-container');
    const el = document.createElement('div');
    el.className = `floating-text ${typeClass}`;
    el.innerText = text;

    // Randomize position slightly near center
    const x = 50 + (Math.random() - 0.5) * 20;
    const y = 50 + (Math.random() - 0.5) * 20;

    el.style.left = `${x}%`;
    el.style.top = `${y}%`;

    container.appendChild(el);

    // Remove after animation completes
    setTimeout(() => {
        if(container.contains(el)) {
            container.removeChild(el);
        }
    }, 1000);
}

// Start everything when DOM is ready
window.onload = init;
