/**
 * PiicoDev Ultrasonic - Distance Sensor
 * 
 * Measures distance using ultrasonic sound waves.
 */

//% weight=90 color=#FF6B6B icon="\uf06d"
//% groups=['Reading', 'Configuration', 'others']
namespace piicodev {

    /**
     * Ultrasonic Distance Sensor class
     */
    class Ultrasonic {
        private addr: number;
        private minVal: number;
        private maxVal: number;

        private static readonly REG_WHOAMI = 0x01;
        private static readonly REG_RAW = 0x05;
        private static readonly REG_STATUS = 0x08;
        private static readonly REG_LED = 0x07;
        private static readonly REG_PERIOD = 0x06;

        private static readonly I2C_DEFAULT_ADDRESS = 0x35;
        private static readonly DEVICE_ID = 578;

        constructor(address: number = Ultrasonic.I2C_DEFAULT_ADDRESS, minValue: number = 0, maxValue: number = 100) {
            this.addr = address;
            this.minVal = minValue;
            this.maxVal = maxValue;
            this.initialize();
        }

        /**
         * Initialize the device
         */
        private initialize(): void {
            try {
                let id = this.readInt(Ultrasonic.REG_WHOAMI, 2);
                if (id !== Ultrasonic.DEVICE_ID) {
                    // Device not recognized, but continue
                }
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Read a register value as big-endian integer
         */
        private readInt(register: number, length: number = 1): number {
            let buffer = picodevUnified.readRegister(this.addr, register, length);
            if (buffer.length === 0) return 0;
            
            let result = 0;
            for (let i = 0; i < length && i < buffer.length; i++) {
                result = (result << 8) | buffer[i];
            }
            return result;
        }

        /**
         * Write a register value as big-endian integer
         */
        private writeInt(register: number, value: number, length: number = 1): void {
            let buf = picodevUnified.createBufferFromArray([
                (value >> (8 * (length - 1))) & 0xFF,
                (length > 1) ? ((value >> 8) & 0xFF) : 0,
                (length > 2) ? (value & 0xFF) : 0
            ]);
            picodevUnified.writeRegister(this.addr, register, buf);
        }

        /**
         * Get raw round-trip time in microseconds
         */
        getRoundTripTime(): number {
            try {
                return this.readInt(Ultrasonic.REG_RAW, 2);
            } catch (e) {
                return 0;
            }
        }

        /**
         * Get distance in millimeters
         */
        getDistanceMM(): number {
            try {
                let microsecondsPerMM = 0.343 / 2; // speed of sound / 2
                return Math.round(this.getRoundTripTime() * microsecondsPerMM);
            } catch (e) {
                return 0;
            }
        }

        /**
         * Get distance in centimeters
         */
        getDistanceCM(): number {
            return Math.round(this.getDistanceMM() / 10);
        }

        /**
         * Get distance in inches
         */
        getDistanceInch(): number {
            return this.getDistanceMM() / 25.4;
        }

        /**
         * Get the LED state
         */
        getLED(): boolean {
            try {
                let state = this.readInt(Ultrasonic.REG_LED, 1);
                return state !== 0;
            } catch (e) {
                return false;
            }
        }

        /**
         * Set the LED state
         */
        setLED(on: boolean): void {
            try {
                this.writeInt(Ultrasonic.REG_LED | 0x80, on ? 1 : 0, 1);
            } catch (e) {
                // Silently fail
            }
        }

        /**
         * Check if a new sample is available
         */
        isSampleAvailable(): boolean {
            try {
                let status = this.readInt(Ultrasonic.REG_STATUS, 1);
                return (status & 1) !== 0;
            } catch (e) {
                return false;
            }
        }
    }

    let ultrasonic: Ultrasonic;

    /**
     * Initialize the Ultrasonic device
     * @param address I2C address of the device (default: 0x35)
     */
    //% blockId=ultrasonic_create
    //% block="Ultrasonic initialize at address $address"
    //% address.defl=0x35
    //% advanced=true
    //% weight=100
    export function createUltrasonic(address: number = 0x35): void {
        ultrasonic = new Ultrasonic(address);
    }

    /**
     * Read distance in millimeters
     */
    //% blockId=ultrasonic_read_mm
    //% block="Ultrasonic read distance (mm)"
    //% group="Reading"
    //% weight=100
    export function readUltrasonicMM(): number {
        if (!ultrasonic) {
            createUltrasonic();
        }
        return ultrasonic.getDistanceMM();
    }

    /**
     * Read distance in centimeters
     */
    //% blockId=ultrasonic_read_cm
    //% block="Ultrasonic read distance (cm)"
    //% group="Reading"
    //% weight=99
    export function readUltrasonicCM(): number {
        if (!ultrasonic) {
            createUltrasonic();
        }
        return ultrasonic.getDistanceCM();
    }

    /**
     * Read distance in inches
     */
    //% blockId=ultrasonic_read_inch
    //% block="Ultrasonic read distance (inches)"
    //% group="Reading"
    //% weight=98
    export function readUltrasonicInch(): number {
        if (!ultrasonic) {
            createUltrasonic();
        }
        return Math.round(ultrasonic.getDistanceInch() * 100) / 100;
    }

    /**
     * Check if a new distance measurement is available
     */
    //% blockId=ultrasonic_sample_available
    //% block="Ultrasonic new sample available"
    //% group="Reading"
    //% weight=97
    export function ultrasonicSampleAvailable(): boolean {
        if (!ultrasonic) {
            createUltrasonic();
        }
        return ultrasonic.isSampleAvailable();
    }

    /**
     * Set the LED indicator
     * @param on True to turn LED on, false to turn off
     */
    //% blockId=ultrasonic_set_led
    //% block="Ultrasonic LED $on"
    //% on.shadow="toggleOnOff"
    //% group="Configuration"
    //% weight=50
    export function ultrasonicSetLED(on: boolean): void {
        if (!ultrasonic) {
            createUltrasonic();
        }
        ultrasonic.setLED(on);
    }
}
