export const WEAPONS = [
    { id: 'ninja_star', name: 'Basic Shuriken', icon: '🥷', damage: 10, power: 100, cost: 0, color: 0x4444ff, shape: 'star', trail: 'blue' },
    { id: 'steel_star', name: 'Steel Shuriken', icon: '⚙️', damage: 25, power: 150, cost: 50, color: 0xaaaaaa, shape: 'star', trail: 'silver' },
    { id: 'fire_star', name: 'Fire Shuriken', icon: '🔥', damage: 50, power: 250, cost: 200, color: 0xff4400, shape: 'star', trail: 'orange' },
    { id: 'lightning_star', name: 'Lightning Shuriken', icon: '⚡', damage: 80, power: 400, cost: 500, color: 0x00ffff, shape: 'star', trail: 'cyan' },
    { id: 'shadow_blade', name: 'Shadow Blade', icon: '🌑', damage: 150, power: 600, cost: 1000, color: 0x8800ff, shape: 'katana', trail: 'purple' }
];

export const MATERIALS = [
    { name: 'Normal Crate', hp: 30, color: 0x8b4513, score: 10, coins: 5, shape: 'box' },
    { name: 'Golden Crate', hp: 35, color: 0xffd700, score: 25, coins: 25, shape: 'box', isGolden: true },
    { name: 'Barrel', hp: 60, color: 0x5c4033, score: 20, coins: 2, shape: 'cylinder' },
    { name: 'Stone Block', hp: 150, color: 0x888888, score: 40, coins: 5, shape: 'box' },
    { name: 'Target Dummy', hp: 300, color: 0xddaa77, score: 80, coins: 10, shape: 'cylinder' },
    { name: 'Crystal Block', hp: 600, color: 0x00ffff, score: 150, coins: 20, shape: 'dodecahedron' },
    { name: 'BOSS', hp: 2000, color: 0xff0000, score: 500, coins: 50, shape: 'boss' }
];

export const POWERUPS = [
    { type: 'damage', name: 'Red Target', color: 0xff0000, shape: 'cylinder' },
    { type: 'slow', name: 'Blue Target', color: 0x0000ff, shape: 'cylinder' }
];

export const STATES = {
    START: 0,
    PLAYING: 1,
    GAMEOVER: 2,
    SHOP: 3,
    PAUSED: 4
};
