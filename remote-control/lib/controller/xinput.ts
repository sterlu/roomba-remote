import {getState, listConnected} from "xinput-ffi";
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
export class XboxController implements Controller{
    static async availableControllers(): Promise<number> {
        debug('Listing connected controllers');
        const connected = await listConnected();
        const nConnected = connected.filter(a => a).length;
        debug('Connected controllers:', connected);
        return nConnected;
    }

    dwUserIndex: number;
    pollHz: number;
    eventListeners: {
        state: ControllerStateListener[],
        input: ControllerInputListener[],
    };
    interval: NodeJS.Timeout = -1 as any;
    thumbDeadzone: number;
    lastState?: ControllerState;

    constructor({ controllerIndex = 0, pollHz = 30, thumbDeadzone = 0.1 }) {
        this.dwUserIndex = controllerIndex;
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
            // debug(await getButtonsDown({ gamepad: this.dwUserIndex }));
            const state = await getState({
                dwUserIndex: this.dwUserIndex,
            });
            const normalizedState = this.normalizeState(state);
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

    normalizeState(rawState: RawState): ControllerState {
        const thumbMax = 32767;
        const triggerMax = 255;
        const normalizeThumb = (value: number) => {
            let normalized = value / thumbMax;
            normalized = Math.abs(normalized) < this.thumbDeadzone ? 0 : normalized;
            return normalized < -1 ? -1 : normalized; // negative values go to 32768
        }
        return {
            buttons: (rawState.gamepad.wButtons as string[])
                .map((b) => b.replace('XINPUT_GAMEPAD_', '') as ControllerButton),
            triggerLeft: rawState.gamepad.bLeftTrigger / triggerMax,
            triggerRight: rawState.gamepad.bRightTrigger / triggerMax,
            thumbLeftX: normalizeThumb(rawState.gamepad.sThumbLX),
            thumbLeftY: normalizeThumb(rawState.gamepad.sThumbLY),
            thumbRightX: normalizeThumb(rawState.gamepad.sThumbRX),
            thumbRightY: normalizeThumb(rawState.gamepad.sThumbRY),
        };
    }
}
