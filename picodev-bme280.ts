/**
 * PiicoDev BME280 Temperature, Humidity, and Pressure Sensor
 * 
 * Provides environmental sensing capabilities with compensation algorithms
 * for accurate temperature, humidity, and atmospheric pressure readings.
 */

//% weight=95 color=#0078D7 icon="\uf2c9"
//% groups=['Reading', 'Configuration', 'others']
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
                // Soft reset the sensor first
                let resetBuf = pins.createBuffer(1);
                resetBuf.setNumber(NumberFormat.UInt8LE, 0, 0xB6);
                picodevUnified.writeRegister(this.addr, 0xE0, resetBuf);
                basic.pause(10);

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

                // H4 and H5 are split across registers and need to be signed 12-bit values
                let reg28 = picodevUnified.readRegisterByte(this.addr, 0xE4);
                let reg29 = picodevUnified.readRegisterByte(this.addr, 0xE5);
                let reg2A = picodevUnified.readRegisterByte(this.addr, 0xE6);
                let h4_raw = (reg28 << 4) | (reg29 & 0x0F);
                let h5_raw = (reg2A << 4) | ((reg29 >> 4) & 0x0F);
                // Convert 12-bit unsigned to signed
                this.H4 = h4_raw > 2047 ? h4_raw - 4096 : h4_raw;
                this.H5 = h5_raw > 2047 ? h5_raw - 4096 : h5_raw;

                this.H6 = picodevUnified.toSigned(picodevUnified.readRegisterByte(this.addr, 0xE7));

                // Configure sensor - match Python order
                this.configureHumidity();
                basic.pause(2);
                // Write initial control value of 36 (0x24) like Python
                let initBuf = pins.createBuffer(1);
                initBuf.setNumber(NumberFormat.UInt8LE, 0, 36);
                picodevUnified.writeRegister(this.addr, 0xF4, initBuf);
                basic.pause(2);
                // Configure IIR filter
                this.configureIIRFilter();
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
            let ctrl = (this.pressMode << 5) | (this.tempMode << 2) | 0x00; // 0x00 = sleep mode (will use forced mode per measurement)
            buf.setNumber(NumberFormat.UInt8LE, 0, ctrl);
            picodevUnified.writeRegister(this.addr, 0xF4, buf);
            basic.pause(2);
        }

        /**
         * Configure IIR filter
         */
        private configureIIRFilter(): void {
            let buf = pins.createBuffer(1);
            buf.setNumber(NumberFormat.UInt8LE, 0, this.filterCoeff << 2);
            picodevUnified.writeRegister(this.addr, 0xF5, buf);
            basic.pause(2);
        }

        /**
         * Trigger a forced measurement
         */
        private forceMeasurement(): void {
            let buf = pins.createBuffer(1);
            let ctrl = (this.pressMode << 5) | (this.tempMode << 2) | 0x02; // 0x02 = forced mode
            buf.setNumber(NumberFormat.UInt8LE, 0, ctrl);
            picodevUnified.writeRegister(this.addr, 0xF4, buf);
        }

        /**
         * Read raw sensor data
         */
        private readRawData(): number[] {
            // Trigger measurement in normal mode (like Python)
            let buf = pins.createBuffer(1);
            let ctrl = (this.pressMode << 5) | (this.tempMode << 2) | 0x01; // 0x01 = normal mode
            buf.setNumber(NumberFormat.UInt8LE, 0, ctrl);
            picodevUnified.writeRegister(this.addr, 0xF4, buf);

            // Calculate measurement time based on oversampling modes
            let sleepTime = 1250;
            if (this.tempMode > 0) sleepTime += 2300 * (1 << this.tempMode);
            if (this.pressMode > 0) sleepTime += 575 + 2300 * (1 << this.pressMode);
            if (this.humidMode > 0) sleepTime += 575 + 2300 * (1 << this.humidMode);

            basic.pause(1 + Math.idiv(sleepTime, 1000));

            // Wait for measurement to complete (check measuring bit)
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
        //% block="BME280 read humidity (pct)"
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
                return this.compensatePressure(raw[1]) / 100; // Bosch algorithm returns Pa, convert to hPa
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
         * Using official Bosch 32-bit integer compensation algorithm
         */
        private compensatePressure(rawP: number): number {
            let var1: number;
            let var2: number;
            let var3: number;
            let var4: number;
            let var5: number;
            let pressure: number;

            var1 = Math.idiv(this.tFine, 2) - 64000;
            var2 = Math.idiv(Math.idiv(Math.idiv(var1, 4) * Math.idiv(var1, 4), 2048) * this.P6, 1);
            var2 = var2 + (var1 * this.P5 * 2);
            var2 = Math.idiv(var2, 4) + (this.P4 * 65536);
            var3 = Math.idiv(this.P3 * Math.idiv(Math.idiv(var1, 4) * Math.idiv(var1, 4), 8192), 8);
            var4 = Math.idiv(this.P2 * var1, 2);
            var1 = Math.idiv(var3 + var4, 262144);
            var1 = Math.idiv((32768 + var1) * this.P1, 32768);

            if (var1 === 0) return 0;

            var5 = 1048576 - rawP;
            pressure = Math.idiv((var5 - Math.idiv(var2, 4096)) * 3125, var1);

            if (pressure < 0x80000000) {
                pressure = Math.idiv(pressure * 2, 1);
            } else {
                pressure = Math.idiv(pressure, var1) * 2;
            }

            var1 = Math.idiv(this.P9 * Math.idiv(Math.idiv(Math.idiv(pressure, 8) * Math.idiv(pressure, 8), 8192), 1), 4096);
            var2 = Math.idiv(Math.idiv(pressure, 4) * this.P8, 8192);
            pressure = pressure + Math.idiv(var1 + var2 + this.P7, 16);

            return pressure;
        }

        /**
         * Compensate raw humidity data and return in 1/1024 %RH
         * Formula from Python: h=((raw_h<<14)-(self._H4<<20)-self._H5*h+16384>>15)*((((h*self._H6>>10)*((h*self._H3>>11)+32768)>>10)+2097152)*self._H2+8192>>14)
         */
        private compensateHumidity(rawH: number): number {
            let h = this.tFine - 76800;
            h = (((rawH << 14) - (this.H4 << 20) - this.H5 * h + 16384) >> 15) * ((((h * this.H6 >> 10) * ((h * this.H3 >> 11) + 32768) >> 10) + 2097152) * this.H2 + 8192 >> 14);
            h = h - (((h >> 15) * (h >> 15) >> 7) * this.H1 >> 4);
            h = h < 0 ? 0 : h;
            h = h > 419430400 ? 419430400 : h;
            return h >> 12;
        }

        /**
         * Calculate altitude in meters based on standard sea level pressure
         */
        //% blockId=bme280_altitude
        //% block="BME280 calculate altitude (m)"
        //% weight=97
        public altitude(): number {
            try {
                let pressure = this.readPressure();
                // Uses standard sea level pressure of 1013.25 hPa
                return 44330 * (1 - Math.pow(pressure / 1013.25, 1 / 5.255));
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
    //% group="Reading"
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
    //% block="BME280 read humidity (pct)"
    //% group="Reading"
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
    //% group="Reading"
    //% weight=98
    export function bme280ReadPressure(): number {
        if (!_bme280) _bme280 = new BME280(0x77);
        if (_bme280) return _bme280.readPressure();
        return 0;
    }

    /**
     * Calculate altitude in meters based on standard sea level pressure
     */
    //% blockId=bme280_altitude
    //% block="BME280 calculate altitude (m)"
    //% group="Reading"
    //% weight=97
    export function bme280Altitude(): number {
        if (!_bme280) _bme280 = new BME280(0x77);
        if (_bme280) return _bme280.altitude();
        return 0;
    }

    /**
     * Set temperature oversampling mode
     */
    //% blockId=bme280_set_temp_oversampling
    //% block="BME280 set temperature oversampling $mode"
    //% group="Configuration"
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
    //% group="Configuration"
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
    //% group="Configuration"
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
    //% group="Configuration"
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
