/**
 * PiicoDev Extension for MakeCode micro:bit
 * 
 * This extension provides block-based programming support for the Core Electronics
 * PiicoDev sensor ecosystem on the BBC micro:bit V2.
 * 
 * Sensor categories are organized into themed drawers:
 * - PiicoDevEnvironmental (Teal): Temperature, humidity, pressure, air quality, and light sensors
 * - PiicoDevInputs (Blue): Buttons, potentiometers, and touch sensors
 * - PiicoDevMotion (Red): Accelerometers, magnetometers, and distance sensors
 * - PiicoDevOutputs (Pink): Buzzers, LEDs, and servos
 * - PiicoDevDisplays (Purple): OLED displays for graphics and text
 * - PiicoDevComm (Orange): Wireless communication modules
 * 
 * Based on MIT-licensed PiicoDev MicroPython libraries from Core Electronics.
 * 
 * @author zarify
 * @version 0.7.1
 */

//% weight=50 color=#00A4CC icon="\uf2db" block="PiicoDev"
namespace piicodev {

    // This namespace is maintained for version information and utilities.
    // Individual sensor implementations are in category-specific namespaces.

    /**
     * Extension version information
     */
    export const VERSION = "0.7.1";

    /**
     * Check if extension is properly loaded
     */
    //% block="PiicoDev extension version"
    //% advanced=true
    //% weight=1
    export function getVersion(): string {
        return VERSION;
    }
}
