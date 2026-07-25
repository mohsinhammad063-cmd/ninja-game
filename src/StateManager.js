import { STATES } from './constants.js';

class StateManager {
    constructor() {
        this.currentState = STATES.START;
        this.previousState = null;
        this.shopReturnState = STATES.START;
        this.listeners = [];
    }

    getState() {
        return this.currentState;
    }

    openShop(originState) {
        if (originState === STATES.START || originState === STATES.PAUSED || originState === STATES.GAMEOVER) {
            this.shopReturnState = originState;
        } else {
            this.shopReturnState = STATES.START;
        }
        this.changeState(STATES.SHOP);
    }

    closeShop() {
        this.changeState(this.shopReturnState);
    }

    changeState(newState) {
        if (this.currentState === newState) return;

        const previousState = this.currentState;
        this.previousState = previousState;
        this.currentState = newState;

        // Notify listeners of state change
        this.listeners.forEach(listener => listener(newState, previousState));
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }
}

export const stateManager = new StateManager();
