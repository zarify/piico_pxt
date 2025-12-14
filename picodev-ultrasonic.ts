/**
 * PiicoDev Ultrasonic Rangefinder
 * 
 * Ultrasonic distance sensor for measuring distances.
 * Provides distance measurements in millimeters and inches.
 */

//% weight=96 color=#0078D7 icon="\uf545"
//% groups=['Inputs']
namespace piicodev {

    /**
     * Distance unit selection for ultrasonic sensor
     */
    export enum UltrasonicUnit {
        //% block="millimeters"
        Millimeters,
        //% block="inches"
        Inches
    }

    /**
     * PiicoDev Ultrasonic Sensor class
     */
    class Ultrasonic {
        private addr: number;
        private millimetersPerMicrosecond: number;

        // Register addresses
        private static readonly REG_STATUS = 0x08;
        private static readonly REG_FIRM_MAJ = 0x02;
        private static readonly REG_FIRM_MIN = 0x03;
        private static readonly REG_I2C_ADDRESS = 0x04;
        private static readonly REG_RAW = 0x05;
        private static readonly REG_PERIOD = 0x06;
        private static readonly REG_LED = 0x07;
        private static readonly REG_SELF_TEST = 0x09;
        private static readonly REG_WHOAMI = 0x01;

        // Device constants
        private static readonly BASE_ADDRESS = 0x35;  // 53 decimal
        private static readonly DEVICE_ID = 0x0242;   // 578 decimal

        constructor(address: number = Ultrasonic.BASE_ADDRESS) {
            this.addr = address;
            this.millimetersPerMicrosecond = 0.343;

            // Verify device
            this.initialize();
        }

        /**
         * Initialize and verify the sensor
         */
        private initialize(): void {
            try {
                let whoami = this.readWhoAmI();
                if (whoami !== Ultrasonic.DEVICE_ID) {
                    picodevUnified.logI2CError(this.addr);
                }

                // Set default period to 20ms and LED on
                this.setPeriod(20);
                this.setLED(true);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Check if a new sample is available
         */
        newSampleAvailable(): boolean {
            try {
                let status = picodevUnified.readRegisterByte(this.addr, Ultrasonic.REG_STATUS);
                return (status & 0x01) !== 0;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return false;
            }
        }

        /**
         * Read the pulse round-trip time in microseconds
         */
        readRoundTripUs(): number {
            try {
                let data = picodevUnified.readRegister(this.addr, Ultrasonic.REG_RAW, 2);
                // Big-endian 16-bit value
                return (data[0] << 8) | data[1];
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Read distance in millimeters
         */
        readDistanceMm(): number {
            let roundTripUs = this.readRoundTripUs();
            // Distance = (round trip time × speed of sound) / 2
            return Math.round(roundTripUs * this.millimetersPerMicrosecond / 2);
        }

        /**
         * Read distance in inches
         */
        readDistanceInch(): number {
            return this.readDistanceMm() / 25.4;
        }

        /**
         * Read distance in specified unit
         */
        readDistance(unit: UltrasonicUnit): number {
            if (unit === UltrasonicUnit.Inches) {
                return this.readDistanceInch();
            }
            return this.readDistanceMm();
        }

        /**
         * Set the sample period in milliseconds
         * @param period Sample period (0 to disable, 1-65535ms)
         */
        setPeriod(period: number): void {
            try {
                // Constrain to valid range
                if (period < 0) period = 0;
                if (period > 65535) period = 65535;

                // Write with bit 7 set as per the Python implementation
                let buf = pins.createBuffer(3);
                buf.setNumber(NumberFormat.UInt8LE, 0, 0x80 | Ultrasonic.REG_PERIOD);
                buf.setNumber(NumberFormat.UInt8LE, 1, (period >> 8) & 0xFF);  // MSB
                buf.setNumber(NumberFormat.UInt8LE, 2, period & 0xFF);          // LSB
                pins.i2cWriteBuffer(this.addr, buf, false);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Get the sample period in milliseconds
         */
        getPeriod(): number {
            try {
                let data = picodevUnified.readRegister(this.addr, Ultrasonic.REG_PERIOD, 2);
                // Big-endian 16-bit value
                return (data[0] << 8) | data[1];
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Control the onboard LED
         * @param state true to turn LED on, false to turn off
         */
        setLED(state: boolean): void {
            try {
                // Write with bit 7 set as per the Python implementation
                let buf = pins.createBuffer(2);
                buf.setNumber(NumberFormat.UInt8LE, 0, 0x80 | Ultrasonic.REG_LED);
                buf.setNumber(NumberFormat.UInt8LE, 1, state ? 1 : 0);
                pins.i2cWriteBuffer(this.addr, buf, false);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Get the LED state
         */
        getLED(): boolean {
            try {
                let state = picodevUnified.readRegisterByte(this.addr, Ultrasonic.REG_LED);
                return state !== 0;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return false;
            }
        }

        /**
         * Read the device WHO_AM_I register
         */
        readWhoAmI(): number {
            try {
                let data = picodevUnified.readRegister(this.addr, Ultrasonic.REG_WHOAMI, 2);
                // Big-endian 16-bit value
                return (data[0] << 8) | data[1];
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Read firmware version
         */
        readFirmware(): string {
            try {
                let major = picodevUnified.readRegisterByte(this.addr, Ultrasonic.REG_FIRM_MAJ);
                let minor = picodevUnified.readRegisterByte(this.addr, Ultrasonic.REG_FIRM_MIN);
                return "" + major + "." + minor;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return "0.0";
            }
        }

        /**
         * Change the I2C address
         * @param newAddr New I2C address (0x08 to 0x77)
         */
        setI2CAddress(newAddr: number): void {
            try {
                // Validate address range
                if (newAddr < 0x08 || newAddr > 0x77) {
                    return;
                }

                let buf = pins.createBuffer(2);
                buf.setNumber(NumberFormat.UInt8LE, 0, Ultrasonic.REG_I2C_ADDRESS);
                buf.setNumber(NumberFormat.UInt8LE, 1, newAddr);
                pins.i2cWriteBuffer(this.addr, buf, false);

                // Update internal address
                this.addr = newAddr;
                basic.pause(5);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Run self-test
         */
        selfTest(): number {
            try {
                return picodevUnified.readRegisterByte(this.addr, Ultrasonic.REG_SELF_TEST);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }
    }

    // Instance cache for ultrasonic sensors
    let ultrasonicInstances: Ultrasonic[] = [];

    /**
     * Get or create an ultrasonic sensor instance
     */
    function getUltrasonic(id: PiicoDevID): Ultrasonic {
        // Calculate I2C address based on ID switches
        let address = picodevUnified.calculateIDSwitchAddress(0x35, id);

        // Register this sensor ID and check for duplicates
        picodevUnified.registerSensorID("Ultrasonic", id, address);

        // Check if instance already exists
        for (let i = 0; i < ultrasonicInstances.length; i++) {
            if (ultrasonicInstances[i] && (ultrasonicInstances[i] as any).addr === address) {
                return ultrasonicInstances[i];
            }
        }

        // Create new instance
        let sensor = new Ultrasonic(address);
        ultrasonicInstances.push(sensor);
        return sensor;
    }

    /**
     * Read distance from ultrasonic sensor
     * @param id the ultrasonic sensor ID
     * @param unit distance unit to return
     * @returns distance in specified unit
     */
    //% blockId=ultrasonic_read_distance
    //% block="ultrasonic $id distance $unit"
    //% id.defl=PiicoDevID.ID0
    //% unit.defl=UltrasonicUnit.Millimeters
    //% group="Ultrasonic Distance"
    //% weight=100
    export function ultrasonicDistance(id: PiicoDevID, unit: UltrasonicUnit): number {
        let sensor = getUltrasonic(id);
        return sensor.readDistance(unit);
    }

    /**
     * Check if a new distance sample is available
     * @param id the ultrasonic sensor ID
     * @returns true if new sample is ready
     */
    //% blockId=ultrasonic_new_sample
    //% block="ultrasonic $id new sample available"
    //% id.defl=PiicoDevID.ID0
    //% group="Ultrasonic Distance"
    //% weight=95
    export function ultrasonicNewSample(id: PiicoDevID): boolean {
        let sensor = getUltrasonic(id);
        return sensor.newSampleAvailable();
    }

    /**
     * Set the ultrasonic sensor sample period
     * @param id the ultrasonic sensor ID
     * @param period Sample period in milliseconds (0 to disable, 1-65535)
     */
    //% blockId=ultrasonic_set_period
    //% block="ultrasonic $id set sample period to $period ms"
    //% id.defl=PiicoDevID.ID0
    //% period.min=0 period.max=65535 period.defl=20
    //% group="Ultrasonic Distance"
    //% weight=85
    //% advanced=true
    export function ultrasonicSetPeriod(id: PiicoDevID, period: number): void {
        let sensor = getUltrasonic(id);
        sensor.setPeriod(period);
    }

    /**
     * Get the ultrasonic sensor sample period
     * @param id the ultrasonic sensor ID
     * @returns Sample period in milliseconds
     */
    //% blockId=ultrasonic_get_period
    //% block="ultrasonic $id sample period (ms)"
    //% id.defl=PiicoDevID.ID0
    //% group="Ultrasonic Distance"
    //% weight=84
    //% advanced=true
    export function ultrasonicGetPeriod(id: PiicoDevID): number {
        let sensor = getUltrasonic(id);
        return sensor.getPeriod();
    }

    /**
     * Control the ultrasonic sensor LED
     * @param id the ultrasonic sensor ID
     * @param state true to turn LED on, false to turn off
     */
    //% blockId=ultrasonic_set_led
    //% block="ultrasonic $id LED $state"
    //% id.defl=PiicoDevID.ID0
    //% state.shadow="toggleOnOff"
    //% group="Ultrasonic Distance"
    //% weight=83
    //% advanced=true
    export function ultrasonicSetLED(id: PiicoDevID, state: boolean): void {
        let sensor = getUltrasonic(id);
        sensor.setLED(state);
    }

    /**
     * Get the ultrasonic sensor LED state
     * @param id the ultrasonic sensor ID
     * @returns true if LED is on
     */
    //% blockId=ultrasonic_get_led
    //% block="ultrasonic $id LED on"
    //% id.defl=PiicoDevID.ID0
    //% group="Ultrasonic Distance"
    //% weight=82
    //% advanced=true
    export function ultrasonicGetLED(id: PiicoDevID): boolean {
        let sensor = getUltrasonic(id);
        return sensor.getLED();
    }

    /**
     * Get the ultrasonic sensor firmware version
     * @param id the ultrasonic sensor ID
     * @returns Firmware version string
     */
    //% blockId=ultrasonic_firmware
    //% block="ultrasonic $id firmware version"
    //% id.defl=PiicoDevID.ID0
    //% group="Ultrasonic Distance"
    //% weight=70
    //% advanced=true
    export function ultrasonicFirmware(id: PiicoDevID): string {
        let sensor = getUltrasonic(id);
        return sensor.readFirmware();
    }
}
