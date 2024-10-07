import {useEffect, useRef, useState} from 'react'
import './App.css'
import {Roomba} from '../../lib/roomba/roomba';
import {RoombaWebSocket} from '../../lib/roomba/socket/websocket';
import {Mode} from "../../lib/roomba/mode";
import {ControllerInputEvent, ControllerState} from "../../lib/controller/controllerButton";
import {Html5Gamepad} from "../../lib/controller/html5Gamepad";
import Debug from "debug";
import {wait} from "../../lib/utils.ts";

const debug = Debug('roomba-remote:html');

const REMOTE_IP = '192.168.50.234';
const REMOTE_PORT = 80;
const REMOTE_PATH = 'ws';

function App() {
    const [controllerConnected, setControllerConnected] = useState(null as string | null);
    const [sensorData, setSensorData] = useState(null as any);
    const [imageSrc, setImageSrc] = useState(null as any);
    const ledLevel = useRef(0);
    const roombaRef = useRef<Roomba | null>(null);

    useEffect(() => {
        let socket: RoombaWebSocket;
        let roomba: Roomba;
        let controller: Html5Gamepad;

        (async () => {
            console.log('starting roomba');
            socket = new RoombaWebSocket(REMOTE_IP, REMOTE_PORT, REMOTE_PATH);
            const imageDataCallback = (data: Uint8Array) => {
                setImageSrc(
                  URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }))
                );
                (roombaRef.current as Roomba).sendCustomCommand([200]);
            }
            roomba = new Roomba("Boo", socket, setSensorData, () => {}, imageDataCallback);
            roombaRef.current = roomba;

            await wait(1000);

            roomba.start();
            await wait(1000);

            // // Set Flash
            // roomba.sendCustomCommand([203, 0]);
            // await wait(1000);

            // Set quality
            roomba.sendCustomCommand([201, 40]);
            await wait(1000);

            // Set size
            roomba.sendCustomCommand([202, 1]);
            await wait(1000);

            console.log('Sending');
            roomba.sendCustomCommand([200]);
        })();

        window.addEventListener("gamepadconnected", (e) => {
            setControllerConnected(e.gamepad.id);

            socket = new RoombaWebSocket(REMOTE_IP, REMOTE_PORT, REMOTE_PATH)
            const imageDataCallback = (data: Uint8Array) => {
                setImageSrc(
                  URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }))
                );
                (roombaRef.current as Roomba).sendCustomCommand([200]);
            }
            roomba = new Roomba("Boo", socket, setSensorData, () => {}, imageDataCallback);
            roombaRef.current = roomba;

            controller = new Html5Gamepad({controllerIndex: 0, pollHz: 30});

            controller.startPolling();
            // Set quality
            roomba.sendCustomCommand([201, 40])
            .then(() => wait(1000))
            .then(() => roomba.sendCustomCommand([200]));

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
                                    .then(() => roomba.setSafeMode())
                                    .then(() => roomba.sendCustomCommand([201, 40]))
                                    .then(() => wait(1000))
                                    .then(() => roomba.sendCustomCommand([200]));
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
                            case 'DPAD_UP':
                                const levelU = Math.min(250, ledLevel.current + 50);
                                roomba.sendCustomCommand([203, levelU]);
                                ledLevel.current = levelU;
                                break;
                            case 'DPAD_DOWN':
                                const levelD = Math.max(0, ledLevel.current - 50);
                                roomba.sendCustomCommand([203, levelD]);
                                ledLevel.current = levelD;
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
                {imageSrc && <img src={imageSrc} alt="Roomba Camera" />}
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
