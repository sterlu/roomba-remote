export class SensorData {

    // private wheelOvercurrents: WheelOvercurrents;
    // private wallDetected;
    // private int


    constructor(sensorDataBuffer: Buffer) {
        // what we receive from the roomba: 4e6f207265706c792066726f6d20726f6f6d6261

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
