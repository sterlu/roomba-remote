import {Roomba} from "./roomba/roomba";
import {ModeChangeCallback} from "./roomba/mode_change_callback";
import {Mode} from "./roomba/mode";

// Define a callback function
const handleModeChange: ModeChangeCallback = (newMode: Mode) => {
    console.log(`Mode changed to: ${newMode}`);
};
const myRoomba = new Roomba('Boomba', '192.168.50.192', 2390, handleModeChange);

// Call the methods
myRoomba.getName(); // Outputs: "I am MyRoomba, a robot."
myRoomba.start().then(r => console.log("Started"));

