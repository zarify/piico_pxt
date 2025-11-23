/**
 * PiicoDev RGB LED Module
 * 
 * 3-pixel programmable RGB LED strip with color wheel effects.
 */

//% weight=70 color=#32CD32 icon="\uf0eb"
//% groups=['Setting Colors', 'Display', 'Control', 'others']
namespace piicodev {

    /**
     * Named colors for easy LED control
     */
    export enum RGBColor {
        //% block="red"
        Red,
        //% block="green"
        Green,
        //% block="blue"
        Blue,
        //% block="yellow"
        Yellow,
        //% block="cyan"
        Cyan,
        //% block="magenta"
        Magenta,
        //% block="white"
        White,
        //% block="off"
        Off
    }

    /**
     * Create a color from RGB values
     * @param red Red value (0-255)
     * @param green Green value (0-255)
     * @param blue Blue value (0-255)
     */
    //% blockId=rgb_color_from_rgb
    //% block="color red $red green $green blue $blue"
    //% red.min=0 red.max=255 red.defl=255
    //% green.min=0 green.max=255 green.defl=0
    //% blue.min=0 blue.max=255 blue.defl=0
    //% group="Setting Colors"
    //% weight=110
    //% inlineInputMode=inline
    export function colorFromRGB(red: number, green: number, blue: number): number {
        red = Math.max(0, Math.min(255, red));
        green = Math.max(0, Math.min(255, green));
        blue = Math.max(0, Math.min(255, blue));
        return (red << 16) | (green << 8) | blue;
    }

    /**
     * Create a color from HSB (Hue, Saturation, Brightness) values
     * @param hue Hue value (0-360 degrees)
     * @param saturation Saturation (0-100%)
     * @param brightness Brightness (0-100%)
     */
    //% blockId=rgb_color_from_hsb
    //% block="color hue $hue saturation $saturation brightness $brightness"
    //% hue.min=0 hue.max=360 hue.defl=0
    //% saturation.min=0 saturation.max=100 saturation.defl=100
    //% brightness.min=0 brightness.max=100 brightness.defl=100
    //% group="Setting Colors"
    //% weight=109
    //% inlineInputMode=inline
    export function colorFromHSB(hue: number, saturation: number, brightness: number): number {
        // Normalize inputs
        let h = (hue % 360) / 360;
        let s = Math.max(0, Math.min(100, saturation)) / 100;
        let v = Math.max(0, Math.min(100, brightness)) / 100;

        // Convert HSB to RGB
        let rgb = hsbToRGB(h, s, v);
        return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
    }

    /**
     * Get a predefined color
     * @param color Named color
     */
    //% blockId=rgb_predefined_color
    //% block="$color"
    //% group="Setting Colors"
    //% weight=108
    export function color(color: RGBColor): number {
        let rgb = getColorRGB(color);
        return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
    }

    /**
     * Convert HSB to RGB
     * @param h Hue (0.0-1.0)
     * @param s Saturation (0.0-1.0)
     * @param v Value/Brightness (0.0-1.0)
     */
    function hsbToRGB(h: number, s: number, v: number): number[] {
        if (s === 0) {
            let val = Math.round(v * 255);
            return [val, val, val];
        }

        let i = Math.floor(h * 6);
        let f = h * 6 - i;
        let p = Math.round(255 * v * (1 - s));
        let q = Math.round(255 * v * (1 - s * f));
        let t = Math.round(255 * v * (1 - s * (1 - f)));
        let vInt = Math.round(v * 255);

        i = i % 6;

        if (i === 0) return [vInt, t, p];
        if (i === 1) return [q, vInt, p];
        if (i === 2) return [p, vInt, t];
        if (i === 3) return [p, q, vInt];
        if (i === 4) return [t, p, vInt];
        return [vInt, p, q];
    }

    /**
     * Get RGB values for a named color
     */
    function getColorRGB(color: RGBColor): number[] {
        switch (color) {
            case RGBColor.Red: return [255, 0, 0];
            case RGBColor.Green: return [0, 255, 0];
            case RGBColor.Blue: return [0, 0, 255];
            case RGBColor.Yellow: return [255, 255, 0];
            case RGBColor.Cyan: return [0, 255, 255];
            case RGBColor.Magenta: return [255, 0, 255];
            case RGBColor.White: return [255, 255, 255];
            case RGBColor.Off: return [0, 0, 0];
            default: return [0, 0, 0];
        }
    }

    /**
     * PiicoDev RGB LED class
     */
    class RGB {
        private addr: number;
        private pixels: number[][];
        private brightness: number;

        // Register addresses
        private static readonly REG_LED_VALUES = 0x07;
        private static readonly REG_BRIGHTNESS = 0x06;
        private static readonly REG_CLEAR = 0x04;
        private static readonly REG_CTRL = 0x03;
        private static readonly REG_I2C_ADDR = 0x05;

        constructor(address: number = 0x08) {
            this.addr = address;
            this.brightness = 50;
            this.pixels = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

            // Initialize RGB module
            this.initialize();
        }

        /**
         * Initialize the RGB module
         */
        private initialize(): void {
            try {
                this.setBrightness(this.brightness);
                this.show();
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Set a pixel to a specific color
         * @param pixel Pixel number (0, 1, or 2)
         * @param color Color value (use color blocks)
         */
        //% blockId=rgb_set_pixel
        //% block="RGB set pixel $pixel to $color"
        //% pixel.min=0 pixel.max=2 pixel.defl=0
        //% color.shadow="rgb_predefined_color"
        //% group="Setting Colors"
        //% weight=100
        public setPixel(pixel: number, color: number): void {
            if (pixel >= 0 && pixel <= 2) {
                let red = (color >> 16) & 0xFF;
                let green = (color >> 8) & 0xFF;
                let blue = color & 0xFF;
                this.pixels[pixel] = [red, green, blue];
            }
        }

        /**
         * Set all pixels to the same color
         * @param color Color value (use color blocks)
         */
        //% blockId=rgb_set_all
        //% block="RGB set all pixels to $color"
        //% color.shadow="rgb_predefined_color"
        //% group="Setting Colors"
        //% weight=97
        public setAll(color: number): void {
            let red = (color >> 16) & 0xFF;
            let green = (color >> 8) & 0xFF;
            let blue = color & 0xFF;
            for (let i = 0; i < 3; i++) {
                this.pixels[i] = [red, green, blue];
            }
        }

        /**
         * Update the LEDs with the current pixel values
         */
        //% blockId=rgb_show
        //% block="RGB show"
        //% weight=95
        public show(): void {
            try {
                // Build buffer with all 9 bytes (3 pixels × 3 RGB values)
                let buf = pins.createBuffer(9);
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        buf.setNumber(NumberFormat.UInt8LE, i * 3 + j, this.pixels[i][j]);
                    }
                }
                picodevUnified.writeRegister(this.addr, RGB.REG_LED_VALUES, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Clear all LEDs (turn off)
         */
        //% blockId=rgb_clear
        //% block="RGB clear all"
        //% weight=94
        public clear(): void {
            try {
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, 0x01);
                picodevUnified.writeRegister(this.addr, RGB.REG_CLEAR, buf);

                // Reset internal pixel state
                this.pixels = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
                basic.pause(1);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Set brightness level
         * @param level Brightness (0-255)
         */
        //% blockId=rgb_set_brightness
        //% block="RGB set brightness $level"
        //% level.min=0 level.max=255 level.defl=50
        //% weight=93
        public setBrightness(level: number): void {
            try {
                this.brightness = Math.max(0, Math.min(255, level));
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, this.brightness);
                picodevUnified.writeRegister(this.addr, RGB.REG_BRIGHTNESS, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Control the power LED on the RGB module
         */
        //% blockId=rgb_power_led
        //% block="RGB set power LED $on"
        //% on.shadow="toggleOnOff"
        //% on.defl=true
        //% advanced=true
        //% weight=50
        public setPowerLED(on: boolean): void {
            try {
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, on ? 0x01 : 0x00);
                picodevUnified.writeRegister(this.addr, RGB.REG_CTRL, buf);
                basic.pause(1);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Change the I2C address (for using multiple RGB modules)
         * @internal
         */
        public changeAddress(newAddress: number): void {
            try {
                // Validate address range
                if (newAddress < 0x08 || newAddress > 0x77) {
                    return;
                }

                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, newAddress);
                picodevUnified.writeRegister(this.addr, RGB.REG_I2C_ADDR, buf);
                this.addr = newAddress;
                basic.pause(5);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }
    }

    // Wrapper functions to call methods on the internal RGB instance
    /**
     * Set a pixel to a specific color
     * Note: Call RGB show after to update the LEDs
     */
    //% blockId=rgb_set_pixel
    //% block="RGB set pixel $pixel to $color"
    //% group="Setting Colors"
    //% pixel.min=0 pixel.max=2 pixel.defl=0
    //% color.shadow="rgb_predefined_color"
    //% weight=100
    export function setPixel(pixel: number, color: number): void {
        if (!_rgb) _rgb = new RGB(0x08);
        if (_rgb) _rgb.setPixel(pixel, color);
    }

    /**
     * Set all pixels to the same color
     * Note: Call RGB show after to update the LEDs
     */
    //% blockId=rgb_set_all
    //% block="RGB set all pixels to $color"
    //% group="Setting Colors"
    //% color.shadow="rgb_predefined_color"
    //% weight=97
    export function setAll(color: number): void {
        if (!_rgb) _rgb = new RGB(0x08);
        if (_rgb) _rgb.setAll(color);
    }

    /**
     * Update the LEDs with the current pixel values
     */
    //% blockId=rgb_show
    //% block="RGB show"
    //% group="Display"
    //% weight=95
    export function rgbShow(): void {
        if (!_rgb) _rgb = new RGB(0x08);
        if (_rgb) _rgb.show();
    }

    /**
     * Clear all LEDs (turn off)
     */
    //% blockId=rgb_clear
    //% block="RGB clear all"
    //% group="Display"
    //% weight=94
    export function rgbClear(): void {
        if (!_rgb) _rgb = new RGB(0x08);
        if (_rgb) _rgb.clear();
    }

    /**
     * Set brightness level
     */
    //% blockId=rgb_set_brightness
    //% block="RGB set brightness $level"
    //% group="Control"
    //% level.min=0 level.max=255 level.defl=50
    //% weight=93
    export function setBrightness(level: number): void {
        if (!_rgb) _rgb = new RGB(0x08);
        if (_rgb) _rgb.setBrightness(level);
    }

    /**
     * Control the power LED on the RGB module
     */
    //% blockId=rgb_power_led
    //% block="RGB set power LED $on"
    //% group="Control"
    //% on.shadow="toggleOnOff"
    //% on.defl=true
    //% advanced=true
    //% weight=50
    export function setPowerLED(on: boolean): void {
        if (!_rgb) _rgb = new RGB(0x08);
        if (_rgb) _rgb.setPowerLED(on);
    }



    /**
     * Create a new PiicoDev RGB LED instance
     */
    export function createRGB(address?: number): void {
        if (address === undefined) address = 0x08;
        _rgb = new RGB(address);
    }

    /**
     * Debug: Check if RGB module is detected at the specified address
     * Default address is 0x08 (all DIP switches off)
     */
    export function rgbIsDetected(address?: number): boolean {
        if (address === undefined) address = 0x08;
        return picodevUnified.isDevicePresent(address);
    }

    /**
     * Debug: Scan I2C bus for RGB modules (addresses 0x08-0x17)
     * Call this to find where your RGB module is connected
     * Returns the address if found, or 0 if not found
     */
    export function rgbScanBus(): number {
        // RGB modules respond at addresses 0x08 through 0x17 based on DIP switch configuration
        for (let addr = 0x08; addr <= 0x17; addr++) {
            if (picodevUnified.isDevicePresent(addr)) {
                return addr;
            }
        }
        return 0; // Not found
    }

    /**
     * Debug: Test RGB communication directly (write test pattern)
     * Tries to write a test pattern to the RGB module
     * @param address I2C address to test (default 0x08)
     */
    export function rgbTestWrite(address?: number): void {
        if (address === undefined) address = 0x08;
        try {
            // Try to write brightness value
            let buf = pins.createBuffer(1);
            buf.setNumber(NumberFormat.UInt8LE, 0, 128);
            let result = picodevUnified.writeRegister(address, 0x06, buf);
            if (result === 0) {
                basic.showIcon(IconNames.Heart);
            } else {
                basic.showIcon(IconNames.Sad);
            }
        } catch (e) {
            basic.showIcon(IconNames.No);
        }
    }

    // Internal singleton instance
    let _rgb: RGB;
}
