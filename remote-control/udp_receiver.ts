import * as dgram from 'dgram';
import {Runtime} from "node:inspector";

export class UDPReceiver {
    private socket: dgram.Socket;
    private port: number;


    constructor(port: number) {
        this.port = port;
        this.socket = dgram.createSocket('udp4');

        // Set up event listeners
        this.socket.on('message', (msg, rinfo) => {
            this.onReceive(msg, rinfo);
        });

        this.socket.on('error', (err) => {
            console.error(`UDP receiver error:\n${err.stack}`);
            this.socket.close();
        });
    }

    // Method to start listening
    public startListening(): void {
        this.socket.bind(this.port, () => {
            console.log(`UDP receiver listening on port ${this.port}`);
        });
    }

    // Method to stop listening
    public stopListening(): void {
        this.socket.close(() => {
            console.log('UDP receiver stopped listening');
        });
    }

    // Method to handle incoming messages
    private onReceive(data: Buffer, rinfo: dgram.RemoteInfo): void {
        console.log(`Received message from ${rinfo.address}:${rinfo.port}: ${data.toString()}`);
    }





    private parseBlock(block: Uint8Array[]) {
        // Implement your parsing logic here
    }
}

