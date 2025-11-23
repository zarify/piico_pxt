/**
 * PiicoDev Button Module
 * 
 * Physical push button with LED indicator and event-driven programming support.
 * Features press detection, double-press detection, press counting, and LED control.
 */

//% weight=85 color=#E63022 icon="\uf205"
//% groups=['Events', 'Reading', 'Configuration', 'others']
namespace piicodev {

    /**
     * Button events that can trigger code
     */
    export enum ButtonEvent {
        //% block="pressed"
        Pressed = 1,
        //% block="released"
        Released = 2,
        //% block="double pressed"
        DoublePressed = 3
    }

    /**
     * Button selector for multiple buttons
     * Set DIP switches on the back of the button, then power-cycle for address to take effect
     * Each switch adds a value: Switch1=+1, Switch2=+2, Switch3=+4, Switch4=+8
     */
    export enum ButtonSelect {
        //% block="Button 1"
        Button1 = 0x42,  // Default: All switches OFF (66 decimal)
        //% block="Button 2"
        Button2 = 0x09,  // Switch 1 ON (9 decimal)
        //% block="Button 3"
        Button3 = 0x0A,  // Switch 2 ON (10 decimal)
        //% block="Button 4"
        Button4 = 0x0C,  // Switch 3 ON (12 decimal)
        //% block="Button 5"
        Button5 = 0x10   // Switch 4 ON (16 decimal)
    }

    /**
     * PiicoDev Button class
     */
    class Button {
        private addr: number;
        private eventId: number;  // Unique event source ID for this button
        private localPressCount: number;  // Local counter incremented on press events
        private localDoublePressCount: number;  // Local counter for double presses
        private pollingStarted: boolean;
        private lastPressState: boolean;  // Track state for edge detection

        // Register addresses
        private static readonly REG_WHOAMI = 0x01;
        private static readonly REG_FIRM_MAJ = 0x02;
        private static readonly REG_FIRM_MIN = 0x03;
        private static readonly REG_I2C_ADDRESS = 0x04;
        private static readonly REG_LED = 0x05;
        private static readonly REG_IS_PRESSED = 0x11;
        private static readonly REG_WAS_PRESSED = 0x12;
        private static readonly REG_DOUBLE_PRESS_DETECTED = 0x13;
        private static readonly REG_PRESS_COUNT = 0x14;
        private static readonly REG_DOUBLE_PRESS_DURATION = 0x21;
        private static readonly REG_EMA_PARAMETER = 0x22;
        private static readonly REG_EMA_PERIOD = 0x23;

        private static readonly DEVICE_ID = 0x0199;  // 409 in decimal
        private static readonly BASE_ADDRESS = 0x42;

        // Event value constants
        private static readonly EVT_PRESSED = 1;
        private static readonly EVT_RELEASED = 2;
        private static readonly EVT_DOUBLE_PRESSED = 3;

        constructor(address: number = 0x42) {
            this.addr = address;
            // Use address as event source ID to keep buttons separate
            this.eventId = 3000 + address;  // Start at 3000 to avoid conflicts
            this.localPressCount = 0;
            this.localDoublePressCount = 0;
            this.pollingStarted = false;
            this.lastPressState = false;

            // Initialize button
            this.initialize();
        }

        /**
         * Initialize the button
         */
        private initialize(): void {
            try {
                // Try to read device ID - if this fails, button may not be connected
                let deviceId = picodevUnified.readRegisterUInt16BE(this.addr, Button.REG_WHOAMI);

                // Only proceed with configuration if we got a valid response
                if (deviceId === Button.DEVICE_ID) {
                    // Set default configuration
                    this.setDoublePressTime(300);
                    this.setLED(true);  // Turn on power LED
                } else {
                    // Log warning but don't crash - device might be at wrong address
                    serial.writeLine("PiicoDev Button: Expected device ID " + Button.DEVICE_ID + " but got " + deviceId + " at 0x" + this.addr.toString());
                }
            } catch (e) {
                // Silently handle I2C errors on init - device may not be connected yet
                // Error will be shown when user tries to actually use it
            }
        }

        /**
         * Start background polling to detect button events
         */
        public startEventPolling(): void {
            if (this.pollingStarted) {
                return;  // Already polling
            }
            this.pollingStarted = true;

            control.inBackground(() => {
                while (true) {
                    this.pollEvents();
                    basic.pause(20);  // Poll every 20ms
                }
            });
        }

        /**
         * Poll button state and raise events
         * This reads the hardware registers and raises events when state changes
         */
        private pollEvents(): void {
            try {
                // Check if button was pressed (clears on read from hardware)
                if (this.wasPressed()) {
                    // Increment local counter
                    this.localPressCount++;
                    // Raise pressed event
                    control.raiseEvent(this.eventId, Button.EVT_PRESSED);
                }

                // Check for double press (clears on read from hardware)
                if (this.wasDoublePressed()) {
                    // Increment local double-press counter
                    this.localDoublePressCount++;
                    // Raise double-press event
                    control.raiseEvent(this.eventId, Button.EVT_DOUBLE_PRESSED);
                }
            } catch (e) {
                // Silently handle I2C errors during polling
            }
        }

        /**
         * Check if button is currently pressed
         */
        public isPressed(): boolean {
            try {
                let value = picodevUnified.readRegisterByte(this.addr, Button.REG_IS_PRESSED);
                return value === 0;  // Inverted: 0 = pressed, 1 = not pressed
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return false;
            }
        }

        /**
         * Check if button was pressed since last check (clears on read)
         */
        public wasPressed(): boolean {
            try {
                let value = picodevUnified.readRegisterByte(this.addr, Button.REG_WAS_PRESSED);
                return value !== 0;  // Non-zero = was pressed
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return false;
            }
        }

        /**
         * Check if button was double pressed (clears on read)
         */
        public wasDoublePressed(): boolean {
            try {
                let value = picodevUnified.readRegisterByte(this.addr, Button.REG_DOUBLE_PRESS_DETECTED);
                return value === 1;
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
                return false;
            }
        }

        /**
         * Get press count and reset the counter
         * Returns the number of times pressed since last call
         * This is a LOCAL counter that works independently of events
         */
        public getPressCount(): number {
            let count = this.localPressCount;
            this.localPressCount = 0;  // Reset local counter
            return count;
        }

        /**
         * Get double-press count and reset the counter
         * Returns the number of double-presses since last call
         */
        public getDoublePressCount(): number {
            let count = this.localDoublePressCount;
            this.localDoublePressCount = 0;  // Reset local counter
            return count;
        }

        /**
         * Control the power LED
         */
        public setLED(on: boolean): void {
            try {
                let buf = pins.createBuffer(1);
                buf.setNumber(NumberFormat.UInt8LE, 0, on ? 0x01 : 0x00);
                picodevUnified.writeRegister(this.addr, Button.REG_LED | 0x80, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Set double-press time window in milliseconds
         */
        public setDoublePressTime(ms: number): void {
            try {
                let buf = pins.createBuffer(2);
                buf.setNumber(NumberFormat.UInt16BE, 0, ms);
                picodevUnified.writeRegister(this.addr, Button.REG_DOUBLE_PRESS_DURATION | 0x80, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Get the event source ID for this button
         */
        public getEventId(): number {
            return this.eventId;
        }

        /**
         * Get the I2C address
         */
        public getAddress(): number {
            return this.addr;
        }
    }

    // Internal storage for button instances (up to 4 buttons)
    let _buttons: Button[] = [];

    /**
     * Get or create a button instance
     */
    function getButton(which: ButtonSelect): Button {
        let address = which as number;

        // Check if button already exists
        for (let i = 0; i < _buttons.length; i++) {
            if (_buttons[i] && _buttons[i].getAddress() === address) {
                return _buttons[i];
            }
        }

        // Create new button instance
        let newButton = new Button(address);
        _buttons.push(newButton);
        return newButton;
    }

    /**
     * Register code to run when a button event occurs
     */
    //% blockId=button_on_event
    //% block="on $which $event"
    //% which.defl=ButtonSelect.Button1
    //% weight=100
    //% group="Events"
    export function onButtonEvent(which: ButtonSelect, event: ButtonEvent, handler: () => void): void {
        let button = getButton(which);
        button.startEventPolling();  // Start polling if not already started
        control.onEvent(button.getEventId(), event as number, handler);
    }

    /**
     * Check if a button is currently being pressed
     * Returns true while the button is held down
     * This is safe to use in forever loops - it doesn't affect events or counters
     */
    //% blockId=button_is_pressed
    //% block="$which is pressed"
    //% which.defl=ButtonSelect.Button1
    //% weight=90
    //% group="Reading"
    export function buttonIsPressed(which: ButtonSelect = ButtonSelect.Button1): boolean {
        let button = getButton(which);
        return button.isPressed();
    }

    /**
     * Get the number of times a button was pressed
     * Returns the count since last time this was called (resets counter)
     * Works independently - you can use this with or without event handlers
     */
    //% blockId=button_press_count
    //% block="$which press count"
    //% which.defl=ButtonSelect.Button1
    //% weight=87
    //% group="Reading"
    export function buttonPressCount(which: ButtonSelect = ButtonSelect.Button1): number {
        let button = getButton(which);
        // Start polling if not already started (needed to update the counter)
        button.startEventPolling();
        return button.getPressCount();
    }

    /**
     * Control the button's power LED
     */
    //% blockId=button_set_led
    //% block="$which LED $on"
    //% which.defl=ButtonSelect.Button1
    //% on.shadow="toggleOnOff"
    //% weight=80
    //% group="Configuration"
    export function buttonSetLED(which: ButtonSelect = ButtonSelect.Button1, on: boolean): void {
        let button = getButton(which);
        button.setLED(on);
    }

    /**
     * Set the time window for double-press detection
     */
    //% blockId=button_set_double_press_time
    //% block="$which set double press time $ms ms"
    //% which.defl=ButtonSelect.Button1
    //% ms.min=50 ms.max=1000 ms.defl=300
    //% weight=70
    //% group="Configuration"
    //% advanced=true
    export function buttonSetDoublePressTime(which: ButtonSelect = ButtonSelect.Button1, ms: number): void {
        let button = getButton(which);
        button.setDoublePressTime(ms);
    }
}
