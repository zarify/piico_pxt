/**
 * PiicoDev VEML6040 RGB Color Light Sensor
 * 
 * Measures red, green, blue, and white light with color classification
 * and ambient light detection capabilities.
 */

//% weight=85 color=#FF6B9D icon="\uf53f"
//% groups=['Reading', 'Color Analysis', 'Configuration', 'others']
namespace piicodev {

    /**
     * Named colors for easy color classification
     */
    export enum ColorName {
        //% block="red"
        Red,
        //% block="yellow"
        Yellow,
        //% block="green"
        Green,
        //% block="cyan"
        Cyan,
        //% block="blue"
        Blue,
        //% block="magenta"
        Magenta,
        //% block="none"
        None
    }

    /**
     * Color channel selection for RGBW readings
     */
    export enum ColorChannel {
        //% block="red"
        Red = 0,
        //% block="green"
        Green = 1,
        //% block="blue"
        Blue = 2,
        //% block="white"
        White = 3
    }

    /**
     * HSB color component
     */
    export enum HSBComponent {
        //% block="hue"
        Hue = 0,
        //% block="saturation"
        Saturation = 1,
        //% block="brightness"
        Brightness = 2
    }

    /**
     * VEML6040 Color Sensor class
     */
    class VEML6040 {
        private addr: number;

        // Register addresses
        private static readonly REG_RED = 0x08;
        private static readonly REG_GREEN = 0x09;
        private static readonly REG_BLUE = 0x0A;
        private static readonly REG_WHITE = 0x0B;
        private static readonly REG_CONFIG = 0x00;

        // Sensitivity factor for ambient light calculation
        private static readonly SENSITIVITY = 0.25168;

        constructor(address: number = 0x10) {
            this.addr = address;
            this.initialize();
        }

        /**
         * Initialize the sensor
         */
        private initialize(): void {
            try {
                // Shutdown sensor
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, 0x01); // shutdown
                picodevUnified.writeRegister(this.addr, VEML6040.REG_CONFIG, buf);

                // Re-initialize with default settings
                buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, 0x00); // default settings
                picodevUnified.writeRegister(this.addr, VEML6040.REG_CONFIG, buf);
                basic.pause(50);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Read red light intensity (0-65535)
         */
        //% blockId=veml6040_read_red
        //% block="VEML6040 read red light"
        //% weight=100
        public readRed(): number {
            try {
                return picodevUnified.readRegisterUInt16LE(this.addr, VEML6040.REG_RED);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Read green light intensity (0-65535)
         */
        //% blockId=veml6040_read_green
        //% block="VEML6040 read green light"
        //% weight=99
        public readGreen(): number {
            try {
                return picodevUnified.readRegisterUInt16LE(this.addr, VEML6040.REG_GREEN);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Read blue light intensity (0-65535)
         */
        //% blockId=veml6040_read_blue
        //% block="VEML6040 read blue light"
        //% weight=98
        public readBlue(): number {
            try {
                return picodevUnified.readRegisterUInt16LE(this.addr, VEML6040.REG_BLUE);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Read white light intensity (0-65535)
         */
        //% blockId=veml6040_read_white
        //% block="VEML6040 read white light"
        //% weight=97
        public readWhite(): number {
            try {
                return picodevUnified.readRegisterUInt16LE(this.addr, VEML6040.REG_WHITE);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Convert RGB to HSV
         * Returns array with [hue (0-360), saturation (0-1), value (0-1)]
         * Matches the Python implementation exactly
         */
        private rgbToHsv(r: number, g: number, b: number): number[] {
            let rf = r / 65535;
            let gf = g / 65535;
            let bf = b / 65535;

            let max = Math.max(rf, Math.max(gf, bf));
            let min = Math.min(rf, Math.min(gf, bf));
            let delta = max - min;

            // Calculate hue (matches Python: h={r:(g-b)/d+(6 if g<b else 0),g:(b-r)/d+2,b:(r-g)/d+4}[high];h/=6)
            let hue = 0;
            if (delta !== 0) {
                if (max === rf) {
                    // Python: (g-b)/d + (6 if g<b else 0), then /6, then *360
                    hue = (gf - bf) / delta + (gf < bf ? 6 : 0);
                } else if (max === gf) {
                    // Python: (b-r)/d + 2
                    hue = (bf - rf) / delta + 2;
                } else {
                    // Python: (r-g)/d + 4
                    hue = (rf - gf) / delta + 4;
                }
                // Divide by 6 then multiply by 360 (equivalent to * 60)
                hue = (hue / 6) * 360;
            }

            // Ensure hue is positive
            if (hue < 0) hue += 360;

            // Calculate saturation
            let sat = max === 0 ? 0 : delta / max;

            // Value is just max
            return [hue, sat, max];
        }

        /**
         * Classify the detected color and return its name
         * Uses RGB ratio-based approach to handle sensor's yellow bias
         * Optimized for close-distance detection (sensor must be very close to surface)
         */
        //% blockId=veml6040_classify_color
        //% block="VEML6040 classify color"
        //% weight=96
        public classifyColor(): string {
            try {
                let r = this.readRed();
                let g = this.readGreen();
                let b = this.readBlue();

                // Calculate total and percentages
                let total = r + g + b;
                if (total === 0) {
                    return "none";
                }

                // Filter out very low readings (sensor pointing at nothing/dark surface far away)
                if (total < 800) {
                    return "none";
                }

                let rPct = r / total;
                let gPct = g / total;
                let bPct = b / total;

                // Find max and min percentages
                let maxPct = Math.max(rPct, Math.max(gPct, bPct));
                let minPct = Math.min(rPct, Math.min(gPct, bPct));
                let range = maxPct - minPct;

                // Red detection: R% is dominant and significantly higher
                if (rPct > 0.45 && rPct > gPct && rPct > bPct) {
                    return "red";
                }

                // Green detection: G% is dominant and significantly higher
                if (gPct > 0.40 && gPct > rPct && gPct > bPct) {
                    return "green";
                }

                // Blue detection: B% is highest OR (G% slightly higher but B% strong)
                // Blue is tricky due to sensor bias - it often reads with G slightly higher than B
                if (bPct > rPct && bPct > gPct) {
                    return "blue";
                }
                if (bPct > 0.27 && gPct > rPct && (gPct - bPct) < 0.10) {
                    return "blue";
                }

                // White detection: balanced channels with good blue content
                // Must have tight range AND higher B% than black would have
                if (range < 0.16 && rPct > 0.36 && gPct > 0.38 && bPct > 0.235) {
                    return "white";
                }

                // Black detection: all channels similar and relatively balanced
                // Checked after white - has slightly wider range tolerance
                if (range < 0.17 && rPct > 0.35 && gPct > 0.35) {
                    return "black";
                }

                // If nothing matched, return none
                return "none";
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return "none";
            }
        }

        /**
         * Get color hue (0-360 degrees)
         */
        //% blockId=veml6040_hue
        //% block="VEML6040 color hue"
        //% weight=95
        public getHue(): number {
            try {
                let r = this.readRed();
                let g = this.readGreen();
                let b = this.readBlue();
                let hsv = this.rgbToHsv(r, g, b);
                return Math.round(hsv[0]);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Get color saturation (0-100%)
         */
        //% blockId=veml6040_saturation
        //% block="VEML6040 color saturation"
        //% weight=94
        public getSaturation(): number {
            try {
                let r = this.readRed();
                let g = this.readGreen();
                let b = this.readBlue();
                let hsv = this.rgbToHsv(r, g, b);
                return Math.round(hsv[1] * 100);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Get color brightness/value (0-100%)
         */
        //% blockId=veml6040_brightness
        //% block="VEML6040 color brightness"
        //% weight=93
        public getBrightness(): number {
            try {
                let r = this.readRed();
                let g = this.readGreen();
                let b = this.readBlue();
                let hsv = this.rgbToHsv(r, g, b);
                return Math.round(hsv[2] * 100);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Read ambient light level in lux
         */
        //% blockId=veml6040_ambient_light
        //% block="VEML6040 ambient light (lux)"
        //% advanced=true
        //% weight=50
        public getAmbientLight(): number {
            try {
                let g = this.readGreen();
                return Math.round(g * VEML6040.SENSITIVITY);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }

        /**
         * Read color temperature in Kelvin
         */
        //% blockId=veml6040_color_temperature
        //% block="VEML6040 color temperature (K)"
        //% advanced=true
        //% weight=49
        public getColorTemperature(): number {
            try {
                let r = this.readRed();
                let g = this.readGreen();
                let b = this.readBlue();

                // CCT calculation using CIE 1960 chromaticity coordinates
                // These constants are based on the color temperature calculation algorithm
                let colorX = -0.023249 * r + 0.291014 * g + (-0.36488) * b;
                let colorY = -0.042799 * r + 0.272148 * g + (-0.279591) * b;
                let colorZ = -0.155901 * r + 0.251534 * g + (-0.07624) * b;

                let colorTotal = colorX + colorY + colorZ;
                if (colorTotal === 0) {
                    return 0;
                }

                let cx = colorX / colorTotal;
                let cy = colorY / colorTotal;

                // McCamy's approximation for CCT
                let n = (cx - 0.332) / (0.1858 - cy);
                let cct = 449.0 * Math.pow(n, 3) + 3525.0 * Math.pow(n, 2) +
                    6823.3 * n + 5520.33;

                return Math.round(cct);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return 0;
            }
        }
    }

    // Internal singleton instance
    let _veml6040: VEML6040;

    // Wrapper functions to call methods on the internal VEML6040 instance
    /**
     * Read light intensity for a specific color channel (0-65535)
     * @param channel The color channel to read (Red, Green, Blue, or White)
     */
    //% blockId=veml6040_read_channel
    //% block="VEML6040 read $channel light"
    //% group="Reading"
    //% weight=100
    export function veml6040ReadChannel(channel: ColorChannel): number {
        if (!_veml6040) _veml6040 = new VEML6040(0x10);
        if (!_veml6040) return 0;
        if (channel === ColorChannel.Red) return _veml6040.readRed();
        else if (channel === ColorChannel.Green) return _veml6040.readGreen();
        else if (channel === ColorChannel.Blue) return _veml6040.readBlue();
        else return _veml6040.readWhite();
    }

    /**
     * Classify the detected color and return its name
     */
    //% blockId=veml6040_classify_color
    //% block="VEML6040 classify color"
    //% group="Color Analysis"
    //% weight=96
    export function veml6040ClassifyColor(): string {
        if (!_veml6040) _veml6040 = new VEML6040(0x10);
        if (_veml6040) return _veml6040.classifyColor();
        return "none";
    }

    /**
     * Get HSB color component value
     * @param component The HSB component to read (Hue, Saturation, or Brightness)
     */
    //% blockId=veml6040_get_hsb
    //% block="VEML6040 color $component"
    //% group="Color Analysis"
    //% weight=95
    export function veml6040GetHSB(component: HSBComponent): number {
        if (!_veml6040) _veml6040 = new VEML6040(0x10);
        if (!_veml6040) return 0;
        if (component === HSBComponent.Hue) return _veml6040.getHue();
        else if (component === HSBComponent.Saturation) return _veml6040.getSaturation();
        else return _veml6040.getBrightness();
    }

    /**
     * Read ambient light level in lux
     */
    //% blockId=veml6040_ambient_light
    //% block="VEML6040 ambient light (lux)"
    //% group="Configuration"
    //% advanced=true
    //% weight=50
    export function veml6040GetAmbientLight(): number {
        if (!_veml6040) _veml6040 = new VEML6040(0x10);
        if (_veml6040) return _veml6040.getAmbientLight();
        return 0;
    }

    /**
     * Read color temperature in Kelvin
     */
    //% blockId=veml6040_color_temperature
    //% block="VEML6040 color temperature (K)"
    //% group="Configuration"
    //% advanced=true
    //% weight=49
    export function veml6040GetColorTemperature(): number {
        if (!_veml6040) _veml6040 = new VEML6040(0x10);
        if (_veml6040) return _veml6040.getColorTemperature();
        return 0;
    }

    /**
     * Create a new VEML6040 color sensor instance
     */
    export function createVEML6040(address?: number): void {
        if (address === undefined) address = 0x10;
        _veml6040 = new VEML6040(address);
    }
}
