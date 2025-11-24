/**
 * PiicoDev ENS160 Air Quality Sensor
 * 
 * Measures air quality index (AQI), total volatile organic compounds (TVOC),
 * and equivalent CO2 (eCO2) with built-in quality ratings.
 */

//% weight=79 color=#00A4A6 icon="\uf72e"
//% groups=['Environment']
namespace piicodev {

    /**
     * Air quality reading type
     */
    export enum ENS160Reading {
        //% block="AQI (1-5)"
        AQI = 0,
        //% block="TVOC (ppb)"
        TVOC = 1,
        //% block="eCO2 (ppm)"
        ECO2 = 2
    }

    /**
     * Operating mode for ENS160
     */
    export enum ENS160Mode {
        //% block="deep sleep"
        DeepSleep = 0,
        //% block="idle"
        Idle = 1,
        //% block="standard"
        Standard = 2
    }

    /**
     * PiicoDev ENS160 Air Quality Sensor class
     */
    class ENS160 {
        private addr: number;
        private _aqi: number;
        private _tvoc: number;
        private _eco2: number;
        private _status: number;

        // Register addresses
        private static readonly REG_PART_ID = 0x00;
        private static readonly REG_OPMODE = 0x10;
        private static readonly REG_CONFIG = 0x11;
        private static readonly REG_COMMAND = 0x12;
        private static readonly REG_TEMP_IN = 0x13;
        private static readonly REG_RH_IN = 0x15;
        private static readonly REG_DEVICE_STATUS = 0x20;
        private static readonly REG_DATA_AQI = 0x21;
        private static readonly REG_DATA_TVOC = 0x22;
        private static readonly REG_DATA_ECO2 = 0x24;
        private static readonly REG_DATA_T = 0x30;
        private static readonly REG_DATA_RH = 0x32;

        // Status bit positions
        private static readonly BIT_DEVICE_STATUS_NEWDAT = 1;
        private static readonly BIT_DEVICE_STATUS_VALIDITY_FLAG = 2;

        // Expected part ID
        private static readonly VAL_PART_ID = 0x0160;

        // Operating modes
        private static readonly VAL_OPMODE_DEEP_SLEEP = 0x00;
        private static readonly VAL_OPMODE_IDLE = 0x01;
        private static readonly VAL_OPMODE_STANDARD = 0x02;
        private static readonly VAL_OPMODE_RESET = 0xF0;

        constructor(address: number = 0x53) {
            this.addr = address;
            this._aqi = 0;
            this._tvoc = 0;
            this._eco2 = 0;
            this._status = 0;
            this.initialize();
        }

        /**
         * Initialize the sensor
         */
        private initialize(): void {
            try {
                // Verify device ID
                let partId = picodevUnified.readRegisterUInt16LE(this.addr, ENS160.REG_PART_ID);
                if (partId !== ENS160.VAL_PART_ID) {
                    // Device not found or wrong ID
                    return;
                }

                // Set standard operating mode
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, ENS160.VAL_OPMODE_STANDARD);
                picodevUnified.writeRegister(this.addr, ENS160.REG_OPMODE, buf);
                basic.pause(20);

                // Set default temperature and humidity compensation
                this.setTemperature(25.0);
                this.setHumidity(50.0);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Read bit from byte
         */
        private readBit(x: number, n: number): boolean {
            return ((x & (1 << n)) !== 0);
        }

        /**
         * Read 2-bit value (crumb) from byte
         */
        private readCrumb(x: number, n: number): number {
            return (this.readBit(x, n) ? 1 : 0) + (this.readBit(x, n + 1) ? 2 : 0);
        }

        /**
         * Read 3-bit value (tribit) from byte
         */
        private readTribit(x: number, n: number): number {
            return (this.readBit(x, n) ? 1 : 0) +
                (this.readBit(x, n + 1) ? 2 : 0) +
                (this.readBit(x, n + 2) ? 4 : 0);
        }

        /**
         * Read sensor data from registers
         */
        private readData(): void {
            try {
                // Read device status
                this._status = picodevUnified.readRegisterByte(this.addr, ENS160.REG_DEVICE_STATUS);

                // Check if new data is available
                if (this.readBit(this._status, ENS160.BIT_DEVICE_STATUS_NEWDAT)) {
                    // Read all data registers at once (6 bytes total)
                    let data = picodevUnified.readRegister(this.addr, ENS160.REG_DEVICE_STATUS, 6);

                    // Parse the data
                    // Byte 0: status (already read above)
                    // Byte 1: AQI
                    // Bytes 2-3: TVOC (little endian)
                    // Bytes 4-5: eCO2 (little endian)
                    this._aqi = data[1];
                    this._tvoc = data[2] | (data[3] << 8);
                    this._eco2 = data[4] | (data[5] << 8);
                }
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Get operating status description
         */
        public getOperationStatus(): string {
            this.readData();
            let validityFlag = this.readCrumb(this._status, ENS160.BIT_DEVICE_STATUS_VALIDITY_FLAG);
            let statuses = ["operating ok", "warm-up", "initial start-up", "no valid output"];
            return statuses[validityFlag];
        }

        /**
         * Get Air Quality Index (1-5)
         * 1 = excellent, 2 = good, 3 = moderate, 4 = poor, 5 = unhealthy
         */
        public getAQI(): number {
            this.readData();
            return this.readTribit(this._aqi, 0);
        }

        /**
         * Get AQI quality rating
         */
        public getAQIRating(): string {
            let aqi = this.getAQI();
            let ratings = ["invalid", "excellent", "good", "moderate", "poor", "unhealthy"];
            if (aqi >= 0 && aqi < ratings.length) {
                return ratings[aqi];
            }
            return "invalid";
        }

        /**
         * Get Total Volatile Organic Compounds in ppb
         */
        public getTVOC(): number {
            this.readData();
            return this._tvoc;
        }

        /**
         * Get equivalent CO2 in ppm
         */
        public getECO2(): number {
            this.readData();
            return this._eco2;
        }

        /**
         * Get eCO2 quality rating
         */
        public getECO2Rating(): string {
            let eco2 = this.getECO2();
            let rating = "invalid";

            if (eco2 >= 400) rating = "excellent";
            if (eco2 > 600) rating = "good";
            if (eco2 > 800) rating = "fair";
            if (eco2 > 1000) rating = "poor";
            if (eco2 > 1500) rating = "bad";

            return rating;
        }

        /**
         * Set ambient temperature for compensation (°C)
         */
        public setTemperature(temperature: number): void {
            try {
                // Convert Celsius to Kelvin and scale by 64
                let kelvin = temperature + 273.15;
                let value = Math.round(kelvin * 64);

                // Write as 16-bit little endian
                let buf = pins.createBuffer(2);
                buf.setNumber(NumberFormat.UInt16LE, 0, value);
                picodevUnified.writeRegister(this.addr, ENS160.REG_TEMP_IN, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Get current temperature compensation setting (°C)
         */
        public getTemperature(): number {
            try {
                let value = picodevUnified.readRegisterUInt16LE(this.addr, ENS160.REG_DATA_T);
                let kelvin = value / 64;
                return kelvin - 273.15;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Set relative humidity for compensation (%)
         */
        public setHumidity(humidity: number): void {
            try {
                // Scale humidity by 512
                let value = Math.round(humidity * 512);

                // Write as 16-bit little endian
                let buf = pins.createBuffer(2);
                buf.setNumber(NumberFormat.UInt16LE, 0, value);
                picodevUnified.writeRegister(this.addr, ENS160.REG_RH_IN, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Get current humidity compensation setting (%)
         */
        public getHumidity(): number {
            try {
                let value = picodevUnified.readRegisterUInt16LE(this.addr, ENS160.REG_DATA_RH);
                return value / 512;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Set operating mode
         */
        public setMode(mode: ENS160Mode): void {
            try {
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, mode);
                picodevUnified.writeRegister(this.addr, ENS160.REG_OPMODE, buf);
                basic.pause(20);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }
    }

    // Internal singleton instance
    let _ens160: ENS160;

    /**
     * Read air quality measurement
     * @param reading The type of reading to get (AQI, TVOC, or eCO2)
     */
    //% blockId=ens160_read
    //% block="ENS160 read $reading"
    //% group="Reading"
    //% weight=100
    export function ens160Read(reading: ENS160Reading): number {
        if (!_ens160) _ens160 = new ENS160(0x53);
        if (!_ens160) return 0;

        if (reading === ENS160Reading.AQI) return _ens160.getAQI();
        else if (reading === ENS160Reading.TVOC) return _ens160.getTVOC();
        else return _ens160.getECO2();
    }

    /**
     * Get air quality rating as text
     */
    //% blockId=ens160_aqi_rating
    //% block="ENS160 air quality rating"
    //% group="Reading"
    //% weight=95
    export function ens160GetAQIRating(): string {
        if (!_ens160) _ens160 = new ENS160(0x53);
        if (_ens160) return _ens160.getAQIRating();
        return "invalid";
    }

    /**
     * Get CO2 rating as text
     */
    //% blockId=ens160_eco2_rating
    //% block="ENS160 CO₂ rating"
    //% group="Reading"
    //% weight=94
    export function ens160GetECO2Rating(): string {
        if (!_ens160) _ens160 = new ENS160(0x53);
        if (_ens160) return _ens160.getECO2Rating();
        return "invalid";
    }

    /**
     * Get sensor operation status
     */
    //% blockId=ens160_operation_status
    //% block="ENS160 operation status"
    //% group="Reading"
    //% weight=93
    export function ens160GetOperationStatus(): string {
        if (!_ens160) _ens160 = new ENS160(0x53);
        if (_ens160) return _ens160.getOperationStatus();
        return "no valid output";
    }

    /**
     * Tell the sensor the current temperature to improve accuracy. Use with a BME280 sensor for best results.
     * @param temperature Temperature in degrees Celsius (default 25°C)
     */
    //% blockId=ens160_set_temperature
    //% block="ENS160 set temperature $temperature °C"
    //% temperature.min=-40 temperature.max=85 temperature.defl=25
    //% group="Configuration"
    //% advanced=true
    //% weight=60
    export function ens160SetTemperature(temperature: number): void {
        if (!_ens160) _ens160 = new ENS160(0x53);
        if (_ens160) _ens160.setTemperature(temperature);
    }

    /**
     * Tell the sensor the current humidity to improve accuracy. Use with a BME280 sensor for best results.
     * @param humidity Relative humidity in percent (default 50%)
     */
    //% blockId=ens160_set_humidity
    //% block="ENS160 set humidity $humidity %%"
    //% humidity.min=0 humidity.max=100 humidity.defl=50
    //% group="Configuration"
    //% advanced=true
    //% weight=59
    export function ens160SetHumidity(humidity: number): void {
        if (!_ens160) _ens160 = new ENS160(0x53);
        if (_ens160) _ens160.setHumidity(humidity);
    }

    /**
     * Set operating mode
     * @param mode Operating mode (standard, idle, or deep sleep)
     */
    //% blockId=ens160_set_mode
    //% block="ENS160 set mode $mode"
    //% group="Configuration"
    //% advanced=true
    //% weight=58
    export function ens160SetMode(mode: ENS160Mode): void {
        if (!_ens160) _ens160 = new ENS160(0x53);
        if (_ens160) _ens160.setMode(mode);
    }
}
