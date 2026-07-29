import { WEAPONS, STATES } from './constants.js';

export function updateUIDisplay(playerData) {
    document.getElementById('best-score-display').innerText = playerData.bestScore;
    document.getElementById('start-coins-display').innerText = playerData.coins;
}

export function renderShop(playerData, selectWeapon, buyWeapon) {
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
                PWR: ${w.power}
            </div>
        `;

        const btn = document.createElement('button');
        btn.className = `weapon-action-btn ${isSelected ? 'btn-selected' : isUnlocked ? 'btn-select' : 'btn-buy'}`;

        if (isSelected) {
            btn.innerText = 'Equipped';
            btn.disabled = true;
        } else if (isUnlocked) {
            btn.innerText = 'Select';
            btn.onclick = (e) => {
                e.stopPropagation();
                window.selectWeapon(w.id);
            };
        } else {
            btn.innerText = `Buy (${w.cost})`;
            btn.onclick = (e) => {
                e.stopPropagation();
                window.buyWeapon(w.id, w.cost);
            };
        }

        card.appendChild(btn);
        grid.appendChild(card);
    });
}

export function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    if (screenId) {
        document.getElementById(screenId).classList.remove('hidden');
    }
}

export function handleStateChangeUI(newState, switchScreen) {
    switch (newState) {
        case STATES.START:
            switchScreen('start-screen');
            break;
        case STATES.PLAYING:
            switchScreen('game-ui');
            break;
        case STATES.PAUSED:
            switchScreen('pause-screen');
            resetPauseMenuUI();
            break;
        case STATES.GAMEOVER:
            switchScreen('game-over-screen');
            break;
        case STATES.SHOP:
            switchScreen('shop-screen');
            break;
    }
}

export function resetPauseMenuUI() {
    document.getElementById('pause-main-menu').classList.remove('hidden');
    document.getElementById('restart-confirm-menu').classList.add('hidden');
    document.getElementById('quit-confirm-menu').classList.add('hidden');
}

export function showRestartConfirmMenu() {
    document.getElementById('pause-main-menu').classList.add('hidden');
    document.getElementById('restart-confirm-menu').classList.remove('hidden');
}

export function showQuitConfirmMenu() {
    document.getElementById('pause-main-menu').classList.add('hidden');
    document.getElementById('quit-confirm-menu').classList.remove('hidden');
}

export function showSettingsMenu() {
    document.getElementById('pause-main-menu').classList.add('hidden');
    document.getElementById('settings-menu').classList.remove('hidden');
    document.getElementById('settings-menu').style.display = 'flex';
}

export function hideSettingsMenu() {
    document.getElementById('settings-menu').classList.add('hidden');
    document.getElementById('settings-menu').style.display = 'none';
    document.getElementById('pause-main-menu').classList.remove('hidden');
}
