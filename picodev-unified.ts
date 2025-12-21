/**
 * PiicoDev Unified I2C Layer
 * 
 * This module provides common I2C communication utilities for all PiicoDev sensors.
 * It abstracts the micro:bit I2C interface and provides helper functions for
 * reading and writing 8-bit and 16-bit registers.
 */

/**
 * PiicoDev ID Switch Selector
 * 
 * Many PiicoDev sensors have 4 DIP switches on the back for setting unique I2C addresses.
 * This allows multiple sensors of the same type to be connected to the same I2C bus.
 * 
 * Switch Layout (left to right on hardware):
 * - Switch 1 (leftmost)  = Bit 0 (LSB) = adds +1
 * - Switch 2             = Bit 1       = adds +2
 * - Switch 3             = Bit 2       = adds +4
 * - Switch 4 (rightmost) = Bit 3 (MSB) = adds +8
 * 
 * ID Addressing Logic:
 * - ID 0 [----]: All switches OFF → Uses sensor's default I2C address
 * - ID 1-15: Any switches ON → Address = 0x08 + ID value
 * 
 * IMPORTANT: Power-cycle the sensor after changing DIP switches for the new address to take effect.
 * 
 * Sensors with ID switches: Button, Potentiometer, Ultrasonic, Buzzer, 915MHz Transceiver (future)
 */
//% blockId=picodev_id
enum PiicoDevID {
    //% block="[----] ID 0"
    ID0 = 0,
    //% block="[+---] ID 1"
    ID1 = 1,
    //% block="[-+--] ID 2"
    ID2 = 2,
    //% block="[++--] ID 3"
    ID3 = 3,
    //% block="[--+-] ID 4"
    ID4 = 4,
    //% block="[+-+-] ID 5"
    ID5 = 5,
    //% block="[-++-] ID 6"
    ID6 = 6,
    //% block="[+++-] ID 7"
    ID7 = 7,
    //% block="[---+] ID 8"
    ID8 = 8,
    //% block="[+--+] ID 9"
    ID9 = 9,
    //% block="[-+-+] ID 10"
    ID10 = 10,
    //% block="[++-+] ID 11"
    ID11 = 11,
    //% block="[--++] ID 12"
    ID12 = 12,
    //% block="[+-++] ID 13"
    ID13 = 13,
    //% block="[-+++] ID 14"
    ID14 = 14,
    //% block="[++++] ID 15"
    ID15 = 15
}

namespace picodevUnified {

    /**
     * Error message template for I2C communication failures
     */
    export const I2C_ERROR_MESSAGE = "PiicoDev could not communicate with module at address";

    /**
     * Default I2C frequency for micro:bit (400kHz recommended for compatibility)
     */
    export const I2C_FREQUENCY = 400000;

    /**
     * Write a single byte to an I2C device
     * @param address I2C device address (7-bit)
     * @param data Byte to write
     * @returns 0 on success, non-zero on error
     */
    export function writeByte(address: number, data: number): number {
        let buffer = pins.createBuffer(1);
        buffer.setNumber(NumberFormat.UInt8LE, 0, data);
        return pins.i2cWriteBuffer(address, buffer, false);
    }

    /**
     * Write data to a specific register (8-bit address)
     * @param address I2C device address (7-bit)
     * @param register Register address (8-bit)
     * @param data Data bytes to write
     * @returns 0 on success, non-zero on error
     */
    export function writeRegister(address: number, register: number, data: Buffer): number {
        let buffer = pins.createBuffer(1 + data.length);
        buffer.setNumber(NumberFormat.UInt8LE, 0, register);
        for (let i = 0; i < data.length; i++) {
            buffer.setNumber(NumberFormat.UInt8LE, 1 + i, data[i]);
        }
        return pins.i2cWriteBuffer(address, buffer, false);
    }

    /**
     * Write data to a specific register (16-bit address)
     * Used by sensors like VL53L1X that require 16-bit register addressing
     * @param address I2C device address (7-bit)
     * @param register Register address (16-bit)
     * @param data Data bytes to write
     * @returns 0 on success, non-zero on error
     */
    export function writeRegister16(address: number, register: number, data: Buffer): number {
        let buffer = pins.createBuffer(2 + data.length);
        // Write register address as big-endian 16-bit value
        buffer.setNumber(NumberFormat.UInt8LE, 0, (register >> 8) & 0xFF);
        buffer.setNumber(NumberFormat.UInt8LE, 1, register & 0xFF);
        for (let i = 0; i < data.length; i++) {
            buffer.setNumber(NumberFormat.UInt8LE, 2 + i, data[i]);
        }
        return pins.i2cWriteBuffer(address, buffer, false);
    }

    /**
     * Read bytes from an I2C device
     * @param address I2C device address (7-bit)
     * @param length Number of bytes to read
     * @returns Buffer containing read data, or empty buffer on error
     */
    export function readBytes(address: number, length: number): Buffer {
        return pins.i2cReadBuffer(address, length, false);
    }

    /**
     * Read bytes from a specific register (8-bit address)
     * @param address I2C device address (7-bit)
     * @param register Register address (8-bit)
     * @param length Number of bytes to read
     * @returns Buffer containing read data, or empty buffer on error
     */
    export function readRegister(address: number, register: number, length: number): Buffer {
        let regBuffer = pins.createBuffer(1);
        regBuffer.setNumber(NumberFormat.UInt8LE, 0, register);
        pins.i2cWriteBuffer(address, regBuffer, true); // repeated start
        return pins.i2cReadBuffer(address, length, false);
    }

    /**
     * Read bytes from a specific register (16-bit address)
     * Used by sensors like VL53L1X that require 16-bit register addressing
     * @param address I2C device address (7-bit)
     * @param register Register address (16-bit)
     * @param length Number of bytes to read
     * @returns Buffer containing read data, or empty buffer on error
     */
    export function readRegister16(address: number, register: number, length: number): Buffer {
        let regBuffer = pins.createBuffer(2);
        // Write register address as big-endian 16-bit value
        regBuffer.setNumber(NumberFormat.UInt8LE, 0, (register >> 8) & 0xFF);
        regBuffer.setNumber(NumberFormat.UInt8LE, 1, register & 0xFF);
        pins.i2cWriteBuffer(address, regBuffer, true); // repeated start
        return pins.i2cReadBuffer(address, length, false);
    }

    /**
     * Read a single byte from a register (8-bit address)
     * @param address I2C device address (7-bit)
     * @param register Register address (8-bit)
     * @returns Byte value, or 0 on error
     */
    export function readRegisterByte(address: number, register: number): number {
        let buffer = readRegister(address, register, 1);
        if (buffer.length > 0) {
            return buffer.getNumber(NumberFormat.UInt8LE, 0);
        }
        return 0;
    }

    /**
     * Read a 16-bit value from a register (8-bit address, little-endian)
     * @param address I2C device address (7-bit)
     * @param register Register address (8-bit)
     * @returns 16-bit value (little-endian), or 0 on error
     */
    export function readRegisterUInt16LE(address: number, register: number): number {
        let buffer = readRegister(address, register, 2);
        if (buffer.length >= 2) {
            return buffer.getNumber(NumberFormat.UInt16LE, 0);
        }
        return 0;
    }

    /**
     * Read a 16-bit value from a register (8-bit address, big-endian)
     * @param address I2C device address (7-bit)
     * @param register Register address (8-bit)
     * @returns 16-bit value (big-endian), or 0 on error
     */
    export function readRegisterUInt16BE(address: number, register: number): number {
        let buffer = readRegister(address, register, 2);
        if (buffer.length >= 2) {
            return buffer.getNumber(NumberFormat.UInt16BE, 0);
        }
        return 0;
    }

    /**
     * Read a 16-bit value from a register (16-bit address, big-endian)
     * @param address I2C device address (7-bit)
     * @param register Register address (16-bit)
     * @returns 16-bit value (big-endian), or 0 on error
     */
    export function readRegister16UInt16BE(address: number, register: number): number {
        let buffer = readRegister16(address, register, 2);
        if (buffer.length >= 2) {
            return buffer.getNumber(NumberFormat.UInt16BE, 0);
        }
        return 0;
    }

    /**
     * Convert a signed 16-bit value to a number (handle two's complement)
     * @param value Unsigned 16-bit value
     * @returns Signed 16-bit value as number
     */
    export function int16(value: number): number {
        if (value > 32767) {
            return value - 65536;
        }
        return value;
    }

    /**
     * Convert a value to signed (handle two's complement for both 8 and 16-bit)
     * @param value Unsigned value
     * @returns Signed value as number
     */
    export function toSigned(value: number): number {
        if (value > 32767) {
            return value - 65536;
        }
        if (value > 127) {
            return value - 256;
        }
        return value;
    }

    /**
     * Update specific bits in a register using a mask
     * @param address I2C device address (7-bit)
     * @param register Register address (8-bit)
     * @param value New value for the masked bits
     * @param mask Bit mask indicating which bits to update
     * @returns 0 on success, non-zero on error
     */
    export function updateRegisterBits(address: number, register: number, value: number, mask: number): number {
        let oldValue = readRegisterByte(address, register);
        let newValue = (oldValue & ~mask) | (value & mask);
        let buffer = pins.createBuffer(1);
        buffer.setNumber(NumberFormat.UInt8LE, 0, newValue);
        return writeRegister(address, register, buffer);
    }

    /**
     * Check if a device is present on the I2C bus
     * @param address I2C device address (7-bit)
     * @returns true if device responds, false otherwise
     */
    export function isDevicePresent(address: number): boolean {
        // Try to read one byte from the device
        let buffer = pins.i2cReadBuffer(address, 1, false);
        return buffer.length > 0;
    }

    /**
     * Log an I2C error message to serial
     * @param address I2C device address that failed
     */
    export function logI2CError(address: number): void {
        serial.writeLine(I2C_ERROR_MESSAGE + " 0x" + toHex(address));
    }

    /**
     * Convert a number to a 2-digit hexadecimal string
     * @param value Number to convert
     * @returns Hex string (e.g., "A5")
     */
    export function toHex(value: number): string {
        let hex = "0123456789ABCDEF";
        return hex.charAt((value >> 4) & 0x0F) + hex.charAt(value & 0x0F);
    }

    /**
     * Create a buffer from an array of numbers
     * @param values Array of byte values
     * @returns Buffer containing the values
     */
    export function createBufferFromArray(values: number[]): Buffer {
        let buffer = pins.createBuffer(values.length);
        for (let i = 0; i < values.length; i++) {
            buffer.setNumber(NumberFormat.UInt8LE, i, values[i]);
        }
        return buffer;
    }

    /**
     * Delay for a specified number of milliseconds
     * @param ms Milliseconds to delay
     */
    export function delay(ms: number): void {
        basic.pause(ms);
    }

    /**
     * Calculate the I2C address for a sensor based on its default address and ID switch setting
     * 
     * @param defaultAddress The sensor's default I2C address (when all DIP switches are OFF)
     * @param id The PiicoDevID enum value (0-15)
     * @returns The calculated I2C address for the sensor
     * 
     * Logic:
     * - ID 0: Returns the sensor's default address (all switches OFF)
     * - ID 1-15: Returns 0x08 + ID value (switches create offset from base address 0x08)
     */
    export function calculateIDSwitchAddress(defaultAddress: number, id: PiicoDevID): number {
        if (id === PiicoDevID.ID0) {
            return defaultAddress;
        }
        return 0x08 + id;
    }
}

