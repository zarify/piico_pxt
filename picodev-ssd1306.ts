/**
 * PiicoDev OLED Display (SSD1306)
 * 
 * 128x64 pixel monochrome OLED display with graphics and text support.
 * Uses buffered drawing - call show() to update the display after drawing.
 */

//% weight=86 color=#9966FF icon="\uf0a1"
//% groups=['SSD1306 OLED']
namespace PiicoDevDisplays {

    /**
     * Text size options
     */
    export enum TextSize {
        //% block="small"
        Small = 1,
        //% block="medium"
        Medium = 2,
        //% block="large"
        Large = 3
    }

    /**
     * SSD1306 OLED Display class
     */
    class SSD1306 {
        private addr: number;
        private buffer: Buffer;
        private width: number;
        private height: number;
        private pages: number;

        // Display commands
        private static readonly SET_CONTRAST = 0x81;
        private static readonly SET_ENTIRE_ON = 0xA4;
        private static readonly SET_NORM_INV = 0xA6;
        private static readonly SET_DISP = 0xAE;
        private static readonly SET_MEM_ADDR = 0x20;
        private static readonly SET_COL_ADDR = 0x21;
        private static readonly SET_PAGE_ADDR = 0x22;
        private static readonly SET_DISP_START_LINE = 0x40;
        private static readonly SET_SEG_REMAP = 0xA0;
        private static readonly SET_MUX_RATIO = 0xA8;
        private static readonly SET_IREF_SELECT = 0xAD;
        private static readonly SET_COM_OUT_DIR = 0xC0;
        private static readonly SET_DISP_OFFSET = 0xD3;
        private static readonly SET_COM_PIN_CFG = 0xDA;
        private static readonly SET_DISP_CLK_DIV = 0xD5;
        private static readonly SET_PRECHARGE = 0xD9;
        private static readonly SET_VCOM_DESEL = 0xDB;
        private static readonly SET_CHARGE_PUMP = 0x8D;

        private static readonly WIDTH = 128;
        private static readonly HEIGHT = 64;
        private static readonly I2C_ADDRESS = 0x3C;  // 60 in decimal

        constructor(address: number = 0x3C) {
            this.addr = address;
            this.width = SSD1306.WIDTH;
            this.height = SSD1306.HEIGHT;
            this.pages = this.height / 8;
            this.buffer = pins.createBuffer(this.pages * this.width);

            // Initialize display
            this.initialize();
        }

        /**
         * Initialize the display
         */
        private initialize(): void {
            try {
                // Initialization sequence for SSD1306 128x64
                // Display off
                this.writeCmd(SSD1306.SET_DISP);

                // Set memory addressing mode to horizontal (0x00)
                this.writeCmd(SSD1306.SET_MEM_ADDR);
                this.writeCmd(0x00);

                // Display start line
                this.writeCmd(SSD1306.SET_DISP_START_LINE | 0x00);

                // Segment remap: column 127 mapped to SEG0 (flip horizontally)
                this.writeCmd(SSD1306.SET_SEG_REMAP | 0x01);

                // MUX ratio
                this.writeCmd(SSD1306.SET_MUX_RATIO);
                this.writeCmd(this.height - 1);

                // COM output scan direction: scan from COM[N] to COM0 (flip vertically)
                this.writeCmd(SSD1306.SET_COM_OUT_DIR | 0x08);

                // Display offset
                this.writeCmd(SSD1306.SET_DISP_OFFSET);
                this.writeCmd(0x00);

                // COM pins hardware configuration
                this.writeCmd(SSD1306.SET_COM_PIN_CFG);
                this.writeCmd(0x12);

                // Display clock divide ratio
                this.writeCmd(SSD1306.SET_DISP_CLK_DIV);
                this.writeCmd(0x80);

                // Pre-charge period
                this.writeCmd(SSD1306.SET_PRECHARGE);
                this.writeCmd(0xF1);

                // VCOMH deselect level
                this.writeCmd(SSD1306.SET_VCOM_DESEL);
                this.writeCmd(0x30);

                // Contrast
                this.writeCmd(SSD1306.SET_CONTRAST);
                this.writeCmd(0xFF);

                // Entire display on: output follows RAM content
                this.writeCmd(SSD1306.SET_ENTIRE_ON);

                // Normal display (not inverted)
                this.writeCmd(SSD1306.SET_NORM_INV);

                // Internal IREF setting
                this.writeCmd(SSD1306.SET_IREF_SELECT);
                this.writeCmd(0x30);

                // Charge pump enable
                this.writeCmd(SSD1306.SET_CHARGE_PUMP);
                this.writeCmd(0x14);

                // Display on
                this.writeCmd(SSD1306.SET_DISP | 0x01);

                // Give display time to initialize
                basic.pause(100);

                // Clear the display
                this.clear();
                this.show();
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Write a command byte
         */
        private writeCmd(cmd: number): void {
            let buf = pins.createBuffer(2);
            buf[0] = 0x00;  // Control byte: Co=0, D/C=0 (command)
            buf[1] = cmd;
            pins.i2cWriteBuffer(this.addr, buf, false);
        }

        /**
         * Write data bytes
         */
        private writeData(data: Buffer): void {
            let buf = pins.createBuffer(1 + data.length);
            buf[0] = 0x40;  // Control byte: Co=0, D/C=1 (data)
            for (let i = 0; i < data.length; i++) {
                buf[1 + i] = data[i];
            }
            pins.i2cWriteBuffer(this.addr, buf, false);
        }

        /**
         * Set a pixel in the buffer (does not update display)
         */
        public setPixel(x: number, y: number, on: boolean): void {
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
                return;
            }

            let page = Math.floor(y / 8);
            let shift = y % 8;
            let index = x + page * this.width;

            if (on) {
                this.buffer[index] = this.buffer[index] | (1 << shift);
            } else {
                this.buffer[index] = this.buffer[index] & ~(1 << shift);
            }
        }

        /**
         * Get a pixel value from the buffer
         */
        private getPixel(x: number, y: number): boolean {
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
                return false;
            }

            let page = Math.floor(y / 8);
            let shift = y % 8;
            let index = x + page * this.width;

            return (this.buffer[index] & (1 << shift)) !== 0;
        }

        /**
         * Clear the display buffer (does not update display)
         */
        public clear(): void {
            for (let i = 0; i < this.buffer.length; i++) {
                this.buffer[i] = 0;
            }
        }

        /**
         * Fill the display buffer (does not update display)
         */
        public fill(): void {
            for (let i = 0; i < this.buffer.length; i++) {
                this.buffer[i] = 0xFF;
            }
        }

        /**
         * Update the display with buffer contents
         */
        public show(): void {
            try {
                // Set column address range
                this.writeCmd(SSD1306.SET_COL_ADDR);
                this.writeCmd(0);
                this.writeCmd(this.width - 1);

                // Set page address range
                this.writeCmd(SSD1306.SET_PAGE_ADDR);
                this.writeCmd(0);
                this.writeCmd(this.pages - 1);

                // Write buffer in chunks, but handle control bytes properly
                // Maximum I2C transfer is typically 32 bytes including control byte
                let chunkSize = 31;  // Leave room for control byte
                for (let i = 0; i < this.buffer.length; i += chunkSize) {
                    let end = Math.min(i + chunkSize, this.buffer.length);
                    let dataLength = end - i;

                    // Create buffer with control byte + data
                    let buf = pins.createBuffer(1 + dataLength);
                    buf[0] = 0x40;  // Control byte: D/C=1 (data)

                    // Copy chunk to buffer
                    for (let j = 0; j < dataLength; j++) {
                        buf[1 + j] = this.buffer[i + j];
                    }

                    pins.i2cWriteBuffer(this.addr, buf, false);
                }
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Draw a line (does not update display)
         */
        public drawLine(x0: number, y0: number, x1: number, y1: number): void {
            let steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);

            if (steep) {
                let tmp = x0; x0 = y0; y0 = tmp;
                tmp = x1; x1 = y1; y1 = tmp;
            }

            if (x0 > x1) {
                let tmp = x0; x0 = x1; x1 = tmp;
                tmp = y0; y0 = y1; y1 = tmp;
            }

            let dx = x1 - x0;
            let dy = Math.abs(y1 - y0);
            let err = dx / 2;
            let ystep = y0 < y1 ? 1 : -1;

            while (x0 <= x1) {
                if (steep) {
                    this.setPixel(y0, x0, true);
                } else {
                    this.setPixel(x0, y0, true);
                }
                err -= dy;
                if (err < 0) {
                    y0 += ystep;
                    err += dx;
                }
                x0++;
            }
        }

        /**
         * Draw a rectangle (does not update display)
         */
        public drawRect(x: number, y: number, w: number, h: number, filled: boolean): void {
            if (filled) {
                for (let i = y; i < y + h; i++) {
                    for (let j = x; j < x + w; j++) {
                        this.setPixel(j, i, true);
                    }
                }
            } else {
                // Top and bottom
                for (let i = x; i < x + w; i++) {
                    this.setPixel(i, y, true);
                    this.setPixel(i, y + h - 1, true);
                }
                // Left and right
                for (let i = y; i < y + h; i++) {
                    this.setPixel(x, i, true);
                    this.setPixel(x + w - 1, i, true);
                }
            }
        }

        /**
         * Draw a circle (does not update display)
         */
        public drawCircle(x0: number, y0: number, r: number, filled: boolean): void {
            if (filled) {
                for (let x = x0 - r; x <= x0 + r; x++) {
                    for (let y = y0 - r; y <= y0 + r; y++) {
                        if ((x - x0) * (x - x0) + (y - y0) * (y - y0) <= r * r) {
                            this.setPixel(x, y, true);
                        }
                    }
                }
            } else {
                // Midpoint circle algorithm
                let x = r;
                let y = 0;
                let err = 0;

                while (x >= y) {
                    this.setPixel(x0 + x, y0 + y, true);
                    this.setPixel(x0 + y, y0 + x, true);
                    this.setPixel(x0 - y, y0 + x, true);
                    this.setPixel(x0 - x, y0 + y, true);
                    this.setPixel(x0 - x, y0 - y, true);
                    this.setPixel(x0 - y, y0 - x, true);
                    this.setPixel(x0 + y, y0 - x, true);
                    this.setPixel(x0 + x, y0 - y, true);

                    y++;
                    err += 1 + 2 * y;
                    if (2 * (err - x) + 1 > 0) {
                        x--;
                        err += 1 - 2 * x;
                    }
                }
            }
        }

        /**
         * Draw text (does not update display)
         * Uses built-in 5x7 font
         */
        public drawText(text: string, x: number, y: number, size: number = 1): void {
            for (let i = 0; i < text.length; i++) {
                this.drawChar(text.charAt(i), x + i * 6 * size, y, size);
            }
        }

        /**
         * Draw a single character
         */
        private drawChar(char: string, x: number, y: number, size: number): void {
            let charCode = char.charCodeAt(0);
            if (charCode < 32 || charCode > 126) {
                charCode = 32; // Space for unsupported characters
            }

            let fontIndex = charCode - 32;
            let fontData = this.getFont5x7(fontIndex);

            for (let col = 0; col < 5; col++) {
                let column = fontData[col];
                for (let row = 0; row < 7; row++) {
                    if (column & (1 << row)) {
                        // Draw pixel with scaling
                        for (let sx = 0; sx < size; sx++) {
                            for (let sy = 0; sy < size; sy++) {
                                this.setPixel(x + col * size + sx, y + row * size + sy, true);
                            }
                        }
                    }
                }
            }
        }

        /**
         * Built-in 5x7 font data (simplified ASCII 32-126)
         */
        private getFont5x7(index: number): number[] {
            // Font data for characters 32-126 (space through tilde)
            // Each character is 5 columns, 7 rows
            let font: number[][] = [
                [0x00, 0x00, 0x00, 0x00, 0x00], // Space (32)
                [0x00, 0x00, 0x5F, 0x00, 0x00], // ! (33)
                [0x00, 0x07, 0x00, 0x07, 0x00], // " (34)
                [0x14, 0x7F, 0x14, 0x7F, 0x14], // # (35)
                [0x24, 0x2A, 0x7F, 0x2A, 0x12], // $ (36)
                [0x23, 0x13, 0x08, 0x64, 0x62], // % (37)
                [0x36, 0x49, 0x55, 0x22, 0x50], // & (38)
                [0x00, 0x05, 0x03, 0x00, 0x00], // ' (39)
                [0x00, 0x1C, 0x22, 0x41, 0x00], // ( (40)
                [0x00, 0x41, 0x22, 0x1C, 0x00], // ) (41)
                [0x14, 0x08, 0x3E, 0x08, 0x14], // * (42)
                [0x08, 0x08, 0x3E, 0x08, 0x08], // + (43)
                [0x00, 0x50, 0x30, 0x00, 0x00], // , (44)
                [0x08, 0x08, 0x08, 0x08, 0x08], // - (45)
                [0x00, 0x60, 0x60, 0x00, 0x00], // . (46)
                [0x20, 0x10, 0x08, 0x04, 0x02], // / (47)
                [0x3E, 0x51, 0x49, 0x45, 0x3E], // 0 (48)
                [0x00, 0x42, 0x7F, 0x40, 0x00], // 1 (49)
                [0x42, 0x61, 0x51, 0x49, 0x46], // 2 (50)
                [0x21, 0x41, 0x45, 0x4B, 0x31], // 3 (51)
                [0x18, 0x14, 0x12, 0x7F, 0x10], // 4 (52)
                [0x27, 0x45, 0x45, 0x45, 0x39], // 5 (53)
                [0x3C, 0x4A, 0x49, 0x49, 0x30], // 6 (54)
                [0x01, 0x71, 0x09, 0x05, 0x03], // 7 (55)
                [0x36, 0x49, 0x49, 0x49, 0x36], // 8 (56)
                [0x06, 0x49, 0x49, 0x29, 0x1E], // 9 (57)
                [0x00, 0x36, 0x36, 0x00, 0x00], // : (58)
                [0x00, 0x56, 0x36, 0x00, 0x00], // ; (59)
                [0x08, 0x14, 0x22, 0x41, 0x00], // < (60)
                [0x14, 0x14, 0x14, 0x14, 0x14], // = (61)
                [0x00, 0x41, 0x22, 0x14, 0x08], // > (62)
                [0x02, 0x01, 0x51, 0x09, 0x06], // ? (63)
                [0x32, 0x49, 0x79, 0x41, 0x3E], // @ (64)
                [0x7E, 0x11, 0x11, 0x11, 0x7E], // A (65)
                [0x7F, 0x49, 0x49, 0x49, 0x36], // B (66)
                [0x3E, 0x41, 0x41, 0x41, 0x22], // C (67)
                [0x7F, 0x41, 0x41, 0x22, 0x1C], // D (68)
                [0x7F, 0x49, 0x49, 0x49, 0x41], // E (69)
                [0x7F, 0x09, 0x09, 0x09, 0x01], // F (70)
                [0x3E, 0x41, 0x49, 0x49, 0x7A], // G (71)
                [0x7F, 0x08, 0x08, 0x08, 0x7F], // H (72)
                [0x00, 0x41, 0x7F, 0x41, 0x00], // I (73)
                [0x20, 0x40, 0x41, 0x3F, 0x01], // J (74)
                [0x7F, 0x08, 0x14, 0x22, 0x41], // K (75)
                [0x7F, 0x40, 0x40, 0x40, 0x40], // L (76)
                [0x7F, 0x02, 0x0C, 0x02, 0x7F], // M (77)
                [0x7F, 0x04, 0x08, 0x10, 0x7F], // N (78)
                [0x3E, 0x41, 0x41, 0x41, 0x3E], // O (79)
                [0x7F, 0x09, 0x09, 0x09, 0x06], // P (80)
                [0x3E, 0x41, 0x51, 0x21, 0x5E], // Q (81)
                [0x7F, 0x09, 0x19, 0x29, 0x46], // R (82)
                [0x46, 0x49, 0x49, 0x49, 0x31], // S (83)
                [0x01, 0x01, 0x7F, 0x01, 0x01], // T (84)
                [0x3F, 0x40, 0x40, 0x40, 0x3F], // U (85)
                [0x1F, 0x20, 0x40, 0x20, 0x1F], // V (86)
                [0x3F, 0x40, 0x38, 0x40, 0x3F], // W (87)
                [0x63, 0x14, 0x08, 0x14, 0x63], // X (88)
                [0x07, 0x08, 0x70, 0x08, 0x07], // Y (89)
                [0x61, 0x51, 0x49, 0x45, 0x43], // Z (90)
                [0x00, 0x7F, 0x41, 0x41, 0x00], // [ (91)
                [0x02, 0x04, 0x08, 0x10, 0x20], // \ (92)
                [0x00, 0x41, 0x41, 0x7F, 0x00], // ] (93)
                [0x04, 0x02, 0x01, 0x02, 0x04], // ^ (94)
                [0x40, 0x40, 0x40, 0x40, 0x40], // _ (95)
                [0x00, 0x01, 0x02, 0x04, 0x00], // ` (96)
                [0x20, 0x54, 0x54, 0x54, 0x78], // a (97)
                [0x7F, 0x48, 0x44, 0x44, 0x38], // b (98)
                [0x38, 0x44, 0x44, 0x44, 0x20], // c (99)
                [0x38, 0x44, 0x44, 0x48, 0x7F], // d (100)
                [0x38, 0x54, 0x54, 0x54, 0x18], // e (101)
                [0x08, 0x7E, 0x09, 0x01, 0x02], // f (102)
                [0x0C, 0x52, 0x52, 0x52, 0x3E], // g (103)
                [0x7F, 0x08, 0x04, 0x04, 0x78], // h (104)
                [0x00, 0x44, 0x7D, 0x40, 0x00], // i (105)
                [0x20, 0x40, 0x44, 0x3D, 0x00], // j (106)
                [0x7F, 0x10, 0x28, 0x44, 0x00], // k (107)
                [0x00, 0x41, 0x7F, 0x40, 0x00], // l (108)
                [0x7C, 0x04, 0x18, 0x04, 0x78], // m (109)
                [0x7C, 0x08, 0x04, 0x04, 0x78], // n (110)
                [0x38, 0x44, 0x44, 0x44, 0x38], // o (111)
                [0x7C, 0x14, 0x14, 0x14, 0x08], // p (112)
                [0x08, 0x14, 0x14, 0x18, 0x7C], // q (113)
                [0x7C, 0x08, 0x04, 0x04, 0x08], // r (114)
                [0x48, 0x54, 0x54, 0x54, 0x20], // s (115)
                [0x04, 0x3F, 0x44, 0x40, 0x20], // t (116)
                [0x3C, 0x40, 0x40, 0x20, 0x7C], // u (117)
                [0x1C, 0x20, 0x40, 0x20, 0x1C], // v (118)
                [0x3C, 0x40, 0x30, 0x40, 0x3C], // w (119)
                [0x44, 0x28, 0x10, 0x28, 0x44], // x (120)
                [0x0C, 0x50, 0x50, 0x50, 0x3C], // y (121)
                [0x44, 0x64, 0x54, 0x4C, 0x44], // z (122)
                [0x00, 0x08, 0x36, 0x41, 0x00], // { (123)
                [0x00, 0x00, 0x7F, 0x00, 0x00], // | (124)
                [0x00, 0x41, 0x36, 0x08, 0x00], // } (125)
                [0x08, 0x04, 0x08, 0x10, 0x08], // ~ (126)
            ];

            if (index >= 0 && index < font.length) {
                return font[index];
            }
            return [0x00, 0x00, 0x00, 0x00, 0x00]; // Default to space
        }

        /**
         * Set display contrast (0-255)
         */
        public setContrast(contrast: number): void {
            if (contrast < 0) contrast = 0;
            if (contrast > 255) contrast = 255;
            this.writeCmd(SSD1306.SET_CONTRAST);
            this.writeCmd(contrast);
        }

        /**
         * Invert display colors
         */
        public invert(invert: boolean): void {
            this.writeCmd(SSD1306.SET_NORM_INV | (invert ? 1 : 0));
        }

        /**
         * Power off display
         */
        public powerOff(): void {
            this.writeCmd(SSD1306.SET_DISP);
        }

        /**
         * Power on display
         */
        public powerOn(): void {
            this.writeCmd(SSD1306.SET_DISP | 0x01);
        }
    }

    // Internal storage for OLED instance (typically only one)
    let _oled: SSD1306 = null;

    /**
     * Get or create the OLED instance
     */
    function getOLED(): SSD1306 {
        if (_oled === null) {
            _oled = new SSD1306(0x3C);
        }
        return _oled;
    }

    /**
     * Clear the OLED display buffer
     * Call show() to update the display
     */
    //% blockId=oled_clear
    //% block="OLED clear"
    //% weight=100
    //% group="SSD1306 OLED"
    export function oledClear(): void {
        let oled = getOLED();
        oled.clear();
    }

    /**
     * Update the OLED display with buffer contents
     * Call this after drawing to make changes visible
     */
    //% blockId=oled_show
    //% block="OLED show"
    //% weight=99
    //% group="SSD1306 OLED"
    export function oledShow(): void {
        let oled = getOLED();
        oled.show();
    }

    /**
     * Draw text on the OLED display
     * Call show() to update the display
     */
    //% blockId=oled_text
    //% block="OLED text $text|at x $x|y $y||size $size"
    //% text.defl="Hello"
    //% x.min=0 x.max=127 x.defl=0
    //% y.min=0 y.max=63 y.defl=0
    //% size.defl=TextSize.Small
    //% weight=95
    //% group="SSD1306 OLED"
    //% expandableArgumentMode="toggle"
    export function oledText(text: string, x: number, y: number, size?: TextSize): void {
        let oled = getOLED();
        oled.drawText(text, x, y, size || TextSize.Small);
    }

    /**
     * Draw a line on the OLED display
     * Call show() to update the display
     */
    //% blockId=oled_line
    //% block="OLED line from x0 $x0|y0 $y0|to x1 $x1|y1 $y1"
    //% x0.min=0 x0.max=127 x0.defl=0
    //% y0.min=0 y0.max=63 y0.defl=0
    //% x1.min=0 x1.max=127 x1.defl=127
    //% y1.min=0 y1.max=63 y1.defl=63
    //% weight=90
    //% group="SSD1306 OLED"
    export function oledLine(x0: number, y0: number, x1: number, y1: number): void {
        let oled = getOLED();
        oled.drawLine(x0, y0, x1, y1);
    }

    /**
     * Draw a rectangle on the OLED display
     * Call show() to update the display
     */
    //% blockId=oled_rect
    //% block="OLED rectangle at x $x|y $y|width $w|height $h||filled $filled"
    //% x.min=0 x.max=127 x.defl=10
    //% y.min=0 y.max=63 y.defl=10
    //% w.min=1 w.max=128 w.defl=20
    //% h.min=1 h.max=64 h.defl=20
    //% filled.shadow="toggleOnOff" filled.defl=false
    //% weight=85
    //% group="SSD1306 OLED"
    //% expandableArgumentMode="toggle"
    export function oledRect(x: number, y: number, w: number, h: number, filled?: boolean): void {
        let oled = getOLED();
        oled.drawRect(x, y, w, h, filled || false);
    }

    /**
     * Draw a circle on the OLED display
     * Call show() to update the display
     */
    //% blockId=oled_circle
    //% block="OLED circle at x $x|y $y|radius $r||filled $filled"
    //% x.min=0 x.max=127 x.defl=64
    //% y.min=0 y.max=63 y.defl=32
    //% r.min=1 r.max=64 r.defl=20
    //% filled.shadow="toggleOnOff" filled.defl=false
    //% weight=80
    //% group="SSD1306 OLED"
    //% expandableArgumentMode="toggle"
    export function oledCircle(x: number, y: number, r: number, filled?: boolean): void {
        let oled = getOLED();
        oled.drawCircle(x, y, r, filled || false);
    }

    /**
     * Set a single pixel on the OLED display
     * Call show() to update the display
     */
    //% blockId=oled_pixel
    //% block="OLED pixel at x $x|y $y|$on"
    //% x.min=0 x.max=127 x.defl=64
    //% y.min=0 y.max=63 y.defl=32
    //% on.shadow="toggleOnOff" on.defl=true
    //% weight=75
    //% group="SSD1306 OLED"
    //% advanced=true
    export function oledPixel(x: number, y: number, on: boolean): void {
        let oled = getOLED();
        oled.setPixel(x, y, on);
    }

    /**
     * Set display contrast (0-255)
     */
    //% blockId=oled_contrast
    //% block="OLED set contrast $contrast"
    //% contrast.min=0 contrast.max=255 contrast.defl=127
    //% weight=70
    //% group="SSD1306 OLED"
    //% advanced=true
    export function oledSetContrast(contrast: number): void {
        let oled = getOLED();
        oled.setContrast(contrast);
    }

    /**
     * Invert the display colors
     */
    //% blockId=oled_invert
    //% block="OLED invert $invert"
    //% invert.shadow="toggleOnOff"
    //% weight=69
    //% group="SSD1306 OLED"
    //% advanced=true
    export function oledInvert(invert: boolean): void {
        let oled = getOLED();
        oled.invert(invert);
    }

    /**
     * Turn the display on or off
     */
    //% blockId=oled_power
    //% block="OLED power $on"
    //% on.shadow="toggleOnOff"
    //% weight=68
    //% group="SSD1306 OLED"
    //% advanced=true
    export function oledPower(on: boolean): void {
        let oled = getOLED();
        if (on) {
            oled.powerOn();
        } else {
            oled.powerOff();
        }
    }
}
