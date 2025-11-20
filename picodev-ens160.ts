/**
 * PiicoDev ENS160 Air Quality Sensor
 * 
 * Monitors air quality with AQI, TVOC, and eCO2 measurements.
 */

//% weight=92 color=#0078D7 icon="\uf1b6"
//% groups=['Reading', 'Configuration', 'others']
namespace piicodev {

    /**
     * Air Quality Rating
     */
    export enum AQIRating {
        //% block="invalid"
        Invalid = 0,
        //% block="excellent"
        Excellent = 1,
        //% block="good"
        Good = 2,
        //% block="moderate"
        Moderate = 3,
        //% block="poor"
        Poor = 4,
        //% block="unhealthy"
        Unhealthy = 5
    }

    /**
     * ENS160 Air Quality Sensor class
     */
    class ENS160 {
        private addr: number;

        private static readonly REG_PART_ID = 0x00;
        private static readonly REG_OPMODE = 0x10;
        private static readonly REG_DATA_AQI = 0x21;
        private static readonly REG_DATA_TVOC = 0x22;
        private static readonly REG_DATA_ECO2 = 0x24;
        private static readonly REG_DEVICE_STATUS = 0x20;

        private static readonly I2C_DEFAULT_ADDRESS = 0x53;
        private static readonly DEVICE_ID = 352;
        private static readonly OPMODE_STANDARD = 2;

        constructor(address: number = ENS160.I2C_DEFAULT_ADDRESS) {
            this.addr = address;
            this.initialize();
        }

        /**
         * Initialize the sensor
         */
        private initialize(): void {
            try {
                // Verify device ID
                let id = picodevUnified.readRegisterUInt16LE(this.addr, ENS160.REG_PART_ID);
                if (id !== ENS160.DEVICE_ID) {
                    // Device not recognized, but continue
                }

                // Set to standard mode
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, ENS160.OPMODE_STANDARD);
                picodevUnified.writeRegister(this.addr, ENS160.REG_OPMODE, buf);
                basic.pause(20);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Read AQI value (0-5)
         */
        readAQI(): number {
            try {
                let val = picodevUnified.readRegisterByte(this.addr, ENS160.REG_DATA_AQI);
                return (val & 0x07); // Extract 3-bit AQI value
            } catch (e) {
                return 0;
            }
        }

        /**
         * Get AQI rating text
         */
        getAQIRating(): string {
            let aqi = this.readAQI();
            const ratings = ["invalid", "excellent", "good", "moderate", "poor", "unhealthy"];
            return ratings[aqi] || "invalid";
        }

        /**
         * Read TVOC value in ppb
         */
        readTVOC(): number {
            try {
                return picodevUnified.readRegisterUInt16LE(this.addr, ENS160.REG_DATA_TVOC);
            } catch (e) {
                return 0;
            }
        }

        /**
         * Read eCO2 value in ppm
         */
        readECO2(): number {
            try {
                return picodevUnified.readRegisterUInt16LE(this.addr, ENS160.REG_DATA_ECO2);
            } catch (e) {
                return 0;
            }
        }

        /**
         * Get eCO2 rating text
         */
        getECO2Rating(): string {
            let eco2 = this.readECO2();
            if (eco2 < 400) return "invalid";
            if (eco2 < 600) return "excellent";
            if (eco2 < 800) return "good";
            if (eco2 < 1000) return "fair";
            if (eco2 < 1500) return "poor";
            return "bad";
        }
    }

    let ens160: ENS160;

    /**
     * Initialize the ENS160 air quality sensor
     * @param address I2C address (default: 0x53)
     */
    //% blockId=ens160_create
    //% block="ENS160 initialize at address $address"
    //% address.defl=0x53
    //% advanced=true
    //% weight=100
    export function createENS160(address: number = 0x53): void {
        ens160 = new ENS160(address);
    }

    /**
     * Read AQI (Air Quality Index) value 0-5
     */
    //% blockId=ens160_read_aqi
    //% block="ENS160 read AQI"
    //% group="Reading"
    //% weight=100
    export function readENS160AQI(): number {
        if (!ens160) {
            createENS160();
        }
        return ens160.readAQI();
    }

    /**
     * Get AQI rating as text
     */
    //% blockId=ens160_get_aqi_rating
    //% block="ENS160 AQI rating"
    //% group="Reading"
    //% weight=99
    export function getENS160AQIRating(): string {
        if (!ens160) {
            createENS160();
        }
        return ens160.getAQIRating();
    }

    /**
     * Read TVOC (Total Volatile Organic Compounds) in ppb
     */
    //% blockId=ens160_read_tvoc
    //% block="ENS160 read TVOC (ppb)"
    //% group="Reading"
    //% weight=98
    export function readENS160TVOC(): number {
        if (!ens160) {
            createENS160();
        }
        return ens160.readTVOC();
    }

    /**
     * Read eCO2 (equivalent CO2) in ppm
     */
    //% blockId=ens160_read_eco2
    //% block="ENS160 read eCO2 (ppm)"
    //% group="Reading"
    //% weight=97
    export function readENS160ECO2(): number {
        if (!ens160) {
            createENS160();
        }
        return ens160.readECO2();
    }

    /**
     * Get eCO2 rating as text
     */
    //% blockId=ens160_get_eco2_rating
    //% block="ENS160 eCO2 rating"
    //% group="Reading"
    //% weight=96
    export function getENS160ECO2Rating(): string {
        if (!ens160) {
            createENS160();
        }
        return ens160.getECO2Rating();
    }
}
