/**
 * PiicoDev Buzzer Module
 * 
 * Programmable buzzer with tone generation and volume control.
 */

//% weight=75 color=#9370DB icon="\uf0a2"
namespace piicodev {

    /**
     * Buzzer volume levels
     */
    export enum BuzzerVolume {
        //% block="off"
        Off = 0,
        //% block="low"
        Low = 1,
        //% block="high"
        High = 2
    }

    /**
     * PiicoDev Buzzer class
     */
    class Buzzer {
        private addr: number;
        private firmwareVersion: number[];

        constructor(address: number = 0x5C) {
            this.addr = address;
            this.firmwareVersion = [0, 0];

            // TODO: Initialize buzzer and read firmware version
            // This will be implemented in Phase 2
        }

        /**
         * Play a tone at the specified frequency for a duration
         * @param frequency Frequency in Hz (20-20000)
         * @param duration Duration in milliseconds (0 = continuous)
         */
        //% blockId=buzzer_play_tone
        //% block="Buzzer play tone $frequency Hz||for $duration ms"
        //% frequency.min=20 frequency.max=20000 frequency.defl=440
        //% duration.defl=1000
        //% weight=100
        //% expandableArgumentMode="toggle"
        public playTone(frequency: number, duration?: number): void {
            // TODO: Implement tone generation
            // If duration is 0 or undefined, play continuously
        }

        /**
         * Stop any currently playing tone
         */
        //% blockId=buzzer_stop
        //% block="Buzzer stop tone"
        //% weight=99
        public stopTone(): void {
            // TODO: Implement tone stopping (send frequency 0)
        }

        /**
         * Set buzzer volume (hardware v1.0+ only)
         */
        //% blockId=buzzer_set_volume
        //% block="Buzzer set volume $volume"
        //% weight=98
        public setVolume(volume: BuzzerVolume): void {
            // TODO: Implement volume control
            // Check firmware version and warn if not supported
        }

        /**
         * Get firmware version as string
         */
        //% blockId=buzzer_firmware_version
        //% block="Buzzer firmware version"
        //% advanced=true
        //% weight=50
        public getFirmwareVersion(): string {
            return this.firmwareVersion[0] + "." + this.firmwareVersion[1];
        }

        /**
         * Control the power LED on the buzzer module
         */
        //% blockId=buzzer_power_led
        //% block="Buzzer set power LED $on"
        //% on.shadow="toggleOnOff"
        //% on.defl=true
        //% advanced=true
        //% weight=49
        public setPowerLED(on: boolean): void {
            // TODO: Implement LED control
        }

        /**
         * Change the I2C address (for using multiple buzzers)
         */
        //% blockId=buzzer_change_address
        //% block="Buzzer change address to $newAddress"
        //% advanced=true
        //% weight=48
        //% newAddress.defl=0x5C
        public changeAddress(newAddress: number): void {
            // TODO: Implement address change
            this.addr = newAddress;
        }
    }

    // Internal singleton instance
    let _buzzer: Buzzer;

    // Wrapper functions to call methods on the internal Buzzer instance
    /**
     * Play a tone at the specified frequency for a duration
     */
    //% blockId=buzzer_play_tone
    //% block="Buzzer play tone $frequency Hz||for $duration ms"
    //% frequency.min=20 frequency.max=20000 frequency.defl=440
    //% duration.defl=1000
    //% weight=100
    //% expandableArgumentMode="toggle"
    export function playTone(frequency: number, duration?: number): void {
        if (!_buzzer) _buzzer = new Buzzer(0x5C);
        if (_buzzer) _buzzer.playTone(frequency, duration);
    }

    /**
     * Stop any currently playing tone
     */
    //% blockId=buzzer_stop
    //% block="Buzzer stop tone"
    //% weight=99
    export function stopTone(): void {
        if (!_buzzer) _buzzer = new Buzzer(0x5C);
        if (_buzzer) _buzzer.stopTone();
    }

    /**
     * Set buzzer volume (hardware v1.0+ only)
     */
    //% blockId=buzzer_set_volume
    //% block="Buzzer set volume $volume"
    //% weight=98
    export function setVolume(volume: BuzzerVolume): void {
        if (!_buzzer) _buzzer = new Buzzer(0x5C);
        if (_buzzer) _buzzer.setVolume(volume);
    }

    /**
     * Get firmware version as string
     */
    //% blockId=buzzer_firmware_version
    //% block="Buzzer firmware version"
    //% advanced=true
    //% weight=50
    export function buzzerGetFirmwareVersion(): string {
        if (!_buzzer) _buzzer = new Buzzer(0x5C);
        if (_buzzer) return _buzzer.getFirmwareVersion();
        return "0.0";
    }

    /**
     * Control the power LED on the buzzer module
     */
    //% blockId=buzzer_power_led
    //% block="Buzzer set power LED $on"
    //% on.shadow="toggleOnOff"
    //% on.defl=true
    //% advanced=true
    //% weight=49
    export function buzzerSetPowerLED(on: boolean): void {
        if (!_buzzer) _buzzer = new Buzzer(0x5C);
        if (_buzzer) _buzzer.setPowerLED(on);
    }

    /**
     * Change the I2C address (for using multiple buzzers)
     */
    //% blockId=buzzer_change_address
    //% block="Buzzer change address to $newAddress"
    //% advanced=true
    //% weight=48
    //% newAddress.defl=0x5C
    export function buzzerChangeAddress(newAddress: number): void {
        if (!_buzzer) _buzzer = new Buzzer(0x5C);
        if (_buzzer) _buzzer.changeAddress(newAddress);
    }

    /**
     * Create a new PiicoDev Buzzer instance
     */
    export function createBuzzer(address?: number): void {
        if (address === undefined) address = 0x5C;
        _buzzer = new Buzzer(address);
    }
}