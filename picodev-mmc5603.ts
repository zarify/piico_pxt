/**
 * PiicoDev MMC5603 3-Axis Magnetometer (Compass)
 * 
 * Measures magnetic field for compass/heading applications.
 */

//% weight=88 color=#9370DB icon="\uf14e"
//% groups=['Reading', 'Configuration', 'others']
namespace piicodev {

    /**
     * MMC5603 Magnetometer class
     */
    class MMC5603 {
        private addr: number;

        private static readonly REG_XOUT0 = 0x00;
        private static readonly REG_STATUS = 0x18;
        private static readonly REG_CTRL0 = 0x1B;
        private static readonly REG_CTRL1 = 0x1C;
        private static readonly REG_PRODUCT_ID = 0x39;

        private static readonly I2C_DEFAULT_ADDRESS = 0x30;

        constructor(address: number = MMC5603.I2C_DEFAULT_ADDRESS) {
            this.addr = address;
            this.initialize();
        }

        /**
         * Initialize the sensor
         */
        private initialize(): void {
            try {
                // Verify device ID
                let id = picodevUnified.readRegisterByte(this.addr, MMC5603.REG_PRODUCT_ID);
                if (id !== 0x30) {
                    // Device ID mismatch, but continue
                }

                // Reset sensor
                this.reset();
                basic.pause(20);

                // Enable continuous mode
                let ctrl1 = picodevUnified.readRegisterByte(this.addr, MMC5603.REG_CTRL1);
                ctrl1 = ctrl1 | 0x80; // Enable continuous measurement
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, ctrl1);
                picodevUnified.writeRegister(this.addr, MMC5603.REG_CTRL1, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Reset the sensor
         */
        private reset(): void {
            try {
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, 0x80);
                picodevUnified.writeRegister(this.addr, MMC5603.REG_CTRL0, buf);
            } catch (e) {
                // Silently fail
            }
        }

        /**
         * Read magnetic field on X axis
         */
        readX(): number {
            try {
                let buf = picodevUnified.readRegister(this.addr, MMC5603.REG_XOUT0, 2);
                if (buf.length < 2) return 0;
                // Extract 20-bit value from first 2 bytes
                let raw = ((buf[0] << 8) | buf[1]);
                raw = (raw >> 4) & 0xFFF;
                return raw - 4096; // Centered at 4096
            } catch (e) {
                return 0;
            }
        }

        /**
         * Read magnetic field on Y axis
         */
        readY(): number {
            try {
                let buf = picodevUnified.readRegister(this.addr, 0x02, 2);
                if (buf.length < 2) return 0;
                let raw = ((buf[0] << 8) | buf[1]);
                raw = (raw >> 4) & 0xFFF;
                return raw - 4096;
            } catch (e) {
                return 0;
            }
        }

        /**
         * Read magnetic field on Z axis
         */
        readZ(): number {
            try {
                let buf = picodevUnified.readRegister(this.addr, 0x04, 2);
                if (buf.length < 2) return 0;
                let raw = ((buf[0] << 8) | buf[1]);
                raw = (raw >> 4) & 0xFFF;
                return raw - 4096;
            } catch (e) {
                return 0;
            }
        }

        /**
         * Get magnetic heading in degrees (0-360)
         */
        getHeading(): number {
            let x = this.readX();
            let y = this.readY();

            const PI = 3.14159265359;
            const RAD_TO_DEG = 180 / PI;

            let angle = Math.atan2(y, x) * RAD_TO_DEG;
            if (angle < 0) angle += 360;

            return angle;
        }
    }

    let mmc5603: MMC5603;

    /**
     * Initialize the MMC5603 magnetometer
     * @param address I2C address (default: 0x30)
     */
    //% blockId=mmc5603_create
    //% block="MMC5603 initialize at address $address"
    //% address.defl=0x30
    //% advanced=true
    //% weight=100
    export function createMMC5603(address: number = 0x30): void {
        mmc5603 = new MMC5603(address);
    }

    /**
     * Read magnetic field on X axis
     */
    //% blockId=mmc5603_read_x
    //% block="MMC5603 magnetic X"
    //% group="Reading"
    //% weight=100
    export function readMMC5603X(): number {
        if (!mmc5603) {
            createMMC5603();
        }
        return mmc5603.readX();
    }

    /**
     * Read magnetic field on Y axis
     */
    //% blockId=mmc5603_read_y
    //% block="MMC5603 magnetic Y"
    //% group="Reading"
    //% weight=99
    export function readMMC5603Y(): number {
        if (!mmc5603) {
            createMMC5603();
        }
        return mmc5603.readY();
    }

    /**
     * Read magnetic field on Z axis
     */
    //% blockId=mmc5603_read_z
    //% block="MMC5603 magnetic Z"
    //% group="Reading"
    //% weight=98
    export function readMMC5603Z(): number {
        if (!mmc5603) {
            createMMC5603();
        }
        return mmc5603.readZ();
    }

    /**
     * Get compass heading in degrees (0-360)
     * 0° = North, 90° = East, 180° = South, 270° = West
     */
    //% blockId=mmc5603_get_heading
    //% block="MMC5603 heading (degrees)"
    //% group="Reading"
    //% weight=97
    export function getMMC5603Heading(): number {
        if (!mmc5603) {
            createMMC5603();
        }
        return Math.round(mmc5603.getHeading() * 10) / 10;
    }
}
