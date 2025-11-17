/**
 * PiicoDev CAP1203 Capacitive Touch Sensor
 * 
 * 3-pad capacitive touch sensor with configurable sensitivity and touch modes.
 */

//% weight=80 color=#FFA500 icon="\uf25a"
namespace piicodev {

    /**
     * Touch detection mode
     */
    export enum TouchMode {
        //% block="single"
        Single,
        //% block="multi"
        Multi
    }

    /**
     * CAP1203 Touch Sensor class
     */
    export class CAP1203 {
        private addr: number;
        private mode: TouchMode;
        private sensitivity: number;

        constructor(mode: TouchMode = TouchMode.Multi, sensitivity: number = 3, address: number = 0x28) {
            this.addr = address;
            this.mode = mode;
            this.sensitivity = sensitivity;

            // TODO: Initialize sensor with mode and sensitivity settings
            // This will be implemented in Phase 3
        }

        /**
         * Check if a specific touch pad is currently pressed
         * @param pad Pad number (1, 2, or 3)
         */
        //% blockId=cap1203_is_pressed
        //% block="$this is pad $pad pressed?"
        //% pad.min=1 pad.max=3 pad.defl=1
        //% weight=100
        isPadPressed(pad: number): boolean {
            // TODO: Implement touch detection
            return false;
        }

        /**
         * Get raw touch value (delta count) for a pad
         * @param pad Pad number (1, 2, or 3)
         */
        //% blockId=cap1203_read_raw
        //% block="$this pad $pad raw value"
        //% pad.min=1 pad.max=3 pad.defl=1
        //% weight=99
        readRawValue(pad: number): number {
            // TODO: Implement raw value reading
            return 0;
        }

        /**
         * Set touch sensitivity (0 = most sensitive, 7 = least sensitive)
         */
        //% blockId=cap1203_set_sensitivity
        //% block="$this set sensitivity $level"
        //% level.min=0 level.max=7 level.defl=3
        //% advanced=true
        //% weight=50
        setSensitivity(level: number): void {
            // TODO: Implement sensitivity configuration
            this.sensitivity = level;
        }

        /**
         * Clear touch interrupt
         */
        //% blockId=cap1203_clear_interrupt
        //% block="$this clear interrupt"
        //% advanced=true
        //% weight=49
        clearInterrupt(): void {
            // TODO: Implement interrupt clearing
        }
    }

    /**
     * Create a new CAP1203 touch sensor instance
     */
    //% blockId=create_cap1203
    //% block="create CAP1203 touch sensor||mode $mode|sensitivity $sensitivity|address $address"
    //% blockSetVariable=touchSensor
    //% mode.defl=TouchMode.Multi
    //% sensitivity.defl=3 sensitivity.min=0 sensitivity.max=7
    //% address.defl=0x28
    //% weight=80
    //% expandableArgumentMode="toggle"
    //% inlineInputMode=inline
    export function createCAP1203(mode?: TouchMode, sensitivity?: number, address?: number): CAP1203 {
        if (mode === undefined) mode = TouchMode.Multi;
        if (sensitivity === undefined) sensitivity = 3;
        if (address === undefined) address = 0x28;
        return new CAP1203(mode, sensitivity, address);
    }
}
