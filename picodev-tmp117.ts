/**
 * PiicoDev TMP117 High-Precision Temperature Sensor
 * 
 * Provides accurate temperature readings in Celsius, Fahrenheit, or Kelvin.
 */

//% weight=90 color=#0078D7 icon="\uf2c9"
//% groups=['Reading', 'others']
namespace piicodev {

    /**
     * TMP117 Temperature Sensor class
     */
    class TMP117 {
        private addr: number;

        private static readonly REG_TEMPERATURE = 0x00;
        private static readonly I2C_DEFAULT_ADDRESS = 0x48;

        constructor(address: number = TMP117.I2C_DEFAULT_ADDRESS) {
            this.addr = address;
        }

        /**
         * Read temperature in Celsius
         */
        readTempC(): number {
            try {
                let buffer = picodevUnified.readRegister(this.addr, TMP117.REG_TEMPERATURE, 2);
                if (buffer.length < 2) return 0;

                // Convert big-endian 16-bit to signed value
                let raw = ((buffer[0] << 8) | buffer[1]);
                if (raw >= 32768) {
                    raw = -256.0 + (raw - 32768) * 0.0078125;
                } else {
                    raw = raw * 0.0078125;
                }
                return raw;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Read temperature in Fahrenheit
         */
        readTempF(): number {
            let celsius = this.readTempC();
            return celsius * 9 / 5 + 32;
        }

        /**
         * Read temperature in Kelvin
         */
        readTempK(): number {
            return this.readTempC() + 273.15;
        }
    }

    let tmp117: TMP117;

    /**
     * Initialize the TMP117 temperature sensor
     * @param address I2C address of the device (default: 0x48)
     */
    //% blockId=tmp117_create
    //% block="TMP117 initialize at address $address"
    //% address.defl=0x48
    //% advanced=true
    //% weight=100
    export function createTMP117(address: number = 0x48): void {
        tmp117 = new TMP117(address);
    }

    /**
     * Read temperature in Celsius
     * Returns the temperature in degrees Celsius
     */
    //% blockId=tmp117_read_temp_c
    //% block="TMP117 read temperature (°C)"
    //% group="Reading"
    //% weight=100
    export function readTMP117TempC(): number {
        if (!tmp117) {
            createTMP117();
        }
        return tmp117.readTempC();
    }

    /**
     * Read temperature in Fahrenheit
     * Returns the temperature in degrees Fahrenheit
     */
    //% blockId=tmp117_read_temp_f
    //% block="TMP117 read temperature (°F)"
    //% group="Reading"
    //% weight=99
    export function readTMP117TempF(): number {
        if (!tmp117) {
            createTMP117();
        }
        return tmp117.readTempF();
    }

    /**
     * Read temperature in Kelvin
     * Returns the temperature in Kelvin
     */
    //% blockId=tmp117_read_temp_k
    //% block="TMP117 read temperature (K)"
    //% group="Reading"
    //% weight=98
    export function readTMP117TempK(): number {
        if (!tmp117) {
            createTMP117();
        }
        return tmp117.readTempK();
    }
}
