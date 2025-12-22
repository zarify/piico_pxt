/**
 * PiicoDev LIS3DH 3-Axis Accelerometer
 * 
 * Measures acceleration in 3 axes (X, Y, Z) and provides tilt angle calculations.
 * Supports tap detection, shake detection, and configurable sensitivity ranges.
 */

//% weight=90 color=#E63022 icon="\uf135"
//% groups=['LIS3DH Accelerometer']
namespace PiicoDevMotion {

    /**
     * Acceleration range setting
     */
    export enum AccelRange {
        //% block="±2g (most sensitive)"
        Range2G = 2,
        //% block="±4g"
        Range4G = 4,
        //% block="±8g"
        Range8G = 8,
        //% block="±16g (least sensitive)"
        Range16G = 16
    }

    /**
     * Data rate setting in Hz
     */
    export enum DataRate {
        //% block="power down (0 Hz)"
        PowerDown = 0,
        //% block="1 Hz"
        Rate1Hz = 1,
        //% block="10 Hz"
        Rate10Hz = 10,
        //% block="25 Hz"
        Rate25Hz = 25,
        //% block="50 Hz"
        Rate50Hz = 50,
        //% block="100 Hz"
        Rate100Hz = 100,
        //% block="200 Hz"
        Rate200Hz = 200,
        //% block="400 Hz (default)"
        Rate400Hz = 400
    }

    /**
     * Accelerometer events
     */
    export enum AccelEvent {
        //% block="tapped"
        Tapped = 1,
        //% block="shaken"
        Shaken = 2
    }

    /**
     * Axis selection
     */
    export enum Axis {
        //% block="X"
        X = 0,
        //% block="Y"
        Y = 1,
        //% block="Z"
        Z = 2
    }

    /**
     * PiicoDev LIS3DH Accelerometer class
     */
    class LIS3DH {
        private addr: number;
        private _range: number;
        private _rate: number;
        private _tapThreshold: number;
        private _shakeThreshold: number;
        private eventId: number;
        private pollingStarted: boolean;

        // Register addresses
        private static readonly REG_WHOAMI = 0x0F;
        private static readonly REG_OUT_X_L = 0x28;
        private static readonly REG_CTRL_REG_1 = 0x20;
        private static readonly REG_CTRL_REG_2 = 0x21;
        private static readonly REG_CTRL_REG_3 = 0x22;
        private static readonly REG_CTRL_REG_4 = 0x23;
        private static readonly REG_CTRL_REG_5 = 0x25;
        private static readonly REG_INT1_SRC = 0x31;
        private static readonly REG_CLICK_CFG = 0x38;
        private static readonly REG_CLICKSRC = 0x39;
        private static readonly REG_CLICK_THS = 0x3A;
        private static readonly REG_TIME_LIMIT = 0x3B;
        private static readonly REG_TIME_LATENCY = 0x3C;
        private static readonly REG_TIME_WINDOW = 0x3D;
        private static readonly REG_STATUS_REG = 0x27;

        // Device ID
        private static readonly DEVICE_ID = 0x33;

        // Default I2C addresses
        private static readonly I2C_ADDRESS = 0x19;
        private static readonly I2C_ADDRESS_ALT = 0x18;

        constructor(address: number = LIS3DH.I2C_ADDRESS) {
            this.addr = address;
            this._range = 2;
            this._rate = 400;
            this._tapThreshold = 40;
            this._shakeThreshold = 15;
            this.eventId = 3100; // Event source ID for accelerometer
            this.pollingStarted = false;
            this.initialize();
        }

        /**
         * Initialize the sensor with default settings
         */
        private initialize(): void {
            try {
                basic.pause(5);

                // Verify device ID
                let deviceId = this.readRegisterByte(LIS3DH.REG_WHOAMI);
                if (deviceId !== LIS3DH.DEVICE_ID) {
                    serial.writeLine("Warning: device not recognized as LIS3DH");
                }

                // Enable all axes with normal mode
                // 0x07 = enable X, Y, Z axes
                let buf1 = pins.createBuffer(1);
                buf1.setNumber(NumberFormat.UInt8LE, 0, 0x07);
                this.writeRegister(LIS3DH.REG_CTRL_REG_1, buf1);

                // Configure CTRL_REG_4 for high resolution mode
                // 0x88 = BDU enabled (bit 7) + HR enabled (bit 3)
                let buf4 = pins.createBuffer(1);
                buf4.setNumber(NumberFormat.UInt8LE, 0, 0x88);
                this.writeRegister(LIS3DH.REG_CTRL_REG_4, buf4);

                // Set default range and rate
                this.setRange(AccelRange.Range2G);
                this.setRate(DataRate.Rate400Hz);

                // Enable tap detection by default
                this.enableTapDetection();
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Enable tap detection (called automatically during initialization)
         */
        private enableTapDetection(): void {
            try {
                let threshold = this._tapThreshold | 0x80; // Threshold with bit 7 set

                // Enable tap interrupt on INT1
                let ctrl3 = this.readRegisterByte(LIS3DH.REG_CTRL_REG_3);
                ctrl3 = this.setBit(ctrl3, 7);
                let buf1 = pins.createBuffer(1);
                buf1.setNumber(NumberFormat.UInt8LE, 0, ctrl3);
                this.writeRegister(LIS3DH.REG_CTRL_REG_3, buf1);

                // Enable latched interrupt
                let buf2 = pins.createBuffer(1);
                buf2.setNumber(NumberFormat.UInt8LE, 0, 0x08);
                this.writeRegister(LIS3DH.REG_CTRL_REG_5, buf2);

                // Configure single tap on X, Y, Z (0x15)
                let buf3 = pins.createBuffer(1);
                buf3.setNumber(NumberFormat.UInt8LE, 0, 0x15);
                this.writeRegister(LIS3DH.REG_CLICK_CFG, buf3);

                // Write tap parameters (threshold and time limit)
                let tapParams = pins.createBuffer(2);
                tapParams.setNumber(NumberFormat.UInt8LE, 0, threshold);
                tapParams.setNumber(NumberFormat.UInt8LE, 1, 10); // time limit
                this.writeRegister(LIS3DH.REG_CLICK_THS | 0x80, tapParams);
            } catch (e) {
                // Silent fail - tap detection is optional
            }
        }

        /**
         * Start background polling to detect accelerometer events
         */
        public startEventPolling(): void {
            if (this.pollingStarted) {
                return;  // Already polling
            }
            this.pollingStarted = true;

            control.inBackground(() => {
                while (true) {
                    this.pollEvents();
                    basic.pause(50);  // Poll every 50ms
                }
            });
        }

        /**
         * Poll accelerometer and raise events
         */
        private pollEvents(): void {
            try {
                // Check for tap
                if (this.tapped()) {
                    control.raiseEvent(this.eventId, 1); // AccelEvent.Tapped
                }

                // Check for shake
                if (this.shake(this._shakeThreshold)) {
                    control.raiseEvent(this.eventId, 2); // AccelEvent.Shaken
                }
            } catch (e) {
                // Silently handle errors during polling
            }
        }

        /**
         * Check if new data is ready
         */
        public dataReady(): boolean {
            try {
                let status = this.readRegisterByte(LIS3DH.REG_STATUS_REG);
                return ((status >> 3) & 1) === 1; // Check bit 3
            } catch (e) {
                return false;
            }
        }

        /**
         * Set the acceleration measurement range
         * @param r Range in g (2, 4, 8, or 16)
         */
        //% blockId=lis3dh_set_range
        //% block="LIS3DH set range $r"
        //% group="LIS3DH Accelerometer"
        //% weight=90
        public setRange(r: AccelRange): void {
            try {
                let rangeCode = 0;
                if (r === 2) rangeCode = 0;
                else if (r === 4) rangeCode = 1;
                else if (r === 8) rangeCode = 2;
                else if (r === 16) rangeCode = 3;
                else {
                    serial.writeLine("LIS3DH: Invalid range. Use 2, 4, 8, or 16");
                    return;
                }

                // Read current value, modify bits [5:4], write back
                let val = this.readRegisterByte(LIS3DH.REG_CTRL_REG_4);
                val = this.writeCrumb(val, 4, rangeCode);
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, val);
                this.writeRegister(LIS3DH.REG_CTRL_REG_4, buf);

                this._range = r;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Set the data rate (sampling frequency)
         * @param r Rate in Hz (0, 1, 10, 25, 50, 100, 200, 400)
         */
        //% blockId=lis3dh_set_rate
        //% block="LIS3DH set data rate $r"
        //% group="LIS3DH Accelerometer"
        //% weight=85
        public setRate(r: DataRate): void {
            try {
                let rateCode = 0;
                if (r === 0) rateCode = 0;
                else if (r === 1) rateCode = 1;
                else if (r === 10) rateCode = 2;
                else if (r === 25) rateCode = 3;
                else if (r === 50) rateCode = 4;
                else if (r === 100) rateCode = 5;
                else if (r === 200) rateCode = 6;
                else if (r === 400) rateCode = 7;
                else {
                    serial.writeLine("LIS3DH: Invalid rate. Use 0, 1, 10, 25, 50, 100, 200, or 400");
                    return;
                }

                // Read current value, modify bits [7:4], write back
                let val = this.readRegisterByte(LIS3DH.REG_CTRL_REG_1);
                val = val & 0x0F; // Clear upper nibble
                val = val | (rateCode << 4); // Set new rate
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, val);
                this.writeRegister(LIS3DH.REG_CTRL_REG_1, buf);

                this._rate = r;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Read X-axis acceleration in m/s²
         */
        //% blockId=lis3dh_read_x
        //% block="LIS3DH acceleration X (m/s²)"
        //% group="LIS3DH Accelerometer"
        //% weight=100
        public readX(): number {
            let accel = this.readAcceleration();
            return accel[0];
        }

        /**
         * Read Y-axis acceleration in m/s²
         */
        //% blockId=lis3dh_read_y
        //% block="LIS3DH acceleration Y (m/s²)"
        //% group="LIS3DH Accelerometer"
        //% weight=99
        public readY(): number {
            let accel = this.readAcceleration();
            return accel[1];
        }

        /**
         * Read Z-axis acceleration in m/s²
         */
        //% blockId=lis3dh_read_z
        //% block="LIS3DH acceleration Z (m/s²)"
        //% group="LIS3DH Accelerometer"
        //% weight=98
        public readZ(): number {
            let accel = this.readAcceleration();
            return accel[2];
        }

        /**
         * Read all three axes of acceleration
         * @returns Array [x, y, z] in m/s²
         */
        private readAcceleration(): number[] {
            try {
                // Read 6 bytes starting from OUT_X_L with auto-increment (bit 7 set)
                let data = this.readRegisterMulti(LIS3DH.REG_OUT_X_L | 0x80, 6);

                // Parse 16-bit signed values (little-endian)
                let x = this.toSigned16(data.getNumber(NumberFormat.UInt16LE, 0));
                let y = this.toSigned16(data.getNumber(NumberFormat.UInt16LE, 2));
                let z = this.toSigned16(data.getNumber(NumberFormat.UInt16LE, 4));

                // Convert to m/s² using divisors based on range
                // These divisors match the Python implementation
                let divisor = 16384.0; // Default for ±2g
                if (this._range === 2) divisor = 1670.295;
                else if (this._range === 4) divisor = 835.1476;
                else if (this._range === 8) divisor = 417.6757;
                else if (this._range === 16) divisor = 139.1912;

                return [
                    Math.round((x / divisor) * 100) / 100,
                    Math.round((y / divisor) * 100) / 100,
                    Math.round((z / divisor) * 100) / 100
                ];
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return [0, 0, 0];
            }
        }

        /**
         * Read X-axis tilt angle in degrees
         */
        //% blockId=lis3dh_angle_x
        //% block="LIS3DH tilt angle X (degrees)"
        //% group="LIS3DH Accelerometer"
        //% weight=95
        public angleX(): number {
            let angles = this.readAngles();
            return angles[0];
        }

        /**
         * Read Y-axis tilt angle in degrees
         */
        //% blockId=lis3dh_angle_y
        //% block="LIS3DH tilt angle Y (degrees)"
        //% group="LID3DH Accelerometer"
        //% weight=94
        public angleY(): number {
            let angles = this.readAngles();
            return angles[1];
        }

        /**
         * Read Z-axis tilt angle in degrees
         */
        //% blockId=lis3dh_angle_z
        //% block="LIS3DH tilt angle Z (degrees)"
        //% group="LIS3DH Accelerometer"
        //% weight=93
        public angleZ(): number {
            let angles = this.readAngles();
            return angles[2];
        }

        /**
         * Calculate tilt angles from acceleration
         * @returns Array [angleX, angleY, angleZ] in degrees
         */
        private readAngles(): number[] {
            let accel = this.readAcceleration();
            let x = accel[0];
            let y = accel[1];
            let z = accel[2];

            // Calculate angles using atan2 (matches Python implementation)
            let ay = this.rad2deg(Math.atan2(z, x));
            let az = this.rad2deg(Math.atan2(x, y));
            let ax = this.rad2deg(Math.atan2(y, z));

            return [
                Math.round(ax * 10) / 10,
                Math.round(ay * 10) / 10,
                Math.round(az * 10) / 10
            ];
        }

        /**
         * Set tap detection sensitivity
         * @param threshold Tap threshold (0-127). Lower = more sensitive. Default is 40.
         */
        //% blockId=lis3dh_set_tap_sensitivity
        //% block="LIS3DH set tap sensitivity $threshold"
        //% group="LIS3DH Accelerometer"
        //% weight=70
        //% threshold.min=0 threshold.max=127 threshold.defl=40
        //% advanced=true
        public setTapSensitivity(threshold: number): void {
            if (threshold < 0 || threshold > 127) {
                threshold = 40; // Default on invalid input
            }
            this._tapThreshold = threshold;
            // Re-enable tap detection with new threshold
            this.enableTapDetection();
        }

        /**
         * Set shake detection sensitivity
         * @param threshold Shake threshold (minimum 10). Lower = more sensitive. Default is 15.
         */
        //% blockId=lis3dh_set_shake_sensitivity
        //% block="LIS3DH set shake sensitivity $threshold"
        //% group="LIS3DH Accelerometer"
        //% weight=65
        //% threshold.min=10 threshold.max=50 threshold.defl=15
        //% advanced=true
        public setShakeSensitivity(threshold: number): void {
            if (threshold < 10) {
                threshold = 10; // Minimum threshold
            }
            this._shakeThreshold = threshold;
        }

        /**
         * Check if a tap was detected
         */
        //% blockId=lis3dh_tapped
        //% block="LIS3DH tap detected"
        //% group="LIS3DH Accelerometer"
        //% weight=75
        public tapped(): boolean {
            try {
                let raw = this.readRegisterByte(LIS3DH.REG_CLICKSRC);
                if ((raw & 0x40) !== 0) { // Check bit 6
                    // Clear interrupt by reading INT1_SRC
                    this.readRegisterByte(LIS3DH.REG_INT1_SRC);
                    return true;
                }
                return false;
            } catch (e) {
                return false;
            }
        }

        /**
         * Detect when the accelerometer is shaken
         * @param threshold Shake threshold (minimum 10, default 15)
         * @param avgCount Number of readings to average (default 40)
         * @param totalDelay Total time in ms for averaging (default 100)
         */
        //% blockId=lis3dh_shake
        //% block="LIS3DH shake detected"
        //% group="LIS3DH Accelerometer"
        //% weight=90
        //% expandableArgumentMode="toggle"
        //% threshold.defl=15
        //% avgCount.defl=40
        //% totalDelay.defl=100
        public shake(
            threshold: number = 15,
            avgCount: number = 40,
            totalDelay: number = 100
        ): boolean {
            try {
                let sumX = 0;
                let sumY = 0;
                let sumZ = 0;
                let delayPerReading = Math.round(totalDelay / avgCount);

                // Collect multiple readings
                for (let i = 0; i < avgCount; i++) {
                    let accel = this.readAcceleration();
                    sumX += accel[0];
                    sumY += accel[1];
                    sumZ += accel[2];
                    basic.pause(delayPerReading);
                }

                // Calculate average
                let avgX = sumX / avgCount;
                let avgY = sumY / avgCount;
                let avgZ = sumZ / avgCount;

                // Calculate total acceleration magnitude
                let totalAccel = Math.sqrt(avgX * avgX + avgY * avgY + avgZ * avgZ);

                return totalAccel > threshold;
            } catch (e) {
                return false;
            }
        }

        // ========== Helper Methods ==========

        /**
         * Read a single byte from a register
         */
        private readRegisterByte(reg: number): number {
            let data = picodevUnified.readRegister(this.addr, reg, 1);
            return data.getNumber(NumberFormat.UInt8LE, 0);
        }

        /**
         * Read multiple bytes from a register
         */
        private readRegisterMulti(reg: number, length: number): Buffer {
            return picodevUnified.readRegister(this.addr, reg, length);
        }

        /**
         * Write data to a register
         */
        private writeRegister(reg: number, data: Buffer): void {
            picodevUnified.writeRegister(this.addr, reg, data);
        }

        /**
         * Convert unsigned 16-bit to signed
         */
        private toSigned16(val: number): number {
            if (val > 32767) {
                return val - 65536;
            }
            return val;
        }

        /**
         * Convert radians to degrees
         */
        private rad2deg(rad: number): number {
            return rad * 180 / Math.PI;
        }

        /**
         * Set a specific bit
         */
        private setBit(x: number, n: number): number {
            return x | (1 << n);
        }

        /**
         * Clear a specific bit
         */
        private clearBit(x: number, n: number): number {
            return x & ~(1 << n);
        }

        /**
         * Read a specific bit
         */
        private readBit(x: number, n: number): number {
            return (x & (1 << n)) !== 0 ? 1 : 0;
        }

        /**
         * Write a 2-bit value (crumb) at position n
         */
        private writeCrumb(x: number, n: number, c: number): number {
            x = this.writeBit(x, n, this.readBit(c, 0));
            x = this.writeBit(x, n + 1, this.readBit(c, 1));
            return x;
        }

        /**
         * Write a single bit value
         */
        private writeBit(x: number, n: number, b: number): number {
            if (b === 0) {
                return this.clearBit(x, n);
            } else {
                return this.setBit(x, n);
            }
        }
    }

    // Internal singleton instance
    let _lis3dh: LIS3DH;

    /**
     * Read acceleration on a specific axis in m/s²
     * @param axis The axis to read (X, Y, or Z)
     */
    //% blockId=lis3dh_read_acceleration
    //% block="LIS3DH acceleration $axis (m/s²)"
    //% group="LIS3DH Accelerometer"
    //% weight=100
    export function lis3dhAcceleration(axis: Axis): number {
        if (!_lis3dh) _lis3dh = new LIS3DH();
        if (axis === Axis.X) return _lis3dh.readX();
        else if (axis === Axis.Y) return _lis3dh.readY();
        else return _lis3dh.readZ();
    }

    /**
     * Read tilt angle on a specific axis in degrees
     * @param axis The axis to read (X, Y, or Z)
     */
    //% blockId=lis3dh_read_angle
    //% block="LIS3DH tilt angle $axis (degrees)"
    //% group="LIS3DH Accelerometer"
    //% weight=95
    export function lis3dhAngle(axis: Axis): number {
        if (!_lis3dh) _lis3dh = new LIS3DH();
        if (axis === Axis.X) return _lis3dh.angleX();
        else if (axis === Axis.Y) return _lis3dh.angleY();
        else return _lis3dh.angleZ();
    }

    /**
     * Set the acceleration measurement range
     * @param r Range in g (2, 4, 8, or 16)
     */
    //% blockId=lis3dh_set_range
    //% block="LIS3DH set range $r"
    //% group="LIS3DH Accelerometer"
    //% advanced=true
    //% weight=90
    export function lis3dhSetRange(r: AccelRange): void {
        if (!_lis3dh) _lis3dh = new LIS3DH();
        _lis3dh.setRange(r);
    }

    /**
     * Set the data rate (sampling frequency)
     * @param r Rate in Hz (0, 1, 10, 25, 50, 100, 200, 400)
     */
    //% blockId=lis3dh_set_rate
    //% block="LIS3DH set data rate $r"
    //% group="LIS3DH Accelerometer"
    //% advanced=true
    //% weight=85
    export function lis3dhSetRate(r: DataRate): void {
        if (!_lis3dh) _lis3dh = new LIS3DH();
        _lis3dh.setRate(r);
    }

    /**
     * Check if a tap was detected
     */
    //% blockId=lis3dh_tapped
    //% block="LIS3DH tap detected"
    //% group="LIS3DH Accelerometer"
    //% weight=75
    export function lis3dhTapped(): boolean {
        if (!_lis3dh) _lis3dh = new LIS3DH();
        return _lis3dh.tapped();
    }

    /**
     * Detect when the accelerometer is shaken
     */
    //% blockId=lis3dh_shake
    //% block="LIS3DH shake detected"
    //% group="LIS3DH Accelerometer"
    //% weight=90
    export function lis3dhShake(): boolean {
        if (!_lis3dh) _lis3dh = new LIS3DH();
        return _lis3dh.shake();
    }

    /**
     * Set tap detection sensitivity
     * @param threshold Tap threshold (0-127). Lower = more sensitive. Default is 40.
     */
    //% blockId=lis3dh_set_tap_sensitivity
    //% block="LIS3DH set tap sensitivity $threshold"
    //% group="LIS3DH Accelerometer"
    //% weight=70
    //% threshold.min=0 threshold.max=127 threshold.defl=40
    //% advanced=true
    export function lis3dhSetTapSensitivity(threshold: number): void {
        if (!_lis3dh) _lis3dh = new LIS3DH();
        _lis3dh.setTapSensitivity(threshold);
    }

    /**
     * Set shake detection sensitivity
     * @param threshold Shake threshold (minimum 10). Lower = more sensitive. Default is 15.
     */
    //% blockId=lis3dh_set_shake_sensitivity
    //% block="LIS3DH set shake sensitivity $threshold"
    //% group="LIS3DH Accelerometer"
    //% weight=65
    //% threshold.min=10 threshold.max=50 threshold.defl=15
    //% advanced=true
    export function lis3dhSetShakeSensitivity(threshold: number): void {
        if (!_lis3dh) _lis3dh = new LIS3DH();
        _lis3dh.setShakeSensitivity(threshold);
    }

    /**
     * Register code to run when an accelerometer event occurs
     * @param event The event to handle (tapped or shaken)
     * @param handler The code to run when the event occurs
     */
    //% blockId=lis3dh_on_event
    //% block="on LIS3DH $event"
    //% group="LIS3DH Accelerometer"
    //% weight=100
    export function lis3dhOnEvent(event: AccelEvent, handler: () => void): void {
        if (!_lis3dh) _lis3dh = new LIS3DH();
        _lis3dh.startEventPolling();
        control.onEvent(3100, event, handler);
    }

}
