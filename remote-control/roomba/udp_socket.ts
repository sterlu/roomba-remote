import * as dgram from 'dgram';
import Debug from 'debug';
import {Command} from "./command";

const debug = Debug('roomba-remote:udp');

export enum MessageType {
    Acknowledge = 'ack',
    Error = 'error',
    SensorData = 'sensordata',
}

export type Message = {
    type: MessageType,
    data: Buffer,
    message?: string,
}

export class UdpSocket {
    private socket: dgram.Socket;
    private readonly ipAddress: string;
    private readonly port: number;
    private readonly messageCallback: (msg: Message) => any;

    constructor(ipAddress: string, port: number, messageCallback: (msg: Message) => any) {
        this.ipAddress = ipAddress;
        this.port = port;
        this.socket = dgram.createSocket('udp4');
        this.messageCallback = messageCallback;

        // Set up event listeners
        this.socket.on('message', this.onReceive.bind(this));

        this.socket.on('error', (err) => {
            debug(`UDP receiver error:\n${err.stack}`);
            this.socket.close();
        });
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
        } else if (true) { // TODO Add packet prefix to identify sensor data
            debug(`<- Received ${data.length} bytes of sensor data:`, data);
            this.messageCallback({type: MessageType.SensorData, data});
        // } else {
        //     debug(`<- Received ${data.length} bytes:`, data);
        }
    }

    public executeCommand(command: Command): Promise<void> {
        return new Promise((resolve, reject) => {
            const buffer = command.generateCommandBytes();
            debug("Sending: " + command.getName() + " bytes: " + [...buffer]);

            this.socket.send(buffer, 0, buffer.length, this.port, this.ipAddress, (err) => {
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

