/**
 * PiicoDev RGB LED Module
 * 
 * 3-pixel programmable RGB LED strip with color wheel effects.
 */

//% weight=70 color=#32CD32 icon="\uf0eb"
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
     * PiicoDev RGB LED class
     */
    export class RGB {
        private addr: number;
        private pixels: number[][];
        private brightness: number;

        constructor(address: number = 0x08) {
            this.addr = address;
            this.brightness = 50;
            this.pixels = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

            // TODO: Initialize RGB module
            // This will be implemented in Phase 2
        }

        /**
         * Set a pixel to specific RGB values
         * @param pixel Pixel number (0, 1, or 2)
         * @param red Red intensity (0-255)
         * @param green Green intensity (0-255)
         * @param blue Blue intensity (0-255)
         */
        //% blockId=rgb_set_pixel_rgb
        //% block="$this set pixel $pixel to red $red green $green blue $blue"
        //% pixel.min=0 pixel.max=2 pixel.defl=0
        //% red.min=0 red.max=255 red.defl=255
        //% green.min=0 green.max=255 green.defl=0
        //% blue.min=0 blue.max=255 blue.defl=0
        //% weight=100
        //% inlineInputMode=inline
        setPixelRGB(pixel: number, red: number, green: number, blue: number): void {
            if (pixel >= 0 && pixel <= 2) {
                this.pixels[pixel] = [red, green, blue];
            }
        }

        /**
         * Set a pixel to a named color
         * @param pixel Pixel number (0, 1, or 2)
         * @param color Named color
         */
        //% blockId=rgb_set_pixel_color
        //% block="$this set pixel $pixel to $color"
        //% pixel.min=0 pixel.max=2 pixel.defl=0
        //% weight=99
        setPixelColor(pixel: number, color: RGBColor): void {
            let rgb = this.getColorRGB(color);
            this.setPixelRGB(pixel, rgb[0], rgb[1], rgb[2]);
        }

        /**
         * Set a pixel using color wheel position (0.0-1.0)
         * @param pixel Pixel number (0, 1, or 2)
         * @param position Position on color wheel (0.0-1.0)
         */
        //% blockId=rgb_set_pixel_wheel
        //% block="$this set pixel $pixel using color wheel $position"
        //% pixel.min=0 pixel.max=2 pixel.defl=0
        //% position.min=0 position.max=1 position.defl=0
        //% weight=98
        setPixelColorWheel(pixel: number, position: number): void {
            let rgb = this.wheel(position, 1, 1);
            this.setPixelRGB(pixel, rgb[0], rgb[1], rgb[2]);
        }

        /**
         * Set all pixels to the same RGB values
         * @param red Red intensity (0-255)
         * @param green Green intensity (0-255)
         * @param blue Blue intensity (0-255)
         */
        //% blockId=rgb_set_all_rgb
        //% block="$this set all pixels to red $red green $green blue $blue"
        //% red.min=0 red.max=255 red.defl=255
        //% green.min=0 green.max=255 green.defl=0
        //% blue.min=0 blue.max=255 blue.defl=0
        //% weight=97
        //% inlineInputMode=inline
        setAllRGB(red: number, green: number, blue: number): void {
            for (let i = 0; i < 3; i++) {
                this.pixels[i] = [red, green, blue];
            }
        }

        /**
         * Set all pixels to a named color
         * @param color Named color
         */
        //% blockId=rgb_set_all_color
        //% block="$this set all pixels to $color"
        //% weight=96
        setAllColor(color: RGBColor): void {
            let rgb = this.getColorRGB(color);
            this.setAllRGB(rgb[0], rgb[1], rgb[2]);
        }

        /**
         * Update the LEDs with the current pixel values
         */
        //% blockId=rgb_show
        //% block="$this show"
        //% weight=95
        show(): void {
            // TODO: Implement I2C write to update LEDs
        }

        /**
         * Clear all LEDs (turn off)
         */
        //% blockId=rgb_clear
        //% block="$this clear all"
        //% weight=94
        clear(): void {
            this.setAllRGB(0, 0, 0);
            this.show();
        }

        /**
         * Set brightness level
         * @param level Brightness (0-255)
         */
        //% blockId=rgb_set_brightness
        //% block="$this set brightness $level"
        //% level.min=0 level.max=255 level.defl=50
        //% weight=93
        setBrightness(level: number): void {
            this.brightness = Math.max(0, Math.min(255, level));
            // TODO: Send brightness to device
        }

        /**
         * Control the power LED on the RGB module
         */
        //% blockId=rgb_power_led
        //% block="$this set power LED $on"
        //% on.shadow="toggleOnOff"
        //% on.defl=true
        //% advanced=true
        //% weight=50
        setPowerLED(on: boolean): void {
            // TODO: Implement LED control
        }

        /**
         * Change the I2C address (for using multiple RGB modules)
         */
        //% blockId=rgb_change_address
        //% block="$this change address to $newAddress"
        //% advanced=true
        //% weight=49
        //% newAddress.defl=0x08
        changeAddress(newAddress: number): void {
            // TODO: Implement address change
            this.addr = newAddress;
        }

        /**
         * Get RGB values for a named color
         */
        private getColorRGB(color: RGBColor): number[] {
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
         * Color wheel function - converts HSV to RGB
         * @param h Hue (0.0-1.0)
         * @param s Saturation (0.0-1.0)
         * @param v Value/Brightness (0.0-1.0)
         */
        private wheel(h: number, s: number, v: number): number[] {
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
    }

    /**
     * Create a new PiicoDev RGB LED instance
     */
    //% blockId=create_rgb
    //% block="create PiicoDev RGB||at address $address"
    //% blockSetVariable=rgbLED
    //% address.defl=0x08
    //% weight=70
    //% expandableArgumentMode="toggle"
    export function createRGB(address?: number): RGB {
        if (address === undefined) address = 0x08;
        return new RGB(address);
    }
}
