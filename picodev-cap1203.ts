/**
 * PiicoDev CAP1203 Capacitive Touch Sensor
 * 
 * 3-pad capacitive touch sensor with configurable sensitivity and touch modes.
 */

//% weight=99 color=#0078D7 icon="\uf25a"
//% groups=['Inputs']
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

        // Register addresses
        private static readonly REG_MAIN_CONTROL = 0x00;
        private static readonly REG_GENERAL_STATUS = 0x02;
        private static readonly REG_SENSOR_INPUT_STATUS = 0x03;
        private static readonly REG_SENSITIVITY_CONTROL = 0x1F;
        private static readonly REG_MULTIPLE_TOUCH_CONFIG = 0x2A;
        private static readonly REG_DELTA_COUNT_1 = 0x10;
        private static readonly REG_DELTA_COUNT_2 = 0x11;
        private static readonly REG_DELTA_COUNT_3 = 0x12;

        constructor(mode: TouchMode = TouchMode.Multi, sensitivity: number = 3, address: number = 0x28) {
            this.addr = address;
            this.mode = mode;
            this.sensitivity = sensitivity;

            // Initialize sensor with mode and sensitivity settings
            this.initialize();
        }

        /**
         * Initialize the sensor
         */
        private initialize(): void {
            try {
                // Configure touch mode (single or multi-touch)
                let modeValue = this.mode === TouchMode.Single ? 0x80 : 0x00;
                this.setBits(CAP1203.REG_MULTIPLE_TOUCH_CONFIG, modeValue, 0x80);

                // Configure sensitivity (0-7, where 0 is most sensitive)
                if (this.sensitivity >= 0 && this.sensitivity <= 7) {
                    let sensValue = this.sensitivity << 4;
                    this.setBits(CAP1203.REG_SENSITIVITY_CONTROL, sensValue, 0x70);
                }
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Set or clear specific bits in a register using a mask
         */
        private setBits(register: number, byteValue: number, mask: number): void {
            // Read current register value
            let oldByte = picodevUnified.readRegisterByte(this.addr, register);

            // Modify the bits according to mask
            let tempByte = oldByte;
            for (let n = 0; n < 8; n++) {
                let bitMask = (mask >> n) & 1;
                if (bitMask === 1) {
                    if (((byteValue >> n) & 1) === 1) {
                        tempByte = tempByte | (1 << n);
                    } else {
                        tempByte = tempByte & ~(1 << n);
                    }
                }
            }

            // Write modified value back
            let buf = pins.createBuffer(1);
            buf.setNumber(NumberFormat.UInt8LE, 0, tempByte);
            picodevUnified.writeRegister(this.addr, register, buf);
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
            try {
                // Clear interrupt first
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, 0);
                picodevUnified.writeRegister(this.addr, CAP1203.REG_MAIN_CONTROL, buf);

                // Read sensor input status
                let status = picodevUnified.readRegisterByte(this.addr, CAP1203.REG_SENSOR_INPUT_STATUS);

                // Check if the specific pad is pressed (bit corresponds to pad)
                let padBit = 1 << (pad - 1);
                return (status & padBit) !== 0;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return false;
            }
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
            try {
                let register = 0;
                if (pad === 1) {
                    register = CAP1203.REG_DELTA_COUNT_1;
                } else if (pad === 2) {
                    register = CAP1203.REG_DELTA_COUNT_2;
                } else if (pad === 3) {
                    register = CAP1203.REG_DELTA_COUNT_3;
                } else {
                    return 0;
                }

                let deltaData = picodevUnified.readRegister(this.addr, register, 1);
                if (deltaData.length > 0) {
                    return deltaData.getNumber(NumberFormat.UInt8LE, 0);
                }
                return 0;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
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
            try {
                if (level >= 0 && level <= 7) {
                    this.sensitivity = level;
                    let sensValue = level << 4;
                    this.setBits(CAP1203.REG_SENSITIVITY_CONTROL, sensValue, 0x70);
                }
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Clear touch interrupt
         */
        //% blockId=cap1203_clear_interrupt
        //% block="CAP1203 clear interrupt"
        //% advanced=true
        //% weight=49
        public clearInterrupt(): void {
            try {
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, 0);
                picodevUnified.writeRegister(this.addr, CAP1203.REG_MAIN_CONTROL, buf);

                // Read the status to complete the interrupt clear
                picodevUnified.readRegisterByte(this.addr, CAP1203.REG_MAIN_CONTROL);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
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
    //% group="CAP1203 Touch Sensor"
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
    //% group="CAP1203 Touch Sensor"
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
    //% group="CAP1203 Touch Sensor"
    //% level.min=0 level.max=7 level.defl=3
    //% advanced=true
    //% weight=50
    export function cap1203SetSensitivity(level: number): void {
        if (!_cap1203) _cap1203 = new CAP1203(TouchMode.Multi, 3, 0x28);
        if (_cap1203) _cap1203.setSensitivity(level);
    }
}
