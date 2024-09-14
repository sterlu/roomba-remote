import dgram from 'node:dgram';
import {ControllerInputEvent, ControllerState, XboxController} from "./xbox";
import Debug from 'debug';

const debug = Debug('roomba-remote:main');


const REMOTE_IP = '192.168.50.192';
const REMOTE_PORT = 2390;

const client = dgram.createSocket('udp4');

const send = (...arr: number[]) => client.send(Buffer.from(arr), REMOTE_PORT, REMOTE_IP);

send(128); // Start
// send(131); // Safe mode
// send(145, 1, 244, 1, 244) // Go
// send(173); // Stop


(async () => {
    if (await XboxController.availableControllers() === 0) throw new Error('No controllers connected');

    const pollHz = 10;
    const controller = new XboxController({ controllerIndex: 0, pollHz });

    controller.startPolling();
    controller.on('input', (input: ControllerInputEvent) => {
        if (input.type === 'button') {
            if (input.state === 'pressed') {
                switch (input.button) {
                    case 'A':
                        // Roomba.clean();
                        break;
                    default:
                        break;
                }
            }
        }
    });
    controller.on('state', (state: ControllerState) => {
        const { thumbLeftX, thumbLeftY, thumbRightX, thumbRightY, triggerLeft, triggerRight } = state;
        const speedTrigger = triggerRight - triggerLeft;
        const speed = Math.max(-500, Math.min(500, Math.round(500 * speedTrigger)));
        const radius = Math.max(-2000, Math.min(2000, Math.round(2000 * thumbLeftX)));
        debug({ speed, radius });
        debug(137, speed >> 8, speed & 0xff, radius >> 8, radius & 0xff);
    });
})();
