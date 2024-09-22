export enum Mode {
    // After a battery change or when power is first turned on, the OI is in “off” mode.
    // When it is off, the OI listens at the default baud rate for an OI Start command.
    Off = 'Off',

    // While in Passive mode, you can read Roomba’s sensors, watch Roomba perform a cleaning cycle, and
    // charge the battery. Roomba enters the Passive mode once it receives the "start" command.
    Passive = 'Passive',

    // Safe mode gives you full control of Roomba. If no commands are sent to the OI when in Safe mode, Roomba waits with all motors and LEDs off and
    // does not respond to button presses or other sensor input.
    Safe = 'Safe',


//     Full mode gives you complete control over Roomba, all of its actuators, and all of the safety-related conditions that are restricted when
//     the OI is in Safe mode, as Full mode shuts off the cliff, wheel-drop and internal charger safety features.
//     To put the OI back into Safe mode, you must send the Safe command.
//     If no commands are sent to the OI when in Full mode, Roomba waits with all motors and LEDs off and
//     does not respond to button presses or other sensor input.
    Full = 'Full'
}