/**
 * PiicoDev Switch - Digital Input Button/Switch
 * 
 * Detects button presses, double-presses, and provides press counting.
 */

//% weight=75 color=#6BCB77 icon="\ufb2d"
//% groups=['Reading', 'Configuration', 'others']
namespace piicodev {

    /**
     * Switch/Button Input class
     */
    class Switch {
        private addr: number;

        private static readonly REG_WHOAMI = 0x01;
        private static readonly REG_I2C_ADDRESS = 0x04;
        private static readonly REG_LED = 0x05;
        private static readonly REG_IS_PRESSED = 0x11;
        private static readonly REG_WAS_PRESSED = 0x12;
        private static readonly REG_DOUBLE_PRESS_DETECTED = 0x13;
        private static readonly REG_PRESS_COUNT = 0x14;
        private static readonly REG_DOUBLE_PRESS_DURATION = 0x21;
        private static readonly REG_EMA_PARAMETER = 0x22;
        private static readonly REG_EMA_PERIOD = 0x23;

        private static readonly I2C_DEFAULT_ADDRESS = 0x42;
        private static readonly DEVICE_ID = 409;

        constructor(address: number = Switch.I2C_DEFAULT_ADDRESS) {
            this.addr = address;
            this.initialize();
        }

        /**
         * Initialize the switch device
         */
        private initialize(): void {
            try {
                let id = this.readInt(Switch.REG_WHOAMI, 2);
                if (id !== Switch.DEVICE_ID) {
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
         * Check if button is currently pressed
         */
        isPadPressed(): boolean {
            try {
                let state = this.readInt(Switch.REG_IS_PRESSED, 1);
                return state === 0; // Logic inverted in device
            } catch (e) {
                return false;
            }
        }

        /**
         * Check if button was pressed since last read
         */
        wasPadPressed(): boolean {
            try {
                let state = this.readInt(Switch.REG_WAS_PRESSED, 1);
                return state !== 0;
            } catch (e) {
                return false;
            }
        }

        /**
         * Check if double-press was detected
         */
        wasDoublePressed(): boolean {
            try {
                let state = this.readInt(Switch.REG_DOUBLE_PRESS_DETECTED, 1);
                return state === 1;
            } catch (e) {
                return false;
            }
        }

        /**
         * Get press count since last read
         */
        getPressCount(): number {
            try {
                return this.readInt(Switch.REG_PRESS_COUNT, 2);
            } catch (e) {
                return 0;
            }
        }

        /**
         * Set double-press duration threshold
         */
        setDoublePressTimeout(ms: number): void {
            try {
                // Set bit 7 to enable write
                this.writeInt(Switch.REG_DOUBLE_PRESS_DURATION | 0x80, ms, 2);
            } catch (e) {
                // Silently fail
            }
        }

        /**
         * Get the LED state
         */
        getLED(): boolean {
            try {
                let state = this.readInt(Switch.REG_LED, 1);
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
                this.writeInt(Switch.REG_LED | 0x80, on ? 1 : 0, 1);
            } catch (e) {
                // Silently fail
            }
        }
    }

    let switchDevice: Switch;

    /**
     * Initialize the Switch device
     * @param address I2C address of the device (default: 0x42)
     */
    //% blockId=switch_create
    //% block="Switch initialize at address $address"
    //% address.defl=0x42
    //% advanced=true
    //% weight=100
    export function createSwitch(address: number = 0x42): void {
        switchDevice = new Switch(address);
    }

    /**
     * Check if button is pressed right now
     */
    //% blockId=switch_is_pressed
    //% block="Switch is pressed"
    //% group="Reading"
    //% weight=100
    export function switchIsPressed(): boolean {
        if (!switchDevice) {
            createSwitch();
        }
        return switchDevice.isPadPressed();
    }

    /**
     * Check if button was pressed since last read
     */
    //% blockId=switch_was_pressed
    //% block="Switch was pressed"
    //% group="Reading"
    //% weight=99
    export function switchWasPressed(): boolean {
        if (!switchDevice) {
            createSwitch();
        }
        return switchDevice.wasPadPressed();
    }

    /**
     * Check if button was double-pressed
     */
    //% blockId=switch_was_double_pressed
    //% block="Switch was double pressed"
    //% group="Reading"
    //% weight=98
    export function switchWasDoublePressed(): boolean {
        if (!switchDevice) {
            createSwitch();
        }
        return switchDevice.wasDoublePressed();
    }

    /**
     * Get the number of times button was pressed
     */
    //% blockId=switch_press_count
    //% block="Switch press count"
    //% group="Reading"
    //% weight=97
    export function switchPressCount(): number {
        if (!switchDevice) {
            createSwitch();
        }
        return switchDevice.getPressCount();
    }

    /**
     * Set double-press timeout in milliseconds
     * @param ms Timeout duration (default: 300ms)
     */
    //% blockId=switch_set_double_press_timeout
    //% block="Switch set double-press timeout to $ms ms"
    //% ms.defl=300
    //% group="Configuration"
    //% weight=50
    export function switchSetDoublePressDuration(ms: number): void {
        if (!switchDevice) {
            createSwitch();
        }
        switchDevice.setDoublePressTimeout(ms);
    }

    /**
     * Set the LED indicator
     * @param on True to turn LED on, false to turn off
     */
    //% blockId=switch_set_led
    //% block="Switch LED $on"
    //% on.shadow="toggleOnOff"
    //% group="Configuration"
    //% weight=49
    export function switchSetLED(on: boolean): void {
        if (!switchDevice) {
            createSwitch();
        }
        switchDevice.setLED(on);
    }

    /**
     * Get the LED state
     */
    //% blockId=switch_get_led
    //% block="Switch LED is on"
    //% group="Configuration"
    //% weight=48
    //% advanced=true
    export function switchGetLED(): boolean {
        if (!switchDevice) {
            createSwitch();
        }
        return switchDevice.getLED();
    }
}
