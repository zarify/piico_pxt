/**
 * PiicoDev VL53L1X Time-of-Flight Distance Sensor
 * 
 * Laser ranging sensor capable of measuring distances from 4mm to 4000mm.
 */

//% weight=90 color=#8B4513 icon="\uf545"
namespace piicodev {

    /**
     * Distance measurement mode
     */
    export enum DistanceMode {
        //% block="short (up to 1.3m)"
        Short = 1,
        //% block="medium (up to 3m)"
        Medium = 2,
        //% block="long (up to 4m)"
        Long = 3
    }

    /**
     * VL53L1X Distance Sensor class
     */
    class VL53L1X {
        private addr: number;
        private status: string;

        constructor(address: number = 0x29) {
            this.addr = address;
            this.status = "OK";

            // TODO: Initialize sensor with default configuration
            // This will be implemented in Phase 3
        }

        /**
         * Read distance measurement in millimeters
         */
        //% blockId=vl53l1x_read_distance
        //% block="VL53L1X read distance (mm)"
        //% weight=100
        public readDistance(): number {
            // TODO: Implement distance reading
            return 0;
        }

        /**
         * Get the status of the last measurement
         */
        //% blockId=vl53l1x_get_status
        //% block="VL53L1X measurement status"
        //% weight=99
        public getStatus(): string {
            return this.status;
        }

        /**
         * Reset the sensor
         */
        //% blockId=vl53l1x_reset
        //% block="VL53L1X reset sensor"
        //% advanced=true
        //% weight=50
        public reset(): void {
            // TODO: Implement sensor reset
        }

        /**
         * Change the I2C address (for using multiple sensors)
         */
        //% blockId=vl53l1x_change_address
        //% block="VL53L1X change address to $newAddress"
        //% advanced=true
        //% weight=49
        //% newAddress.defl=0x29
        public changeAddress(newAddress: number): void {
            // TODO: Implement address change
            this.addr = newAddress;
        }

        /**
         * Set distance mode
         */
        //% blockId=vl53l1x_set_distance_mode
        //% block="VL53L1X set distance mode $mode"
        //% advanced=true
        //% weight=48
        public setDistanceMode(mode: DistanceMode): void {
            // TODO: Implement distance mode configuration
        }
    }

    // Internal singleton instance
    let _vl53l1x: VL53L1X;

    // Wrapper functions to call methods on the internal VL53L1X instance
    /**
     * Read distance measurement in millimeters
     */
    //% blockId=vl53l1x_read_distance
    //% block="VL53L1X read distance (mm)"
    //% weight=100
    export function vl53l1xReadDistance(): number {
        if (_vl53l1x) return _vl53l1x.readDistance();
        return 0;
    }

    /**
     * Get the status of the last measurement
     */
    //% blockId=vl53l1x_get_status
    //% block="VL53L1X measurement status"
    //% weight=99
    export function vl53l1xGetStatus(): string {
        if (_vl53l1x) return _vl53l1x.getStatus();
        return "OK";
    }

    /**
     * Reset the sensor
     */
    //% blockId=vl53l1x_reset
    //% block="VL53L1X reset sensor"
    //% advanced=true
    //% weight=50
    export function vl53l1xReset(): void {
        if (_vl53l1x) _vl53l1x.reset();
    }

    /**
     * Change the I2C address (for using multiple sensors)
     */
    //% blockId=vl53l1x_change_address
    //% block="VL53L1X change address to $newAddress"
    //% advanced=true
    //% weight=49
    //% newAddress.defl=0x29
    export function vl53l1xChangeAddress(newAddress: number): void {
        if (_vl53l1x) _vl53l1x.changeAddress(newAddress);
    }

    /**
     * Set distance mode
     */
    //% blockId=vl53l1x_set_distance_mode
    //% block="VL53L1X set distance mode $mode"
    //% advanced=true
    //% weight=48
    export function vl53l1xSetDistanceMode(mode: DistanceMode): void {
        if (_vl53l1x) _vl53l1x.setDistanceMode(mode);
    }

    /**
     * Create a new VL53L1X distance sensor instance
     */
    //% blockId=create_vl53l1x
    //% block="create VL53L1X distance sensor||at address $address"
    //% blockSetVariable=distanceSensor
    //% address.defl=0x29
    //% weight=90
    //% expandableArgumentMode="toggle"
    export function createVL53L1X(address?: number): void {
        if (address === undefined) address = 0x29;
        _vl53l1x = new VL53L1X(address);
    }
}
