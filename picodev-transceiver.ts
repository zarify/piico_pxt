/**
 * PiicoDev Transceiver - Wireless Communication Module
 * 
 * Enables wireless communication between devices.
 * Note: Simplified implementation for MakeCode
 */

//% weight=65 color=#FF8C00 icon="\uf1eb"
//% groups=['Messaging', 'Configuration', 'others']
namespace piicodev {

    /**
     * Transceiver module class
     */
    class Transceiver {
        private addr: number;
        private nodeID: number;
        private groupID: number;

        private static readonly I2C_DEFAULT_ADDRESS = 0x1A;

        constructor(address: number = Transceiver.I2C_DEFAULT_ADDRESS, nodeID: number = 0, groupID: number = 0) {
            this.addr = address;
            this.nodeID = nodeID;
            this.groupID = groupID;
            this.initialize();
        }

        /**
         * Initialize the transceiver
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
         * Send a text message to another node
         */
        sendMessage(message: string, toNode: number): boolean {
            try {
                // Truncate message to max length
                if (message.length > 59) {
                    message = message.substring(0, 59);
                }

                // Convert message to bytes and send
                let buf = pins.createBuffer(message.length + 2);
                buf.setNumber(NumberFormat.UInt8LE, 0, 3); // Message type
                buf.setNumber(NumberFormat.UInt8LE, 1, message.length);

                for (let i = 0; i < message.length; i++) {
                    buf.setNumber(NumberFormat.UInt8LE, 2 + i, message.charCodeAt(i));
                }

                picodevUnified.writeRegister(this.addr, 0x22, buf);
                return true;
            } catch (e) {
                return false;
            }
        }

        /**
         * Send a number value
         */
        sendNumber(value: number, toNode: number): boolean {
            try {
                // Determine if integer or float
                let buf = pins.createBuffer(6);
                let isInt = Math.floor(value) === value;

                if (isInt) {
                    buf.setNumber(NumberFormat.UInt8LE, 0, 1); // Integer type
                } else {
                    buf.setNumber(NumberFormat.UInt8LE, 0, 2); // Float type
                }

                // Store value in bytes 2-5 (big-endian)
                let intVal = Math.floor(value);
                buf.setNumber(NumberFormat.UInt8LE, 2, (intVal >> 24) & 0xFF);
                buf.setNumber(NumberFormat.UInt8LE, 3, (intVal >> 16) & 0xFF);
                buf.setNumber(NumberFormat.UInt8LE, 4, (intVal >> 8) & 0xFF);
                buf.setNumber(NumberFormat.UInt8LE, 5, intVal & 0xFF);

                picodevUnified.writeRegister(this.addr, 0x22, buf);
                return true;
            } catch (e) {
                return false;
            }
        }

        /**
         * Check if a message is available
         */
        messageAvailable(): boolean {
            try {
                let status = picodevUnified.readRegisterByte(this.addr, 0x23);
                return (status & 0x01) !== 0;
            } catch (e) {
                return false;
            }
        }

        /**
         * Receive a message
         */
        receiveMessage(): string {
            try {
                if (!this.messageAvailable()) {
                    return "";
                }

                let buffer = picodevUnified.readRegister(this.addr, 0x22, 61);
                if (buffer.length < 2) {
                    return "";
                }

                let length = buffer[0];
                if (length > 59) length = 59;

                let message = "";
                for (let i = 0; i < length; i++) {
                    message += String.fromCharCode(buffer[1 + i]);
                }
                return message;
            } catch (e) {
                return "";
            }
        }

        /**
         * Set node ID
         */
        setNodeID(id: number): void {
            this.nodeID = id;
        }

        /**
         * Set group ID
         */
        setGroupID(id: number): void {
            this.groupID = id;
        }
    }

    let transceiver: Transceiver;

    /**
     * Initialize the transceiver
     * @param address I2C address (default: 0x1A)
     * @param nodeID This device's node ID
     * @param groupID Network group ID
     */
    //% blockId=transceiver_create
    //% block="Transceiver initialize at address $address node ID $nodeID group $groupID"
    //% address.defl=0x1A nodeID.defl=1 groupID.defl=0
    //% advanced=true
    //% weight=100
    export function createTransceiver(address: number = 0x1A, nodeID: number = 1, groupID: number = 0): void {
        transceiver = new Transceiver(address, nodeID, groupID);
    }

    /**
     * Send a text message
     * @param message Message text
     * @param toNode Destination node ID
     */
    //% blockId=transceiver_send_message
    //% block="Transceiver send message $message to node $toNode"
    //% message.defl="hello"
    //% toNode.defl=0
    //% group="Messaging"
    //% weight=100
    export function transceiverSendMessage(message: string, toNode: number = 0): void {
        if (!transceiver) {
            createTransceiver();
        }
        transceiver.sendMessage(message, toNode);
    }

    /**
     * Send a number
     * @param value Number to send
     * @param toNode Destination node ID
     */
    //% blockId=transceiver_send_number
    //% block="Transceiver send number $value to node $toNode"
    //% value.defl=42
    //% toNode.defl=0
    //% group="Messaging"
    //% weight=99
    export function transceiverSendNumber(value: number, toNode: number = 0): void {
        if (!transceiver) {
            createTransceiver();
        }
        transceiver.sendNumber(value, toNode);
    }

    /**
     * Check if a message is waiting
     */
    //% blockId=transceiver_message_available
    //% block="Transceiver message available"
    //% group="Messaging"
    //% weight=98
    export function transceiverMessageAvailable(): boolean {
        if (!transceiver) {
            createTransceiver();
        }
        return transceiver.messageAvailable();
    }

    /**
     * Receive a message
     */
    //% blockId=transceiver_receive_message
    //% block="Transceiver receive message"
    //% group="Messaging"
    //% weight=97
    export function transceiverReceiveMessage(): string {
        if (!transceiver) {
            createTransceiver();
        }
        return transceiver.receiveMessage();
    }

    /**
     * Set this device's node ID
     */
    //% blockId=transceiver_set_node_id
    //% block="Transceiver set node ID to $id"
    //% id.defl=1
    //% group="Configuration"
    //% weight=50
    export function transceiverSetNodeID(id: number): void {
        if (!transceiver) {
            createTransceiver();
        }
        transceiver.setNodeID(id);
    }

    /**
     * Set network group ID
     */
    //% blockId=transceiver_set_group_id
    //% block="Transceiver set group ID to $id"
    //% id.defl=0
    //% group="Configuration"
    //% weight=49
    export function transceiverSetGroupID(id: number): void {
        if (!transceiver) {
            createTransceiver();
        }
        transceiver.setGroupID(id);
    }
}
