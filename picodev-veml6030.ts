/**
 * PiicoDev VEML6030 Ambient Light Sensor
 * 
 * Measures ambient light intensity in lux with adjustable gain.
 */

//% weight=85 color=#FFD93D icon="\uf0eb"
//% groups=['Reading', 'Configuration', 'others']
namespace piicodev {

    /**
     * Light sensor gain setting
     */
    export enum GainSetting {
        //% block="1/8"
        Gain1_8 = 1,
        //% block="1/4"
        Gain1_4 = 2,
        //% block="1"
        Gain1 = 3,
        //% block="2"
        Gain2 = 4
    }

    /**
     * VEML6030 Ambient Light Sensor class
     */
    class VEML6030 {
        private addr: number;
        private gain: number;
        private resolution: number;

        private static readonly REG_ALS_CONF = 0x00;
        private static readonly REG_ALS = 0x04;

        private static readonly I2C_DEFAULT_ADDRESS = 0x10;

        constructor(address: number = VEML6030.I2C_DEFAULT_ADDRESS) {
            this.addr = address;
            this.gain = 1;
            this.resolution = 0.0576;
            this.initialize();
        }

        /**
         * Initialize the sensor
         */
        private initialize(): void {
            try {
                // Write default settings
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, 0x00);
                picodevUnified.writeRegister(this.addr, VEML6030.REG_ALS_CONF, buf);
                basic.pause(4);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Read ambient light in lux
         */
        readLux(): number {
            try {
                let val = picodevUnified.readRegisterUInt16LE(this.addr, VEML6030.REG_ALS);
                return val * this.resolution;
            } catch (e) {
                return 0;
            }
        }

        /**
         * Set sensor gain
         */
        setGain(gainSetting: GainSetting): void {
            try {
                let gainValues: { [key: number]: number } = {
                    1: 0.125, 2: 0.25, 3: 1, 4: 2
                };
                let resValues: { [key: number]: number } = {
                    1: 0.4608, 2: 0.2304, 3: 0.0576, 4: 0.0288
                };

                this.gain = gainValues[gainSetting] || 1;
                this.resolution = resValues[gainSetting] || 0.0576;

                // Write configuration
                let config = 0x00;
                if (gainSetting === GainSetting.Gain1_8) config = 0x10;
                else if (gainSetting === GainSetting.Gain1_4) config = 0x18;
                else if (gainSetting === GainSetting.Gain2) config = 0x08;

                let buf = pins.createBuffer(2);
                buf.setNumber(NumberFormat.UInt16LE, 0, config);
                picodevUnified.writeRegister(this.addr, VEML6030.REG_ALS_CONF, buf);
                basic.pause(4);
            } catch (e) {
                // Silently fail
            }
        }
    }

    let veml6030: VEML6030;

    /**
     * Initialize the VEML6030 ambient light sensor
     * @param address I2C address (default: 0x10)
     */
    //% blockId=veml6030_create
    //% block="VEML6030 initialize at address $address"
    //% address.defl=0x10
    //% advanced=true
    //% weight=100
    export function createVEML6030(address: number = 0x10): void {
        veml6030 = new VEML6030(address);
    }

    /**
     * Read ambient light in lux
     */
    //% blockId=veml6030_read_lux
    //% block="VEML6030 read light (lux)"
    //% group="Reading"
    //% weight=100
    export function readVEML6030Lux(): number {
        if (!veml6030) {
            createVEML6030();
        }
        return Math.round(veml6030.readLux() * 100) / 100;
    }

    /**
     * Set sensor gain for different light conditions
     * @param gain Gain setting (1/8, 1/4, 1, or 2)
     */
    //% blockId=veml6030_set_gain
    //% block="VEML6030 set gain to $gain"
    //% gain.defl=GainSetting.Gain1
    //% group="Configuration"
    //% weight=50
    export function setVEML6030Gain(gain: GainSetting): void {
        if (!veml6030) {
            createVEML6030();
        }
        veml6030.setGain(gain);
    }
}
