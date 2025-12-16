/**
 * PiicoDev Extension for MakeCode micro:bit
 * 
 * This extension provides block-based programming support for the Core Electronics
 * PiicoDev sensor ecosystem on the BBC micro:bit V2.
 * 
 * Based on MIT-licensed PiicoDev MicroPython libraries from Core Electronics.
 * 
 * @author zarify
 * @version 0.6.0
 */

//% weight=50 color=#00A4CC icon="\uf2db" block="PiicoDev"
namespace piicodev {

    // This is the main entry point namespace for all PiicoDev sensors.
    // Individual sensor implementations are in separate files.

    /**
     * Extension version information
     */
    export const VERSION = "0.6.0";

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
