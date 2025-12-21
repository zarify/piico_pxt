/**
 * PiicoDev 915MHz Transceiver Module
 * 
 * Wireless communication using RFM69 radio for sending and receiving data.
 * Features configurable frequency, transmission power, speed, groups, and addresses.
 */

//% weight=75 color=#FFA500 icon="\uf0ec"
//% groups=['Transceiver']
namespace PiicoDevComm {

    /**
     * Radio transmission speed presets
     */
    export enum RadioSpeed {
        //% block="slow (9.6 kbps)"
        Slow = 1,
        //% block="medium (115.2 kbps)"
        Medium = 2,
        //% block="fast (250 kbps)"
        Fast = 3
    }

    /**
     * Radio frequency presets (MHz)
     */
    export enum RadioFrequency {
        //% block="915 MHz"
        Freq915 = 915,
        //% block="918 MHz"
        Freq918 = 918,
        //% block="922 MHz"
        Freq922 = 922,
        //% block="925 MHz"
        Freq925 = 925,
        //% block="928 MHz"
        Freq928 = 928
    }

    /**
     * Message types for transceiver payload
     */
    enum MessageType {
        Integer = 1,
        Float = 2,
        String = 3
    }

    /**
     * PiicoDev Transceiver class
     */
    class Transceiver {
        private addr: number;
        private _speed: RadioSpeed;
        private _frequency: RadioFrequency;
        private _txPower: number;
        private eventId: number;  // Unique event source ID for this transceiver
        private pollingStarted: boolean;

        // Public message reception fields
        public rssi: number;
        public messageType: MessageType;
        public message: string;
        public key: string;
        public value: number;
        public receivedBytes: Buffer;
        public sourceRadioAddress: number;

        // Register addresses
        private static readonly REG_WHOAMI = 0x01;
        private static readonly REG_FIRM_MAJ = 0x02;
        private static readonly REG_FIRM_MIN = 0x03;
        private static readonly REG_I2C_ADDRESS = 0x04;
        private static readonly REG_LED = 0x05;
        private static readonly REG_TX_POWER = 0x13;
        private static readonly REG_RFM69_RADIO_STATE = 0x14;
        private static readonly REG_RFM69_NODE_ID = 0x15;
        private static readonly REG_RFM69_NETWORK_ID = 0x16;
        private static readonly REG_RFM69_TO_NODE_ID = 0x17;
        private static readonly REG_RFM69_REG = 0x18;
        private static readonly REG_RFM69_VALUE = 0x19;
        private static readonly REG_RFM69_RESET = 0x20;
        private static readonly REG_PAYLOAD_LENGTH = 0x21;
        private static readonly REG_PAYLOAD = 0x22;
        private static readonly REG_PAYLOAD_NEW = 0x23;
        private static readonly REG_PAYLOAD_GO = 0x24;
        private static readonly REG_TRANSCEIVER_READY = 0x25;

        // RFM69 radio registers
        private static readonly RFM69_REG_BITRATEMSB = 0x03;
        private static readonly RFM69_REG_BITRATELSB = 0x04;
        private static readonly RFM69_REG_FRFMSB = 0x07;
        private static readonly RFM69_REG_FRFMID = 0x08;
        private static readonly RFM69_REG_FRFLSB = 0x09;

        private static readonly MAXIMUM_PAYLOAD_LENGTH = 61;
        private static readonly MAXIMUM_I2C_SIZE = 32;
        private static readonly DEVICE_ID = 0x01EF;  // 495 in decimal
        private static readonly BASE_ADDRESS = 0x1A;  // 26 in decimal

        constructor(
            address: number = 0x1A,
            radioAddress: number = 0,
            group: number = 0,
            speed: RadioSpeed = RadioSpeed.Medium,
            frequency: RadioFrequency = RadioFrequency.Freq922,
            txPower: number = 20
        ) {
            this.addr = address;
            this._speed = speed;
            this._frequency = frequency;
            this._txPower = txPower;
            // Use address as event source ID to keep transceivers separate
            this.eventId = 4000 + address;  // Start at 4000 to avoid conflicts
            this.pollingStarted = false;

            // Initialize message fields
            this.rssi = 0;
            this.messageType = MessageType.String;
            this.message = "";
            this.key = "";
            this.value = 0;
            this.receivedBytes = pins.createBuffer(0);
            this.sourceRadioAddress = 0;

            // Initialize transceiver
            this.initialize(radioAddress, group, speed, frequency, txPower);
        }

        /**
         * Initialize the transceiver
         */
        private initialize(
            radioAddress: number,
            group: number,
            speed: RadioSpeed,
            frequency: RadioFrequency,
            txPower: number
        ): void {
            try {
                // Clamp radio address to valid range (0-127)
                if (radioAddress < 0) radioAddress = 0;
                if (radioAddress > 127) radioAddress = 127;

                // Clamp group to valid range (0-255)
                if (group < 0) group = 0;
                if (group > 255) group = 255;

                // Turn on power LED
                this.setLED(true);

                // Set radio address (16-bit big-endian)
                this.writeInt16BE(Transceiver.REG_RFM69_NODE_ID, radioAddress);
                basic.pause(5);

                // Wait for transceiver to be ready
                while (!this.transceiverReady()) {
                    basic.pause(10);
                }

                // Set network group ID
                this.writeInt8(Transceiver.REG_RFM69_NETWORK_ID, group);
                basic.pause(5);

                // Configure radio parameters
                this.setSpeed(speed);
                this.setFrequency(frequency);
                this.setTxPower(txPower);

            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Check if transceiver is ready to send/receive
         */
        private transceiverReady(): boolean {
            try {
                return picodevUnified.readRegisterByte(this.addr, Transceiver.REG_TRANSCEIVER_READY) === 1;
            } catch (e) {
                return false;
            }
        }

        /**
         * Read an 8-bit integer from a register
         */
        private readInt8(register: number): number {
            return picodevUnified.readRegisterByte(this.addr, register);
        }

        /**
         * Read a 16-bit integer from a register (big-endian)
         */
        private readInt16BE(register: number): number {
            return picodevUnified.readRegisterUInt16BE(this.addr, register);
        }

        /**
         * Write an 8-bit integer to a register
         */
        private writeInt8(register: number, value: number): void {
            let buf = pins.createBuffer(1);
            buf.setNumber(NumberFormat.UInt8LE, 0, value);
            picodevUnified.writeRegister(this.addr, register | 0x80, buf);
        }

        /**
         * Write a 16-bit integer to a register (big-endian)
         */
        private writeInt16BE(register: number, value: number): void {
            let buf = pins.createBuffer(2);
            buf.setNumber(NumberFormat.UInt16BE, 0, value);
            picodevUnified.writeRegister(this.addr, register | 0x80, buf);
        }

        /**
         * Get an RFM69 radio register value
         */
        private getRFM69Register(register: number): number {
            this.writeInt8(Transceiver.REG_RFM69_REG, register);
            basic.pause(5);
            return this.readInt8(Transceiver.REG_RFM69_VALUE);
        }

        /**
         * Set an RFM69 radio register value
         */
        private setRFM69Register(register: number, value: number): void {
            this.writeInt8(Transceiver.REG_RFM69_REG, register);
            basic.pause(5);
            this.writeInt8(Transceiver.REG_RFM69_VALUE, value);
            basic.pause(5);
        }

        /**
         * Set the radio transmission speed
         */
        private setSpeed(speed: RadioSpeed): void {
            try {
                while (!this.transceiverReady()) {
                    basic.pause(10);
                }

                if (speed === RadioSpeed.Slow) {
                    this.setRFM69Register(Transceiver.RFM69_REG_BITRATEMSB, 13);
                    this.setRFM69Register(Transceiver.RFM69_REG_BITRATELSB, 5);
                } else if (speed === RadioSpeed.Medium) {
                    this.setRFM69Register(Transceiver.RFM69_REG_BITRATEMSB, 1);
                    this.setRFM69Register(Transceiver.RFM69_REG_BITRATELSB, 22);
                } else if (speed === RadioSpeed.Fast) {
                    this.setRFM69Register(Transceiver.RFM69_REG_BITRATEMSB, 0);
                    this.setRFM69Register(Transceiver.RFM69_REG_BITRATELSB, 107);
                }
                this._speed = speed;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Set the radio frequency
         */
        private setFrequency(frequency: RadioFrequency): void {
            try {
                while (!this.transceiverReady()) {
                    basic.pause(10);
                }

                if (frequency === RadioFrequency.Freq915) {
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFMSB, 228);
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFMID, 192);
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFLSB, 0);
                } else if (frequency === RadioFrequency.Freq918) {
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFMSB, 229);
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFMID, 128);
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFLSB, 0);
                } else if (frequency === RadioFrequency.Freq922) {
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFMSB, 230);
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFMID, 128);
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFLSB, 0);
                } else if (frequency === RadioFrequency.Freq925) {
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFMSB, 231);
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFMID, 64);
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFLSB, 0);
                } else if (frequency === RadioFrequency.Freq928) {
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFMSB, 232);
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFMID, 0);
                    this.setRFM69Register(Transceiver.RFM69_REG_FRFLSB, 0);
                }
                this._frequency = frequency;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Set the radio transmission power
         */
        private setTxPower(power: number): void {
            try {
                // Clamp to valid range (-2 to +20 dBm)
                if (power < -2) power = -2;
                if (power > 20) power = 20;

                while (!this.transceiverReady()) {
                    basic.pause(10);
                }

                // Convert signed value to buffer
                let buf = pins.createBuffer(1);
                if (power < 0) {
                    buf.setNumber(NumberFormat.Int8LE, 0, power);
                } else {
                    buf.setNumber(NumberFormat.UInt8LE, 0, power);
                }
                picodevUnified.writeRegister(this.addr, Transceiver.REG_TX_POWER | 0x80, buf);
                this._txPower = power;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Set destination radio address for next transmission
         */
        private setDestinationAddress(address: number): void {
            if (address < 0) return;
            if (address > 127) return;
            this.writeInt16BE(Transceiver.REG_RFM69_TO_NODE_ID, address);
            basic.pause(8);
        }

        /**
         * Send payload to the transceiver
         */
        private sendPayload(payload: Buffer): void {
            try {
                let payloadLength = payload.length;

                // Set payload length
                this.writeInt8(Transceiver.REG_PAYLOAD_LENGTH, payloadLength);
                basic.pause(5);

                // Send payload in chunks
                let offset = 0;
                while (offset < payloadLength) {
                    let chunkSize = Math.min(Transceiver.MAXIMUM_I2C_SIZE - 1, payloadLength - offset);
                    let chunk = payload.slice(offset, offset + chunkSize);
                    // Use 0x80 bit for write operation
                    picodevUnified.writeRegister(this.addr, Transceiver.REG_PAYLOAD | 0x80, chunk);
                    basic.pause(5);
                    offset += chunkSize;
                }

                // Trigger transmission
                this.writeInt8(Transceiver.REG_PAYLOAD_GO, 1);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Check if a new payload is available
         */
        private payloadNew(): boolean {
            return this.readInt8(Transceiver.REG_PAYLOAD_NEW) === 1;
        }

        /**
         * Receive payload from the transceiver
         */
        private receivePayload(): Buffer {
            try {
                if (!this.payloadNew()) {
                    return pins.createBuffer(0);
                }

                basic.pause(5);

                // Read payload length (includes 3-byte header)
                let payloadLength = this.readInt8(Transceiver.REG_PAYLOAD_LENGTH) + 3;
                basic.pause(5);

                // Read payload in chunks
                let payload = pins.createBuffer(0);
                let offset = 0;
                while (offset < payloadLength) {
                    let chunkSize = Math.min(Transceiver.MAXIMUM_I2C_SIZE, payloadLength - offset);
                    let chunk = picodevUnified.readRegister(this.addr, Transceiver.REG_PAYLOAD, chunkSize);

                    // Append chunk to payload
                    let newPayload = pins.createBuffer(payload.length + chunk.length);
                    for (let i = 0; i < payload.length; i++) {
                        newPayload[i] = payload[i];
                    }
                    for (let i = 0; i < chunk.length; i++) {
                        newPayload[payload.length + i] = chunk[i];
                    }
                    payload = newPayload;

                    offset += chunkSize;
                    basic.pause(5);
                }

                return payload.slice(0, payloadLength);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return pins.createBuffer(0);
            }
        }

        /**
         * Control the power LED
         */
        public setLED(on: boolean): void {
            try {
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, on ? 0x01 : 0x00);
                picodevUnified.writeRegister(this.addr, Transceiver.REG_LED | 0x80, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Send a string message
         */
        public sendString(message: string, address: number = 0): void {
            try {
                this.setDestinationAddress(address);

                // Truncate message to maximum length
                if (message.length > Transceiver.MAXIMUM_PAYLOAD_LENGTH - 2) {
                    message = message.substr(0, Transceiver.MAXIMUM_PAYLOAD_LENGTH - 2);
                }

                // Create payload: [type, length, message_bytes]
                let messageBytes = Buffer.fromUTF8(message);
                let payload = pins.createBuffer(2 + messageBytes.length);
                payload[0] = MessageType.String;
                payload[1] = messageBytes.length;
                for (let i = 0; i < messageBytes.length; i++) {
                    payload[2 + i] = messageBytes[i];
                }

                this.sendPayload(payload);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Send an integer value with optional key
         */
        public sendInteger(value: number, key: string = "", address: number = 0): void {
            try {
                this.setDestinationAddress(address);

                // Truncate key to maximum length
                if (key.length > Transceiver.MAXIMUM_PAYLOAD_LENGTH - 6) {
                    key = key.substr(0, Transceiver.MAXIMUM_PAYLOAD_LENGTH - 6);
                }

                // Create payload: [type, value(4 bytes), key_length, key_bytes]
                let keyBytes = Buffer.fromUTF8(key);
                let payload = pins.createBuffer(6 + keyBytes.length);
                payload[0] = MessageType.Integer;

                // Write 32-bit integer (big-endian)
                payload[1] = (value >> 24) & 0xFF;
                payload[2] = (value >> 16) & 0xFF;
                payload[3] = (value >> 8) & 0xFF;
                payload[4] = value & 0xFF;

                payload[5] = keyBytes.length;
                for (let i = 0; i < keyBytes.length; i++) {
                    payload[6 + i] = keyBytes[i];
                }

                this.sendPayload(payload);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Send a float value with optional key
         * Note: MakeCode/micro:bit doesn't support IEEE 754 float encoding natively,
         * so we convert to integer by multiplying by 1000
         */
        public sendFloat(value: number, key: string = "", address: number = 0): void {
            try {
                this.setDestinationAddress(address);

                // Truncate key to maximum length
                if (key.length > Transceiver.MAXIMUM_PAYLOAD_LENGTH - 6) {
                    key = key.substr(0, Transceiver.MAXIMUM_PAYLOAD_LENGTH - 6);
                }

                // Convert float to integer (multiply by 1000)
                let intValue = Math.round(value * 1000);

                // Create payload: [type, value(4 bytes), key_length, key_bytes]
                let keyBytes = Buffer.fromUTF8(key);
                let payload = pins.createBuffer(6 + keyBytes.length);
                payload[0] = MessageType.Float;

                // Write 32-bit integer (big-endian)
                payload[1] = (intValue >> 24) & 0xFF;
                payload[2] = (intValue >> 16) & 0xFF;
                payload[3] = (intValue >> 8) & 0xFF;
                payload[4] = intValue & 0xFF;

                payload[5] = keyBytes.length;
                for (let i = 0; i < keyBytes.length; i++) {
                    payload[6 + i] = keyBytes[i];
                }

                this.sendPayload(payload);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Send raw bytes
         */
        public sendBytes(data: Buffer, address: number = 0): void {
            try {
                this.setDestinationAddress(address);
                this.sendPayload(data);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Check if a new message has arrived and parse it
         * Returns true if a message was received
         */
        public receive(): boolean {
            try {
                let payload = this.receivePayload();

                if (payload.length === 0) {
                    return false;
                }

                // Store raw payload for debugging
                this.receivedBytes = payload;

                // Parse header: [rssi, source_address(2 bytes), type, ...]
                this.rssi = -payload[0];
                this.sourceRadioAddress = (payload[1] << 8) | payload[2];
                this.messageType = payload[3];

                // Parse message based on type
                if (this.messageType === MessageType.Integer) {
                    // [type, value(4 bytes), key_length, key_bytes]
                    let intValue = (payload[4] << 24) | (payload[5] << 16) | (payload[6] << 8) | payload[7];
                    // Handle signed integer (two's complement)
                    if (intValue > 0x7FFFFFFF) {
                        intValue = intValue - 0x100000000;
                    }
                    this.value = intValue;

                    let keyLength = payload[8];
                    if (keyLength > 0) {
                        this.key = payload.slice(9, 9 + keyLength).toString();
                        this.message = this.key + ": " + this.value.toString();
                    } else {
                        this.key = "";
                        this.message = this.value.toString();
                    }

                } else if (this.messageType === MessageType.Float) {
                    // [type, value(4 bytes), key_length, key_bytes]
                    let intValue = (payload[4] << 24) | (payload[5] << 16) | (payload[6] << 8) | payload[7];
                    // Handle signed integer (two's complement)
                    if (intValue > 0x7FFFFFFF) {
                        intValue = intValue - 0x100000000;
                    }
                    // Convert back from integer (divide by 1000)
                    this.value = intValue / 1000;

                    let keyLength = payload[8];
                    if (keyLength > 0) {
                        this.key = payload.slice(9, 9 + keyLength).toString();
                        this.message = this.key + ": " + this.value.toString();
                    } else {
                        this.key = "";
                        this.message = this.value.toString();
                    }

                } else if (this.messageType === MessageType.String) {
                    // [type, length, message_bytes]
                    let messageLength = payload[4];
                    this.message = payload.slice(5, 5 + messageLength).toString();
                    this.key = "";
                    this.value = 0;
                }

                return true;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return false;
            }
        }

        /**
         * Receive raw bytes
         * Returns true if bytes were received
         */
        public receiveBytes(): boolean {
            try {
                let payload = this.receivePayload();

                if (payload.length === 0) {
                    return false;
                }

                // Parse header: [rssi, source_address(2 bytes), data...]
                this.rssi = -payload[0];
                this.sourceRadioAddress = (payload[1] << 8) | payload[2];
                this.receivedBytes = payload.slice(3);

                return true;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return false;
            }
        }

        /**
         * Get the I2C address
         */
        public getAddress(): number {
            return this.addr;
        }

        /**
         * Get the radio address
         */
        public getRadioAddress(): number {
            return this.readInt16BE(Transceiver.REG_RFM69_NODE_ID);
        }

        /**
         * Get the network group
         */
        public getGroup(): number {
            return this.readInt8(Transceiver.REG_RFM69_NETWORK_ID);
        }

        /**
         * Get the last received RSSI
         */
        public getRSSI(): number {
            return this.rssi;
        }

        /**
         * Get the last message
         */
        public getMessage(): string {
            return this.message;
        }

        /**
         * Get the last message key
         */
        public getKey(): string {
            return this.key;
        }

        /**
         * Get the last message value
         */
        public getValue(): number {
            return this.value;
        }

        /**
         * Get the source radio address of last message
         */
        public getSourceAddress(): number {
            return this.sourceRadioAddress;
        }

        /**
         * Get the received raw bytes
         */
        public getReceivedBytes(): Buffer {
            return this.receivedBytes;
        }

        /**
         * Start background polling to detect incoming messages
         */
        public startEventPolling(): void {
            if (this.pollingStarted) {
                return;  // Already polling
            }
            this.pollingStarted = true;

            control.inBackground(() => {
                while (true) {
                    this.pollMessages();
                    basic.pause(20);  // Poll every 20ms
                }
            });
        }

        /**
         * Poll for incoming messages and raise appropriate events
         */
        private pollMessages(): void {
            try {
                if (this.receive()) {
                    // Raise event based on message type
                    if (this.messageType === MessageType.String) {
                        control.raiseEvent(this.eventId, 1);  // String message event
                    } else if (this.messageType === MessageType.Integer || this.messageType === MessageType.Float) {
                        if (this.key === "") {
                            control.raiseEvent(this.eventId, 2);  // Number message event
                        } else {
                            control.raiseEvent(this.eventId, 3);  // Key-value pair event
                        }
                    }
                }
            } catch (e) {
                // Silently handle errors during polling
            }
        }

        /**
         * Get the event source ID for this transceiver
         */
        public getEventId(): number {
            return this.eventId;
        }
    }

    // Internal storage for transceiver instances
    let _transceivers: Transceiver[] = [];

    /**
     * Get or create a transceiver instance
     */
    function getTransceiver(
        id: PiicoDevID,
        radioAddress?: number,
        group?: number,
        speed?: RadioSpeed,
        frequency?: RadioFrequency,
        txPower?: number
    ): Transceiver {
        // Calculate I2C address based on ID switches
        let address = picodevUnified.calculateIDSwitchAddress(0x1A, id);

        // Check if transceiver already exists
        for (let i = 0; i < _transceivers.length; i++) {
            if (_transceivers[i] && _transceivers[i].getAddress() === address) {
                return _transceivers[i];
            }
        }

        // Create new transceiver instance
        let newTransceiver = new Transceiver(
            address,
            radioAddress || 0,
            group || 0,
            speed || RadioSpeed.Medium,
            frequency || RadioFrequency.Freq922,
            txPower || 20
        );
        _transceivers.push(newTransceiver);
        return newTransceiver;
    }

    /**
     * Initialize a transceiver with configuration
     * Must be called once at the start before using the transceiver
     */
    //% blockId=transceiver_init
    //% block="transceiver $id set|radio address $radioAddress|group $group||speed $speed|frequency $frequency|tx power $txPower dBm"
    //% id.defl=PiicoDevID.ID0
    //% radioAddress.min=0 radioAddress.max=127 radioAddress.defl=0
    //% group.min=0 group.max=255 group.defl=0
    //% speed.defl=RadioSpeed.Medium
    //% frequency.defl=RadioFrequency.Freq922
    //% txPower.min=-2 txPower.max=20 txPower.defl=20
    //% weight=100
    //% group="Transceiver"
    //% expandableArgumentMode="toggle"
    export function transceiverSetGroup(
        id: PiicoDevID = PiicoDevID.ID0,
        radioAddress: number = 0,
        group: number = 0,
        speed?: RadioSpeed,
        frequency?: RadioFrequency,
        txPower?: number
    ): void {
        getTransceiver(id, radioAddress, group, speed, frequency, txPower);
    }

    /**
     * Send a text string message to a specific address (or broadcast to all if address is 0)
     */
    //% blockId=transceiver_send_string
    //% block="transceiver $id send string $message||to address $address"
    //% id.defl=PiicoDevID.ID0
    //% address.min=0 address.max=127 address.defl=0
    //% weight=95
    //% group="Transceiver"
    //% expandableArgumentMode="toggle"
    export function transceiverSendString(
        id: PiicoDevID = PiicoDevID.ID0,
        message: string,
        address?: number
    ): void {
        let transceiver = getTransceiver(id);
        transceiver.sendString(message, address || 0);
    }

    /**
     * Send a number value to a specific address (or broadcast to all if address is 0)
     */
    //% blockId=transceiver_send_number
    //% block="transceiver $id send number $value||to address $address"
    //% id.defl=PiicoDevID.ID0
    //% address.min=0 address.max=127 address.defl=0
    //% weight=94
    //% group="Transceiver"
    //% expandableArgumentMode="toggle"
    export function transceiverSendNumber(
        id: PiicoDevID = PiicoDevID.ID0,
        value: number,
        address?: number
    ): void {
        let transceiver = getTransceiver(id);
        transceiver.sendFloat(value, "", address || 0);
    }

    /**
     * Send a key-value pair to a specific address (or broadcast to all if address is 0)
     */
    //% blockId=transceiver_send_value
    //% block="transceiver $id send value $name = $value||to address $address"
    //% id.defl=PiicoDevID.ID0
    //% address.min=0 address.max=127 address.defl=0
    //% weight=93
    //% group="Transceiver"
    //% expandableArgumentMode="toggle"
    export function transceiverSendValue(
        id: PiicoDevID = PiicoDevID.ID0,
        name: string,
        value: number,
        address?: number
    ): void {
        let transceiver = getTransceiver(id);
        transceiver.sendFloat(value, name, address || 0);
    }

    /**
     * Send raw bytes to a specific address (or broadcast to all if address is 0)
     */
    //% blockId=transceiver_send_bytes
    //% block="transceiver $id send bytes $data||to address $address"
    //% id.defl=PiicoDevID.ID0
    //% address.min=0 address.max=127 address.defl=0
    //% weight=92
    //% group="Transceiver"
    //% advanced=true
    //% expandableArgumentMode="toggle"
    export function transceiverSendBytes(
        id: PiicoDevID = PiicoDevID.ID0,
        data: Buffer,
        address?: number
    ): void {
        let transceiver = getTransceiver(id);
        transceiver.sendBytes(data, address || 0);
    }

    /**
     * Run code when a string message is received
     * The received message will be available in the 'receivedString' parameter
     */
    //% blockId=transceiver_on_string
    //% block="on transceiver $id received string $receivedString"
    //% id.defl=PiicoDevID.ID0
    //% draggableParameters="reporter"
    //% weight=90
    //% group="Transceiver"
    export function onTransceiverReceivedString(
        id: PiicoDevID = PiicoDevID.ID0,
        handler: (receivedString: string) => void
    ): void {
        let transceiver = getTransceiver(id);
        transceiver.startEventPolling();
        control.onEvent(transceiver.getEventId(), 1, () => {
            handler(transceiver.getMessage());
        });
    }

    /**
     * Run code when a number is received
     * The received number will be available in the 'receivedNumber' parameter
     */
    //% blockId=transceiver_on_number
    //% block="on transceiver $id received number $receivedNumber"
    //% id.defl=PiicoDevID.ID0
    //% draggableParameters="reporter"
    //% weight=89
    //% group="Transceiver"
    export function onTransceiverReceivedNumber(
        id: PiicoDevID = PiicoDevID.ID0,
        handler: (receivedNumber: number) => void
    ): void {
        let transceiver = getTransceiver(id);
        transceiver.startEventPolling();
        control.onEvent(transceiver.getEventId(), 2, () => {
            handler(transceiver.getValue());
        });
    }

    /**
     * Run code when a key-value pair is received
     * The name and value will be available in the parameters
     */
    //% blockId=transceiver_on_value
    //% block="on transceiver $id received value $name = $value"
    //% id.defl=PiicoDevID.ID0
    //% draggableParameters="reporter"
    //% weight=88
    //% group="Transceiver"
    export function onTransceiverReceivedValue(
        id: PiicoDevID = PiicoDevID.ID0,
        handler: (name: string, value: number) => void
    ): void {
        let transceiver = getTransceiver(id);
        transceiver.startEventPolling();
        control.onEvent(transceiver.getEventId(), 3, () => {
            handler(transceiver.getKey(), transceiver.getValue());
        });
    }

    /**
     * Get the signal strength (RSSI) of the last received message
     * Returns a negative number in dBm (closer to 0 = stronger signal)
     */
    //% blockId=transceiver_received_signal_strength
    //% block="transceiver $id received signal strength"
    //% id.defl=PiicoDevID.ID0
    //% weight=80
    //% group="Transceiver"
    export function transceiverReceivedSignalStrength(id: PiicoDevID = PiicoDevID.ID0): number {
        let transceiver = getTransceiver(id);
        return transceiver.getRSSI();
    }

    /**
     * Get the radio address of the sender of the last received message
     */
    //% blockId=transceiver_received_from
    //% block="transceiver $id received from address"
    //% id.defl=PiicoDevID.ID0
    //% weight=79
    //% group="Transceiver"
    export function transceiverReceivedFrom(id: PiicoDevID = PiicoDevID.ID0): number {
        let transceiver = getTransceiver(id);
        return transceiver.getSourceAddress();
    }

    /**
     * Control the transceiver's power LED
     */
    //% blockId=transceiver_set_led
    //% block="transceiver $id LED $on"
    //% id.defl=PiicoDevID.ID0
    //% on.shadow="toggleOnOff"
    //% weight=70
    //% group="Transceiver"
    //% advanced=true
    export function transceiverSetLED(id: PiicoDevID = PiicoDevID.ID0, on: boolean): void {
        let transceiver = getTransceiver(id);
        transceiver.setLED(on);
    }

    /**
     * Check if a message has been received and parse it
     * Returns true if a message was received
     * Call this in a loop to poll for messages (like MicroPython)
     */
    //% blockId=transceiver_receive
    //% block="transceiver $id receive"
    //% id.defl=PiicoDevID.ID0
    //% weight=85
    //% group="Transceiver"
    //% advanced=true
    export function transceiverReceive(id: PiicoDevID = PiicoDevID.ID0): boolean {
        let transceiver = getTransceiver(id);
        return transceiver.receive();
    }

    /**
     * Get the last received message as a string
     */
    //% blockId=transceiver_get_message
    //% block="transceiver $id message"
    //% id.defl=PiicoDevID.ID0
    //% weight=84
    //% group="Transceiver"
    //% advanced=true
    export function transceiverGetMessage(id: PiicoDevID = PiicoDevID.ID0): string {
        let transceiver = getTransceiver(id);
        return transceiver.getMessage();
    }

    /**
     * Get the received bytes from the last message
     */
    //% blockId=transceiver_get_received_bytes
    //% block="transceiver $id received bytes"
    //% id.defl=PiicoDevID.ID0
    //% weight=83
    //% group="Transceiver"
    //% advanced=true
    export function transceiverGetReceivedBytes(id: PiicoDevID = PiicoDevID.ID0): Buffer {
        let transceiver = getTransceiver(id);
        return transceiver.getReceivedBytes();
    }
}