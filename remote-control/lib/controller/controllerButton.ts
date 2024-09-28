export type ControllerButton =
    "DPAD_UP" |
    "DPAD_DOWN" |
    "DPAD_LEFT" |
    "DPAD_RIGHT" |
    "START" |
    "BACK" |
    "LEFT_THUMB" |
    "RIGHT_THUMB" |
    "LEFT_SHOULDER" |
    "RIGHT_SHOULDER" |
    "GUIDE" |
    "A" |
    "B" |
    "X" |
    "Y";
export type RawState = {
    dwPacketNumber: number;
    gamepad: {
        wButtons: number | string[];
        bLeftTrigger: number;
        bRightTrigger: number;
        sThumbLX: number;
        sThumbLY: number;
        sThumbRX: number;
        sThumbRY: number;
    };
}
export type ControllerState = {
    buttons: ControllerButton[];
    triggerLeft: number;
    triggerRight: number;
    thumbLeftX: number;
    thumbLeftY: number;
    thumbRightX: number;
    thumbRightY: number;
}
export type ControllerInputEvent = {
    type: 'button';
    button: ControllerButton;
    state: 'pressed' | 'released';
}
export type ControllerStateListener = (state: ControllerState) => any;
export type ControllerInputListener = (event: ControllerInputEvent) => any;

export interface Controller {
    on(event: 'state' | 'input', listener: ControllerStateListener | ControllerInputListener): void;
    startPolling(): void;
    stopPolling(): void;
}
