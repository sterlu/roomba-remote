import {useEffect, useState} from 'react'
import './App.css'
import {Roomba} from '../../lib/roomba/roomba';
import {RoombaWebSocket} from '../../lib/roomba/socket/websocket';
import {Mode} from "../../lib/roomba/mode";
import {ControllerInputEvent, ControllerState} from "../../lib/controller/controllerButton";
import {Html5Gamepad} from "../../lib/controller/html5Gamepad";
import Debug from "debug";
import {wait} from "../../lib/utils.ts";

const debug = Debug('roomba-remote:html');

const REMOTE_IP = '192.168.50.192';
const REMOTE_PORT = 80;
const REMOTE_PATH = 'ws';

function App() {
    const [controllerConnected, setControllerConnected] = useState(null as string | null);
    const [sensorData, setSensorData] = useState(null as any);

    useEffect(() => {
        let socket: RoombaWebSocket;
        let roomba: Roomba;
        let controller: Html5Gamepad;

        window.addEventListener("gamepadconnected", (e) => {
            setControllerConnected(e.gamepad.id);

            socket = new RoombaWebSocket(REMOTE_IP, REMOTE_PORT, REMOTE_PATH)
            roomba = new Roomba("Boo", socket, setSensorData);

            controller = new Html5Gamepad({controllerIndex: 0, pollHz: 30});

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
                                    .then(() => wait(50))
                                    .then(() => roomba.setSafeMode());
                                break;
                            case 'X':
                                roomba.setFullMode();
                                break;
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
                if (![Mode.Safe, Mode.Full].includes(roomba.getOpMode())) return;
                const { thumbLeftX, triggerLeft, triggerRight } = state;
                const speedTrigger = triggerRight - triggerLeft;
                const speed = 500 * speedTrigger
                const diff = thumbLeftX * 500 * (speed >= 0 ? 1 : -1);
                const speedL = Math.max(-500, Math.min(500, Math.round(speed + diff)));
                const speedR = Math.max(-500, Math.min(500, Math.round(speed - diff)));
                // const radius = (1 / thumbLeftX) * 2000;
                // debug({ speed, diff, speedL, speedR });
                roomba.driveWheels(speedL, speedR);
            });
        });

        window.addEventListener("gamepaddisconnected", () => {
            setControllerConnected(null);
            controller?.stopPolling();
            socket?.close();
        });

    }, []);

    return (
        <>
            <h1>Roomba RC via WebSocket</h1>
            <div>
                Controller is {controllerConnected ? `connected (${controllerConnected})` : 'disconnected'}.
            </div>
            <div>
                <pre>
                    <code>
                        {"Sensor Data:\n"}
                        {JSON.stringify(sensorData, null, 2)}
                    </code>
                </pre>
            </div>
        </>
    )
}

export default App
