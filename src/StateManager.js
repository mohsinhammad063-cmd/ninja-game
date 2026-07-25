import { STATES } from './constants.js';

class StateManager {
    constructor() {
        this.currentState = STATES.START;
        this.listeners = [];
    }

    getState() {
        return this.currentState;
    }

    changeState(newState) {
        if (this.currentState === newState) return;

        const previousState = this.currentState;
        this.currentState = newState;

        // Notify listeners of state change
        this.listeners.forEach(listener => listener(newState, previousState));
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }
}

export const stateManager = new StateManager();
