/**
 * PiicoDev TMP117 Precision Temperature Sensor
 * 
 * High-accuracy temperature sensor with ±0.1°C accuracy.
 * Reads temperature in Celsius, Fahrenheit, or Kelvin.
 */

//% weight=79 color=#00A4A6 icon="\uf2c9"
//% groups=['Environment']
namespace piicodev {

    /**
     * Temperature unit selection
     */
    export enum TempUnit {
        //% block="°C (Celsius)"
        Celsius,
        //% block="°F (Fahrenheit)"
        Fahrenheit,
        //% block="K (Kelvin)"
        Kelvin
    }

    /**
     * TMP117 Temperature Sensor class
     */
    class TMP117 {
        private addr: number;

        // Register addresses
        private static readonly REG_TEMP = 0x00;

        // Device constants
        private static readonly I2C_ADDRESS = 0x48;  // 72 decimal

        constructor(address: number = TMP117.I2C_ADDRESS) {
            this.addr = address;
        }

        /**
         * Read temperature in Celsius
         */
        readTempC(): number {
            try {
                // Read 2 bytes (16-bit temperature value)
                let data = picodevUnified.readRegister(this.addr, TMP117.REG_TEMP, 2);

                // Combine bytes (big-endian, signed 16-bit)
                let tempRaw = (data[0] << 8) | data[1];

                // Convert to signed integer
                if (tempRaw >= 32768) {
                    // Negative temperature
                    return -256.0 + (tempRaw - 32768) * 0.0078125;
                } else {
                    // Positive temperature
                    return tempRaw * 0.0078125;
                }
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Read temperature in Fahrenheit
         */
        readTempF(): number {
            return this.readTempC() * 9 / 5 + 32;
        }

        /**
         * Read temperature in Kelvin
         */
        readTempK(): number {
            return this.readTempC() + 273.15;
        }

        /**
         * Read temperature in specified unit
         */
        readTemp(unit: TempUnit): number {
            if (unit === TempUnit.Fahrenheit) {
                return this.readTempF();
            } else if (unit === TempUnit.Kelvin) {
                return this.readTempK();
            }
            return this.readTempC();
        }
    }

    // Global TMP117 instance
    let _tmp117: TMP117 = null;

    /**
     * Read temperature
     * @param unit Temperature unit (Celsius, Fahrenheit, or Kelvin)
     * @returns Temperature in selected unit
     */
    //% blockId=tmp117_read_temperature
    //% block="temperature $unit"
    //% unit.defl=TempUnit.Celsius
    //% group="Temperature"
    //% weight=100
    export function tmp117Temperature(unit: TempUnit): number {
        if (!_tmp117) {
            _tmp117 = new TMP117();
        }
        return _tmp117.readTemp(unit);
    }
}
