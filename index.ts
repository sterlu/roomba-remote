import dgram from 'node:dgram';

const REMOTE_IP = '192.168.50.192';
const REMOTE_PORT = 2390;

const client = dgram.createSocket('udp4');

const send = (...arr: number[]) => client.send(Buffer.from(arr), REMOTE_PORT, REMOTE_IP);

send(128); // Start
// send(131); // Safe mode
// send(145, 1, 244, 1, 244) // Go
// send(173); // Stop
