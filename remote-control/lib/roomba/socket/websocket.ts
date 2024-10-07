import Debug from 'debug';
import {Message, MessageType, RoombaSocket} from "./common";

const debug = Debug('roomba-remote:ws');

export class RoombaWebSocket implements RoombaSocket {
    private socket: WebSocket;
    private readonly ipAddress: string;
    private readonly port: number;
    private messageCallback: (msg: Message) => any;

    constructor(ipAddress: string, port: number, path = '') {
        this.ipAddress = ipAddress;
        this.port = port;
        this.socket = new WebSocket(`ws://${ipAddress}:${port}/${path}`);
        this.messageCallback = () => null;

        // Set up event listeners
        this.socket.onmessage = this.onReceive.bind(this);

        this.socket.onerror = (err: any) => {
            debug(`WebSocket receiver error:\n${err}`);
            this.socket.close();
        };
    }

    public onMessage(messageCallback: (msg: Message) => any): void {
        this.messageCallback = messageCallback;
    }

    public close(): void {
        this.socket.close(1000);
    }

    // Method to handle incoming messages
    private async onReceive(event: MessageEvent): Promise<void> {
        // if (!event.data.arrayBuffer) {
        //     debug('<- No reply from roomba');
        //     this.messageCallback({type: MessageType.Error, message: (event as MessageEvent<String>).data as string, data: new Uint8Array()});
        //     return;
        // }
        const data = new Uint8Array(await (event as MessageEvent<Blob>).data.arrayBuffer());
        if (data[0] === 255 && data[1] === 216) {
            debug('<- Received image data, length:', data.length);
            this.messageCallback({type: MessageType.Image, data});
            return;
        }
        const dataString = String.fromCharCode(...data);
        if (dataString.substring(0, 3) === 'ack') {
            debug('<- Device acknowledged bytes received:', data[3]);
            this.messageCallback({type: MessageType.Acknowledge, message: dataString, data});
        } else if (dataString.substring(0, 20) === 'No reply from roomba') {
            debug('<- No reply from roomba');
            this.messageCallback({type: MessageType.Error, message: dataString, data});
        } else if (dataString.substring(0, 26) === 'Error getting frame buffer') {
            debug('<- Error getting frame buffer');
            this.messageCallback({type: MessageType.Error, message: dataString, data});
        } else if (true) {
            // TODO Prefix sensor data with packet ID
            debug(`<- Received ${data.length} bytes of sensor data:`, data);
            this.messageCallback({type: MessageType.SensorData, data});
        // } else {
        //     debug(`<- Received ${data.length} bytes:`, data);
        }
    }

    public async sendMessage(message: Uint8Array): Promise<void> {
        this.socket.send(message);
    }
}

