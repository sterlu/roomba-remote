import dgram from "dgram";

export enum MessageType {
    Acknowledge = 'ack',
    Error = 'error',
    SensorData = 'sensordata',
}

export type Message = {
    type: MessageType,
    data: Uint8Array,
    message?: string,
}

export interface RoombaSocket {
    close(): void;
    onMessage(messageCallback: (msg: Message) => any): void;
    sendMessage(message: Uint8Array): Promise<void>;
}
