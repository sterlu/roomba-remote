import Debug from 'debug';
import {Roomba} from "../lib/roomba/roomba";
import {wait} from "../lib/utils";
import {RoombaUdpSocket} from "../lib/roomba/socket/udp";

const debug = Debug('roomba-remote:main');

const REMOTE_IP = '192.168.50.192';
const REMOTE_PORT = 2390;


(async () => {
    const roombaSocket = new RoombaUdpSocket(REMOTE_IP, REMOTE_PORT);
    const roomba = new Roomba("Boo", roombaSocket);
    await roomba.start();
    await wait(200);
    // send(129, 11);
    // await wait(200);

    await roomba.setSafeMode();
    await wait(200);
    debug('Getting all sensor data');
    await roomba.querySensor(6);
    await wait(1000);
    // debug('Getting specific sensor data');
    // await roomba.querySensors([3]);
    // await wait(1000);
    await roomba.stop();
    roomba.close();
})();
