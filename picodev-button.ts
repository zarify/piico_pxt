/**
 * PiicoDev Button Module
 * 
 * Physical push button with LED indicator and event-driven programming support.
 * Features press detection, double-press detection, press counting, and LED control.
 */

//% weight=100 color=#0078D7 icon="\uf205"
//% groups=['Inputs']
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

    // Internal storage for button instances (up to 16 buttons with different IDs)
    let _buttons: Button[] = [];

    /**
     * Get or create a button instance
     */
    function getButton(id: PiicoDevID): Button {
        // Calculate I2C address based on ID switches
        let address = picodevUnified.calculateIDSwitchAddress(0x42, id);

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
    //% block="on button $id $event"
    //% id.defl=PiicoDevID.ID0
    //% weight=100
    //% group="Button"
    export function onButtonEvent(id: PiicoDevID, event: ButtonEvent, handler: () => void): void {
        let button = getButton(id);
        button.startEventPolling();  // Start polling if not already started
        control.onEvent(button.getEventId(), event as number, handler);
    }

    /**
     * Check if a button is currently being pressed
     * Returns true while the button is held down
     * This is safe to use in forever loops - it doesn't affect events or counters
     */
    //% blockId=button_is_pressed
    //% block="button $id is pressed"
    //% id.defl=PiicoDevID.ID0
    //% weight=90
    //% group="Button"
    export function buttonIsPressed(id: PiicoDevID = PiicoDevID.ID0): boolean {
        let button = getButton(id);
        return button.isPressed();
    }

    /**
     * Get the number of times a button was pressed
     * Returns the count since last time this was called (resets counter)
     * Works independently - you can use this with or without event handlers
     */
    //% blockId=button_press_count
    //% block="button $id press count"
    //% id.defl=PiicoDevID.ID0
    //% weight=87
    //% group="Button"
    export function buttonPressCount(id: PiicoDevID = PiicoDevID.ID0): number {
        let button = getButton(id);
        // Start polling if not already started (needed to update the counter)
        button.startEventPolling();
        return button.getPressCount();
    }

    /**
     * Control the button's power LED
     */
    //% blockId=button_set_led
    //% block="button $id LED $on"
    //% id.defl=PiicoDevID.ID0
    //% on.shadow="toggleOnOff"
    //% weight=80
    //% group="Button"
    export function buttonSetLED(id: PiicoDevID = PiicoDevID.ID0, on: boolean): void {
        let button = getButton(id);
        button.setLED(on);
    }

    /**
     * Set the time window for double-press detection
     */
    //% blockId=button_set_double_press_time
    //% block="button $id set double press time $ms ms"
    //% id.defl=PiicoDevID.ID0
    //% ms.min=50 ms.max=1000 ms.defl=300
    //% weight=70
    //% group="Button"
    //% advanced=true
    export function buttonSetDoublePressTime(id: PiicoDevID = PiicoDevID.ID0, ms: number): void {
        let button = getButton(id);
        button.setDoublePressTime(ms);
    }
}
