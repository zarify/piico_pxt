/**
 * PiicoDev BME280 Temperature, Humidity, and Pressure Sensor
 * 
 * Provides environmental sensing capabilities with compensation algorithms
 * for accurate temperature, humidity, and atmospheric pressure readings.
 */

//% weight=95 color=#0078D7 icon="\uf2c9"
namespace piicodev {

    /**
     * Oversampling mode for BME280 sensor
     */
    export enum Oversampling {
        //% block="skip (off)"
        Skip = 0,
        //% block="×1"
        X1 = 1,
        //% block="×2"
        X2 = 2,
        //% block="×4"
        X4 = 3,
        //% block="×8"
        X8 = 4,
        //% block="×16"
        X16 = 5
    }

    /**
     * IIR Filter coefficient for BME280
     */
    export enum IIRFilter {
        //% block="off"
        Off = 0,
        //% block="2"
        Coeff2 = 1,
        //% block="4"
        Coeff4 = 2,
        //% block="8"
        Coeff8 = 3,
        //% block="16"
        Coeff16 = 4
    }

    /**
     * BME280 Environment Sensor class
     */
    class BME280 {
        private addr: number;
        private tFine: number;
        private tempMode: Oversampling;
        private pressMode: Oversampling;
        private humidMode: Oversampling;
        private filterCoeff: IIRFilter;

        // Calibration data
        private T1: number;
        private T2: number;
        private T3: number;
        private P1: number;
        private P2: number;
        private P3: number;
        private P4: number;
        private P5: number;
        private P6: number;
        private P7: number;
        private P8: number;
        private P9: number;
        private H1: number;
        private H2: number;
        private H3: number;
        private H4: number;
        private H5: number;
        private H6: number;

        constructor(address: number = 0x77) {
            this.addr = address;
            this.tFine = 0;
            this.tempMode = Oversampling.X2;
            this.pressMode = Oversampling.X16;
            this.humidMode = Oversampling.X1;
            this.filterCoeff = IIRFilter.Coeff2;

            // Initialize calibration data with default values
            this.T1 = 0; this.T2 = 0; this.T3 = 0;
            this.P1 = 0; this.P2 = 0; this.P3 = 0;
            this.P4 = 0; this.P5 = 0; this.P6 = 0;
            this.P7 = 0; this.P8 = 0; this.P9 = 0;
            this.H1 = 0; this.H2 = 0; this.H3 = 0;
            this.H4 = 0; this.H5 = 0; this.H6 = 0;

            // Initialize sensor and read calibration data
            this.initialize();
        }

        /**
         * Initialize the sensor and read calibration coefficients
         */
        private initialize(): void {
            try {
                // Read calibration data from device
                this.T1 = picodevUnified.readRegisterUInt16LE(this.addr, 0x88);
                this.T2 = picodevUnified.toSigned(picodevUnified.readRegisterUInt16LE(this.addr, 0x8A));
                this.T3 = picodevUnified.toSigned(picodevUnified.readRegisterUInt16LE(this.addr, 0x8C));
                this.P1 = picodevUnified.readRegisterUInt16LE(this.addr, 0x8E);
                this.P2 = picodevUnified.toSigned(picodevUnified.readRegisterUInt16LE(this.addr, 0x90));
                this.P3 = picodevUnified.toSigned(picodevUnified.readRegisterUInt16LE(this.addr, 0x92));
                this.P4 = picodevUnified.toSigned(picodevUnified.readRegisterUInt16LE(this.addr, 0x94));
                this.P5 = picodevUnified.toSigned(picodevUnified.readRegisterUInt16LE(this.addr, 0x96));
                this.P6 = picodevUnified.toSigned(picodevUnified.readRegisterUInt16LE(this.addr, 0x98));
                this.P7 = picodevUnified.toSigned(picodevUnified.readRegisterUInt16LE(this.addr, 0x9A));
                this.P8 = picodevUnified.toSigned(picodevUnified.readRegisterUInt16LE(this.addr, 0x9C));
                this.P9 = picodevUnified.toSigned(picodevUnified.readRegisterUInt16LE(this.addr, 0x9E));

                this.H1 = picodevUnified.readRegisterByte(this.addr, 0xA1);
                this.H2 = picodevUnified.toSigned(picodevUnified.readRegisterUInt16LE(this.addr, 0xE1));
                this.H3 = picodevUnified.readRegisterByte(this.addr, 0xE3);

                // H4 and H5 are split across registers
                let reg28 = picodevUnified.readRegisterByte(this.addr, 0xE4);
                let reg29 = picodevUnified.readRegisterByte(this.addr, 0xE5);
                let reg2A = picodevUnified.readRegisterByte(this.addr, 0xE6);
                this.H4 = (reg28 << 4) + (reg29 & 0x0F);
                this.H5 = (reg2A << 4) + ((reg29 >> 4) & 0x0F);

                this.H6 = picodevUnified.toSigned(picodevUnified.readRegisterByte(this.addr, 0xE7));

                // Configure sensor
                this.configureHumidity();
                this.configureControl();
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Configure humidity oversampling
         */
        private configureHumidity(): void {
            let buf = pins.createBuffer(1);
            buf.setNumber(NumberFormat.UInt8LE, 0, this.humidMode);
            picodevUnified.writeRegister(this.addr, 0xF2, buf);
            basic.pause(2);
        }

        /**
         * Configure control register (temperature and pressure oversampling, mode)
         */
        private configureControl(): void {
            let buf = pins.createBuffer(1);
            let ctrl = (this.pressMode << 5) | (this.tempMode << 2) | 0x01; // 0x01 = normal mode
            buf.setNumber(NumberFormat.UInt8LE, 0, ctrl);
            picodevUnified.writeRegister(this.addr, 0xF4, buf);
            basic.pause(2);
        }

        /**
         * Read raw sensor data
         */
        private readRawData(): number[] {
            // Calculate measurement time based on oversampling modes
            let sleepTime = 1250;
            if (this.tempMode > 0) sleepTime += 2300 * (1 << this.tempMode);
            if (this.pressMode > 0) sleepTime += 575 + 2300 * (1 << this.pressMode);
            if (this.humidMode > 0) sleepTime += 575 + 2300 * (1 << this.humidMode);

            basic.pause(1 + Math.idiv(sleepTime, 1000));

            // Wait for measurement to complete
            while ((picodevUnified.readRegisterByte(this.addr, 0xF3) & 0x08) !== 0) {
                basic.pause(1);
            }

            // Read pressure (3 bytes at 0xF7)
            let rawP = (picodevUnified.readRegisterByte(this.addr, 0xF7) << 16) |
                (picodevUnified.readRegisterByte(this.addr, 0xF8) << 8) |
                picodevUnified.readRegisterByte(this.addr, 0xF9);
            rawP = rawP >> 4;

            // Read temperature (3 bytes at 0xFA)
            let rawT = (picodevUnified.readRegisterByte(this.addr, 0xFA) << 16) |
                (picodevUnified.readRegisterByte(this.addr, 0xFB) << 8) |
                picodevUnified.readRegisterByte(this.addr, 0xFC);
            rawT = rawT >> 4;

            // Read humidity (2 bytes at 0xFD)
            let rawH = (picodevUnified.readRegisterByte(this.addr, 0xFD) << 8) |
                picodevUnified.readRegisterByte(this.addr, 0xFE);

            return [rawT, rawP, rawH];
        }

        /**
         * Read temperature in degrees Celsius
         */
        //% blockId=bme280_read_temperature
        //% block="BME280 read temperature (°C)"
        //% weight=100
        public readTemperature(): number {
            try {
                let raw = this.readRawData();
                return this.compensateTemperature(raw[0]) / 100;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Read humidity as percentage
         */
        //% blockId=bme280_read_humidity
        //% block="BME280 read humidity (%)"
        //% weight=99
        public readHumidity(): number {
            try {
                let raw = this.readRawData();
                this.compensateTemperature(raw[0]); // Must read temperature first
                return this.compensateHumidity(raw[2]) / 1024;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Read atmospheric pressure in hPa (hectopascals)
         */
        //% blockId=bme280_read_pressure
        //% block="BME280 read pressure (hPa)"
        //% weight=98
        public readPressure(): number {
            try {
                let raw = this.readRawData();
                this.compensateTemperature(raw[0]); // Must read temperature first
                return this.compensatePressure(raw[1]) / 256 / 100;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Compensate raw temperature data and return in 0.01°C units
         */
        private compensateTemperature(rawT: number): number {
            let var1 = ((rawT >> 3) - (this.T1 << 1)) * (this.T2 >> 11);
            let var2 = (rawT >> 4) - this.T1;
            var2 = ((var2 * var2) >> 12) * (this.T3 >> 14);
            this.tFine = var1 + var2;
            return (this.tFine * 5 + 128) >> 8;
        }

        /**
         * Compensate raw pressure data and return in Pa
         */
        private compensatePressure(rawP: number): number {
            let var1 = (this.tFine >> 1) - 64000;
            let var2 = var1 * var1 * (this.P6 >> 16);
            var2 = var2 + (var1 * this.P5 << 17);
            var2 = var2 + (this.P4 << 35);
            var1 = ((var1 * var1 * (this.P3 >> 8)) >> 13) + ((this.P2 * var1) << 12);
            var1 = (((1 << 47) + var1) * this.P1) >> 33;

            if (var1 === 0) return 0; // avoid exception caused by division by zero

            let pressure = ((1048576 - rawP) - (var2 >> 12)) * 3125 / var1;
            var1 = (this.P9 * (pressure >> 13) * (pressure >> 13)) >> 25;
            var2 = (this.P8 * pressure) >> 19;
            pressure = ((pressure + var1 + var2) >> 8) + (this.P7 << 4);
            return pressure;
        }

        /**
         * Compensate raw humidity data and return in 1/1024 %RH
         */
        private compensateHumidity(rawH: number): number {
            let var_h = this.tFine - 76800;
            var_h = ((rawH << 14) - (this.H4 << 20) - (this.H5 * var_h) + 16384) >> 15;
            var_h = ((((var_h * var_h) >> 11) * (this.H1 << 4)) >> 20) +
                (((this.H2 << 11) * var_h) >> 10);
            var_h = ((var_h + 2097152) * this.H3) >> 14;
            var_h = (var_h - (((var_h >> 15) * (var_h >> 15)) >> 7) * (this.H6 >> 4));
            var_h = var_h < 0 ? 0 : var_h;
            var_h = var_h > 419430400 ? 419430400 : var_h;
            return var_h >> 12;
        }

        /**
         * Calculate altitude in meters based on sea level pressure
         */
        //% blockId=bme280_altitude
        //% block="BME280 calculate altitude at sea level $seaLevelPressure hPa"
        //% seaLevelPressure.defl=1013.25
        //% weight=97
        public altitude(seaLevelPressure: number): number {
            try {
                let pressure = this.readPressure();
                return 44330 * (1 - Math.pow(pressure / seaLevelPressure, 1 / 5.255));
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Set temperature oversampling mode
         */
        //% blockId=bme280_set_temp_oversampling
        //% block="BME280 set temperature oversampling $mode"
        //% advanced=true
        //% weight=50
        public setTemperatureOversampling(mode: Oversampling): void {
            this.tempMode = mode;
            this.configureControl();
        }

        /**
         * Set pressure oversampling mode
         */
        //% blockId=bme280_set_pressure_oversampling
        //% block="BME280 set pressure oversampling $mode"
        //% advanced=true
        //% weight=49
        public setPressureOversampling(mode: Oversampling): void {
            this.pressMode = mode;
            this.configureControl();
        }

        /**
         * Set humidity oversampling mode
         */
        //% blockId=bme280_set_humidity_oversampling
        //% block="BME280 set humidity oversampling $mode"
        //% advanced=true
        //% weight=48
        public setHumidityOversampling(mode: Oversampling): void {
            this.humidMode = mode;
            this.configureHumidity();
        }

        /**
         * Set IIR filter coefficient
         */
        //% blockId=bme280_set_iir_filter
        //% block="BME280 set IIR filter $coefficient"
        //% advanced=true
        //% weight=47
        public setIIRFilter(coefficient: IIRFilter): void {
            this.filterCoeff = coefficient;
            let buf = pins.createBuffer(1);
            buf.setNumber(NumberFormat.UInt8LE, 0, coefficient << 2);
            picodevUnified.writeRegister(this.addr, 0xF5, buf);
        }
    }

    // Internal singleton instance
    let _bme280: BME280;

    // Wrapper functions to call methods on the internal BME280 instance
    /**
     * Read temperature in degrees Celsius
     */
    //% blockId=bme280_read_temperature
    //% block="BME280 read temperature (°C)"
    //% weight=100
    export function bme280ReadTemperature(): number {
        if (!_bme280) _bme280 = new BME280(0x77);
        if (_bme280) return _bme280.readTemperature();
        return 0;
    }

    /**
     * Read humidity as percentage
     */
    //% blockId=bme280_read_humidity
    //% block="BME280 read humidity (%)"
    //% weight=99
    export function bme280ReadHumidity(): number {
        if (!_bme280) _bme280 = new BME280(0x77);
        if (_bme280) return _bme280.readHumidity();
        return 0;
    }

    /**
     * Read atmospheric pressure in hPa (hectopascals)
     */
    //% blockId=bme280_read_pressure
    //% block="BME280 read pressure (hPa)"
    //% weight=98
    export function bme280ReadPressure(): number {
        if (!_bme280) _bme280 = new BME280(0x77);
        if (_bme280) return _bme280.readPressure();
        return 0;
    }

    /**
     * Calculate altitude in meters based on sea level pressure
     */
    //% blockId=bme280_altitude
    //% block="BME280 calculate altitude at sea level $seaLevelPressure hPa"
    //% seaLevelPressure.defl=1013.25
    //% weight=97
    export function bme280Altitude(seaLevelPressure: number): number {
        if (!_bme280) _bme280 = new BME280(0x77);
        if (_bme280) return _bme280.altitude(seaLevelPressure);
        return 0;
    }

    /**
     * Set temperature oversampling mode
     */
    //% blockId=bme280_set_temp_oversampling
    //% block="BME280 set temperature oversampling $mode"
    //% advanced=true
    //% weight=50
    export function bme280SetTemperatureOversampling(mode: Oversampling): void {
        if (!_bme280) _bme280 = new BME280(0x77);
        if (_bme280) _bme280.setTemperatureOversampling(mode);
    }

    /**
     * Set pressure oversampling mode
     */
    //% blockId=bme280_set_pressure_oversampling
    //% block="BME280 set pressure oversampling $mode"
    //% advanced=true
    //% weight=49
    export function bme280SetPressureOversampling(mode: Oversampling): void {
        if (!_bme280) _bme280 = new BME280(0x77);
        if (_bme280) _bme280.setPressureOversampling(mode);
    }

    /**
     * Set humidity oversampling mode
     */
    //% blockId=bme280_set_humidity_oversampling
    //% block="BME280 set humidity oversampling $mode"
    //% advanced=true
    //% weight=48
    export function bme280SetHumidityOversampling(mode: Oversampling): void {
        if (!_bme280) _bme280 = new BME280(0x77);
        if (_bme280) _bme280.setHumidityOversampling(mode);
    }

    /**
     * Set IIR filter coefficient
     */
    //% blockId=bme280_set_iir_filter
    //% block="BME280 set IIR filter $coefficient"
    //% advanced=true
    //% weight=47
    export function bme280SetIIRFilter(coefficient: IIRFilter): void {
        if (!_bme280) _bme280 = new BME280(0x77);
        if (_bme280) _bme280.setIIRFilter(coefficient);
    }

    /**
     * Create a new BME280 sensor instance
     */
    export function createBME280(address?: number): void {
        if (address === undefined) address = 0x77;
        _bme280 = new BME280(address);
    }
}
