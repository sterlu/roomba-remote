// Robot.ts
import dgram from "node:dgram";
import {
    CleanCommand, DriveCommand,
    FullModeCommand,
    MaxCommand, PowerCommand,
    ResetCommand,
    SafeModeCommand, SeekDockCommand, SetDayTimeCommand,
    SpotCommand,
    StartCommand,
    StopCommand
} from './commands';
import { Command } from './command';
import {Mode} from "./mode";
import {ModeChangeCallback} from "./mode_change_callback";

export class Roomba {
    private readonly name: string;
    private readonly ipAddress: string;
    private readonly port: number;
    private client: dgram.Socket;
    private opMode: Mode;
    private readonly modeChangeCallback?: ModeChangeCallback;

    constructor(name: string, ipAddress: string, port: number, modeChangeCallback?: ModeChangeCallback) {
        this.name = name;
        this.ipAddress = ipAddress;
        this.port = port;
        this.client = dgram.createSocket('udp4');
        this.opMode = Mode.Off;
        this.modeChangeCallback = modeChangeCallback;
    }

    /**
     * Get the name of the roomba.
     */
    public getName(): string {
        console.log(`I am ${this.name}, a roomba.`);
        return this.name;
    }

    // Clean up the UDP client
    public close(): void {
        this.client.close();
        console.log(`${this.name} roomba client closed.`);
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
        try {
            const success = await this.executeCommand(startCommand);
            if (success) {
                this.setOpMode(Mode.Passive);
            } else {
                console.error('Failed to start the Roomba.');
            }
        } catch (error) {
            console.error('Exception occurred while starting the Roomba:', error);
        }
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
        try {
            const success = await this.executeCommand(safeModeCommand);
            if (success) {
                this.setOpMode(Mode.Safe);
            } else {
                console.error('Failed to set Safe mode.');
            }
        } catch (error) {
            console.error('Exception occurred while setting Safe mode:', error);
        }
    }

    public async clean(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot start cleaning while in Off mode.');
            return;
        }
        const cleanCommand = new CleanCommand();
        try {
            const success = await this.executeCommand(cleanCommand);
            if (success) {
                this.setOpMode(Mode.Passive);
            } else {
                console.error('Failed to start cleaning.');
            }
        } catch (error) {
            console.error('Exception occurred while starting cleaning:', error);
        }
    }

    public async max(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot start Max cleaning while in Off mode.');
            return;
        }
        const maxCommand = new MaxCommand();
        try {
            const success = await this.executeCommand(maxCommand);
            if (success) {
                this.setOpMode(Mode.Passive);
            } else {
                console.error('Failed to start Max cleaning.');
            }
        } catch (error) {
            console.error('Exception occurred while starting Max cleaning:', error);
        }
    }

    public async spot(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot start Spot cleaning while in Off mode.');
            return;
        }
        const spotCommand = new SpotCommand();
        try {
            const success = await this.executeCommand(spotCommand);
            if (success) {
                this.setOpMode(Mode.Passive);
            } else {
                console.error('Failed to start Spot cleaning.');
            }
        } catch (error) {
            console.error('Exception occurred while starting Spot cleaning:', error);
        }
    }

    public async seekDock(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot seek dock while in Off mode.');
            return;
        }
        const seekDockCommand = new SeekDockCommand();
        try {
            const success = await this.executeCommand(seekDockCommand);
            if (success) {
                this.setOpMode(Mode.Passive);
            } else {
                console.error('Failed to seek dock.');
            }
        } catch (error) {
            console.error('Exception occurred while seeking dock:', error);
        }
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
        try {
            const success = await this.executeCommand(setDayTimeCommand);
            if (success) {
                console.log(`Day/Time set to ${date}`);
            } else {
                console.error('Failed to set day/time.');
            }
        } catch (error) {
            console.error('Exception occurred while setting day/time:', error);
        }
    }

    public async power(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot power off while in Off mode.');
            return;
        }
        const powerCommand = new PowerCommand();
        try {
            const success = await this.executeCommand(powerCommand);
            if (success) {
                this.setOpMode(Mode.Passive);
            } else {
                console.error('Failed to power off.');
            }
        } catch (error) {
            console.error('Exception occurred while powering off:', error);
        }
    }

    /**
     * This command resets the robot, as if you had removed and reinserted the battery.
     *  Serial sequence: [7].
     *  Available in modes: Always available.
     *  Changes mode to: Off. You will have to send [128] again to re-enter Open Interface mode.
     */
    public async reset(): Promise<void> {
        const resetCommand = new ResetCommand();
        try {
            const success = await this.executeCommand(resetCommand);
            if (success) {
                this.setOpMode(Mode.Off);
            } else {
                console.error('Failed to reset the Roomba.');
            }
        } catch (error) {
            console.error('Exception occurred while resetting the Roomba:', error);
        }
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
        try {
            const success = await this.executeCommand(stopCommand);
            if (success) {
                this.setOpMode(Mode.Off);
            } else {
                console.error('Failed to stop the Roomba.');
            }
        } catch (error) {
            console.error('Exception occurred while stopping the Roomba:', error);
        }
    }

    public async setFullMode(): Promise<void> {
        if (this.opMode === Mode.Off) {
            console.log('Cannot set to Full mode while in Off mode.');
            return;
        }
        const setFullCommand = new FullModeCommand();
        try {
            const success = await this.executeCommand(setFullCommand);
            if (success) {
                this.setOpMode(Mode.Off);
            } else {
                console.error('Failed to stop the Roomba.');
            }
        } catch (error) {
            console.error('Exception occurred while stopping the Roomba:', error);
        }
    }

    public drive(x: number, y: number): void {
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
        this.executeCommand(driveCommand)
            .then(success => {
                if (success) {
                    console.log(`Driving with velocity ${velocity} mm/s and radius ${radius} mm.`);
                } else {
                    console.error('Failed to execute drive command.');
                }
            })
            .catch(error => {
                console.error('Exception occurred while executing drive command:', error);
            });
    }


    private setOpMode(mode: Mode): void {
        this.opMode = mode;
        if (this.modeChangeCallback) {
            this.modeChangeCallback(this.opMode); // Call the callback if provided
        }
    }

    private executeCommand(command: Command): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const buffer = command.generateCommandBytes();
            console.log("Sending: " + command.getName() + " bytes: " + buffer.toString('hex'));

            this.client.send(buffer, 0, buffer.length, this.port, this.ipAddress, (err) => {
                if (err) {
                    console.error(`Error sending command: ${err}`);
                    reject(err); // Reject the promise if there is an error
                } else {
                    console.log(`Command sent to ${this.ipAddress}:${this.port}`);
                    resolve(true); // Resolve the promise if the command was sent successfully
                }
            });
        });
    }


}