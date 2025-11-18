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
    class CAP1203 {
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
        //% block="CAP1203 is pad $pad pressed?"
        //% pad.min=1 pad.max=3 pad.defl=1
        //% weight=100
        public isPadPressed(pad: number): boolean {
            // TODO: Implement touch detection
            return false;
        }

        /**
         * Get raw touch value (delta count) for a pad
         * @param pad Pad number (1, 2, or 3)
         */
        //% blockId=cap1203_read_raw
        //% block="CAP1203 pad $pad raw value"
        //% pad.min=1 pad.max=3 pad.defl=1
        //% weight=99
        public readRawValue(pad: number): number {
            // TODO: Implement raw value reading
            return 0;
        }

        /**
         * Set touch sensitivity (0 = most sensitive, 7 = least sensitive)
         */
        //% blockId=cap1203_set_sensitivity
        //% block="CAP1203 set sensitivity $level"
        //% level.min=0 level.max=7 level.defl=3
        //% advanced=true
        //% weight=50
        public setSensitivity(level: number): void {
            // TODO: Implement sensitivity configuration
            this.sensitivity = level;
        }

        /**
         * Clear touch interrupt
         */
        //% blockId=cap1203_clear_interrupt
        //% block="CAP1203 clear interrupt"
        //% advanced=true
        //% weight=49
        public clearInterrupt(): void {
            // TODO: Implement interrupt clearing
        }
    }

    // Internal singleton instance
    let _cap1203: CAP1203;

    // Wrapper functions to call methods on the internal CAP1203 instance
    /**
     * Check if a specific touch pad is currently pressed
     */
    //% blockId=cap1203_is_pressed
    //% block="CAP1203 is pad $pad pressed?"
    //% pad.min=1 pad.max=3 pad.defl=1
    //% weight=100
    export function cap1203IsPadPressed(pad: number): boolean {
        if (!_cap1203) _cap1203 = new CAP1203(TouchMode.Multi, 3, 0x28);
        if (_cap1203) return _cap1203.isPadPressed(pad);
        return false;
    }

    /**
     * Get raw touch value (delta count) for a pad
     */
    //% blockId=cap1203_read_raw
    //% block="CAP1203 pad $pad raw value"
    //% pad.min=1 pad.max=3 pad.defl=1
    //% weight=99
    export function cap1203ReadRawValue(pad: number): number {
        if (!_cap1203) _cap1203 = new CAP1203(TouchMode.Multi, 3, 0x28);
        if (_cap1203) return _cap1203.readRawValue(pad);
        return 0;
    }

    /**
     * Set touch sensitivity (0 = most sensitive, 7 = least sensitive)
     */
    //% blockId=cap1203_set_sensitivity
    //% block="CAP1203 set sensitivity $level"
    //% level.min=0 level.max=7 level.defl=3
    //% advanced=true
    //% weight=50
    export function cap1203SetSensitivity(level: number): void {
        if (!_cap1203) _cap1203 = new CAP1203(TouchMode.Multi, 3, 0x28);
        if (_cap1203) _cap1203.setSensitivity(level);
    }

    /**
     * Clear touch interrupt
     */
    //% blockId=cap1203_clear_interrupt
    //% block="CAP1203 clear interrupt"
    //% advanced=true
    //% weight=49
    export function cap1203ClearInterrupt(): void {
        if (!_cap1203) _cap1203 = new CAP1203(TouchMode.Multi, 3, 0x28);
        if (_cap1203) _cap1203.clearInterrupt();
    }

    /**
     * Create a new CAP1203 touch sensor instance
     */
    export function createCAP1203(mode?: TouchMode, sensitivity?: number, address?: number): void {
        if (mode === undefined) mode = TouchMode.Multi;
        if (sensitivity === undefined) sensitivity = 3;
        if (address === undefined) address = 0x28;
        _cap1203 = new CAP1203(mode, sensitivity, address);
    }
}
