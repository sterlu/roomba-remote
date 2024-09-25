// Robot.ts
import Debug from 'debug';
import {
    CleanCommand,
    DriveCommand,
    DriveWheelsCommand,
    FullModeCommand,
    MaxCommand,
    MotorsCommand,
    PowerCommand,
    QuerySensorCommand,
    QuerySensorsCommand,
    ResetCommand,
    SafeModeCommand,
    SeekDockCommand,
    SetDayTimeCommand,
    SpotCommand,
    StartCommand,
    StopCommand
} from './commands';
import {Command} from './command';
import {Mode} from "./mode";
import {ModeChangeCallback} from "./mode_change_callback";
import {Message, MessageType, UdpSocket} from "./udp_socket";
import {SensorData} from "./sensor_data";
import {wait} from "../utils";

const debug = Debug('roomba-remote:roomba');

export class Roomba {
    private readonly name: string;
    private socket: UdpSocket;
    private opMode: Mode;
    private readonly modeChangeCallback?: ModeChangeCallback;
    private pollQuerySensorsInterval?: NodeJS.Timeout;

    constructor(name: string, ipAddress: string, port: number, modeChangeCallback?: ModeChangeCallback) {
        this.name = name;
        this.socket = new UdpSocket(ipAddress, port, this.onMessage.bind(this));
        this.opMode = Mode.Unknown;
        this.modeChangeCallback = modeChangeCallback;
    }

    /**
     * Get the name of the roomba.
     */
    public getName(): string {
        debug(`I am ${this.name}, a roomba.`);
        return this.name;
    }

    // Clean up the UDP client
    public close(): void {
        this.socket.close();
        debug(`${this.name} roomba client closed.`);
    }

    /**
     * This command starts the OI. You must always send the Start command before sending any other
     * commands to the OI.
     *  Serial sequence: [128].
     *  Available in modes: Passive, Safe, or Full
     *  Changes mode to: Passive. Roomba beeps once to acknowledge it is starting from “off” mode.
     */
    public async start(): Promise<void> {
        const startCommand = new StartCommand();
        return this.executeCommand(startCommand)
            // Query sensor group 6 to get the current open interface mode
            .then(() => wait(50))
            .then(() => this.querySensor(6));
    }

    /**
     * This command puts the OI into Safe mode, enabling user control of Roomba. It turns off all LEDs. The OI
     * can be in Passive, Safe, or Full mode to accept this command. If a safety condition occurs (see above)
     * Roomba reverts automatically to Passive mode.
     *  Serial sequence: [131]
     *  Available in modes: Passive, Safe, or Full
     *  Changes mode to: Safe
     */
    public async setSafeMode(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot set Safe mode while in Off mode.');
            return;
        }
        const safeModeCommand = new SafeModeCommand();
        return this.executeCommand(safeModeCommand)
            // Query sensor group 6 to get the current open interface mode
            .then(() => wait(50))
            .then(() => this.querySensor(6));
    }

    public async setFullMode(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot set to Full mode while in Off mode.');
            return;
        }
        const setFullCommand = new FullModeCommand();
        return this.executeCommand(setFullCommand)
            // Query sensor group 6 to get the current open interface mode
            .then(() => wait(50))
            .then(() => this.querySensor(6));
    }

    /**
     * This command stops the OI. All streams will stop and the robot will no longer respond to commands.
     * Use this command when you are finished working with the robot.
     *  Serial sequence: [173].
     *  Available in modes: Passive, Safe, or Full
     *  Changes mode to: Off. Roomba plays a song to acknowledge it is exiting the OI.
     */
    public async stop(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot stop while in Off mode.');
            return;
        }
        const stopCommand = new StopCommand();
        return this.executeCommand(stopCommand)
            // Query sensor group 6 to get the current open interface mode
            .then(() => wait(50))
            .then(() => this.querySensor(6));
    }

    /**
     * This command resets the robot, as if you had removed and reinserted the battery.
     *  Serial sequence: [7].
     *  Available in modes: Always available.
     *  Changes mode to: Off. You will have to send [128] again to re-enter Open Interface mode.
     */
    public async reset(): Promise<void> {
        const resetCommand = new ResetCommand();
        return this.executeCommand(resetCommand);
    }

    public async powerOff(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot power off while in Off mode.');
            return;
        }
        const powerCommand = new PowerCommand();
        return this.executeCommand(powerCommand);
    }

    public async clean(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot start cleaning while in Off mode.');
            return;
        }
        const cleanCommand = new CleanCommand();
        return this.executeCommand(cleanCommand);
    }

    public async spot(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot start Spot cleaning while in Off mode.');
            return;
        }
        const spotCommand = new SpotCommand();
        return this.executeCommand(spotCommand);
    }

    public async max(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot start Max cleaning while in Off mode.');
            return;
        }
        const maxCommand = new MaxCommand();
        return this.executeCommand(maxCommand);
    }

    public async seekDock(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot seek dock while in Off mode.');
            return;
        }
        const seekDockCommand = new SeekDockCommand();
        return this.executeCommand(seekDockCommand);
    }

    public async setDayTime(date: Date): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot set day/time while in Off mode.');
            return;
        }

        const day = date.getDay(); // Day of the week (0-6)
        const hour = date.getHours(); // Hour (0-23)
        const minute = date.getMinutes(); // Minute (0-59)

        const setDayTimeCommand = new SetDayTimeCommand(day, hour, minute);
        return this.executeCommand(setDayTimeCommand);
    }

    public async motors(mainBrush: boolean, sideBrush: boolean, vacuum: boolean): Promise<void> {
        if (this.opMode === Mode.Off || this.opMode === Mode.Passive) {
            console.log('Cannot set to Full mode while in Off mode.');
            return;
        }
        const motorsCommand = new MotorsCommand(mainBrush, sideBrush, vacuum);
        return this.executeCommand(motorsCommand);
    }

    public async querySensor(packetOrGroupID: number): Promise<void> {
        const querySensorCommand = new QuerySensorCommand(packetOrGroupID);
        return this.executeCommand(querySensorCommand);
    }

    public async querySensors(): Promise<void> {
        const querySensorsCommand = new QuerySensorsCommand();
        return this.executeCommand(querySensorsCommand);
    }

    public pollQuerySensors(): void {
        if (this.pollQuerySensorsInterval) return;
        this.pollQuerySensorsInterval = setInterval(this.querySensors, 500);
    }

    public async drive(x: number, y: number): Promise<void> {
        if (this.opMode !== Mode.Safe && this.opMode !== Mode.Full) {
            console.log('Drive command is only available in Safe or Full mode.');
            return;
        }

        // Calculate velocity and radius
        const velocity = Math.round(Math.sqrt(x * x + y * y) * 500); // Magnitude of the vector, scaled
        const angle = Math.atan2(y, x); // Angle in radians

        // Calculate radius based on angle
        let radius = Math.round(Math.tan(angle) * 2000); // Convert to desired range

        // Special cases
        if (radius === 0) {
            // Handle straight drive
            radius = 32768; // 0x8000 for straight
        } else if (radius === -1) {
            // Handle turn in place clockwise
            radius = 0xFFFF; // Turn in place clockwise
        } else if (radius === 1) {
            // Handle turn in place counter-clockwise
            radius = 0x0001; // Turn in place counter-clockwise
        }

        const driveCommand = new DriveCommand(velocity, radius);
        return this.executeCommand(driveCommand);
    }

    public async driveWheels(speedLeft: number, speedRight: number): Promise<void> {
        if (this.opMode !== Mode.Safe && this.opMode !== Mode.Full) {
            console.log('Drive command is only available in Safe or Full mode.');
            return;
        }
        const driveCommand = new DriveWheelsCommand(speedLeft, speedRight);
        return this.executeCommand(driveCommand)
    }

    private setOpMode(mode: Mode): void {
        this.opMode = mode;
        if (this.modeChangeCallback) {
            this.modeChangeCallback(this.opMode); // Call the callback if provided
        }
    }

    private async executeCommand(command: Command): Promise<void> {
        try {
            await this.socket.executeCommand(command);
        } catch (error: any) {
            const e = new Error(`Failed to execute ${command.getName()} command: ${error?.message}`);
            (e as any).orriginalError = error;
            throw e;
        }
    }

    private onMessage(msg: Message): void {
        debug('Received message:', msg);
        if (msg.type === MessageType.SensorData) this.parseSensorDataMessage(msg.data);
        if (msg.type === MessageType.Error) this.setOpMode(Mode.Unknown);
    }

    private parseSensorDataMessage(data: Buffer): void {
        const sensorGroup = data[0];
        const sensorDataBytes = data.subarray(1);
        const sensorData = new SensorData(sensorDataBytes, sensorGroup);
        debug(sensorData);
        if (sensorData.openInterfaceMode) this.opMode = sensorData.openInterfaceMode;
        // TODO
    }

}
