/**
 * PiicoDev Servo Motor Controller
 * 
 * Controls servo motors via PWM with angle and speed modes.
 */

//% weight=75 color=#FF8C42 icon="\uf085"
//% groups=['Control', 'Configuration', 'others']
namespace piicodev {

    /**
     * Servo Motor class (simplified for MakeCode)
     */
    class Servo {
        private channel: number;
        private minPulse: number;
        private maxPulse: number;
        private maxAngle: number;

        constructor(channel: number, minPulse: number = 600, maxPulse: number = 2400, maxAngle: number = 180) {
            this.channel = channel;
            this.minPulse = minPulse;
            this.maxPulse = maxPulse;
            this.maxAngle = maxAngle;
        }

        /**
         * Set servo angle
         */
        setAngle(angle: number): void {
            // Clamp angle to valid range
            angle = Math.max(0, Math.min(this.maxAngle, angle));

            // Map angle to pulse width
            let pulse = this.minPulse + (this.maxPulse - this.minPulse) * angle / this.maxAngle;

            // Set pulse via pins.servoSetPulse
            pins.servoSetPulse(this.channel, pulse);
        }

        /**
         * Set servo speed (-100 to 100, where -100 is full speed reverse)
         */
        setSpeed(speed: number): void {
            // Clamp speed
            speed = Math.max(-100, Math.min(100, speed));

            // Map speed to pulse width
            let midpoint = (this.minPulse + this.maxPulse) / 2;
            let range = (this.maxPulse - this.minPulse) / 2;
            let pulse = midpoint + (range * speed / 100);

            pins.servoSetPulse(this.channel, pulse);
        }

        /**
         * Release servo (stop driving)
         */
        release(): void {
            pins.servoSetPulse(this.channel, 0);
        }
    }

    let servos: Servo[] = [];

    /**
     * Initialize a servo on a pin
     * @param pin Servo pin
     * @param minAngle Minimum angle (default: 0)
     * @param maxAngle Maximum angle (default: 180)
     */
    //% blockId=servo_init
    //% block="Servo on pin $pin min angle $minAngle max angle $maxAngle"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% minAngle.defl=0 maxAngle.defl=180
    //% group="Control"
    //% weight=100
    export function initServo(pin: number, minAngle: number = 0, maxAngle: number = 180): void {
        while (servos.length <= pin) {
            servos.push(new Servo(0, 600, 2400, 180));
        }
        servos[pin] = new Servo(pin, 600, 2400, 180);
    }

    /**
     * Set servo angle
     * @param pin Servo pin
     * @param angle Angle in degrees
     */
    //% blockId=servo_set_angle
    //% block="Servo on pin $pin set angle to $angle degrees"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% angle.min=0 angle.max=180 angle.defl=90
    //% group="Control"
    //% weight=99
    export function servoSetAngle(pin: number, angle: number): void {
        if (servos[pin]) {
            servos[pin].setAngle(angle);
        }
    }

    /**
     * Set servo speed
     * @param pin Servo pin
     * @param speed Speed from -100 (full reverse) to 100 (full forward)
     */
    //% blockId=servo_set_speed
    //% block="Servo on pin $pin set speed to $speed"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% speed.min=-100 speed.max=100 speed.defl=0
    //% group="Control"
    //% weight=98
    export function servoSetSpeed(pin: number, speed: number): void {
        if (servos[pin]) {
            servos[pin].setSpeed(speed);
        }
    }

    /**
     * Release servo (stop driving)
     * @param pin Servo pin
     */
    //% blockId=servo_release
    //% block="Servo on pin $pin release"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% group="Control"
    //% weight=97
    export function servoRelease(pin: number): void {
        if (servos[pin]) {
            servos[pin].release();
        }
    }
}
