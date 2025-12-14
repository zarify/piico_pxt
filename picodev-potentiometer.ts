/**
 * PiicoDev Potentiometer Module
 * 
 * Rotary potentiometer (or slide potentiometer) with customizable value scaling.
 * Read raw ADC values (0-1023) or map to custom ranges.
 */

//% weight=98 color=#0078D7 icon="\uf1de"
//% groups=['Inputs']
namespace piicodev {

    /**
     * PiicoDev Potentiometer class
     */
    class Potentiometer {
        private addr: number;
        private minValue: number;  // Minimum scaled value
        private maxValue: number;  // Maximum scaled value

        // Register addresses
        private static readonly REG_WHOAMI = 0x01;
        private static readonly REG_FIRM_MAJ = 0x02;
        private static readonly REG_FIRM_MIN = 0x03;
        private static readonly REG_I2C_ADDRESS = 0x04;
        private static readonly REG_POT = 0x05;
        private static readonly REG_LED = 0x07;
        private static readonly REG_SELF_TEST = 0x09;

        private static readonly DEVICE_ID_POT = 0x017B;  // 379 in decimal
        private static readonly DEVICE_ID_SLIDE = 0x019B;  // 411 in decimal
        private static readonly BASE_ADDRESS = 0x35;  // 53 in decimal

        constructor(address: number = 0x35, minimum: number = 0, maximum: number = 100) {
            this.addr = address;
            this.minValue = minimum;
            this.maxValue = maximum;

            // Initialize potentiometer
            this.initialize();
        }

        /**
         * Initialize the potentiometer
         */
        private initialize(): void {
            try {
                // Try to read device ID - if this fails, potentiometer may not be connected
                let deviceId = picodevUnified.readRegisterUInt16BE(this.addr, Potentiometer.REG_WHOAMI);

                // Check if it's a valid potentiometer or slide potentiometer
                if (deviceId !== Potentiometer.DEVICE_ID_POT && deviceId !== Potentiometer.DEVICE_ID_SLIDE) {
                    // Device not found or incorrect device
                    return;
                }

                // Turn on LED by default
                this.setLED(true);
            } catch (e) {
                // Silently handle initialization errors
            }
        }

        /**
         * Get raw ADC value (0-1023)
         */
        getRaw(): number {
            try {
                let rawValue = picodevUnified.readRegisterUInt16BE(this.addr, Potentiometer.REG_POT);
                return rawValue;
            } catch (e) {
                return 0;
            }
        }

        /**
         * Get scaled value based on configured minimum and maximum
         */
        getValue(): number {
            let rawValue = this.getRaw();
            // Scale from 0-1023 range to min-max range
            let scaledValue = this.minValue + (this.maxValue - this.minValue) * rawValue / 1023;
            return scaledValue;
        }

        /**
         * Set the state of the onboard LED
         */
        setLED(state: boolean): void {
            try {
                // Write to LED register with bit 7 set (0x80 | value)
                let value = state ? 1 : 0;
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, value);
                picodevUnified.writeRegister(this.addr, 0x80 | Potentiometer.REG_LED, buf);
            } catch (e) {
                // Silently handle errors
            }
        }
    }

    // Instance cache for potentiometers
    let potentiometerInstances: Potentiometer[] = [];

    /**
     * Get or create a potentiometer instance
     */
    function getPotentiometer(id: PiicoDevID): Potentiometer {
        // Calculate I2C address based on ID switches
        let address = picodevUnified.calculateIDSwitchAddress(0x35, id);

        // Check if instance already exists
        for (let i = 0; i < potentiometerInstances.length; i++) {
            if (potentiometerInstances[i] && (potentiometerInstances[i] as any).addr === address) {
                return potentiometerInstances[i];
            }
        }

        // Create new instance
        let pot = new Potentiometer(address);
        potentiometerInstances.push(pot);
        return pot;
    }

    // ========== BLOCKS ==========

    /**
     * Read the raw ADC value from a potentiometer (0-1023)
     * @param id the potentiometer ID to read from
     */
    //% block="potentiometer $id raw value"
    //% id.defl=PiicoDevID.ID0
    //% group="Potentiometer"
    //% weight=100
    export function potentiometerRawValue(id: PiicoDevID): number {
        let pot = getPotentiometer(id);
        return pot.getRaw();
    }

    /**
     * Read the scaled value from a potentiometer
     * @param id the potentiometer ID to read from
     */
    //% block="potentiometer $id value"
    //% id.defl=PiicoDevID.ID0
    //% group="Potentiometer"
    //% weight=90
    export function potentiometerValue(id: PiicoDevID): number {
        let pot = getPotentiometer(id);
        return pot.getValue();
    }

    /**
     * Turn the potentiometer LED on or off
     * @param id the potentiometer ID to control
     * @param state true for on, false for off
     */
    //% block="potentiometer $id LED $state"
    //% id.defl=PiicoDevID.ID0
    //% state.defl=true
    //% group="Potentiometer"
    //% weight=40
    export function setPotentiometerLED(id: PiicoDevID, state: boolean): void {
        let pot = getPotentiometer(id);
        pot.setLED(state);
    }
}
