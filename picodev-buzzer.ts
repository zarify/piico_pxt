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
    export class Buzzer {
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
        //% block="$this play tone $frequency Hz||for $duration ms"
        //% frequency.min=20 frequency.max=20000 frequency.defl=440
        //% duration.defl=1000
        //% weight=100
        //% expandableArgumentMode="toggle"
        playTone(frequency: number, duration?: number): void {
            // TODO: Implement tone generation
            // If duration is 0 or undefined, play continuously
        }

        /**
         * Stop any currently playing tone
         */
        //% blockId=buzzer_stop
        //% block="$this stop tone"
        //% weight=99
        stopTone(): void {
            // TODO: Implement tone stopping (send frequency 0)
        }

        /**
         * Set buzzer volume (hardware v1.0+ only)
         */
        //% blockId=buzzer_set_volume
        //% block="$this set volume $volume"
        //% weight=98
        setVolume(volume: BuzzerVolume): void {
            // TODO: Implement volume control
            // Check firmware version and warn if not supported
        }

        /**
         * Get firmware version as string
         */
        //% blockId=buzzer_firmware_version
        //% block="$this firmware version"
        //% advanced=true
        //% weight=50
        getFirmwareVersion(): string {
            return this.firmwareVersion[0] + "." + this.firmwareVersion[1];
        }

        /**
         * Control the power LED on the buzzer module
         */
        //% blockId=buzzer_power_led
        //% block="$this set power LED $on"
        //% on.shadow="toggleOnOff"
        //% on.defl=true
        //% advanced=true
        //% weight=49
        setPowerLED(on: boolean): void {
            // TODO: Implement LED control
        }

        /**
         * Change the I2C address (for using multiple buzzers)
         */
        //% blockId=buzzer_change_address
        //% block="$this change address to $newAddress"
        //% advanced=true
        //% weight=48
        //% newAddress.defl=0x5C
        changeAddress(newAddress: number): void {
            // TODO: Implement address change
            this.addr = newAddress;
        }
    }

    /**
     * Create a new PiicoDev Buzzer instance
     */
    //% blockId=create_buzzer
    //% block="create PiicoDev Buzzer||at address $address"
    //% blockSetVariable=buzzer
    //% address.defl=0x5C
    //% weight=75
    //% expandableArgumentMode="toggle"
    export function createBuzzer(address?: number): Buzzer {
        if (address === undefined) address = 0x5C;
        return new Buzzer(address);
    }
}
