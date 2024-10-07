import Debug from 'debug';
import {Mode} from "./mode";

const debug = Debug('roomba-remote:sensor');

const SENSOR_GROUPS = {
    0: {id: 0, length: 26, start: 7, end: 26},
    1: {id: 1, length: 10, start: 7, end: 16},
    2: {id: 2, length: 6, start: 17, end: 20},
    3: {id: 3, length: 10, start: 21, end: 26},
    4: {id: 4, length: 14, start: 27, end: 34},
    5: {id: 5, length: 12, start: 35, end: 42},
    6: {id: 6, length: 52, start: 7, end: 42},
    100: {id: 100, length: 80, start: 7, end: 58},
    101: {id: 101, length: 28, start: 43, end: 58},
    106: {id: 106, length: 12, start: 46, end: 51},
    107: {id: 107, length: 9, start: 54, end: 58},
}

const PACKET_ID_TO_INFO: { [key: number]: { description: string, byteLength: number } } = {
    7: {description: 'Bumps Wheeldrops', byteLength: 1},
    8: {description: 'Wall', byteLength: 1},
    9: {description: 'Cliff Left', byteLength: 1},
    10: {description: 'Cliff Front Left', byteLength: 1},
    11: {description: 'Cliff Front Right', byteLength: 1},
    12: {description: 'Cliff Right', byteLength: 1},
    13: {description: 'Virtual Wall', byteLength: 1},
    14: {description: 'Overcurrents', byteLength: 1},
    15: {description: 'Dirt Detect', byteLength: 1},
    16: {description: 'Unused', byteLength: 1},
    17: {description: 'Infrared Opcode', byteLength: 1},
    18: {description: 'Buttons', byteLength: 1},
    19: {description: 'Distance', byteLength: 2},
    20: {description: 'Angle', byteLength: 2},
    21: {description: 'Charging State', byteLength: 1},
    22: {description: 'Voltage', byteLength: 2},
    23: {description: 'Current', byteLength: 2},
    24: {description: 'Temperature', byteLength: 1},
    25: {description: 'Battery Charge', byteLength: 2},
    26: {description: 'Battery Capacity', byteLength: 2},
    27: {description: 'Wall Signal', byteLength: 2},
    28: {description: 'Cliff Left Signal', byteLength: 2},
    29: {description: 'Cliff Front Left Signal', byteLength: 2},
    30: {description: 'Cliff Front Right Signal', byteLength: 2},
    31: {description: 'Cliff Right Signal', byteLength: 2},
    32: {description: 'Unused', byteLength: 1},
    33: {description: 'Unused', byteLength: 2},
    34: {description: 'Charger Available', byteLength: 1},
    35: {description: 'Open Interface Mode', byteLength: 1},
    36: {description: 'Song Number', byteLength: 1},
    37: {description: 'Song Playing?', byteLength: 1},
    38: {description: 'Oi Stream Num Packets', byteLength: 1},
    39: {description: 'Velocity', byteLength: 2},
    40: {description: 'Radius', byteLength: 2},
    41: {description: 'Velocity Right', byteLength: 2},
    42: {description: 'Velocity Left', byteLength: 2},
    43: {description: 'Encoder Counts Left', byteLength: 2},
    44: {description: 'Encoder Counts Right', byteLength: 2},
    45: {description: 'Light Bumper', byteLength: 1},
    46: {description: 'Light Bump Left', byteLength: 2},
    47: {description: 'Light Bump Front Left', byteLength: 2},
    48: {description: 'Light Bump Center Left', byteLength: 2},
    49: {description: 'Light Bump Center Right', byteLength: 2},
    50: {description: 'Light Bump Front Right', byteLength: 2},
    51: {description: 'Light Bump Right', byteLength: 2},
    52: {description: 'Infrared Opcode Left', byteLength: 1},
    53: {description: 'Infrared Opcode Right', byteLength: 1},
    54: {description: 'Left Motor Current', byteLength: 2},
    55: {description: 'Right Motor Current', byteLength: 2},
    56: {description: 'Main Brush Current', byteLength: 2},
    57: {description: 'Side Brush Current', byteLength: 2},
    58: {description: 'Stasis', byteLength: 1}
};


export class SensorData {

    public wheelOvercurrents?: WheelOvercurrents;
    public openInterfaceMode?: Mode;
    // private wallDetected;
    // private int


    constructor(sensorData: Uint8Array, sensorGroup: number) {
        if (!(sensorGroup in SENSOR_GROUPS)) throw new Error(`Invalid sensor group ${sensorGroup}`);
        const sensorGroupData = SENSOR_GROUPS[sensorGroup as (keyof typeof SENSOR_GROUPS)];
        let bytesRead = 0;
        for (let packetId = sensorGroupData.start; packetId <= sensorGroupData.end; packetId++) {
            const packetInfo = PACKET_ID_TO_INFO[packetId];
            const packet = sensorData.subarray(bytesRead, bytesRead + packetInfo.byteLength)
            // debug(packetId, packet, packetInfo);
            if (packetInfo.description === 'Overcurrents') {
                this.wheelOvercurrents = new WheelOvercurrents(packet[0]);
            }
            if (packetInfo.description === 'Open Interface Mode') {
                // Roomba seems to return 2 for passive, 3 for safe, and 4 for full mode
                // even though documentation says 1, 2, 3
                this.openInterfaceMode = ([
                    Mode.Unknown, Mode.Off, Mode.Passive, Mode.Safe, Mode.Full
                ] as const)[packet[0] as 0 | 1 | 2 | 3 | 4];
                debug('Open Interface Mode', packet[0], this.openInterfaceMode);
            }
            if (packetInfo.description === 'Voltage') {
                debug('Voltage', ((packet[0] << 8) + packet[1]) / 1000, 'V');
            }
            // if (packetInfo.description === 'Current') {
            //     // Need to parse signed int differently
            //     debug('Current', (packet[0] << 8) + packet[1], packet);
            // }
            if (packetInfo.description === 'Battery Charge') {
                debug('Battery Charge', (packet[0] << 8) + packet[1], 'mAh');
            }
            if (packetInfo.description === 'Battery Capacity') {
                debug('Battery Capacity', (packet[0] << 8) + packet[1], 'mAh');
            }
            if (packetInfo.description === 'Temperature') {
                debug('Temperature', packet[0], 'C');
            }
            bytesRead += packetInfo.byteLength;
        }
        debug('Bytes read', bytesRead);
    }


}

export class WheelOvercurrents {

    public static readonly packetID = 14;

    public sideBrush: boolean;
    public mainBrush: boolean;
    public wheelRight: boolean;
    public wheelLeft: boolean;

    constructor(dataByte: number) {
        // Extract bits using bitwise operations
        this.sideBrush = (dataByte & 0b00000001) !== 0; // Bit 0
        this.mainBrush = (dataByte & 0b00000010) !== 0;  // Bit 1
        this.wheelRight = (dataByte & 0b00000100) !== 0; // Bit 2
        this.wheelLeft = (dataByte & 0b00001000) !== 0;  // Bit 3
    }
}

export class BumpsAndWheelDrops {

    public static readonly packetID = 7;

    public bumpRight: boolean;
    public bumpLeft: boolean;
    public wheelDropRight: boolean;
    public wheelDropLeft: boolean;

    constructor(dataByte: number) {
        // Extract bits using bitwise operations
        this.bumpRight = (dataByte & 0b00000001) !== 0; // Bit 0
        this.bumpLeft = (dataByte & 0b00000010) !== 0;  // Bit 1
        this.wheelDropRight = (dataByte & 0b00000100) !== 0; // Bit 2
        this.wheelDropLeft = (dataByte & 0b00001000) !== 0;  // Bit 3
    }
}
