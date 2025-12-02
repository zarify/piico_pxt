/**
 * PiicoDev MS5637 Barometric Pressure Sensor
 * 
 * High-accuracy pressure and temperature sensor with altitude calculation.
 * Provides pressure in hPa, temperature in Celsius, and calculated altitude.
 */

//% weight=81 color=#00A4A6 icon="\uf2c9"
//% groups=['Environment']
namespace piicodev {

    /**
     * Resolution/Oversampling mode for MS5637
     */
    export enum MS5637Resolution {
        //% block="OSR 256"
        OSR_256 = 0,
        //% block="OSR 512"
        OSR_512 = 1,
        //% block="OSR 1024"
        OSR_1024 = 2,
        //% block="OSR 2048"
        OSR_2048 = 3,
        //% block="OSR 4096"
        OSR_4096 = 4,
        //% block="OSR 8192 (highest accuracy)"
        OSR_8192 = 5
    }

    /**
     * MS5637 Barometric Pressure Sensor class
     */
    class MS5637 {
        private addr: number;
        private eepromCoeff: number[];
        private coeffValid: boolean;

        // Register/Command addresses
        private static readonly I2C_ADDRESS = 0x76;  // 118 decimal
        private static readonly SOFTRESET = 0x1E;    // 30 decimal
        private static readonly START_PRESSURE_ADC = 0x40;     // 64 decimal
        private static readonly START_TEMPERATURE_ADC = 0x50;  // 80 decimal
        private static readonly CONVERSION_OSR_MASK = 0x0F;    // 15 decimal
        private static readonly ADC_READ = 0x00;

        // PROM addresses for calibration coefficients
        private static readonly PROM_ADDR_0 = 0xA0;  // 160 decimal
        private static readonly PROM_ADDR_1 = 0xA2;  // 162 decimal
        private static readonly PROM_ADDR_2 = 0xA4;  // 164 decimal
        private static readonly PROM_ADDR_3 = 0xA6;  // 166 decimal
        private static readonly PROM_ADDR_4 = 0xA8;  // 168 decimal
        private static readonly PROM_ADDR_5 = 0xAA;  // 170 decimal
        private static readonly PROM_ADDR_6 = 0xAC;  // 172 decimal

        // Conversion times for different OSR values (milliseconds)
        private static readonly CONV_TIME_OSR_256 = 1;
        private static readonly CONV_TIME_OSR_512 = 2;
        private static readonly CONV_TIME_OSR_1024 = 3;
        private static readonly CONV_TIME_OSR_2048 = 5;
        private static readonly CONV_TIME_OSR_4096 = 9;
        private static readonly CONV_TIME_OSR_8192 = 17;

        // Calibration coefficient indices
        private static readonly CRC_INDEX = 0;
        private static readonly PRESSURE_SENSITIVITY_INDEX = 1;
        private static readonly PRESSURE_OFFSET_INDEX = 2;
        private static readonly TEMP_COEFF_OF_PRESSURE_SENSITIVITY_INDEX = 3;
        private static readonly TEMP_COEFF_OF_PRESSURE_OFFSET_INDEX = 4;
        private static readonly REFERENCE_TEMPERATURE_INDEX = 5;
        private static readonly TEMP_COEFF_OF_TEMPERATURE_INDEX = 6;

        constructor(address: number = MS5637.I2C_ADDRESS) {
            this.addr = address;
            this.eepromCoeff = [0, 0, 0, 0, 0, 0, 0, 0];
            this.coeffValid = false;

            // Initialize sensor
            this.initialize();
        }

        /**
         * Initialize the sensor with soft reset
         */
        private initialize(): void {
            try {
                // Soft reset
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, MS5637.SOFTRESET);
                pins.i2cWriteBuffer(this.addr, buf, false);
                basic.pause(15);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Set resolution and get corresponding commands and timing
         */
        private setResolution(res: MS5637Resolution): { cmdTemp: number, cmdPressure: number, timeTemp: number, timePressure: number } {
            const convTimes = [
                MS5637.CONV_TIME_OSR_256,
                MS5637.CONV_TIME_OSR_512,
                MS5637.CONV_TIME_OSR_1024,
                MS5637.CONV_TIME_OSR_2048,
                MS5637.CONV_TIME_OSR_4096,
                MS5637.CONV_TIME_OSR_8192
            ];

            let cmdTemp = res * 2;
            cmdTemp |= MS5637.START_TEMPERATURE_ADC;
            let timeTemp = convTimes[Math.floor((cmdTemp & MS5637.CONVERSION_OSR_MASK) / 2)];

            let cmdPressure = res * 2;
            cmdPressure |= MS5637.START_PRESSURE_ADC;
            let timePressure = convTimes[Math.floor((cmdPressure & MS5637.CONVERSION_OSR_MASK) / 2)];

            return { cmdTemp, cmdPressure, timeTemp, timePressure };
        }

        /**
         * Read a single EEPROM coefficient
         */
        private readEepromCoeff(cmd: number): number {
            try {
                let data = picodevUnified.readRegister(this.addr, cmd, 2);
                // Big-endian 16-bit value
                return (data[0] << 8) | data[1];
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Read all EEPROM calibration coefficients
         */
        private readEeprom(): number[] {
            const coeffs: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
            const promAddresses = [
                MS5637.PROM_ADDR_0,
                MS5637.PROM_ADDR_1,
                MS5637.PROM_ADDR_2,
                MS5637.PROM_ADDR_3,
                MS5637.PROM_ADDR_4,
                MS5637.PROM_ADDR_5,
                MS5637.PROM_ADDR_6
            ];

            for (let i = 0; i < promAddresses.length; i++) {
                coeffs[i] = this.readEepromCoeff(promAddresses[i]);
            }

            this.coeffValid = true;
            return coeffs;
        }

        /**
         * Start conversion and read ADC result
         */
        private conversionReadAdc(cmd: number, timeMs: number): number {
            try {
                // Start conversion
                let cmdBuf = pins.createBuffer(1);
                cmdBuf.setNumber(NumberFormat.UInt8LE, 0, cmd);
                pins.i2cWriteBuffer(this.addr, cmdBuf, false);

                // Wait for conversion
                basic.pause(timeMs);

                // Read 24-bit ADC result
                let data = picodevUnified.readRegister(this.addr, MS5637.ADC_READ, 3);
                // Big-endian 24-bit value
                return (data[0] << 16) | (data[1] << 8) | data[2];
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Read temperature and pressure with compensation
         */
        readTemperatureAndPressure(res: MS5637Resolution = MS5637Resolution.OSR_8192): { temperature: number, pressure: number } {
            // Read calibration coefficients if not already done
            if (!this.coeffValid) {
                this.eepromCoeff = this.readEeprom();
            }

            // Get commands and timing for the selected resolution
            const config = this.setResolution(res);

            // Read ADC values
            const adcTemperature = this.conversionReadAdc(config.cmdTemp, config.timeTemp);
            const adcPressure = this.conversionReadAdc(config.cmdPressure, config.timePressure);

            if (adcTemperature === 0 || adcPressure === 0) {
                return { temperature: 0, pressure: 0 };
            }

            // Temperature calculation
            const dT = adcTemperature - this.eepromCoeff[MS5637.REFERENCE_TEMPERATURE_INDEX] * 256;
            let TEMP = 2000 + ((dT * this.eepromCoeff[MS5637.TEMP_COEFF_OF_TEMPERATURE_INDEX]) >> 23);

            // Second order temperature compensation
            let T2 = 0;
            let OFF2 = 0;
            let SENS2 = 0;

            if (TEMP < 2000) {
                T2 = (3 * (dT * dT)) >> 33;
                OFF2 = Math.floor((61 * (TEMP - 2000) * (TEMP - 2000)) / 16);
                SENS2 = Math.floor((29 * (TEMP - 2000) * (TEMP - 2000)) / 16);

                if (TEMP < -1500) {
                    OFF2 += 17 * (TEMP + 1500) * (TEMP + 1500);
                    SENS2 += 9 * (TEMP + 1500) * (TEMP + 1500);
                }
            } else {
                T2 = (5 * (dT * dT)) >> 38;
                OFF2 = 0;
                SENS2 = 0;
            }

            // Pressure calculation
            let OFF = (this.eepromCoeff[MS5637.PRESSURE_OFFSET_INDEX] << 17) +
                ((this.eepromCoeff[MS5637.TEMP_COEFF_OF_PRESSURE_OFFSET_INDEX] * dT) >> 6);
            OFF -= OFF2;

            let SENS = this.eepromCoeff[MS5637.PRESSURE_SENSITIVITY_INDEX] * 65536 +
                ((this.eepromCoeff[MS5637.TEMP_COEFF_OF_PRESSURE_SENSITIVITY_INDEX] * dT) >> 7);
            SENS -= SENS2;

            const P = (Math.floor((adcPressure * SENS) / 2097152) - OFF) >> 15;

            const temperature = (TEMP - T2) / 100.0;
            const pressure = P / 100.0;

            return { temperature, pressure };
        }

        /**
         * Read pressure only
         */
        readPressure(res: MS5637Resolution = MS5637Resolution.OSR_8192): number {
            const result = this.readTemperatureAndPressure(res);
            return result.pressure;
        }

        /**
         * Calculate altitude from pressure
         * @param pressureSeaLevel Sea level pressure in hPa (default 1013.25)
         */
        readAltitude(pressureSeaLevel: number = 1013.25): number {
            const pressure = this.readPressure();
            // Barometric formula
            return 44330 * (1 - Math.pow(pressure / pressureSeaLevel, 1 / 5.255));
        }
    }

    // Global MS5637 instance
    let _ms5637: MS5637 = null;

    /**
     * Read pressure from MS5637 sensor
     * @param resolution Oversampling resolution (higher = more accurate but slower)
     * @returns Pressure in hectopascals (hPa)
     */
    //% blockId=ms5637_read_pressure
    //% block="pressure (hPa) || resolution $resolution"
    //% resolution.defl=MS5637Resolution.OSR_8192
    //% group="Barometric"
    //% weight=100
    //% expandableArgumentMode="toggle"
    export function ms5637Pressure(resolution?: MS5637Resolution): number {
        if (!_ms5637) {
            _ms5637 = new MS5637();
        }
        if (resolution === undefined) {
            resolution = MS5637Resolution.OSR_8192;
        }
        return _ms5637.readPressure(resolution);
    }

    /**
     * Read temperature from MS5637 sensor
     * @param resolution Oversampling resolution (higher = more accurate but slower)
     * @returns Temperature in Celsius
     */
    //% blockId=ms5637_read_temperature
    //% block="barometric temperature (°C) || resolution $resolution"
    //% resolution.defl=MS5637Resolution.OSR_8192
    //% group="Barometric"
    //% weight=95
    //% expandableArgumentMode="toggle"
    export function ms5637Temperature(resolution?: MS5637Resolution): number {
        if (!_ms5637) {
            _ms5637 = new MS5637();
        }
        if (resolution === undefined) {
            resolution = MS5637Resolution.OSR_8192;
        }
        const result = _ms5637.readTemperatureAndPressure(resolution);
        return result.temperature;
    }

    /**
     * Calculate altitude based on atmospheric pressure
     * @param seaLevelPressure Sea level pressure in hPa (default 1013.25)
     * @returns Altitude in meters
     */
    //% blockId=ms5637_read_altitude
    //% block="altitude (m) || sea level pressure $seaLevelPressure hPa"
    //% seaLevelPressure.defl=1013.25
    //% group="Barometric"
    //% weight=90
    //% expandableArgumentMode="toggle"
    export function ms5637Altitude(seaLevelPressure?: number): number {
        if (!_ms5637) {
            _ms5637 = new MS5637();
        }
        if (seaLevelPressure === undefined) {
            seaLevelPressure = 1013.25;
        }
        return _ms5637.readAltitude(seaLevelPressure);
    }
}
