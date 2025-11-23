/**
 * PiicoDev MMC5603 3-Axis Magnetometer
 * 
 * Measures magnetic field strength in 3 axes (X, Y, Z).
 * Provides compass heading and magnetic field magnitude readings.
 */

//% weight=76 color=#00A4A6 icon="\uf14e"
//% groups=['Environment']
namespace piicodev {

    /**
     * Axis selection for magnetometer
     */
    export enum MagAxis {
        //% block="X"
        X = 0,
        //% block="Y"
        Y = 1,
        //% block="Z"
        Z = 2
    }

    /**
     * MMC5603 Magnetometer class
     */
    class MMC5603 {
        private addr: number;
        private declination: number;
        private xOffset: number;
        private yOffset: number;
        private zOffset: number;
        private sensitivity: number;
        private lastReading: { x: number, y: number, z: number };

        // Register addresses
        private static readonly REG_XOUT0 = 0x00;
        private static readonly REG_XOUT1 = 0x01;
        private static readonly REG_YOUT0 = 0x02;
        private static readonly REG_YOUT1 = 0x03;
        private static readonly REG_ZOUT0 = 0x04;
        private static readonly REG_ZOUT1 = 0x05;
        private static readonly REG_TEMP = 0x09;
        private static readonly REG_STATUS = 0x18;
        private static readonly REG_ODR = 0x1A;
        private static readonly REG_CTRL0 = 0x1B;
        private static readonly REG_CTRL1 = 0x1C;
        private static readonly REG_CTRL2 = 0x1D;
        private static readonly REG_PRODUCT_ID = 0x39;

        // Control bits
        private static readonly BIT_TAKE_MEAS_M = 0x01;
        private static readonly BIT_TAKE_MEAS_T = 0x02;
        private static readonly BIT_DO_SET = 0x08;
        private static readonly BIT_DO_RESET = 0x10;
        private static readonly BIT_AUTO_SR = 0x04;

        // Device constants
        private static readonly I2C_ADDRESS = 0x30;
        private static readonly PRODUCT_ID = 0x10;

        constructor(address: number = MMC5603.I2C_ADDRESS) {
            this.addr = address;
            this.declination = 0;
            this.xOffset = 0;
            this.yOffset = 0;
            this.zOffset = 0;
            this.sensitivity = 0.0625; // 20-bit mode sensitivity in uT/LSB
            this.lastReading = { x: 0, y: 0, z: 0 };

            this.initialize();
        }

        /**
         * Initialize the magnetometer
         */
        private initialize(): void {
            try {
                // Check product ID
                let productId = picodevUnified.readRegisterByte(this.addr, MMC5603.REG_PRODUCT_ID);
                if (productId !== MMC5603.PRODUCT_ID) {
                    // Device not found or wrong device
                    return;
                }

                // Reset sensor
                this.reset();

                // Set output data rate to maximum (255 = ~1000Hz)
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, 255);
                picodevUnified.writeRegister(this.addr, MMC5603.REG_ODR, buf);

                // Enable continuous mode
                this.enableContinuousMode();

                basic.pause(5);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Reset the sensor
         */
        private reset(): void {
            try {
                // Software reset
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, 0x80);
                picodevUnified.writeRegister(this.addr, MMC5603.REG_CTRL1, buf);
                basic.pause(20);

                // Perform SET/RESET to eliminate offset errors
                this.setReset();
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Perform SET and RESET operations to eliminate offset errors
         */
        private setReset(): void {
            try {
                // Perform SET operation
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, MMC5603.BIT_DO_SET);
                picodevUnified.writeRegister(this.addr, MMC5603.REG_CTRL0, buf);
                basic.pause(1);

                // Perform RESET operation
                buf.setNumber(NumberFormat.UInt8LE, 0, MMC5603.BIT_DO_RESET);
                picodevUnified.writeRegister(this.addr, MMC5603.REG_CTRL0, buf);
                basic.pause(1);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Enable continuous measurement mode
         */
        private enableContinuousMode(): void {
            try {
                let buf = pins.createBuffer(1);

                // Enable continuous mode (bit 7 of CTRL0)
                buf.setNumber(NumberFormat.UInt8LE, 0, 0x80);
                picodevUnified.writeRegister(this.addr, MMC5603.REG_CTRL0, buf);

                // Enable continuous mode on CTRL2 (bit 4)
                buf.setNumber(NumberFormat.UInt8LE, 0, 0x10);
                picodevUnified.writeRegister(this.addr, MMC5603.REG_CTRL2, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Read raw magnetic field data
         */
        private readRaw(): { x: number, y: number, z: number } {
            try {
                // Read 6 bytes starting from XOUT0
                let data = picodevUnified.readRegisterBlock(this.addr, MMC5603.REG_XOUT0, 6);

                // Combine bytes (16-bit values, big-endian)
                let x = (data[0] << 8) | data[1];
                let y = (data[2] << 8) | data[3];
                let z = (data[4] << 8) | data[5];

                // Convert to signed (subtract 2^15 to center at zero)
                x -= 32768;
                y -= 32768;
                z -= 32768;

                // Apply offsets and sensitivity
                x = (x - this.xOffset) * this.sensitivity;
                y = (y - this.yOffset) * this.sensitivity;
                z = (z - this.zOffset) * this.sensitivity;

                this.lastReading = { x: x, y: y, z: z };
                return this.lastReading;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return { x: 0, y: 0, z: 0 };
            }
        }

        /**
         * Get magnetic field strength for a specific axis
         */
        getMagneticField(axis: MagAxis): number {
            let data = this.readRaw();
            if (axis === MagAxis.X) return data.x;
            if (axis === MagAxis.Y) return data.y;
            return data.z;
        }

        /**
         * Get compass heading in degrees (0-360)
         */
        getHeading(): number {
            let data = this.readRaw();

            // Calculate angle using atan2 (X and -Y for proper compass orientation)
            let angle = Math.atan2(data.x, -data.y) * 180 / Math.PI;

            // Add declination correction
            angle += this.declination;

            // Normalize to 0-360 range
            angle = this.normalizeAngle(angle);

            return angle;
        }

        /**
         * Get total magnetic field magnitude in microTeslas (uT)
         */
        getMagnitude(): number {
            let data = this.readRaw();
            return Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
        }

        /**
         * Set magnetic declination for compass correction
         * @param declination Magnetic declination in degrees
         */
        setDeclination(declination: number): void {
            this.declination = declination;
        }

        /**
         * Normalize angle to 0-360 range
         */
        private normalizeAngle(angle: number): number {
            while (angle >= 360) {
                angle -= 360;
            }
            while (angle < 0) {
                angle += 360;
            }
            return angle;
        }

        /**
         * Set calibration offsets
         * Note: Calibration must be performed externally
         */
        setCalibration(xOffset: number, yOffset: number, zOffset: number): void {
            this.xOffset = xOffset;
            this.yOffset = yOffset;
            this.zOffset = zOffset;
        }
    }

    // Global magnetometer instance
    let _mmc5603: MMC5603 = null;

    /**
     * Read magnetic field strength on a specific axis
     * @param axis Axis to read (X, Y, or Z)
     * @returns Magnetic field strength in microTeslas (uT)
     */
    //% blockId=mmc5603_read_field
    //% block="magnetometer read $axis axis (μT)"
    //% group="Reading"
    //% weight=100
    export function mmc5603MagneticField(axis: MagAxis): number {
        if (!_mmc5603) {
            _mmc5603 = new MMC5603();
        }
        return _mmc5603.getMagneticField(axis);
    }

    /**
     * Read compass heading
     * @returns Heading in degrees (0-360), where 0° is North
     */
    //% blockId=mmc5603_read_heading
    //% block="magnetometer heading (°)"
    //% group="Compass"
    //% weight=99
    export function mmc5603Heading(): number {
        if (!_mmc5603) {
            _mmc5603 = new MMC5603();
        }
        return _mmc5603.getHeading();
    }

    /**
     * Read total magnetic field magnitude
     * @returns Magnetic field magnitude in microTeslas (uT)
     */
    //% blockId=mmc5603_read_magnitude
    //% block="magnetometer field strength (μT)"
    //% group="Reading"
    //% weight=98
    export function mmc5603Magnitude(): number {
        if (!_mmc5603) {
            _mmc5603 = new MMC5603();
        }
        return _mmc5603.getMagnitude();
    }

    /**
     * Set magnetic declination for compass correction
     * Find your local declination at: https://www.magnetic-declination.com/
     * @param declination Magnetic declination in degrees (positive = East, negative = West)
     */
    //% blockId=mmc5603_set_declination
    //% block="magnetometer set declination to $declination °"
    //% declination.defl=0
    //% group="Compass"
    //% weight=90
    export function mmc5603SetDeclination(declination: number): void {
        if (!_mmc5603) {
            _mmc5603 = new MMC5603();
        }
        _mmc5603.setDeclination(declination);
    }

    /**
     * Set calibration offsets (advanced)
     * Calibration must be performed externally. These values compensate
     * for hard-iron distortions and sensor offsets.
     * @param xOffset X-axis offset
     * @param yOffset Y-axis offset
     * @param zOffset Z-axis offset
     */
    //% blockId=mmc5603_set_calibration
    //% block="magnetometer calibrate | X $xOffset | Y $yOffset | Z $zOffset"
    //% xOffset.defl=0
    //% yOffset.defl=0
    //% zOffset.defl=0
    //% group="Configuration"
    //% weight=80
    //% advanced=true
    //% inlineInputMode=inline
    export function mmc5603SetCalibration(xOffset: number, yOffset: number, zOffset: number): void {
        if (!_mmc5603) {
            _mmc5603 = new MMC5603();
        }
        _mmc5603.setCalibration(xOffset, yOffset, zOffset);
    }
}
