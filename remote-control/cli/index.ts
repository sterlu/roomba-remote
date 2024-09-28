import {XboxController} from "../lib/controller/xinput";
import Debug from 'debug';
import {Roomba} from "../lib/roomba/roomba";
import {RoombaUdpSocket} from "../lib/roomba/socket/udp";
import {ControllerInputEvent, ControllerState} from "../lib/controller/controllerButton";

const debug = Debug('roomba-remote:main');

const REMOTE_IP = '192.168.50.192';
const REMOTE_PORT = 2390;

(async () => {
    if (await XboxController.availableControllers() === 0) throw new Error('No controllers connected');

    const pollHz = 10;
    const controller = new XboxController({ controllerIndex: 0, pollHz });

    const roombaSocket = new RoombaUdpSocket(REMOTE_IP, REMOTE_PORT);
    const roomba = new Roomba("Boo", roombaSocket);
    await roomba.start();
    await roomba.setSafeMode();

    controller.startPolling();
    controller.on('input', (input: ControllerInputEvent) => {
        debug(input.button, input.state);
        if (input.type === 'button') {
            if (input.state === 'pressed') {
                switch (input.button) {
                    case 'A':
                        roomba.motors(true, true, true);
                        break;
                    case 'B':
                        roomba.motors(false, false, false);
                        break;
                    case 'START':
                        roomba.start()
                            .then(() => roomba.setSafeMode());
                        break;
                    // case 'X':
                    //     roomba.setFullMode();
                    //     break;
                    case 'BACK':
                        roomba.stop();
                        break;
                    case "Y":
                        roomba.querySensor(6);
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
        // debug({ speed, diff, speedL, speedR });
        roomba.driveWheels(speedL, speedR);
    });
})();
