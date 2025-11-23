/**
 * PiicoDev VEML6030 Ambient Light Sensor
 * 
 * Measures ambient light intensity with configurable gain settings
 * for optimal light detection across various brightness conditions.
 */

//% weight=78 color=#00A4A6 icon="\uf185"
//% groups=['Environment']
namespace piicodev {

    /**
     * VEML6030 gain settings for sensitivity adjustment
     */
    export enum VEML6030Gain {
        //% block="×2 (most sensitive)"
        X2 = 2,
        //% block="×1 (default)"
        X1 = 1,
        //% block="×0.25"
        X025 = 0.25,
        //% block="×0.125 (least sensitive)"
        X0125 = 0.125
    }

    /**
     * PiicoDev VEML6030 Ambient Light Sensor class
     */
    class VEML6030 {
        private addr: number;
        private gain: number;
        private resolution: number;

        // Register addresses
        private static readonly REG_ALS_CONF = 0x00;
        private static readonly REG_ALS = 0x04;

        // Default I2C address
        private static readonly I2C_ADDRESS = 0x10;

        // Default settings: sensor enabled with gain ×1
        private static readonly DEFAULT_SETTINGS = 0x00;

        constructor(address: number = VEML6030.I2C_ADDRESS) {
            this.addr = address;
            this.gain = 1;
            this.resolution = 0.0576; // lux per count for gain ×1
            this.initialize();
        }

        /**
         * Initialize the sensor with default settings
         */
        private initialize(): void {
            try {
                // Write default configuration to enable sensor
                let buf = pins.createBuffer(2);
                buf.setNumber(NumberFormat.UInt8LE, 0, VEML6030.DEFAULT_SETTINGS);
                buf.setNumber(NumberFormat.UInt8LE, 1, 0x00);
                picodevUnified.writeRegister(this.addr, VEML6030.REG_ALS_CONF, buf);
                basic.pause(4);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Read ambient light level in lux
         */
        //% blockId=veml6030_read
        //% block="VEML6030 read ambient light (lux)"
        //% weight=100
        public read(): number {
            try {
                let data = picodevUnified.readRegister(this.addr, VEML6030.REG_ALS, 2);
                // Read 16-bit value in little-endian format
                let rawValue = data.getNumber(NumberFormat.UInt16LE, 0);
                // Convert to lux using current resolution
                return Math.round(rawValue * this.resolution * 100) / 100;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Set sensor gain for different light conditions
         * Higher gain = more sensitive (for low light)
         * Lower gain = less sensitive (for bright light)
         * @param g Gain value: 0.125, 0.25, 1, or 2
         */
        //% blockId=veml6030_set_gain
        //% block="VEML6030 set gain $g"
        //% weight=90
        public setGain(g: VEML6030Gain): void {
            try {
                // Validate gain value
                if (g !== 0.125 && g !== 0.25 && g !== 1 && g !== 2) {
                    serial.writeLine("VEML6030: Invalid gain. Use 0.125, 0.25, 1, or 2");
                    return;
                }

                this.gain = g;

                let configBytes = pins.createBuffer(2);
                let mask = pins.createBuffer(2);

                // Set gain configuration and resolution based on gain value
                if (g === 0.125) {
                    // Gain 1/8 - bits [12:11] = 10b
                    configBytes.setNumber(NumberFormat.UInt8LE, 0, 0x00);
                    configBytes.setNumber(NumberFormat.UInt8LE, 1, 0x10);
                    this.resolution = 0.4608;
                } else if (g === 0.25) {
                    // Gain 1/4 - bits [12:11] = 11b
                    configBytes.setNumber(NumberFormat.UInt8LE, 0, 0x00);
                    configBytes.setNumber(NumberFormat.UInt8LE, 1, 0x18);
                    this.resolution = 0.2304;
                } else if (g === 1) {
                    // Gain 1 (default) - bits [12:11] = 00b
                    configBytes.setNumber(NumberFormat.UInt8LE, 0, 0x00);
                    configBytes.setNumber(NumberFormat.UInt8LE, 1, 0x00);
                    this.resolution = 0.0576;
                } else if (g === 2) {
                    // Gain 2 - bits [12:11] = 01b
                    configBytes.setNumber(NumberFormat.UInt8LE, 0, 0x00);
                    configBytes.setNumber(NumberFormat.UInt8LE, 1, 0x08);
                    this.resolution = 0.0288;
                }

                // Mask for bits [12:11] = 0x1800 (big-endian: 0x00 0x18)
                mask.setNumber(NumberFormat.UInt8LE, 0, 0x18);
                mask.setNumber(NumberFormat.UInt8LE, 1, 0x00);

                // Apply the configuration
                this.setBits(VEML6030.REG_ALS_CONF, configBytes, mask);
                basic.pause(4);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Set specific bits in a register using a mask
         * This implements the bit manipulation logic from the Python code
         * @param address Register address
         * @param byte New byte values to set
         * @param mask Mask indicating which bits to modify
         */
        private setBits(address: number, byte: Buffer, mask: Buffer): void {
            try {
                // Read current register value (2 bytes, little-endian)
                let oldBytes = picodevUnified.readRegister(this.addr, address, 2);
                let oldValue = oldBytes.getNumber(NumberFormat.UInt16LE, 0);

                // Convert buffers to 16-bit integers
                let newBits = byte.getNumber(NumberFormat.UInt16LE, 0);
                let maskBits = mask.getNumber(NumberFormat.UInt16BE, 0); // Note: mask is big-endian

                // Apply bit mask
                let tempValue = oldValue;
                for (let n = 0; n < 16; n++) {
                    let bitMask = (maskBits >> n) & 1;
                    if (bitMask === 1) {
                        if (((newBits >> n) & 1) === 1) {
                            // Set bit
                            tempValue = tempValue | (1 << n);
                        } else {
                            // Clear bit
                            tempValue = tempValue & ~(1 << n);
                        }
                    }
                }

                // Write back modified value (little-endian)
                let newBytes = pins.createBuffer(2);
                newBytes.setNumber(NumberFormat.UInt16LE, 0, tempValue);
                picodevUnified.writeRegister(this.addr, address, newBytes);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }
    }

    // Internal singleton instance
    let _veml6030: VEML6030;

    /**
     * Read ambient light level in lux
     */
    //% blockId=veml6030_read
    //% block="VEML6030 read ambient light (lux)"
    //% group="Reading"
    //% weight=100
    export function veml6030Read(): number {
        if (!_veml6030) _veml6030 = new VEML6030();
        return _veml6030.read();
    }

    /**
     * Set sensor gain for different light conditions
     * Higher gain = more sensitive (for low light)
     * Lower gain = less sensitive (for bright light)
     */
    //% blockId=veml6030_set_gain
    //% block="VEML6030 set gain $gain"
    //% group="Configuration"
    //% weight=90
    export function veml6030SetGain(gain: VEML6030Gain): void {
        if (!_veml6030) _veml6030 = new VEML6030();
        _veml6030.setGain(gain);
    }

    /**
     * Create a new VEML6030 ambient light sensor instance
     * @param address I2C address (default: 0x10)
     */
    export function createVEML6030(address?: number): void {
        if (address === undefined) address = 0x10;
        _veml6030 = new VEML6030(address);
    }
}
