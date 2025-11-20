/**
 * PiicoDev Potentiometer / Slider - Analog Input
 * 
 * Reads analog input from potentiometer or slide potentiometer with optional scaling.
 */

//% weight=70 color=#FFA500 icon="\uf1de"
//% groups=['Reading', 'Configuration', 'others']
namespace piicodev {

    /**
     * Potentiometer/Slider Input class
     */
    class Potentiometer {
        private addr: number;
        private minValue: number;
        private maxValue: number;

        private static readonly REG_WHOAMI = 0x01;
        private static readonly REG_POT = 0x05;
        private static readonly REG_LED = 0x07;

        private static readonly I2C_DEFAULT_ADDRESS = 0x35;
        private static readonly DEVICE_ID = 379;

        constructor(address: number = Potentiometer.I2C_DEFAULT_ADDRESS, minValue: number = 0, maxValue: number = 100) {
            this.addr = address;
            this.minValue = minValue;
            this.maxValue = maxValue;
            this.initialize();
        }

        /**
         * Initialize the device
         */
        private initialize(): void {
            try {
                let id = this.readInt(Potentiometer.REG_WHOAMI, 2);
                if (id !== Potentiometer.DEVICE_ID) {
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
            let buf = pins.createBuffer(length);
            for (let i = length - 1; i >= 0; i--) {
                buf.setNumber(NumberFormat.Int8LE, i, (value >> (8 * i)) & 0xFF);
            }
            picodevUnified.writeRegister(this.addr, register, buf);
        }

        /**
         * Get raw ADC value (0-1023)
         */
        getRawValue(): number {
            try {
                return this.readInt(Potentiometer.REG_POT, 2);
            } catch (e) {
                return 0;
            }
        }

        /**
         * Get scaled value based on min/max configuration
         */
        getScaledValue(): number {
            try {
                let raw = this.getRawValue();
                return this.minValue + (this.maxValue - this.minValue) * raw / 1023;
            } catch (e) {
                return 0;
            }
        }

        /**
         * Set minimum value for scaling
         */
        setMinimum(value: number): void {
            this.minValue = value;
        }

        /**
         * Set maximum value for scaling
         */
        setMaximum(value: number): void {
            this.maxValue = value;
        }

        /**
         * Get the LED state
         */
        getLED(): boolean {
            try {
                let state = this.readInt(Potentiometer.REG_LED, 1);
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
                // Set bit 7 to enable write
                this.writeInt(Potentiometer.REG_LED | 0x80, on ? 1 : 0, 1);
            } catch (e) {
                // Silently fail
            }
        }
    }

    let potentiometer: Potentiometer;

    /**
     * Initialize the Potentiometer device
     * @param address I2C address of the device (default: 0x35)
     * @param minimum Minimum scaled value (default: 0)
     * @param maximum Maximum scaled value (default: 100)
     */
    //% blockId=pot_create
    //% block="Potentiometer initialize at address $address min $minimum max $maximum"
    //% address.defl=0x35 minimum.defl=0 maximum.defl=100
    //% advanced=true
    //% weight=100
    export function createPotentiometer(address: number = 0x35, minimum: number = 0, maximum: number = 100): void {
        potentiometer = new Potentiometer(address, minimum, maximum);
    }

    /**
     * Read raw potentiometer value (0-1023)
     */
    //% blockId=pot_read_raw
    //% block="Potentiometer read raw value"
    //% group="Reading"
    //% weight=100
    export function readPotRaw(): number {
        if (!potentiometer) {
            createPotentiometer();
        }
        return potentiometer.getRawValue();
    }

    /**
     * Read scaled potentiometer value
     */
    //% blockId=pot_read_scaled
    //% block="Potentiometer read scaled value"
    //% group="Reading"
    //% weight=99
    export function readPotScaled(): number {
        if (!potentiometer) {
            createPotentiometer();
        }
        return potentiometer.getScaledValue();
    }

    /**
     * Set minimum value for scaling
     * @param value Minimum value
     */
    //% blockId=pot_set_minimum
    //% block="Potentiometer set minimum to $value"
    //% value.defl=0
    //% group="Configuration"
    //% weight=50
    export function potSetMinimum(value: number): void {
        if (!potentiometer) {
            createPotentiometer();
        }
        potentiometer.setMinimum(value);
    }

    /**
     * Set maximum value for scaling
     * @param value Maximum value
     */
    //% blockId=pot_set_maximum
    //% block="Potentiometer set maximum to $value"
    //% value.defl=100
    //% group="Configuration"
    //% weight=49
    export function potSetMaximum(value: number): void {
        if (!potentiometer) {
            createPotentiometer();
        }
        potentiometer.setMaximum(value);
    }

    /**
     * Set the LED indicator
     * @param on True to turn LED on, false to turn off
     */
    //% blockId=pot_set_led
    //% block="Potentiometer LED $on"
    //% on.shadow="toggleOnOff"
    //% group="Configuration"
    //% weight=48
    export function potSetLED(on: boolean): void {
        if (!potentiometer) {
            createPotentiometer();
        }
        potentiometer.setLED(on);
    }
}
