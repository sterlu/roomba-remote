import dgram from 'node:dgram';
import Debug from 'debug';

const debug = Debug('roomba-remote:main');

const REMOTE_IP = '192.168.50.192';
const REMOTE_PORT = 2390;

const client = dgram.createSocket('udp4');

const send = (...arr: number[]) => {
    client.send(Buffer.from(arr), REMOTE_PORT, REMOTE_IP, (err, bytes) => {
        if (err) console.error(err);
        debug('-> Sent bytes:', bytes);
    });
}

client.on('message', (msg, rinfo) => {
    if (msg.toString().substring(0, 3) === 'ack') {
        debug('<- Device acknowledged bytes received:', msg[3]);
    } else if (msg.toString().substring(0, 20) === 'No reply from roomba') {
        debug('<- No reply from roomba');
    } else {
        debug(`<- Received ${msg.length} bytes:`, msg);
    }
});

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    send(128); // Start
    await wait(200);
    // send(129, 11);
    // await wait(200);
    // send(131); // Safe mode
    // await wait(200);
    debug('Getting all sensor data');
    send(142, 6);
    await wait(1000);
    debug('Getting specific sensor data');
    send(149, 1, 3);
    await wait(1000);
    // send(142, 0);
    // await wait(1000);
    // send(142, 100);
    // await wait(1000);
    send(173); // Stop
    client.close();
})();
