import Debug from 'debug';
import {
    ControllerButton,
    ControllerInputListener,
    ControllerState,
    ControllerStateListener,
    RawState,
    Controller,
} from "./controllerButton";

const debug = Debug('roomba-remote:xbox');

/**
 * This class wraps the Windows-native Xinput API.
 * It only works via Node.js on Windows.
 */
export class Html5Gamepad implements Controller{
    static async availableControllers(): Promise<number> {
        debug('Listing connected controllers');
        const connected = navigator.getGamepads();
        const nConnected = connected.filter(a => a).length;
        debug('Connected controllers:', connected);
        return nConnected;
    }

    controllerIndex: number;
    pollHz: number;
    eventListeners: {
        state: ControllerStateListener[],
        input: ControllerInputListener[],
    };
    interval: NodeJS.Timeout = -1 as any;
    thumbDeadzone: number;
    lastState?: ControllerState;

    constructor({ controllerIndex = 0, pollHz = 30, thumbDeadzone = 0.1 }) {
        this.controllerIndex = controllerIndex;
        this.pollHz = pollHz;
        this.thumbDeadzone = thumbDeadzone;
        this.eventListeners = {
            state: [],
            input: [],
        };
    }

    on(event: 'state' | 'input', listener: ControllerStateListener | ControllerInputListener) {
        if (event !== 'state' && event !== 'input') throw new Error('Invalid event type');
        if (event === 'state') this.eventListeners[event].push(listener as ControllerStateListener);
        if (event === 'input') this.eventListeners[event].push(listener as ControllerInputListener);
    }

    startPolling() {
        const pollMs = 1000 / this.pollHz;
        this.interval = setInterval(async () => {
            const normalizedState = this.normalizeState();
            // debug(normalizedState);
            this.eventListeners.state.forEach(listener => listener(normalizedState));

            const newButtonsPressed = normalizedState.buttons.filter((button) => !this.lastState?.buttons.includes(button));
            const buttonsReleased = this.lastState?.buttons.filter((button) => !normalizedState.buttons.includes(button)) || [];
            newButtonsPressed.forEach((button) => {
                this.eventListeners.input.forEach(listener => listener({ type: 'button', button, state: 'pressed' }));
            });
            buttonsReleased.forEach((button) => {
                this.eventListeners.input.forEach(listener => listener({ type: 'button', button, state: 'released' }));
            });
            this.lastState = normalizedState;
        }, pollMs);
    }

    stopPolling() {
        clearInterval(this.interval);
    }

    normalizeState(): ControllerState {
        const gamepad = navigator.getGamepads()[this.controllerIndex]!;
        const normalizeThumb = (normalized: number) => {
            normalized = Math.abs(normalized) < this.thumbDeadzone ? 0 : normalized;
            return normalized < -1 ? -1 : normalized; // negative values go to 32768
        }
        const buttonOrder: (ControllerButton | null)[] = ['A', 'B', 'X', 'Y', 'LEFT_SHOULDER', 'RIGHT_SHOULDER', null, null, 'BACK', 'START', 'LEFT_THUMB', 'RIGHT_THUMB', 'DPAD_UP', 'DPAD_DOWN', 'DPAD_LEFT', 'DPAD_RIGHT'];
        return {
            buttons: gamepad.buttons
                .map((button, i) => button.pressed ? buttonOrder[i]! : null)
                .filter(a => a) as ControllerButton[],
            triggerLeft: gamepad.buttons[6].value,
            triggerRight: gamepad.buttons[7].value,
            thumbLeftX: normalizeThumb(gamepad.axes[0]),
            thumbLeftY: normalizeThumb(gamepad.axes[1]),
            thumbRightX: normalizeThumb(gamepad.axes[2]),
            thumbRightY: normalizeThumb(gamepad.axes[3]),
        };
    }
}
