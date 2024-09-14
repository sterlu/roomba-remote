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

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    if (await XboxController.availableControllers() === 0) throw new Error('No controllers connected');

    const pollHz = 10;
    const controller = new XboxController({ controllerIndex: 0, pollHz });

    send(128); // Start
    await wait(1000);
    send(131); // Safe mode
    await wait(1000);
    // // send(145, 1, 244, 1, 244) // Go

    controller.startPolling();
    controller.on('input', (input: ControllerInputEvent) => {
        debug(input.button, input.state);
        if (input.type === 'button') {
            if (input.state === 'pressed') {
                switch (input.button) {
                    case 'A':
                        // Roomba.clean();
                        send(138, 2);
                        break;
                    case 'START':
                        send(128);
                        wait(100).then(() => send(131));
                        break;
                    case 'BACK':
                        send(173);
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
        const speed = 500 * speedTrigger
        const diff = thumbLeftX * 500 * (speed >= 0 ? 1 : -1);
        const speedL = Math.max(-500, Math.min(500, Math.round(speed + diff)));
        const speedR = Math.max(-500, Math.min(500, Math.round(speed - diff)));
        // const radius = (1 / thumbLeftX) * 2000;
        debug({ speed, diff, speedL, speedR });
        // const command = [137, speed >> 8, speed & 0xff, radius >> 8, radius & 0xff];
        const command = [145, speedR >> 8, speedR & 0xff, speedL >> 8, speedL & 0xff];
        debug(command);
        send(...command);


        // const speedL = Math.max(-500, Math.min(500, Math.round(500 * thumbLeftY)));
        // const speedR = Math.max(-500, Math.min(500, Math.round(500 * thumbRightY)));
        // const command = [145, speedR >> 8, speedR & 0xff, speedL >> 8, speedL & 0xff];
        // debug(command);
        // send(...command);
    });
})();
