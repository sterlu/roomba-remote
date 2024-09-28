import * as dgram from 'dgram';
import Debug from 'debug';
import {Message, MessageType, RoombaSocket} from "./common";

const debug = Debug('roomba-remote:udp');

export class RoombaUdpSocket implements RoombaSocket {
    private socket: dgram.Socket;
    private readonly ipAddress: string;
    private readonly port: number;
    private messageCallback: (msg: Message) => any;

    constructor(ipAddress: string, port: number) {
        this.ipAddress = ipAddress;
        this.port = port;
        this.socket = dgram.createSocket('udp4');
        this.messageCallback = () => null;

        // Set up event listeners
        this.socket.on('message', this.onReceive.bind(this));

        this.socket.on('error', (err) => {
            debug(`UDP receiver error:\n${err.stack}`);
            this.socket.close();
        });
    }

    public onMessage(messageCallback: (msg: Message) => any): void {
        this.messageCallback = messageCallback;
    }

    public close(): void {
        this.socket.close(() => {
            console.log('UDP receiver stopped listening');
        });
    }

    // Method to handle incoming messages
    private onReceive(data: Buffer, rinfo: dgram.RemoteInfo): void {
        if (data.toString().substring(0, 3) === 'ack') {
            debug('<- Device acknowledged bytes received:', data[3]);
            this.messageCallback({type: MessageType.Acknowledge, message: data.toString(), data});
        } else if (data.toString().substring(0, 20) === 'No reply from roomba') {
            debug('<- No reply from roomba');
            this.messageCallback({type: MessageType.Error, message: data.toString(), data});
        } else if (true) {
            debug(`<- Received ${data.length} bytes of sensor data:`, data);
            this.messageCallback({type: MessageType.SensorData, data});
        // } else {
        //     debug(`<- Received ${data.length} bytes:`, data);
        }
    }

    public sendMessage(message: Uint8Array): Promise<void> {
        return new Promise((resolve, reject) => {
            debug("Sending bytes:", message);
            this.socket.send(message, 0, message.length, this.port, this.ipAddress, (err) => {
                if (err) {
                    console.error(`Error sending command: ${err}`);
                    reject(err); // Reject the promise if there is an error
                } else {
                    resolve(); // Resolve the promise if the command was sent successfully
                    // DEV: Potentially should resolve only if device acknowledges with "ack" message
                }
            });
        });
    }
}

