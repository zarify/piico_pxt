/**
 * PiicoDev LIS3DH 3-Axis Accelerometer
 * 
 * Measures acceleration on three axes with configurable range and sample rate.
 */

//% weight=85 color=#FF9500 icon="\uf021"
//% groups=['Reading', 'Configuration', 'others']
namespace piicodev {

    /**
     * Acceleration range setting
     */
    export enum AccelRange {
        //% block="±2g"
        Range2G = 2,
        //% block="±4g"
        Range4G = 4,
        //% block="±8g"
        Range8G = 8,
        //% block="±16g"
        Range16G = 16
    }

    /**
     * Sample rate setting
     */
    export enum SampleRate {
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
        //% block="400 Hz"
        Rate400Hz = 400
    }

    /**
     * LIS3DH 3-Axis Accelerometer class
     */
    class LIS3DH {
        private addr: number;
        private rangeG: number;
        private rateHz: number;

        private static readonly REG_WHOAMI = 0x0F;
        private static readonly REG_CTRL_REG1 = 0x20;
        private static readonly REG_CTRL_REG4 = 0x23;
        private static readonly REG_STATUS = 0x27;
        private static readonly REG_OUT_X_L = 0x28;

        private static readonly I2C_DEFAULT_ADDRESS = 0x18;
        private static readonly DEVICE_ID = 0x33;

        constructor(address: number = LIS3DH.I2C_DEFAULT_ADDRESS, range: AccelRange = AccelRange.Range2G, rate: SampleRate = SampleRate.Rate400Hz) {
            this.addr = address;
            this.rangeG = range;
            this.rateHz = rate;
            this.initialize();
        }

        /**
         * Initialize the sensor
         */
        private initialize(): void {
            try {
                let id = this.readByte(LIS3DH.REG_WHOAMI);
                if (id !== LIS3DH.DEVICE_ID) {
                    // Device ID mismatch, but continue
                }

                // Set data rate and enable axes
                this.configureRate();

                // Set range
                this.configureRange();
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Read a single byte register
         */
        private readByte(register: number): number {
            return picodevUnified.readRegisterByte(this.addr, register);
        }

        /**
         * Write a single byte register
         */
        private writeByte(register: number, value: number): void {
            let buf = pins.createBuffer(1);
            buf.setNumber(NumberFormat.UInt8LE, 0, value);
            picodevUnified.writeRegister(this.addr, register, buf);
        }

        /**
         * Read multiple bytes from a register
         */
        private readBytes(register: number, length: number): Buffer {
            return picodevUnified.readRegister(this.addr, register | 0x80, length);
        }

        /**
         * Configure data rate
         */
        private configureRate(): void {
            let rateMap: { [key: number]: number } = {
                1: 0, 10: 1, 25: 2, 50: 3, 100: 4, 200: 5, 400: 6
            };
            let rateVal = rateMap[this.rateHz] || 6;
            let ctrl1 = this.readByte(LIS3DH.REG_CTRL_REG1);
            ctrl1 = (ctrl1 & 0x0F) | ((rateVal << 4) & 0xF0);
            ctrl1 = ctrl1 | 0x07; // Enable all axes
            this.writeByte(LIS3DH.REG_CTRL_REG1, ctrl1);
        }

        /**
         * Configure range
         */
        private configureRange(): void {
            let rangeMap: { [key: number]: number } = {
                2: 0, 4: 1, 8: 2, 16: 3
            };
            let rangeVal = rangeMap[this.rangeG] || 0;
            let ctrl4 = this.readByte(LIS3DH.REG_CTRL_REG4);
            ctrl4 = (ctrl4 & 0xCF) | ((rangeVal << 4) & 0x30);
            this.writeByte(LIS3DH.REG_CTRL_REG4, ctrl4);
        }

        /**
         * Get acceleration in m/s²
         */
        getAcceleration(): { x: number, y: number, z: number } {
            try {
                let buffer = this.readBytes(LIS3DH.REG_OUT_X_L, 6);
                if (buffer.length < 6) {
                    return { x: 0, y: 0, z: 0 };
                }

                let x = buffer.getNumber(NumberFormat.Int16LE, 0);
                let y = buffer.getNumber(NumberFormat.Int16LE, 2);
                let z = buffer.getNumber(NumberFormat.Int16LE, 4);

                // Scale based on range (divisors from LIS3DH datasheet)
                let divisors: { [key: number]: number } = {
                    2: 1670.295, 4: 835.1476, 8: 417.6757, 16: 139.1912
                };
                let div = divisors[this.rangeG] || 1670.295;

                return {
                    x: x / div,
                    y: y / div,
                    z: z / div
                };
            } catch (e) {
                return { x: 0, y: 0, z: 0 };
            }
        }

        /**
         * Get tilt angles in degrees
         */
        getAngles(): { x: number, y: number, z: number } {
            let accel = this.getAcceleration();
            const PI = 3.14159265359;
            const RAD_TO_DEG = 180 / PI;

            let ax = Math.atan2(accel.z, accel.x) * RAD_TO_DEG;
            let ay = Math.atan2(accel.z, accel.y) * RAD_TO_DEG;
            let az = Math.atan2(accel.x, accel.y) * RAD_TO_DEG;

            return { x: ax, y: ay, z: az };
        }

        /**
         * Set acceleration range
         */
        setRange(range: AccelRange): void {
            this.rangeG = range;
            this.configureRange();
        }

        /**
         * Set sample rate
         */
        setRate(rate: SampleRate): void {
            this.rateHz = rate;
            this.configureRate();
        }
    }

    let lis3dh: LIS3DH;

    /**
     * Initialize the LIS3DH accelerometer
     * @param address I2C address (default: 0x18)
     * @param range Acceleration range (default: ±2g)
     * @param rate Sample rate (default: 400Hz)
     */
    //% blockId=lis3dh_create
    //% block="LIS3DH initialize at address $address range $range rate $rate"
    //% address.defl=0x18 range.defl=AccelRange.Range2G rate.defl=SampleRate.Rate400Hz
    //% advanced=true
    //% weight=100
    export function createLIS3DH(address: number = 0x18, range: AccelRange = AccelRange.Range2G, rate: SampleRate = SampleRate.Rate400Hz): void {
        lis3dh = new LIS3DH(address, range, rate);
    }

    /**
     * Read acceleration on X axis (m/s²)
     */
    //% blockId=lis3dh_read_accel_x
    //% block="LIS3DH acceleration X (m/s²)"
    //% group="Reading"
    //% weight=100
    export function readLIS3DHAccelX(): number {
        if (!lis3dh) {
            createLIS3DH();
        }
        return lis3dh.getAcceleration().x;
    }

    /**
     * Read acceleration on Y axis (m/s²)
     */
    //% blockId=lis3dh_read_accel_y
    //% block="LIS3DH acceleration Y (m/s²)"
    //% group="Reading"
    //% weight=99
    export function readLIS3DHAccelY(): number {
        if (!lis3dh) {
            createLIS3DH();
        }
        return lis3dh.getAcceleration().y;
    }

    /**
     * Read acceleration on Z axis (m/s²)
     */
    //% blockId=lis3dh_read_accel_z
    //% block="LIS3DH acceleration Z (m/s²)"
    //% group="Reading"
    //% weight=98
    export function readLIS3DHAccelZ(): number {
        if (!lis3dh) {
            createLIS3DH();
        }
        return lis3dh.getAcceleration().z;
    }

    /**
     * Read tilt angle on X axis (degrees)
     */
    //% blockId=lis3dh_read_angle_x
    //% block="LIS3DH angle X (degrees)"
    //% group="Reading"
    //% weight=95
    export function readLIS3DHAngleX(): number {
        if (!lis3dh) {
            createLIS3DH();
        }
        return lis3dh.getAngles().x;
    }

    /**
     * Read tilt angle on Y axis (degrees)
     */
    //% blockId=lis3dh_read_angle_y
    //% block="LIS3DH angle Y (degrees)"
    //% group="Reading"
    //% weight=94
    export function readLIS3DHAngleY(): number {
        if (!lis3dh) {
            createLIS3DH();
        }
        return lis3dh.getAngles().y;
    }

    /**
     * Read tilt angle on Z axis (degrees)
     */
    //% blockId=lis3dh_read_angle_z
    //% block="LIS3DH angle Z (degrees)"
    //% group="Reading"
    //% weight=93
    export function readLIS3DHAngleZ(): number {
        if (!lis3dh) {
            createLIS3DH();
        }
        return lis3dh.getAngles().z;
    }

    /**
     * Set acceleration range
     */
    //% blockId=lis3dh_set_range
    //% block="LIS3DH set range to $range"
    //% range.defl=AccelRange.Range2G
    //% group="Configuration"
    //% weight=50
    export function setLIS3DHRange(range: AccelRange): void {
        if (!lis3dh) {
            createLIS3DH();
        }
        lis3dh.setRange(range);
    }

    /**
     * Set sample rate
     */
    //% blockId=lis3dh_set_rate
    //% block="LIS3DH set rate to $rate"
    //% rate.defl=SampleRate.Rate400Hz
    //% group="Configuration"
    //% weight=49
    export function setLIS3DHRate(rate: SampleRate): void {
        if (!lis3dh) {
            createLIS3DH();
        }
        lis3dh.setRate(rate);
    }
}
