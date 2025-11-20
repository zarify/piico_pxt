/**
 * PiicoDev RFID Reader
 * 
 * Reads RFID tags and returns their unique identifiers.
 * Note: Simplified implementation for MakeCode
 */

//% weight=70 color=#FF6B6B icon="\uf111"
//% groups=['Reading', 'Control', 'others']
namespace piicodev {

    /**
     * RFID Reader class
     */
    class RFID {
        private addr: number;

        private static readonly I2C_DEFAULT_ADDRESS = 0x2C;

        constructor(address: number = RFID.I2C_DEFAULT_ADDRESS) {
            this.addr = address;
            this.initialize();
        }

        /**
         * Initialize the RFID reader
         */
        private initialize(): void {
            try {
                // Verify device presence
                let buf = picodevUnified.readRegister(this.addr, 1, 1);
                if (buf.length > 0) {
                    // Device found
                }
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Read RFID tag ID
         * Returns formatted UID string
         */
        readTagID(): string {
            try {
                // Read 7 bytes of tag data
                let buffer = picodevUnified.readRegister(this.addr, 0x20, 7);
                if (buffer.length < 5) {
                    return "";
                }

                // Format as hex string
                let id = "";
                for (let i = 0; i < 4; i++) {
                    if (i > 0) id += ":";
                    let byte = buffer[i];
                    let hex = "0123456789ABCDEF";
                    id += hex.charAt((byte >> 4) & 0x0F);
                    id += hex.charAt(byte & 0x0F);
                }
                return id;
            } catch (e) {
                return "";
            }
        }

        /**
         * Check if a tag is present
         */
        isTagPresent(): boolean {
            try {
                let status = picodevUnified.readRegisterByte(this.addr, 0x00);
                return (status & 0x01) !== 0;
            } catch (e) {
                return false;
            }
        }
    }

    let rfidReader: RFID;

    /**
     * Initialize the RFID reader
     * @param address I2C address (default: 0x2C)
     */
    //% blockId=rfid_create
    //% block="RFID reader initialize at address $address"
    //% address.defl=0x2C
    //% advanced=true
    //% weight=100
    export function createRFID(address: number = 0x2C): void {
        rfidReader = new RFID(address);
    }

    /**
     * Read RFID tag ID as formatted string
     */
    //% blockId=rfid_read_tag_id
    //% block="RFID read tag ID"
    //% group="Reading"
    //% weight=100
    export function rfidReadTagID(): string {
        if (!rfidReader) {
            createRFID();
        }
        return rfidReader.readTagID();
    }

    /**
     * Check if a tag is present
     */
    //% blockId=rfid_is_tag_present
    //% block="RFID tag present"
    //% group="Reading"
    //% weight=99
    export function rfidIsTagPresent(): boolean {
        if (!rfidReader) {
            createRFID();
        }
        return rfidReader.isTagPresent();
    }
}
