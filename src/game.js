// --- CONSTANTS & DATA ---

const WEAPONS = [
    { id: 'ninja_star', name: 'Ninja Star', icon: '🥷', damage: 10, power: 100, cost: 0, color: 0x888888, shape: 'star' },
    { id: 'knife', name: 'Knife', icon: '🗡️', damage: 25, power: 150, cost: 50, color: 0xaaaaaa, shape: 'knife' },
    { id: 'axe', name: 'Axe', icon: '🪓', damage: 50, power: 250, cost: 200, color: 0x555555, shape: 'axe' },
    { id: 'sword', name: 'Sword', icon: '🤺', damage: 80, power: 400, cost: 500, color: 0xcccccc, shape: 'sword' },
    { id: 'katana', name: 'Katana', icon: '⚔️', damage: 150, power: 600, cost: 1000, color: 0xffffff, shape: 'katana' }
];

const MATERIALS = [
    { name: 'Paper', hp: 20, color: 0xeeeeee, score: 10, coins: 1, shape: 'plane' },
    { name: 'Plastic', hp: 50, color: 0x88ccff, score: 20, coins: 2, shape: 'cylinder' },
    { name: 'Wood', hp: 120, color: 0x8b4513, score: 40, coins: 5, shape: 'box' },
    { name: 'Brick', hp: 250, color: 0xb22222, score: 80, coins: 10, shape: 'box' },
    { name: 'Metal', hp: 500, color: 0xaaaaaa, score: 150, coins: 20, shape: 'cylinder' },
    { name: 'Stone', hp: 1000, color: 0x555555, score: 300, coins: 40, shape: 'dodecahedron' }
];

const STATES = {
    START: 0,
    PLAYING: 1,
    GAMEOVER: 2,
    SHOP: 3
};

// --- GLOBAL VARIABLES ---

let currentState = STATES.START;

// Three.js
let scene, camera, renderer;
let lane, weaponMesh;
let activeObjects = [];
let particles = [];
let clock = new THREE.Clock();

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
    objectsBroken: 0
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
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.Fog(0x050510, 20, 150);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, -20);

    // Renderer
    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    container.appendChild(canvas);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xff00ff, 0.5);
    dirLight2.position.set(-10, 20, -10);
    scene.add(dirLight2);

    // Lane/Platform
    const laneGeom = new THREE.PlaneGeometry(10, 1000);
    const laneMat = new THREE.MeshStandardMaterial({
        color: 0x111122,
        roughness: 0.8,
        metalness: 0.2
    });
    lane = new THREE.Mesh(laneGeom, laneMat);
    lane.rotation.x = -Math.PI / 2;
    lane.position.y = 0;
    lane.position.z = -400; // Extend far forward
    scene.add(lane);

    // Grid helper for ninja aesthetic
    const grid = new THREE.GridHelper(20, 40, 0x00ffff, 0x003333);
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
        speed: 40 // Fix NaN issue
    };

    // Get Selected Weapon
    const weaponData = WEAPONS.find(w => w.id === playerData.selectedWeaponId);
    run.power = weaponData.power;
    run.maxPower = weaponData.power;

    document.getElementById('ui-score').innerText = '0';
    document.getElementById('ui-coins').innerText = '0';
    document.getElementById('ui-weapon-name').innerText = weaponData.name;
    document.getElementById('ui-object').innerText = 'None';

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

// --- GAMEPLAY MECHANICS ---

function spawnObject(zPos) {
    // Difficulty curve
    let maxMaterialIndex = Math.min(MATERIALS.length - 1, Math.floor(run.objectsBroken / 3) + 1);

    let matIndex = Math.floor(Math.random() * maxMaterialIndex);
    if (Math.random() > 0.5) matIndex = maxMaterialIndex - 1;
    if (matIndex < 0) matIndex = 0;

    const mat = MATERIALS[matIndex];
    const mesh = createObjectMesh(mat);
    mesh.position.set(0, 1.5, zPos);
    scene.add(mesh);

    activeObjects.push({
        data: mat,
        mesh: mesh,
        hp: mat.hp,
        z: zPos
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
            p.velocity.y -= 20 * delta; // Gravity
            p.mesh.rotation.x += delta * 10;
            p.mesh.rotation.y += delta * 10;
            p.mesh.scale.setScalar(p.life);
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

    // Move Weapon normally unless colliding
    let isColliding = false;

    // Check Collisions
    if (activeObjects.length > 0) {
        let target = activeObjects[0];

        // Update UI
        document.getElementById('ui-object').innerText = target.data.name;

        // If weapon reached the target
        if (weaponMesh.position.z <= target.z + 1.5 && weaponMesh.position.z >= target.z - 1.5) { // 1.5 rough collision radius
            isColliding = true;
            // Lock weapon position at the object
            weaponMesh.position.z = target.z + 1.5;

            // Get weapon data
            const weaponData = WEAPONS.find(w => w.id === playerData.selectedWeaponId);

            // Apply Damage
            const damagePerSec = weaponData.damage * 10;
            target.hp -= damagePerSec * delta;

            // Reduce Power
            const drainRate = target.data.hp * 0.5; // Drain faster on hard objects
            run.power -= drainRate * delta;

            // Visual feedback: Shake object
            target.mesh.position.x = (Math.random() - 0.5) * 0.5;
            applyCameraShake(0.2, 0.05);

            if (target.hp <= 0) {
                // Object Broken
                createBreakParticles(target.mesh.position, target.data.color);
                applyCameraShake(0.5, 0.2);

                run.score += target.data.score;
                run.coins += target.data.coins;
                run.objectsBroken++;

                document.getElementById('ui-score').innerText = run.score;
                document.getElementById('ui-coins').innerText = run.coins;

                scene.remove(target.mesh);
                target.mesh.geometry.dispose();
                target.mesh.material.dispose();
                activeObjects.shift();

                isColliding = false; // allow to move again

                // Spawn new object further down
                const lastZ = activeObjects.length > 0 ? activeObjects[activeObjects.length - 1].z : weaponMesh.position.z;
                spawnObject(lastZ - (30 + Math.random() * 30));
            } else if (run.power <= 0) {
                // Out of power while hitting
                run.power = 0;
            }
        }
    }

    if (!isColliding) {
        weaponMesh.position.z -= run.speed * delta;
    }

    weaponMesh.rotation.z += run.speed * 0.5 * delta;
    weaponMesh.rotation.x += run.speed * 0.2 * delta;

    // Camera Follow
    const targetCameraZ = weaponMesh.position.z + 10;
    camera.position.z += (targetCameraZ - camera.position.z) * 0.1;
    camera.position.y = 5;
    camera.position.x = 0;

    // Extend Lane
    if (weaponMesh.position.z < lane.position.z) {
        lane.position.z -= 400; // 400 is less than half of 1000, so it should overlap seamlessly
    }

    // Update UI Power Bar
    const powerPercent = Math.max(0, (run.power / run.maxPower) * 100);
    document.getElementById('power-bar-fill').style.width = `${powerPercent}%`;
}

// Start everything when DOM is ready
window.onload = init;
