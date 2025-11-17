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
    export class VL53L1X {
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
        //% block="$this read distance (mm)"
        //% weight=100
        readDistance(): number {
            // TODO: Implement distance reading
            return 0;
        }

        /**
         * Get the status of the last measurement
         */
        //% blockId=vl53l1x_get_status
        //% block="$this measurement status"
        //% weight=99
        getStatus(): string {
            return this.status;
        }

        /**
         * Reset the sensor
         */
        //% blockId=vl53l1x_reset
        //% block="$this reset sensor"
        //% advanced=true
        //% weight=50
        reset(): void {
            // TODO: Implement sensor reset
        }

        /**
         * Change the I2C address (for using multiple sensors)
         */
        //% blockId=vl53l1x_change_address
        //% block="$this change address to $newAddress"
        //% advanced=true
        //% weight=49
        //% newAddress.defl=0x29
        changeAddress(newAddress: number): void {
            // TODO: Implement address change
            this.addr = newAddress;
        }

        /**
         * Set distance mode
         */
        //% blockId=vl53l1x_set_distance_mode
        //% block="$this set distance mode $mode"
        //% advanced=true
        //% weight=48
        setDistanceMode(mode: DistanceMode): void {
            // TODO: Implement distance mode configuration
        }
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
    export function createVL53L1X(address?: number): VL53L1X {
        if (address === undefined) address = 0x29;
        return new VL53L1X(address);
    }
}
