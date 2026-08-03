import { WEAPONS, STATES, POWERUPS, MATERIALS } from './constants.js';
import { playSound } from './audio.js';
import { updateUIDisplay, renderShop, switchScreen } from './UIManager.js';

export function createRun(weaponData) {
    return {
        score: 0,
        coins: 0,
        distanceTraveled: 0,
        objectsBroken: 0,
        speed: 40,
        wave: 0, // Starts at 0, first transition makes it 1
        waveTransitionTimer: 0,
        combo: 0,
        comboTimer: 0,
        damageMultiplier: 1,
        speedMultiplier: 1,
        powerupTimer: 0,
        power: weaponData.power,
        maxPower: weaponData.power
    };
}

export function resetGameUI(weaponData) {
    document.getElementById('ui-wave').innerText = '1';
    document.getElementById('ui-score').innerText = '0';
    document.getElementById('ui-coins').innerText = '0';
    document.getElementById('ui-weapon-name').innerText = weaponData.name;
    document.getElementById('boss-warning').classList.add('hidden');
    document.getElementById('combo-display').classList.add('hidden');
    document.getElementById('power-bar-fill').style.width = '100%';
}

export function handleGameOver(run, playerData, playSound) {
    playSound('hit');

    // Update Stats
    if (run.score > playerData.bestScore) {
        playerData.bestScore = run.score;
    }
    playerData.coins += run.coins;

    document.getElementById('go-score').innerText = run.score;
    document.getElementById('go-coins').innerText = run.coins;

    return STATES.GAMEOVER;
}

export function safelyClearRun(scene, activeObjects, projectiles, particles) {
    // Clear active objects
    activeObjects.forEach(obj => {
        scene.remove(obj.mesh);
        obj.mesh.geometry.dispose();
        obj.mesh.material.dispose();
    });

    // Clear projectiles
    projectiles.forEach(proj => {
        scene.remove(proj.mesh);
        proj.mesh.geometry.dispose();
        proj.mesh.material.dispose();
    });

    // Clear particles
    particles.forEach(p => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
    });

    // Arrays must be emptied by the caller or we can return empty arrays to them
}
