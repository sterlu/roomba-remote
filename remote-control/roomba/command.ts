export abstract class Command {

    protected readonly name: string;
    protected readonly opCode: number;

    protected constructor(name: string, opCode: number) {
        this.name = name;
        this.opCode = opCode;
    }

    generateCommandBytes(): Buffer {
        const opCode = this.getOpCode();
        const dataBytes = this.generateDataBytes();
        // Combine opCode and dataBytes into a single array
        const commandArray = [opCode, ...dataBytes];
        // Create and return a Buffer from the array
        return Buffer.from(commandArray);
    }
    // Abstract method to generate data bytes for the command
    abstract generateDataBytes(): number[];

    getOpCode(): number {
        return this.opCode;
    }

    getName(): string {
        return this.name;
    }

    static toTwoByteArray(value: number): number[] {
        if (value >= 0) {
            return [value >> 8, value & 0xFF];
        } else {
            // Convert negative values to two's complement
            const unsignedValue = (value + 0x10000) & 0xFFFF;
            return [unsignedValue >> 8, unsignedValue & 0xFF];
        }
    }
}
