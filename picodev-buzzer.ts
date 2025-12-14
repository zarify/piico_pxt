/**
 * PiicoDev Buzzer Module
 * 
 * Programmable buzzer with tone generation and volume control.
 */

//% weight=89 color=#E63022 icon="\uf0a2"
//% groups=['Outputs']
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

        // Register addresses
        private static readonly REG_STATUS = 0x01;
        private static readonly REG_FIRMWARE_MAJ = 0x02;
        private static readonly REG_FIRMWARE_MIN = 0x03;
        private static readonly REG_I2C_ADDR = 0x04;
        private static readonly REG_TONE = 0x05;
        private static readonly REG_VOLUME = 0x06;
        private static readonly REG_LED = 0x07;

        constructor(address: number = 0x5C) {
            this.addr = address;
            this.firmwareVersion = [0, 0];

            // Initialize buzzer
            this.initialize();
        }

        /**
         * Initialize the buzzer
         */
        private initialize(): void {
            try {
                // Enable power LED
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, 0x01);
                picodevUnified.writeRegister(this.addr, Buzzer.REG_LED, buf);

                // Read firmware version
                this.firmwareVersion[0] = picodevUnified.readRegisterByte(this.addr, Buzzer.REG_FIRMWARE_MAJ);
                this.firmwareVersion[1] = picodevUnified.readRegisterByte(this.addr, Buzzer.REG_FIRMWARE_MIN);

                // Set default volume if supported (firmware v1.0+)
                if (this.firmwareVersion[0] >= 1) {
                    this.setVolume(BuzzerVolume.High);
                }
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
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
            try {
                // Clamp frequency to valid range
                if (frequency < 20) frequency = 20;
                if (frequency > 20000) frequency = 20000;

                let dur = duration || 0;
                if (dur < 0) dur = 0;

                // Write frequency (16-bit big-endian) and duration (16-bit big-endian)
                let buf = pins.createBuffer(4);
                buf.setNumber(NumberFormat.UInt8LE, 0, (frequency >> 8) & 0xFF);
                buf.setNumber(NumberFormat.UInt8LE, 1, frequency & 0xFF);
                buf.setNumber(NumberFormat.UInt8LE, 2, (dur >> 8) & 0xFF);
                buf.setNumber(NumberFormat.UInt8LE, 3, dur & 0xFF);
                picodevUnified.writeRegister(this.addr, Buzzer.REG_TONE, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Stop any currently playing tone
         */
        //% blockId=buzzer_stop
        //% block="Buzzer stop tone"
        //% weight=99
        public stopTone(): void {
            // Stop tone is equivalent to playing frequency 0
            this.playTone(0);
        }

        /**
         * Set buzzer volume (hardware v1.0+ only)
         */
        //% blockId=buzzer_set_volume
        //% block="Buzzer set volume $volume"
        //% weight=98
        public setVolume(volume: BuzzerVolume): void {
            try {
                // Only works on firmware v1.0+
                if (this.firmwareVersion[0] < 1) {
                    serial.writeLine("Warning: Volume not implemented on this hardware revision");
                    return;
                }

                // Volume must be 0, 1, or 2
                if (volume < 0 || volume > 2) {
                    return;
                }

                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, volume & 0xFF);
                picodevUnified.writeRegister(this.addr, Buzzer.REG_VOLUME, buf);
                basic.pause(5);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
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
            try {
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, on ? 0x01 : 0x00);
                picodevUnified.writeRegister(this.addr, Buzzer.REG_LED, buf);
                basic.pause(1);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Change the I2C address (for using multiple buzzers)
         * @internal
         */
        public changeAddress(newAddress: number): void {
            try {
                // Validate address range
                if (newAddress < 0x08 || newAddress > 0x77) {
                    return;
                }

                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, newAddress & 0xFF);
                picodevUnified.writeRegister(this.addr, Buzzer.REG_I2C_ADDR, buf);
                this.addr = newAddress;
                basic.pause(5);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }
    }

    // Instance cache for buzzer modules
    let buzzerInstances: Buzzer[] = [];

    /**
     * Get or create a buzzer instance
     */
    function getBuzzer(id: PiicoDevID): Buzzer {
        // Calculate I2C address based on ID switches
        let address = picodevUnified.calculateIDSwitchAddress(0x5C, id);

        // Check if instance already exists
        for (let i = 0; i < buzzerInstances.length; i++) {
            if (buzzerInstances[i] && (buzzerInstances[i] as any).addr === address) {
                return buzzerInstances[i];
            }
        }

        // Create new instance
        let buzzer = new Buzzer(address);
        buzzerInstances.push(buzzer);
        return buzzer;
    }

    // Wrapper functions to call methods on buzzer instances
    /**
     * Play a tone at the specified frequency for a duration
     */
    //% blockId=buzzer_play_tone
    //% block="buzzer $id play tone $frequency Hz||for $duration ms"
    //% id.defl=PiicoDevID.ID0
    //% group="Buzzer"
    //% frequency.min=20 frequency.max=20000 frequency.defl=440
    //% duration.defl=1000
    //% weight=100
    //% expandableArgumentMode="toggle"
    export function playTone(id: PiicoDevID, frequency: number, duration?: number): void {
        let buzzer = getBuzzer(id);
        buzzer.playTone(frequency, duration);
    }

    /**
     * Stop any currently playing tone
     */
    //% blockId=buzzer_stop
    //% block="buzzer $id stop tone"
    //% id.defl=PiicoDevID.ID0
    //% group="Buzzer"
    //% weight=99
    export function stopTone(id: PiicoDevID): void {
        let buzzer = getBuzzer(id);
        buzzer.stopTone();
    }

    /**
     * Set buzzer volume (hardware v1.0+ only)
     */
    //% blockId=buzzer_set_volume
    //% block="buzzer $id set volume $volume"
    //% id.defl=PiicoDevID.ID0
    //% group="Buzzer"
    //% weight=98
    export function setVolume(id: PiicoDevID, volume: BuzzerVolume): void {
        let buzzer = getBuzzer(id);
        buzzer.setVolume(volume);
    }

    /**
     * Control the power LED on the buzzer module
     */
    //% blockId=buzzer_power_led
    //% block="buzzer $id LED $on"
    //% id.defl=PiicoDevID.ID0
    //% group="Buzzer"
    //% on.shadow="toggleOnOff"
    //% on.defl=true
    //% advanced=true
    //% weight=49
    export function buzzerSetPowerLED(id: PiicoDevID, on: boolean): void {
        let buzzer = getBuzzer(id);
        buzzer.setPowerLED(on);
    }
}