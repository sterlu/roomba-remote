import {Command} from "./command";

export class StartCommand extends Command {

    private static readonly opCode: number = 128;
    private static readonly cmdName: string = "START";

    constructor() {
        super(StartCommand.cmdName, StartCommand.opCode);
    }

    generateDataBytes(): number[] {
        return [];
    }
}

export class ResetCommand extends Command {

    private static readonly opCode: number = 7;
    private static readonly cmdName: string = "RESET";

    constructor() {
        super(ResetCommand.cmdName, ResetCommand.opCode);
    }

    generateDataBytes(): number[] {
        return [];
    }

}

export class StopCommand extends Command {

    private static readonly opCode: number = 173;
    private static readonly cmdName: string = "STOP";

    constructor() {
        super(StopCommand.cmdName, StopCommand.opCode);
    }

    generateDataBytes(): number[] {
        return [];
    }

}

export class SafeModeCommand extends Command {

    private static readonly opCode: number = 131;
    private static readonly cmdName: string = "SAFE";

    constructor() {
        super(SafeModeCommand.cmdName, SafeModeCommand.opCode);
    }

    generateDataBytes(): number[] {
        return [];
    }

}

export class FullModeCommand extends Command {

    private static readonly opCode: number = 132;
    private static readonly cmdName: string = "FULL";

    constructor() {
        super(FullModeCommand.cmdName, FullModeCommand.opCode);
    }

    generateDataBytes(): number[] {
        return [];
    }

}

export class CleanCommand extends Command {
    private static readonly opCode: number = 135;
    private static readonly cmdName: string = "CLEAN";

    constructor() {
        super(CleanCommand.cmdName, CleanCommand.opCode);
    }

    generateDataBytes(): number[] {
        return [];
    }
}

export class SpotCommand extends Command {
    private static readonly opCode: number = 134;
    private static readonly cmdName: string = "SPOT";

    constructor() {
        super(SpotCommand.cmdName, SpotCommand.opCode);
    }

    generateDataBytes(): number[] {
        return [];
    }
}

export class MaxCommand extends Command {
    private static readonly opCode: number = 136;
    private static readonly cmdName: string = "MAX";

    constructor() {
        super(MaxCommand.cmdName, MaxCommand.opCode);
    }

    generateDataBytes(): number[] {
        return [];
    }
}

export class SeekDockCommand extends Command {
    private static readonly opCode: number = 143;
    private static readonly cmdName: string = "SEEK_DOCK";

    constructor() {
        super(SeekDockCommand.cmdName, SeekDockCommand.opCode);
    }

    generateDataBytes(): number[] {
        return [];
    }
}

export class PowerCommand extends Command {
    private static readonly opCode: number = 133;
    private static readonly cmdName: string = "POWER";

    constructor() {
        super(PowerCommand.cmdName, PowerCommand.opCode);
    }

    generateDataBytes(): number[] {
        return [];
    }
}

export class SetDayTimeCommand extends Command {
    private static readonly opCode: number = 168;
    private static readonly cmdName: string = "SET_DAY_TIME";
    private readonly day: number;
    private readonly hour: number;
    private readonly minute: number;

    constructor(day: number, hour: number, minute: number) {
        super(SetDayTimeCommand.cmdName, SetDayTimeCommand.opCode);
        this.day = day;
        this.hour = hour;
        this.minute = minute;
    }

    public generateDataBytes(): number[] {
        return [this.day, this.hour, this.minute];
    }
}

export class DriveCommand extends Command {
    private static readonly opCode: number = 137;
    private static readonly cmdName: string = "DRIVE";
    private velocity: number;
    private radius: number;

    constructor(velocity: number, radius: number) {
        super(DriveCommand.cmdName, DriveCommand.opCode);
        this.velocity = velocity;
        this.radius = radius;
    }

    private toTwoByteArray(value: number): number[] {
        if (value >= 0) {
            return [value >> 8, value & 0xFF];
        } else {
            // Convert negative values to two's complement
            const unsignedValue = (value + 0x10000) & 0xFFFF;
            return [unsignedValue >> 8, unsignedValue & 0xFF];
        }
    }

    public generateDataBytes(): number[] {
        // Convert velocity and radius to two-byte arrays
        const velocityBytes = this.toTwoByteArray(this.velocity);
        const radiusBytes = this.toTwoByteArray(this.radius);

        return [...velocityBytes, ...radiusBytes];
    }
}
