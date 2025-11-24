/**
 * PiicoDev Servo Driver Module
 * 
 * Controls up to 4 servos with the PCA9685 PWM driver.
 * Supports standard servos (angle control) and continuous rotation servos (speed control).
 */

//% weight=65 color=#FF69B4 icon="\uf013"
//% groups=['Servo Control', 'Configuration', 'others']
namespace piicodev {

    /**
     * Servo channel selector (1-4 as labeled on board)
     */
    export enum ServoChannel {
        //% block="S1"
        S1 = 1,
        //% block="S2"
        S2 = 2,
        //% block="S3"
        S3 = 3,
        //% block="S4"
        S4 = 4
    }

    /**
     * PCA9685 PWM Driver class
     * Internal class that handles low-level PWM operations
     */
    class PCA9685 {
        private i2c_addr: number;
        private _frequency: number;

        // PCA9685 Register addresses
        private static readonly MODE1 = 0x00;
        private static readonly PRESCALE = 0xFE;
        private static readonly LED0_ON_L = 0x06;

        constructor(address: number) {
            this.i2c_addr = address;
            this._frequency = 50;
            this.reset();
        }

        /**
         * Reset the PCA9685
         */
        reset(): void {
            try {
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, 0x00);
                picodevUnified.writeRegister(this.i2c_addr, PCA9685.MODE1, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.i2c_addr);
            }
        }

        /**
         * Set PWM frequency
         */
        setFrequency(freq: number): void {
            try {
                // Calculate prescale value
                let prescale = Math.floor(25000000.0 / 4096.0 / freq + 0.5);

                // Read current mode
                let oldMode = picodevUnified.readRegisterByte(this.i2c_addr, PCA9685.MODE1);

                // Sleep mode (disable oscillator)
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, (oldMode & 0x7F) | 0x10);
                picodevUnified.writeRegister(this.i2c_addr, PCA9685.MODE1, buf);

                // Set prescale
                buf.setNumber(NumberFormat.UInt8LE, 0, prescale);
                picodevUnified.writeRegister(this.i2c_addr, PCA9685.PRESCALE, buf);

                // Restore old mode
                buf.setNumber(NumberFormat.UInt8LE, 0, oldMode);
                picodevUnified.writeRegister(this.i2c_addr, PCA9685.MODE1, buf);

                basic.pause(1);

                // Enable auto-increment
                buf.setNumber(NumberFormat.UInt8LE, 0, oldMode | 0xa1);
                picodevUnified.writeRegister(this.i2c_addr, PCA9685.MODE1, buf);

                this._frequency = 1 / ((prescale - 0.5) * 4096 / 25000000);
            } catch (e) {
                picodevUnified.logI2CError(this.i2c_addr);
            }
        }

        /**
         * Set PWM duty cycle for a channel
         * @param channel Channel index (0-15)
         * @param value Duty cycle value (0-4095)
         */
        setDuty(channel: number, value: number): void {
            try {
                // Clamp value
                if (value < 0) value = 0;
                if (value > 4095) value = 4095;

                let on = 0;
                let off = value;

                if (value === 0) {
                    on = 0;
                    off = 4095;
                } else if (value === 4095) {
                    on = 4095;
                    off = 0;
                }

                // Write 4 bytes: on_low, on_high, off_low, off_high
                let buf = pins.createBuffer(4);
                buf.setNumber(NumberFormat.UInt8LE, 0, on & 0xFF);
                buf.setNumber(NumberFormat.UInt8LE, 1, (on >> 8) & 0xFF);
                buf.setNumber(NumberFormat.UInt8LE, 2, off & 0xFF);
                buf.setNumber(NumberFormat.UInt8LE, 3, (off >> 8) & 0xFF);

                picodevUnified.writeRegister(this.i2c_addr, PCA9685.LED0_ON_L + 4 * channel, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.i2c_addr);
            }
        }
    }

    /**
     * Servo configuration class
     * Handles angle and speed control for servos
     */
    class Servo {
        private controller: PCA9685;
        private channel: number;
        private minDuty: number;
        private maxDuty: number;
        private degrees: number;
        private period: number;
        private _angle: number;
        private _speed: number;

        constructor(
            controller: PCA9685,
            channel: ServoChannel,
            freq: number = 50,
            minUs: number = 600,
            maxUs: number = 2400,
            degrees: number = 180
        ) {
            this.controller = controller;
            // Map silk screen labels (1-4) to PCA9685 channels (3,2,1,0)
            this.channel = [3, 2, 1, 0][channel - 1];
            this.degrees = degrees;
            this.period = 1000000 / freq; // microseconds
            this.minDuty = this.us2duty(minUs);
            this.maxDuty = this.us2duty(maxUs);
            this._angle = 0;
            this._speed = 0;
        }

        /**
         * Convert microseconds to duty cycle value
         */
        private us2duty(us: number): number {
            return Math.floor(4095 * us / this.period + 0.5);
        }

        /**
         * Remap value from one range to another
         */
        private remap(value: number, oldMin: number, oldMax: number, newMin: number, newMax: number): number {
            let x = (newMax - newMin) * (value - oldMin) / (oldMax - oldMin) + newMin;
            return Math.min(newMax, Math.max(x, newMin));
        }

        /**
         * Set servo angle (for standard servos)
         * @param angle Angle in degrees (0 to configured maximum)
         */
        setAngle(angle: number): void {
            // Clamp angle
            angle = Math.min(this.degrees, Math.max(0, angle));

            // Calculate duty cycle
            let duty = this.minDuty + (this.maxDuty - this.minDuty) * angle / this.degrees;
            duty = Math.min(this.maxDuty, Math.max(this.minDuty, Math.floor(duty)));

            this.controller.setDuty(this.channel, duty);
            this._angle = angle;
        }

        /**
         * Set servo speed (for continuous rotation servos)
         * @param speed Speed from -100 to 100 (-100=full reverse, 0=stop, 100=full forward)
         */
        setSpeed(speed: number): void {
            // Clamp speed to -100 to 100
            speed = Math.min(100, Math.max(-100, speed));
            this._speed = speed;

            // Remap -100 to 100 to min_duty to max_duty
            let duty = Math.floor(this.remap(speed, -100, 100, this.minDuty, this.maxDuty) + 0.5);
            this.controller.setDuty(this.channel, duty);
        }

        /**
         * Release servo (disable PWM)
         */
        release(): void {
            this.controller.setDuty(this.channel, 0);
        }
    }

    /**
     * Servo driver instance
     */
    let _servoDriver: PCA9685 = null;
    let _servos: Servo[] = [null, null, null, null];

    /**
     * Initialize the servo driver
     * Call this once before using servos
     */
    //% blockId=servo_init
    //% block="initialize servo driver||at address $address"
    //% address.defl=0x44
    //% group="Servo"
    //% weight=90
    //% advanced=true
    export function servoInit(address?: number): void {
        if (!_servoDriver) {
            let addr = address || 0x44;
            _servoDriver = new PCA9685(addr);
            _servoDriver.setFrequency(50);
        }
    }

    /**
     * Set servo angle (for standard servos)
     * @param channel Servo channel (S1-S4)
     * @param angle Angle in degrees (0-180)
     */
    //% blockId=servo_set_angle
    //% block="set servo $channel angle to $angle °"
    //% channel.defl=ServoChannel.S1
    //% angle.min=0 angle.max=180 angle.defl=90
    //% group="Servo"
    //% weight=100
    export function servoAngle(channel: ServoChannel, angle: number): void {
        // Auto-initialize if needed
        if (!_servoDriver) {
            servoInit();
        }

        // Create servo instance if needed
        let idx = channel - 1;
        if (!_servos[idx]) {
            _servos[idx] = new Servo(_servoDriver, channel);
        }

        _servos[idx].setAngle(angle);
    }

    /**
     * Set continuous rotation servo speed
     * @param channel Servo channel (S1-S4)
     * @param speed Speed from -100 (full reverse) to 100 (full forward), 0 = stop
     */
    //% blockId=servo_set_speed
    //% block="set servo $channel speed to $speed \\%"
    //% channel.defl=ServoChannel.S1
    //% speed.min=-100 speed.max=100 speed.defl=0
    //% group="Servo"
    //% weight=99
    export function servoSpeed(channel: ServoChannel, speed: number): void {
        // Auto-initialize if needed
        if (!_servoDriver) {
            servoInit();
        }

        // Create servo instance if needed
        let idx = channel - 1;
        if (!_servos[idx]) {
            _servos[idx] = new Servo(_servoDriver, channel);
        }

        _servos[idx].setSpeed(speed);
    }

    /**
     * Release servo (disable PWM, servo can be moved freely)
     * @param channel Servo channel (S1-S4)
     */
    //% blockId=servo_release
    //% block="release servo $channel"
    //% channel.defl=ServoChannel.S1
    //% group="Servo"
    //% weight=98
    export function servoRelease(channel: ServoChannel): void {
        if (!_servoDriver) return;

        let idx = channel - 1;
        if (_servos[idx]) {
            _servos[idx].release();
        }
    }

    /**
     * Configure servo timing parameters
     * Advanced: For servos with non-standard pulse widths
     * @param channel Servo channel
     * @param minUs Minimum pulse width in microseconds
     * @param maxUs Maximum pulse width in microseconds
     * @param degrees Maximum angle in degrees
     */
    //% blockId=servo_configure
    //% block="configure servo $channel | min $minUs μs | max $maxUs μs | range $degrees °"
    //% channel.defl=ServoChannel.S1
    //% minUs.defl=600
    //% maxUs.defl=2400
    //% degrees.defl=180
    //% group="Servo"
    //% weight=80
    //% advanced=true
    //% inlineInputMode=inline
    export function servoConfigure(
        channel: ServoChannel,
        minUs: number,
        maxUs: number,
        degrees: number
    ): void {
        // Auto-initialize if needed
        if (!_servoDriver) {
            servoInit();
        }

        // Create or replace servo instance with custom parameters
        let idx = channel - 1;
        _servos[idx] = new Servo(_servoDriver, channel, 50, minUs, maxUs, degrees);
    }
}
