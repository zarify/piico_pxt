/**
 * PiicoDev RFID Module
 * 
 * Read and write RFID/NFC tags (NTAG213 and MIFARE Classic).
 * Supports tag ID detection, text/number storage, and NFC URI links.
 */

//% weight=82 color=#0033CC icon="\uf2c2"
//% groups=['Communication']
namespace piicodev {

    /**
     * RFID tag type
     */
    export enum TagType {
        //% block="NTAG"
        NTAG = 0,
        //% block="Classic"
        Classic = 1,
        //% block="unknown"
        Unknown = 2
    }

    /**
     * RFID Module class
     */
    class RFID {
        private addr: number;
        private eventId: number;
        private pollingStarted: boolean;

        // Last detected tag info
        private lastTagId: string;
        private lastTagType: TagType;
        private lastTagIdBytes: number[];
        private tagPresent: boolean;

        // Register addresses
        private static readonly REG_COMMAND = 0x01;
        private static readonly REG_COM_I_EN = 0x02;
        private static readonly REG_DIV_I_EN = 0x03;
        private static readonly REG_COM_IRQ = 0x04;
        private static readonly REG_DIV_IRQ = 0x05;
        private static readonly REG_ERROR = 0x06;
        private static readonly REG_STATUS_1 = 0x07;
        private static readonly REG_STATUS_2 = 0x08;
        private static readonly REG_FIFO_DATA = 0x09;
        private static readonly REG_FIFO_LEVEL = 0x0A;
        private static readonly REG_CONTROL = 0x0C;
        private static readonly REG_BIT_FRAMING = 0x0D;
        private static readonly REG_MODE = 0x11;
        private static readonly REG_TX_CONTROL = 0x14;
        private static readonly REG_TX_ASK = 0x15;
        private static readonly REG_CRC_RESULT_MSB = 0x21;
        private static readonly REG_CRC_RESULT_LSB = 0x22;
        private static readonly REG_T_MODE = 0x2A;
        private static readonly REG_T_PRESCALER = 0x2B;
        private static readonly REG_T_RELOAD_HI = 0x2C;
        private static readonly REG_T_RELOAD_LO = 0x2D;
        private static readonly REG_AUTO_TEST = 0x36;
        private static readonly REG_VERSION = 0x37;

        // Commands
        private static readonly CMD_IDLE = 0x00;
        private static readonly CMD_CALC_CRC = 0x03;
        private static readonly CMD_TRANSCEIVE = 0x0C;
        private static readonly CMD_MF_AUTHENT = 0x0E;
        private static readonly CMD_SOFT_RESET = 0x0F;

        // Tag commands
        private static readonly TAG_CMD_REQIDL = 0x26;
        private static readonly TAG_CMD_REQALL = 0x52;
        private static readonly TAG_CMD_ANTICOL1 = 0x93;
        private static readonly TAG_CMD_ANTICOL2 = 0x95;
        private static readonly TAG_CMD_ANTICOL3 = 0x97;
        private static readonly TAG_AUTH_KEY_A = 0x60;

        // Constants
        private static readonly CLASSIC_KEY = [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
        private static readonly NTAG_BYTES_PER_PAGE = 4;
        private static readonly NTAG_PAGE_MIN = 4;
        private static readonly NTAG_PAGE_MAX = 39;
        private static readonly CLASSIC_BYTES_PER_REG = 16;
        private static readonly CLASSIC_ADR = [1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 20, 21, 22, 24, 25, 26, 28, 29, 30, 32, 33, 34, 36, 37, 38, 40, 41, 42, 44, 45, 46, 48];
        private static readonly SLOT_MIN = 0;
        private static readonly SLOT_MAX = 35;

        // Status codes
        private static readonly OK = 1;
        private static readonly NOTAGERR = 2;
        private static readonly ERR = 3;

        constructor(address: number = 0x2C) {
            this.addr = address;
            this.eventId = 5000 + address;
            this.pollingStarted = false;
            this.lastTagId = "";
            this.lastTagType = TagType.Unknown;
            this.lastTagIdBytes = [];
            this.tagPresent = false;

            // Initialize RFID module
            this.initialize();
        }

        /**
         * Initialize the RFID module
         */
        private initialize(): void {
            try {
                this.reset();
                basic.pause(50);

                // Configure timer
                this.writeReg(RFID.REG_T_MODE, 0x80);
                this.writeReg(RFID.REG_T_PRESCALER, 0xA9);
                this.writeReg(RFID.REG_T_RELOAD_HI, 0x03);
                this.writeReg(RFID.REG_T_RELOAD_LO, 0xE8);

                // Configure TX
                this.writeReg(RFID.REG_TX_ASK, 0x40);
                this.writeReg(RFID.REG_MODE, 0x3D);

                // Configure interrupts
                this.writeReg(RFID.REG_DIV_I_EN, 0x80);
                this.writeReg(RFID.REG_COM_I_EN, 0x20);

                this.antennaOn();
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Write to a register
         */
        private writeReg(reg: number, val: number): void {
            let buf = pins.createBuffer(1);
            buf[0] = val;
            picodevUnified.writeRegister(this.addr, reg, buf);
        }

        /**
         * Write multiple bytes to FIFO
         */
        private writeFifo(reg: number, data: number[]): void {
            let buf = pins.createBuffer(data.length);
            for (let i = 0; i < data.length; i++) {
                buf[i] = data[i];
            }
            picodevUnified.writeRegister(this.addr, reg, buf);
        }

        /**
         * Read from a register
         */
        private readReg(reg: number): number {
            return picodevUnified.readRegisterByte(this.addr, reg);
        }

        /**
         * Set flags in a register
         */
        private setFlags(reg: number, mask: number): void {
            let current = this.readReg(reg);
            this.writeReg(reg, current | mask);
        }

        /**
         * Clear flags in a register
         */
        private clearFlags(reg: number, mask: number): void {
            let current = this.readReg(reg);
            this.writeReg(reg, current & ~mask);
        }

        /**
         * Calculate CRC for data
         */
        private calcCRC(data: number[]): number[] {
            this.writeReg(RFID.REG_COMMAND, RFID.CMD_IDLE);
            this.clearFlags(RFID.REG_DIV_IRQ, 0x04);
            this.setFlags(RFID.REG_FIFO_LEVEL, 0x80);

            for (let i = 0; i < data.length; i++) {
                this.writeReg(RFID.REG_FIFO_DATA, data[i]);
            }

            this.writeReg(RFID.REG_COMMAND, RFID.CMD_CALC_CRC);

            let timeout = 255;
            while (timeout > 0) {
                let n = this.readReg(RFID.REG_DIV_IRQ);
                timeout--;
                if (n & 0x04) break;
            }

            this.writeReg(RFID.REG_COMMAND, RFID.CMD_IDLE);

            return [
                this.readReg(RFID.REG_CRC_RESULT_LSB),
                this.readReg(RFID.REG_CRC_RESULT_MSB)
            ];
        }

        /**
         * Communicate with card
         */
        private toCard(cmd: number, send: number[]): { status: number, data: number[], bits: number } {
            let recv: number[] = [];
            let bits = 0;
            let irqEn = 0;
            let waitIrq = 0;
            let status = RFID.ERR;

            if (cmd === RFID.CMD_MF_AUTHENT) {
                irqEn = 0x12;
                waitIrq = 0x10;
            } else if (cmd === RFID.CMD_TRANSCEIVE) {
                irqEn = 0x77;
                waitIrq = 0x30;
            }

            this.writeReg(RFID.REG_COMMAND, RFID.CMD_IDLE);
            this.writeReg(RFID.REG_COM_IRQ, 0x7F);
            this.setFlags(RFID.REG_FIFO_LEVEL, 0x80);
            this.writeFifo(RFID.REG_FIFO_DATA, send);

            if (cmd === RFID.CMD_TRANSCEIVE) {
                this.setFlags(RFID.REG_BIT_FRAMING, 0x00);
            }

            this.writeReg(RFID.REG_COMMAND, cmd);

            if (cmd === RFID.CMD_TRANSCEIVE) {
                this.setFlags(RFID.REG_BIT_FRAMING, 0x80);
            }

            let timeout = 20000;
            while (timeout > 0) {
                let n = this.readReg(RFID.REG_COM_IRQ);
                timeout--;
                if (n & waitIrq) break;
                if (n & 0x01) break;
            }

            this.clearFlags(RFID.REG_BIT_FRAMING, 0x80);

            if (timeout > 0) {
                if ((this.readReg(RFID.REG_ERROR) & 0x1B) === 0) {
                    status = RFID.OK;

                    if ((this.readReg(RFID.REG_COM_IRQ) & irqEn & 0x01) !== 0) {
                        status = RFID.NOTAGERR;
                    } else if (cmd === RFID.CMD_TRANSCEIVE) {
                        let n = this.readReg(RFID.REG_FIFO_LEVEL);
                        let lbits = this.readReg(RFID.REG_CONTROL) & 0x07;

                        if (lbits !== 0) {
                            bits = (n - 1) * 8 + lbits;
                        } else {
                            bits = n * 8;
                        }

                        if (n === 0) n = 1;
                        else if (n > 16) n = 16;

                        for (let i = 0; i < n; i++) {
                            recv.push(this.readReg(RFID.REG_FIFO_DATA));
                        }
                    }
                } else {
                    status = RFID.ERR;
                }
            }

            return { status: status, data: recv, bits: bits };
        }

        /**
         * Request tag
         */
        private request(mode: number): { status: number, bits: number } {
            this.writeReg(RFID.REG_BIT_FRAMING, 0x07);
            let result = this.toCard(RFID.CMD_TRANSCEIVE, [mode]);

            if (result.status !== RFID.OK || result.bits !== 16) {
                result.status = RFID.ERR;
            }

            return { status: result.status, bits: result.bits };
        }

        /**
         * Anti-collision detection
         */
        private anticoll(anticolCmd: number = RFID.TAG_CMD_ANTICOL1): { status: number, uid: number[] } {
            this.writeReg(RFID.REG_BIT_FRAMING, 0x00);
            let result = this.toCard(RFID.CMD_TRANSCEIVE, [anticolCmd, 0x20]);

            if (result.status === RFID.OK) {
                if (result.data.length === 5) {
                    let checksum = 0;
                    for (let i = 0; i < 4; i++) {
                        checksum = checksum ^ result.data[i];
                    }
                    if (checksum !== result.data[4]) {
                        result.status = RFID.ERR;
                    }
                } else {
                    result.status = RFID.ERR;
                }
            }

            return { status: result.status, uid: result.data };
        }

        /**
         * Select tag
         */
        private selectTag(uid: number[], anticolCmd: number): boolean {
            let buf: number[] = [anticolCmd, 0x70];
            for (let i = 0; i < uid.length; i++) {
                buf.push(uid[i]);
            }
            let crc = this.calcCRC(buf);
            buf.push(crc[0]);
            buf.push(crc[1]);

            let result = this.toCard(RFID.CMD_TRANSCEIVE, buf);
            return result.status === RFID.OK && result.bits === 24;
        }

        /**
         * Read tag ID
         */
        private readTagID(): { success: boolean, id: number[], idFormatted: string, type: TagType } {
            let validUid: number[] = [];

            // First anti-collision
            let result1 = this.anticoll(RFID.TAG_CMD_ANTICOL1);
            if (result1.status !== RFID.OK) {
                return { success: false, id: [], idFormatted: "", type: TagType.Unknown };
            }

            if (!this.selectTag(result1.uid, RFID.TAG_CMD_ANTICOL1)) {
                return { success: false, id: [], idFormatted: "", type: TagType.Unknown };
            }

            // Check for cascade tag (0x88)
            if (result1.uid[0] === 0x88) {
                validUid.push(result1.uid[1], result1.uid[2], result1.uid[3]);

                let result2 = this.anticoll(RFID.TAG_CMD_ANTICOL2);
                if (result2.status !== RFID.OK) {
                    return { success: false, id: [], idFormatted: "", type: TagType.Unknown };
                }

                if (!this.selectTag(result2.uid, RFID.TAG_CMD_ANTICOL2)) {
                    return { success: false, id: [], idFormatted: "", type: TagType.Unknown };
                }

                if (result2.uid[0] === 0x88) {
                    validUid.push(result2.uid[1], result2.uid[2], result2.uid[3]);

                    let result3 = this.anticoll(RFID.TAG_CMD_ANTICOL3);
                    if (result3.status !== RFID.OK) {
                        return { success: false, id: [], idFormatted: "", type: TagType.Unknown };
                    }

                    validUid.push(result3.uid[0], result3.uid[1], result3.uid[2], result3.uid[3], result3.uid[4]);
                } else {
                    validUid.push(result2.uid[0], result2.uid[1], result2.uid[2], result2.uid[3], result2.uid[4]);
                }
            } else {
                validUid.push(result1.uid[0], result1.uid[1], result1.uid[2], result1.uid[3], result1.uid[4]);
            }

            // Remove checksum byte
            let id = validUid.slice(0, validUid.length - 1);

            // Format ID as hex string
            let idFormatted = "";
            for (let i = 0; i < id.length; i++) {
                if (i > 0) idFormatted += ":";
                let hex = id[i].toString(16).toUpperCase();
                if (hex.length === 1) hex = "0" + hex;
                idFormatted += hex;
            }

            // Determine tag type
            let tagType = id.length === 4 ? TagType.Classic : TagType.NTAG;

            return { success: true, id: id, idFormatted: idFormatted, type: tagType };
        }

        /**
         * Detect if a tag is present
         */
        private detectTag(): boolean {
            let result = this.request(RFID.TAG_CMD_REQIDL);
            return result.status === RFID.OK;
        }

        /**
         * Reset the module
         */
        private reset(): void {
            this.writeReg(RFID.REG_COMMAND, RFID.CMD_SOFT_RESET);
        }

        /**
         * Turn antenna on
         */
        private antennaOn(): void {
            let val = this.readReg(RFID.REG_TX_CONTROL);
            if ((val & 0x03) === 0) {
                this.setFlags(RFID.REG_TX_CONTROL, 0x83);
            }
        }

        /**
         * Turn antenna off
         */
        private antennaOff(): void {
            this.clearFlags(RFID.REG_TX_CONTROL, 0x03);
        }

        /**
         * Classic tag: select for read/write operations
         */
        private classicSelectTag(uid: number[]): boolean {
            let buf = [0x93, 0x70];
            for (let i = 0; i < 5; i++) {
                buf.push(uid[i]);
            }
            let crc = this.calcCRC(buf);
            buf.push(crc[0]);
            buf.push(crc[1]);

            let result = this.toCard(RFID.CMD_TRANSCEIVE, buf);
            return result.status === RFID.OK && result.bits === 0x18;
        }

        /**
         * Classic tag: authenticate
         */
        private classicAuth(mode: number, addr: number, key: number[], uid: number[]): number {
            let buf = [mode, addr];
            for (let i = 0; i < key.length; i++) {
                buf.push(key[i]);
            }
            for (let i = 0; i < 4; i++) {
                buf.push(uid[i]);
            }
            let result = this.toCard(RFID.CMD_MF_AUTHENT, buf);
            return result.status;
        }

        /**
         * Classic tag: stop crypto
         */
        private classicStopCrypto(): void {
            this.clearFlags(RFID.REG_STATUS_2, 0x08);
        }

        /**
         * Read a page/register from tag
         */
        private readPage(addr: number): number[] {
            let buf = [0x30, addr];
            let crc = this.calcCRC(buf);
            buf.push(crc[0]);
            buf.push(crc[1]);

            let result = this.toCard(RFID.CMD_TRANSCEIVE, buf);
            return result.status === RFID.OK ? result.data : [];
        }

        /**
         * Write to NTAG page
         */
        private writePageNtag(page: number, data: number[]): boolean {
            let buf = [0xA2, page];
            for (let i = 0; i < data.length; i++) {
                buf.push(data[i]);
            }
            let crc = this.calcCRC(buf);
            buf.push(crc[0]);
            buf.push(crc[1]);

            let result = this.toCard(RFID.CMD_TRANSCEIVE, buf);
            return result.status === RFID.OK;
        }

        /**
         * Write to Classic register
         */
        private writeClassicReg(addr: number, data: number[]): boolean {
            // Send write command
            let buf1 = [0xA0, addr];
            let crc1 = this.calcCRC(buf1);
            buf1.push(crc1[0]);
            buf1.push(crc1[1]);

            let result1 = this.toCard(RFID.CMD_TRANSCEIVE, buf1);
            if (result1.status !== RFID.OK || result1.bits !== 4 || (result1.data[0] & 0x0F) !== 0x0A) {
                return false;
            }

            // Send data
            let buf2: number[] = [];
            for (let i = 0; i < RFID.CLASSIC_BYTES_PER_REG; i++) {
                buf2.push(i < data.length ? data[i] : 0);
            }
            let crc2 = this.calcCRC(buf2);
            buf2.push(crc2[0]);
            buf2.push(crc2[1]);

            let result2 = this.toCard(RFID.CMD_TRANSCEIVE, buf2);
            return result2.status === RFID.OK && result2.bits === 4 && (result2.data[0] & 0x0F) === 0x0A;
        }

        /**
         * Start background polling to detect tags
         */
        public startEventPolling(): void {
            if (this.pollingStarted) {
                return;
            }
            this.pollingStarted = true;

            control.inBackground(() => {
                while (true) {
                    this.pollForTags();
                    basic.pause(100);  // Poll every 100ms
                }
            });
        }

        /**
         * Poll for tags and raise events
         */
        private pollForTags(): void {
            try {
                if (this.detectTag()) {
                    let tagInfo = this.readTagID();
                    if (tagInfo.success) {
                        // Update stored tag info
                        this.lastTagId = tagInfo.idFormatted;
                        this.lastTagType = tagInfo.type;
                        this.lastTagIdBytes = tagInfo.id;
                        this.tagPresent = true;

                        // Raise tag detected event
                        control.raiseEvent(this.eventId, 1);
                    }
                } else {
                    this.tagPresent = false;
                }
            } catch (e) {
                // Silently handle errors during polling
            }
        }

        /**
         * Get the event source ID
         */
        public getEventId(): number {
            return this.eventId;
        }

        /**
         * Get the last detected tag ID
         */
        public getLastTagId(): string {
            return this.lastTagId;
        }

        /**
         * Get the last detected tag type
         */
        public getLastTagType(): TagType {
            return this.lastTagType;
        }

        /**
         * Check if a tag is currently present
         */
        public isTagPresent(): boolean {
            try {
                if (this.detectTag()) {
                    let tagInfo = this.readTagID();
                    if (tagInfo.success) {
                        this.lastTagId = tagInfo.idFormatted;
                        this.lastTagType = tagInfo.type;
                        this.lastTagIdBytes = tagInfo.id;
                        this.tagPresent = true;
                        return true;
                    }
                }
                this.tagPresent = false;
                return false;
            } catch (e) {
                return false;
            }
        }

        /**
         * Read tag ID (blocking)
         */
        public readID(): string {
            try {
                if (this.detectTag()) {
                    basic.pause(5);
                    let tagInfo = this.readTagID();
                    if (tagInfo.success) {
                        this.lastTagId = tagInfo.idFormatted;
                        this.lastTagType = tagInfo.type;
                        this.lastTagIdBytes = tagInfo.id;
                        return tagInfo.idFormatted;
                    }
                }
                return "";
            } catch (e) {
                return "";
            }
        }

        /**
         * Write a number to tag
         */
        public writeNumber(value: number, slot: number = 35): boolean {
            try {
                // Ensure we have tag info
                if (!this.isTagPresent()) {
                    return false;
                }

                // Convert number to bytes (32-bit signed integer, little-endian)
                let bytes: number[] = [];
                bytes.push(value & 0xFF);
                bytes.push((value >> 8) & 0xFF);
                bytes.push((value >> 16) & 0xFF);
                bytes.push((value >> 24) & 0xFF);

                if (this.lastTagType === TagType.NTAG) {
                    return this.writePageNtag(RFID.NTAG_PAGE_MIN + slot, bytes);
                } else if (this.lastTagType === TagType.Classic) {
                    // Pad to 16 bytes for Classic
                    while (bytes.length < RFID.CLASSIC_BYTES_PER_REG) {
                        bytes.push(0);
                    }

                    // Authenticate and write
                    let result = this.request(RFID.TAG_CMD_REQIDL);
                    if (result.status === RFID.OK) {
                        let anticollResult = this.anticoll(RFID.TAG_CMD_ANTICOL1);
                        if (anticollResult.status === RFID.OK) {
                            if (this.classicSelectTag(anticollResult.uid)) {
                                let addr = RFID.CLASSIC_ADR[slot];
                                if (this.classicAuth(RFID.TAG_AUTH_KEY_A, addr, RFID.CLASSIC_KEY, anticollResult.uid) === RFID.OK) {
                                    let success = this.writeClassicReg(addr, bytes);
                                    this.classicStopCrypto();
                                    return success;
                                }
                            }
                        }
                    }
                }
                return false;
            } catch (e) {
                return false;
            }
        }

        /**
         * Read a number from tag
         */
        public readNumber(slot: number = 35): number {
            try {
                if (!this.isTagPresent()) {
                    return 0;
                }

                let bytes: number[] = [];

                if (this.lastTagType === TagType.NTAG) {
                    bytes = this.readPage(RFID.NTAG_PAGE_MIN + slot);
                } else if (this.lastTagType === TagType.Classic) {
                    // Authenticate and read
                    let result = this.request(RFID.TAG_CMD_REQIDL);
                    if (result.status === RFID.OK) {
                        let anticollResult = this.anticoll(RFID.TAG_CMD_ANTICOL1);
                        if (anticollResult.status === RFID.OK) {
                            if (this.classicSelectTag(anticollResult.uid)) {
                                let addr = RFID.CLASSIC_ADR[slot];
                                if (this.classicAuth(RFID.TAG_AUTH_KEY_A, addr, RFID.CLASSIC_KEY, anticollResult.uid) === RFID.OK) {
                                    bytes = this.readPage(addr);
                                    this.classicStopCrypto();
                                }
                            }
                        }
                    }
                }

                if (bytes.length >= 4) {
                    // Convert from little-endian 32-bit signed integer
                    let value = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
                    // Handle negative numbers (two's complement)
                    if (value > 0x7FFFFFFF) {
                        value = value - 0x100000000;
                    }
                    return value;
                }
                return 0;
            } catch (e) {
                return 0;
            }
        }

        /**
         * Write text to tag
         */
        public writeText(text: string): boolean {
            try {
                if (!this.isTagPresent()) {
                    return false;
                }

                // Add null terminator
                text = text + "\0";

                if (this.lastTagType === TagType.NTAG) {
                    // Write to NTAG pages
                    let bufferStart = 0;
                    for (let page = RFID.NTAG_PAGE_MIN; page <= RFID.NTAG_PAGE_MAX; page++) {
                        let chunk = text.substring(bufferStart, bufferStart + RFID.NTAG_BYTES_PER_PAGE);
                        bufferStart += RFID.NTAG_BYTES_PER_PAGE;

                        let data: number[] = [];
                        for (let i = 0; i < chunk.length; i++) {
                            data.push(chunk.charCodeAt(i));
                        }
                        // Pad to 4 bytes
                        while (data.length < RFID.NTAG_BYTES_PER_PAGE) {
                            data.push(0);
                        }

                        if (!this.writePageNtag(page, data)) {
                            return false;
                        }

                        // Stop if we wrote a null terminator
                        if (data.indexOf(0) !== -1) {
                            return true;
                        }
                    }
                    return true;
                } else if (this.lastTagType === TagType.Classic) {
                    // Write to Classic registers (first 9 slots = 144 bytes)
                    let bufferStart = 0;
                    for (let i = 0; i < 9; i++) {
                        let chunk = text.substring(bufferStart, bufferStart + RFID.CLASSIC_BYTES_PER_REG);
                        bufferStart += RFID.CLASSIC_BYTES_PER_REG;

                        let data: number[] = [];
                        for (let j = 0; j < chunk.length; j++) {
                            data.push(chunk.charCodeAt(j));
                        }
                        // Pad to 16 bytes
                        while (data.length < RFID.CLASSIC_BYTES_PER_REG) {
                            data.push(0);
                        }

                        // Authenticate and write
                        let result = this.request(RFID.TAG_CMD_REQIDL);
                        if (result.status === RFID.OK) {
                            let anticollResult = this.anticoll(RFID.TAG_CMD_ANTICOL1);
                            if (anticollResult.status === RFID.OK) {
                                if (this.classicSelectTag(anticollResult.uid)) {
                                    let addr = RFID.CLASSIC_ADR[i];
                                    if (this.classicAuth(RFID.TAG_AUTH_KEY_A, addr, RFID.CLASSIC_KEY, anticollResult.uid) === RFID.OK) {
                                        if (!this.writeClassicReg(addr, data)) {
                                            this.classicStopCrypto();
                                            return false;
                                        }
                                        this.classicStopCrypto();

                                        // Stop if we wrote a null terminator
                                        if (data.indexOf(0) !== -1) {
                                            return true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    return true;
                }
                return false;
            } catch (e) {
                return false;
            }
        }

        /**
         * Read text from tag
         */
        public readText(): string {
            try {
                if (!this.isTagPresent()) {
                    return "";
                }

                let totalText = "";

                if (this.lastTagType === TagType.NTAG) {
                    // Read from NTAG pages
                    for (let page = RFID.NTAG_PAGE_MIN; page <= RFID.NTAG_PAGE_MAX; page++) {
                        let pageData = this.readPage(page);
                        if (pageData.length < 4) break;

                        // Convert first 4 bytes to text
                        for (let i = 0; i < 4; i++) {
                            if (pageData[i] === 0) {
                                return totalText;  // Null terminator found
                            }
                            totalText += String.fromCharCode(pageData[i]);
                        }
                    }
                } else if (this.lastTagType === TagType.Classic) {
                    // Read from Classic registers (first 9 slots)
                    for (let i = 0; i < 9; i++) {
                        // Authenticate and read
                        let result = this.request(RFID.TAG_CMD_REQIDL);
                        if (result.status === RFID.OK) {
                            let anticollResult = this.anticoll(RFID.TAG_CMD_ANTICOL1);
                            if (anticollResult.status === RFID.OK) {
                                if (this.classicSelectTag(anticollResult.uid)) {
                                    let addr = RFID.CLASSIC_ADR[i];
                                    if (this.classicAuth(RFID.TAG_AUTH_KEY_A, addr, RFID.CLASSIC_KEY, anticollResult.uid) === RFID.OK) {
                                        let regData = this.readPage(addr);
                                        this.classicStopCrypto();

                                        if (regData.length === 0) break;

                                        for (let j = 0; j < regData.length; j++) {
                                            if (regData[j] === 0) {
                                                return totalText;  // Null terminator found
                                            }
                                            totalText += String.fromCharCode(regData[j]);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                return totalText;
            } catch (e) {
                return "";
            }
        }

        /**
         * Write NFC URI to NTAG (for smartphone tap-to-open)
         */
        public writeURI(uri: string): boolean {
            try {
                if (!this.isTagPresent() || this.lastTagType !== TagType.NTAG) {
                    return false;  // Only NTAG supports NDEF
                }

                // Build NDEF message
                let ndefMessage = "\x03";  // NDEF message marker
                let ndefLength = String.fromCharCode(uri.length + 5);
                let ndefRecordHeader = "\xD1";  // MB=1, ME=1, CF=0, SR=1, IL=0, TNF=001
                let ndefTypeLength = "\x01";  // Type length = 1
                let ndefPayloadLength = String.fromCharCode(uri.length + 1);
                let isUriRecord = "\x55";  // 'U' for URI record
                let recordTypeIndicator = "\x00";  // No prefix (full URI)
                let tlvTerminator = "\xFE";  // TLV terminator

                let ndef = ndefMessage + ndefLength + ndefRecordHeader + ndefTypeLength +
                    ndefPayloadLength + isUriRecord + recordTypeIndicator + uri + tlvTerminator;

                return this.writeText(ndef);
            } catch (e) {
                return false;
            }
        }

        /**
         * Get the I2C address
         */
        public getAddress(): number {
            return this.addr;
        }
    }

    // Internal storage for RFID instance (typically only one)
    let _rfid: RFID = null;

    /**
     * Get or create the RFID instance
     */
    function getRFID(): RFID {
        if (_rfid === null) {
            _rfid = new RFID(0x2C);  // Default I2C address
        }
        return _rfid;
    }

    /**
     * Run code when an RFID tag is detected
     * The tag ID will be available in the tagID parameter
     */
    //% blockId=rfid_on_tag_detected
    //% block="on RFID tag detected $tagID"
    //% draggableParameters="reporter"
    //% weight=100
    //% group="RFID"
    export function onRFIDTagDetected(handler: (tagID: string) => void): void {
        let rfid = getRFID();
        rfid.startEventPolling();
        control.onEvent(rfid.getEventId(), 1, () => {
            handler(rfid.getLastTagId());
        });
    }

    /**
     * Check if an RFID tag is currently present (blocking check)
     */
    //% blockId=rfid_tag_present
    //% block="RFID tag present"
    //% weight=95
    //% group="RFID"
    export function rfidTagPresent(): boolean {
        let rfid = getRFID();
        return rfid.isTagPresent();
    }

    /**
     * Read the tag ID (blocking - waits for tag)
     * Returns the tag ID as a formatted hex string (e.g., "04:1A:2B:3C")
     */
    //% blockId=rfid_read_id
    //% block="RFID read tag ID"
    //% weight=90
    //% group="RFID"
    export function rfidReadID(): string {
        let rfid = getRFID();
        return rfid.readID();
    }

    /**
     * Write a number to the tag
     * Uses slot 35 by default (last slot, won't interfere with text)
     */
    //% blockId=rfid_write_number
    //% block="RFID write number $value||to slot $slot"
    //% value.defl=42
    //% slot.min=0 slot.max=35 slot.defl=35
    //% weight=85
    //% group="RFID"
    //% expandableArgumentMode="toggle"
    export function rfidWriteNumber(value: number, slot?: number): boolean {
        let rfid = getRFID();
        return rfid.writeNumber(value, slot || 35);
    }

    /**
     * Read a number from the tag
     * Uses slot 35 by default (last slot)
     */
    //% blockId=rfid_read_number
    //% block="RFID read number||from slot $slot"
    //% slot.min=0 slot.max=35 slot.defl=35
    //% weight=84
    //% group="RFID"
    //% expandableArgumentMode="toggle"
    export function rfidReadNumber(slot?: number): number {
        let rfid = getRFID();
        return rfid.readNumber(slot || 35);
    }

    /**
     * Write text to the tag
     * Maximum 144 characters
     */
    //% blockId=rfid_write_text
    //% block="RFID write text $text"
    //% text.defl="Hello World"
    //% weight=83
    //% group="RFID"
    export function rfidWriteText(text: string): boolean {
        let rfid = getRFID();
        // Limit to 144 characters
        if (text.length > 144) {
            text = text.substring(0, 144);
        }
        return rfid.writeText(text);
    }

    /**
     * Read text from the tag
     */
    //% blockId=rfid_read_text
    //% block="RFID read text"
    //% weight=82
    //% group="RFID"
    export function rfidReadText(): string {
        let rfid = getRFID();
        return rfid.readText();
    }

    /**
     * Write an NFC URI link to NTAG tag
     * Enables tap-to-open on smartphones
     * Example: "https://corelectronics.com.au"
     */
    //% blockId=rfid_write_uri
    //% block="RFID write link $uri"
    //% uri.defl="https://core-electronics.com.au"
    //% weight=80
    //% group="RFID"
    //% advanced=true
    export function rfidWriteURI(uri: string): boolean {
        let rfid = getRFID();
        return rfid.writeURI(uri);
    }
}
