import { initScene } from './SceneManager.js';
import { updateUIDisplay, renderShop, switchScreen, handleStateChangeUI, showRestartConfirmMenu, showQuitConfirmMenu, resetPauseMenuUI } from './UIManager.js';
import { createRun, resetGameUI, handleGameOver, safelyClearRun } from './GameManager.js';
import { WEAPONS, MATERIALS, POWERUPS, STATES } from './constants.js';
import { playSound } from './audio.js';
import { stateManager } from './StateManager.js';

// --- GLOBAL VARIABLES ---

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
let run = {};
let playerData = {
    coins: 0,
    bestScore: 0,
    unlockedWeapons: ['ninja_star'],
    selectedWeaponId: 'ninja_star',
    settings: {
        shake: true,
        move: true
    }
};

function init() {
    loadData();
    stateManager.subscribe((newState) => {
        handleStateChangeUI(newState, switchScreen);
    });
    const sceneData = initScene();
    scene = sceneData.scene;
    camera = sceneData.camera;
    renderer = sceneData.renderer;
    lane = sceneData.lane;

    updateUIDisplay(playerData);
    renderShop(playerData, window.selectWeapon, window.buyWeapon);
    bindEvents();

    // Start render loop
    renderer.setAnimationLoop(gameLoop);
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

    // Pause menu confirmation bindings
    document.getElementById('confirm-restart-btn').addEventListener('click', showRestartConfirmMenu);
    document.getElementById('cancel-restart-btn').addEventListener('click', resetPauseMenuUI);

    document.getElementById('do-restart-btn').addEventListener('click', () => {
        safelyClearRun(scene, activeObjects, projectiles, particles);
        activeObjects = [];
        projectiles = [];
        particles = [];
        startGame();
    });

    document.getElementById('confirm-quit-btn').addEventListener('click', showQuitConfirmMenu);
    document.getElementById('cancel-quit-btn').addEventListener('click', resetPauseMenuUI);
    document.getElementById('do-quit-btn').addEventListener('click', () => {
        safelyClearRun(scene, activeObjects, projectiles, particles);
        activeObjects = [];
        projectiles = [];
        particles = [];
        stateManager.changeState(STATES.START);
    });

    // Keyboard Pause Controls
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
            togglePause();
        }
    });

    // Auto-pause when tab is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && stateManager.getState() === STATES.PLAYING) {
            stateManager.changeState(STATES.PAUSED);
        }
    });

    // Touch / Mouse Aiming
    const touchArea = document.getElementById('mobile-control-area');

    touchArea.addEventListener('pointerdown', (e) => {
        if(stateManager.getState() !== STATES.PLAYING) return;
        isDragging = true;
        updateAim(e);
        throwProjectile();
    });

    touchArea.addEventListener('pointermove', (e) => {
        if(!isDragging || stateManager.getState() !== STATES.PLAYING) return;
        updateAim(e);
    });

    touchArea.addEventListener('pointerup', () => {
        isDragging = false;
    });
}

function updateAim(event) {
    aim.x = (event.clientX / window.innerWidth) * 2 - 1;
    aim.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function togglePause() {
    if(stateManager.getState() === STATES.PLAYING) {
        stateManager.changeState(STATES.PAUSED);
    } else if (stateManager.getState() === STATES.PAUSED) {
        stateManager.changeState(STATES.PLAYING);
    }
}

function loadData() {
    const saved = localStorage.getItem('ninjaStarBreaker3D');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            playerData = { ...playerData, ...parsed };
            // Ensure nested default settings exist if an older save was loaded
            if (!playerData.settings) {
                playerData.settings = { shake: true, move: true };
            }
        } catch (e) {
            console.error("Failed to parse save data", e);
        }
    }
}

function saveData() {
    localStorage.setItem('ninjaStarBreaker3D', JSON.stringify(playerData));
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
            geometry = new THREE.CylinderGeometry(0.01, 1, 0.2, 4);
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

// --- GAME STATE FLOW ---

function startGame() {
    stateManager.changeState(STATES.PLAYING);

    const weaponData = WEAPONS.find(w => w.id === playerData.selectedWeaponId);
    run = createRun(weaponData);

    resetGameUI(weaponData);

    // Setup Scene
    createWeaponMesh(weaponData);
    weaponMesh.position.set(0, 1.5, 0);
    camera.position.set(0, 5, 10);

    // Clear old objects
    activeObjects.forEach(obj => scene.remove(obj.mesh));
    activeObjects = [];

    // Spawn initial objects
    for(let i=0; i<3; i++) {
        spawnObject(-40 - (i * 20));
    }
}

function gameOver() {
    const newState = handleGameOver(run, playerData, playSound);
    stateManager.changeState(newState);
    saveData();
    updateUIDisplay(playerData);
}

// --- SHOP ---

function openShop() {
    stateManager.changeState(STATES.SHOP);
    document.getElementById('shop-coins').innerText = playerData.coins;
    renderShop(playerData, window.selectWeapon, window.buyWeapon);
}

function closeShop() {
    stateManager.changeState(STATES.START);
}


// --- PROJECTILE SYSTEM ---

function throwProjectile() {
    if (run.power <= 0 || stateManager.getState() !== STATES.PLAYING) return;

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
        // Random normal material (excluding boss)
        const normalMats = MATERIALS.filter(m => m.name !== 'BOSS');
        // Weight selection based on wave (later waves = harder mats)
        const maxMatIndex = Math.min(normalMats.length - 1, Math.floor(run.wave / 2));
        objData = normalMats[Math.floor(Math.random() * (maxMatIndex + 1))];
    }

    let geometry;
    switch(objData.shape) {
        case 'box': geometry = new THREE.BoxGeometry(2, 2, 2); break;
        case 'cylinder': geometry = new THREE.CylinderGeometry(1, 1, 2, 16); break;
        case 'dodecahedron': geometry = new THREE.DodecahedronGeometry(1.5); break;
        case 'boss': geometry = new THREE.OctahedronGeometry(4); break;
        default: geometry = new THREE.BoxGeometry(2, 2, 2);
    }

    const material = new THREE.MeshStandardMaterial({
        color: objData.color,
        roughness: 0.7,
        metalness: 0.1
    });

    if(isBoss) {
        material.emissive = new THREE.Color(0x330000);
        material.emissiveIntensity = 0.5;
    }

    const mesh = new THREE.Mesh(geometry, material);

    // Random X position within lane (-10 to 10)
    mesh.position.x = (Math.random() - 0.5) * 20;
    mesh.position.y = isBoss ? 4 : 1;
    mesh.position.z = zPos;

    if(isBoss) mesh.castShadow = true;

    scene.add(mesh);

    activeObjects.push({
        mesh: mesh,
        data: objData,
        hp: objData.hp,
        maxHp: objData.hp,
        z: zPos,
        x: mesh.position.x,
        isBoss: isBoss,
        isPowerup: isPowerup
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
    if (playerData.settings.shake) {
        shakeMagnitude = magnitude;
        shakeTime = time;
    }
}

// --- MAIN LOOP ---

function gameLoop() {
    const delta = clock.getDelta();

    if (stateManager.getState() === STATES.PLAYING) {
        updateGameplay(delta);

        // Update Particles (only while playing)
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
    }

    // Apply Camera Shake (can still happen during other states like gameover)
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

window.selectWeapon = function(weaponId) {
    if (playerData.unlockedWeapons.includes(weaponId)) {
        playSound('buy');
        playerData.selectedWeaponId = weaponId;
        saveData();
        renderShop(playerData, window.selectWeapon, window.buyWeapon);
    }
}

window.buyWeapon = function(weaponId, cost) {
    if (playerData.coins >= cost && !playerData.unlockedWeapons.includes(weaponId)) {
        playSound('buy');
        playerData.coins -= cost;
        playerData.unlockedWeapons.push(weaponId);
        playerData.selectedWeaponId = weaponId;
        saveData();
        renderShop(playerData, window.selectWeapon, window.buyWeapon);
    }
}

// Start everything when DOM is ready
window.onload = init;
