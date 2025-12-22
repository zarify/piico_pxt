/**
 * PiicoDev Real-Time Clock (RV3028)
 * 
 * Precise timekeeping with battery backup, alarms, and event timestamps.
 * Maintains accurate date/time even when powered off.
 */

//% weight=90 color=#00A4CC icon="\uf2db"
//% groups=['RV3028 Time']
namespace piicodev {

    /**
     * Date and time components
     */
    export enum DateTimeComponent {
        //% block="year"
        Year = 0,
        //% block="month"
        Month = 1,
        //% block="day"
        Day = 2,
        //% block="weekday"
        Weekday = 3,
        //% block="hour"
        Hour = 4,
        //% block="minute"
        Minute = 5,
        //% block="second"
        Second = 6
    }

    /**
     * Day of the week
     */
    export enum Weekday {
        //% block="Monday"
        Monday = 0,
        //% block="Tuesday"
        Tuesday = 1,
        //% block="Wednesday"
        Wednesday = 2,
        //% block="Thursday"
        Thursday = 3,
        //% block="Friday"
        Friday = 4,
        //% block="Saturday"
        Saturday = 5,
        //% block="Sunday"
        Sunday = 6
    }

    /**
     * Time format for display
     */
    export enum TimeFormat {
        //% block="24 hour"
        Hour24 = 0,
        //% block="12 hour"
        Hour12 = 1
    }

    /**
     * AM/PM indicator for 12-hour format
     */
    export enum AMPM {
        //% block="AM"
        AM = 0,
        //% block="PM"
        PM = 1
    }

    /**
     * RV3028 Real-Time Clock class
     */
    class RV3028 {
        private addr: number;
        private eventId: number;
        private pollingStarted: boolean;

        // Current date/time
        public year: number;
        public month: number;
        public day: number;
        public weekday: Weekday;
        public hour: number;
        public minute: number;
        public second: number;
        public ampm: AMPM;
        public timeFormat: TimeFormat;

        // Alarm settings
        private alarmHours: number;
        private alarmMinutes: number;
        private alarmWeekdayDate: number;
        private alarmAMPM: AMPM;

        // Register addresses
        private static readonly REG_SEC = 0x00;
        private static readonly REG_MIN = 0x01;
        private static readonly REG_HOUR = 0x02;
        private static readonly REG_WEEKDAY = 0x03;
        private static readonly REG_DAY = 0x04;
        private static readonly REG_MONTH = 0x05;
        private static readonly REG_YEAR = 0x06;
        private static readonly REG_ALMIN = 0x07;
        private static readonly REG_ALHOUR = 0x08;
        private static readonly REG_ALWDAY = 0x09;
        private static readonly REG_STATUS = 0x0E;
        private static readonly REG_CTRL1 = 0x0F;
        private static readonly REG_CTRL2 = 0x10;
        private static readonly REG_CIM = 0x12;
        private static readonly REG_ECTRL = 0x13;
        private static readonly REG_SECTS = 0x15;
        private static readonly REG_DAYTS = 0x18;
        private static readonly REG_UNIX = 0x1B;
        private static readonly REG_ID = 0x28;
        private static readonly REG_EE_CLKOUT = 0x35;
        private static readonly REG_EE_BACKUP = 0x37;

        private static readonly I2C_ADDRESS = 0x52;  // 82 in decimal

        constructor(address: number = 0x52) {
            this.addr = address;
            this.eventId = 6000 + address;
            this.pollingStarted = false;

            // Initialize date/time
            this.year = 2024;
            this.month = 1;
            this.day = 1;
            this.weekday = Weekday.Monday;
            this.hour = 0;
            this.minute = 0;
            this.second = 0;
            this.ampm = AMPM.AM;
            this.timeFormat = TimeFormat.Hour24;

            // Initialize alarm
            this.alarmHours = 0;
            this.alarmMinutes = 0;
            this.alarmWeekdayDate = 0;
            this.alarmAMPM = AMPM.AM;

            // Initialize RTC
            this.initialize();
        }

        /**
         * Initialize the RTC
         */
        private initialize(): void {
            try {
                // Read device ID to verify communication
                let id = picodevUnified.readRegisterByte(this.addr, RV3028.REG_ID);

                // Configure battery switchover and trickle charger
                this.setBatterySwitchover(true);
                this.configTrickleCharger();
                this.setTrickleCharger(true);

                // Read current time
                this.getDateTime();
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * BCD decode (Binary Coded Decimal)
         */
        private bcdDecode(val: number): number {
            return ((val >> 4) * 10) + (val & 0x0F);
        }

        /**
         * BCD encode
         */
        private bcdEncode(val: number): number {
            return ((Math.floor(val / 10) << 4) | (val % 10));
        }

        /**
         * Set a bit in a value
         */
        private setBit(x: number, n: number): number {
            return x | (1 << n);
        }

        /**
         * Clear a bit in a value
         */
        private clearBit(x: number, n: number): number {
            return x & ~(1 << n);
        }

        /**
         * Write a bit in a value
         */
        private writeBit(x: number, n: number, b: boolean): number {
            return b ? this.setBit(x, n) : this.clearBit(x, n);
        }

        /**
         * Read a bit from a value
         */
        private readBit(x: number, n: number): boolean {
            return ((x & (1 << n)) !== 0);
        }

        /**
         * Write a 2-bit value (crumb)
         */
        private writeCrumb(x: number, n: number, c: number): number {
            x = this.writeBit(x, n, this.readBit(c, 0));
            x = this.writeBit(x, n + 1, this.readBit(c, 1));
            return x;
        }

        /**
         * Write a 3-bit value (tribit)
         */
        private writeTribit(x: number, n: number, c: number): number {
            x = this.writeBit(x, n, this.readBit(c, 0));
            x = this.writeBit(x, n + 1, this.readBit(c, 1));
            x = this.writeBit(x, n + 2, this.readBit(c, 2));
            return x;
        }

        /**
         * Read multiple bytes from a register
         */
        private readBytes(reg: number, length: number): number[] {
            let buffer = picodevUnified.readRegister(this.addr, reg, length);
            let result: number[] = [];
            for (let i = 0; i < buffer.length; i++) {
                result.push(buffer[i]);
            }
            return result;
        }

        /**
         * Write multiple bytes to a register
         */
        private writeBytes(reg: number, data: number[]): void {
            let buffer = pins.createBuffer(data.length);
            for (let i = 0; i < data.length; i++) {
                buffer[i] = data[i];
            }
            picodevUnified.writeRegister(this.addr, reg, buffer);
        }

        /**
         * Configure battery switchover
         */
        private setBatterySwitchover(state: boolean): void {
            try {
                let tmp = picodevUnified.readRegisterByte(this.addr, RV3028.REG_EE_BACKUP);
                tmp = this.writeCrumb(tmp, 2, state ? 1 : 0);
                let buf = pins.createBuffer(1);
                buf[0] = tmp;
                picodevUnified.writeRegister(this.addr, RV3028.REG_EE_BACKUP, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Enable/disable trickle charger
         */
        private setTrickleCharger(state: boolean): void {
            try {
                let tmp = picodevUnified.readRegisterByte(this.addr, RV3028.REG_EE_BACKUP);
                tmp = this.writeBit(tmp, 5, state);
                let buf = pins.createBuffer(1);
                buf[0] = tmp;
                picodevUnified.writeRegister(this.addr, RV3028.REG_EE_BACKUP, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Configure trickle charger resistance
         */
        private configTrickleCharger(): void {
            try {
                let tmp = picodevUnified.readRegisterByte(this.addr, RV3028.REG_EE_BACKUP);
                tmp = this.setBit(tmp, 7);
                tmp = this.writeCrumb(tmp, 0, 0);  // 3k default
                let buf = pins.createBuffer(1);
                buf[0] = tmp;
                picodevUnified.writeRegister(this.addr, RV3028.REG_EE_BACKUP, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Get current date and time from RTC
         */
        public getDateTime(): void {
            try {
                let data = this.readBytes(RV3028.REG_SEC, 7);

                this.second = this.bcdDecode(data[0]);
                this.minute = this.bcdDecode(data[1]);
                this.weekday = data[3] as Weekday;
                this.day = this.bcdDecode(data[4]);
                this.month = this.bcdDecode(data[5]);
                this.year = this.bcdDecode(data[6]);

                // Check time format
                let ctrl2 = picodevUnified.readRegisterByte(this.addr, RV3028.REG_CTRL2);
                let is12Hour = this.readBit(ctrl2, 1);

                if (is12Hour) {
                    this.timeFormat = TimeFormat.Hour12;
                    if (this.readBit(data[2], 5)) {
                        this.ampm = AMPM.PM;
                        let hrByte = this.clearBit(data[2], 5);
                        this.hour = this.bcdDecode(hrByte);
                    } else {
                        this.ampm = AMPM.AM;
                        this.hour = this.bcdDecode(data[2]);
                    }
                } else {
                    this.timeFormat = TimeFormat.Hour24;
                    this.hour = this.bcdDecode(data[2]);
                }
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Set date and time on RTC
         */
        public setDateTime(): void {
            try {
                let year2Digits = this.year;
                if (year2Digits > 100) {
                    year2Digits -= 2000;
                }

                let ctrl2 = picodevUnified.readRegisterByte(this.addr, RV3028.REG_CTRL2);
                let hrs: number;

                if (this.timeFormat === TimeFormat.Hour24) {
                    ctrl2 = this.writeBit(ctrl2, 1, false);
                    hrs = this.bcdEncode(this.hour);
                } else {
                    ctrl2 = this.writeBit(ctrl2, 1, true);
                    hrs = this.bcdEncode(this.hour);
                    if (this.ampm === AMPM.PM) {
                        hrs = this.setBit(hrs, 5);
                    } else {
                        hrs = this.clearBit(hrs, 5);
                    }
                }

                // Write CTRL2
                let buf = pins.createBuffer(1);
                buf[0] = ctrl2;
                picodevUnified.writeRegister(this.addr, RV3028.REG_CTRL2, buf);

                // Write date/time registers
                this.writeBytes(RV3028.REG_SEC, [
                    this.bcdEncode(this.second),
                    this.bcdEncode(this.minute),
                    hrs,
                    this.weekday,
                    this.bcdEncode(this.day),
                    this.bcdEncode(this.month),
                    this.bcdEncode(year2Digits)
                ]);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Setup alarm
         */
        public setupAlarm(minutes?: number, hours?: number, weekday?: number, date?: number, interrupt: boolean = true): void {
            try {
                let AE_M = 1;  // Alarm enable bits (1 = disabled)
                let AE_H = 1;
                let AE_WD = 1;
                let WADA = false;  // Weekday/Date select (false = weekday, true = date)

                // Configure weekday or date
                if (weekday !== undefined && weekday !== null) {
                    WADA = false;
                    this.alarmWeekdayDate = weekday;
                    AE_WD = 0;
                }
                if (date !== undefined && date !== null) {
                    WADA = true;
                    this.alarmWeekdayDate = date;
                    AE_WD = 0;
                }

                // Set WADA bit in CTRL1
                let ctrl1 = picodevUnified.readRegisterByte(this.addr, RV3028.REG_CTRL1);
                ctrl1 = this.writeBit(ctrl1, 5, WADA);
                let buf1 = pins.createBuffer(1);
                buf1[0] = ctrl1;
                picodevUnified.writeRegister(this.addr, RV3028.REG_CTRL1, buf1);

                // Configure hours
                if (hours !== undefined && hours !== null) {
                    this.alarmHours = hours;
                    AE_H = 0;
                }

                let h = this.bcdEncode(this.alarmHours);
                if (this.timeFormat === TimeFormat.Hour12) {
                    h = this.writeBit(h, 5, this.alarmAMPM === AMPM.PM);
                }

                // Configure minutes
                if (minutes !== undefined && minutes !== null) {
                    this.alarmMinutes = minutes;
                    AE_M = 0;
                }

                let m = (AE_M << 7) | this.bcdEncode(this.alarmMinutes);
                h = (AE_H << 7) | h;
                let d = (AE_WD << 7) | this.bcdEncode(this.alarmWeekdayDate);

                // Write alarm registers
                this.writeBytes(RV3028.REG_ALMIN, [m, h, d]);

                // Enable/disable alarm interrupt
                let ctrl2 = picodevUnified.readRegisterByte(this.addr, RV3028.REG_CTRL2);
                ctrl2 = this.writeBit(ctrl2, 3, interrupt);
                let buf2 = pins.createBuffer(1);
                buf2[0] = ctrl2;
                picodevUnified.writeRegister(this.addr, RV3028.REG_CTRL2, buf2);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Disable alarm
         */
        public disableAlarm(): void {
            this.setupAlarm(undefined, undefined, undefined, undefined, false);
            this.checkAlarm();  // Clear flag if set
        }

        /**
         * Check if alarm was triggered
         */
        public checkAlarm(): boolean {
            try {
                let status = picodevUnified.readRegisterByte(this.addr, RV3028.REG_STATUS);
                if (this.readBit(status, 2)) {
                    // Clear alarm flag
                    status = this.writeBit(status, 2, false);
                    let buf = pins.createBuffer(1);
                    buf[0] = status;
                    picodevUnified.writeRegister(this.addr, RV3028.REG_STATUS, buf);
                    return true;
                }
                return false;
            } catch (e) {
                return false;
            }
        }

        /**
         * Get formatted timestamp string
         */
        public getTimestamp(): string {
            this.getDateTime();

            let yearStr = (this.year + 2000).toString();
            let monthStr = this.month < 10 ? "0" + this.month : this.month.toString();
            let dayStr = this.day < 10 ? "0" + this.day : this.day.toString();
            let hourStr = this.hour < 10 ? "0" + this.hour : this.hour.toString();
            let minStr = this.minute < 10 ? "0" + this.minute : this.minute.toString();
            let secStr = this.second < 10 ? "0" + this.second : this.second.toString();

            let timestamp = yearStr + "-" + monthStr + "-" + dayStr + " " +
                hourStr + ":" + minStr + ":" + secStr;

            if (this.timeFormat === TimeFormat.Hour12) {
                timestamp += this.ampm === AMPM.AM ? " AM" : " PM";
            }

            return timestamp;
        }

        /**
         * Start background polling for alarm events
         */
        public startEventPolling(): void {
            if (this.pollingStarted) {
                return;
            }
            this.pollingStarted = true;

            control.inBackground(() => {
                while (true) {
                    this.pollAlarm();
                    basic.pause(500);  // Check every 500ms
                }
            });
        }

        /**
         * Poll for alarm triggers
         */
        private pollAlarm(): void {
            try {
                if (this.checkAlarm()) {
                    // Raise alarm event
                    control.raiseEvent(this.eventId, 1);
                }
            } catch (e) {
                // Silently handle errors during polling
            }
        }

        /**
         * Get the event source ID
         */
        public getEventId(): number {
            return this.eventId;
        }

        /**
         * Get Unix timestamp
         */
        public getUnixTime(): number {
            try {
                let bytes = this.readBytes(RV3028.REG_UNIX, 4);
                return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
            } catch (e) {
                return 0;
            }
        }

        /**
         * Set Unix timestamp
         */
        public setUnixTime(time: number): void {
            try {
                this.writeBytes(RV3028.REG_UNIX, [
                    time & 0xFF,
                    (time >> 8) & 0xFF,
                    (time >> 16) & 0xFF,
                    (time >> 24) & 0xFF
                ]);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }

        /**
         * Clear all interrupt flags
         */
        public clearAllInterrupts(): void {
            try {
                let buf = pins.createBuffer(1);
                buf[0] = 0;
                picodevUnified.writeRegister(this.addr, RV3028.REG_STATUS, buf);
            } catch (e) {
                picodevUnified.logI2CError(this.addr);
            }
        }
    }

    // Internal storage for RTC instance (typically only one)
    let _rtc: RV3028 = null;

    /**
     * Get or create the RTC instance
     */
    function getRTC(): RV3028 {
        if (_rtc === null) {
            _rtc = new RV3028(0x52);
        }
        return _rtc;
    }

    /**
     * Set the current date on the RTC
     */
    //% blockId=rtc_set_date
    //% block="RTC set date year $year|month $month|day $day"
    //% year.min=2000 year.max=2099 year.defl=2024
    //% month.min=1 month.max=12 month.defl=1
    //% day.min=1 day.max=31 day.defl=1
    //% weight=100
    //% group="RV3028 Time"
    export function rtcSetDate(year: number, month: number, day: number): void {
        let rtc = getRTC();
        rtc.year = year;
        rtc.month = month;
        rtc.day = day;
        rtc.setDateTime();
    }

    /**
     * Set the current time on the RTC (24-hour format)
     */
    //% blockId=rtc_set_time_24
    //% block="RTC set time $hour|:$minute|:$second"
    //% hour.min=0 hour.max=23 hour.defl=12
    //% minute.min=0 minute.max=59 minute.defl=0
    //% second.min=0 second.max=59 second.defl=0
    //% weight=99
    //% group="RV3028 Time"
    export function rtcSetTime24(hour: number, minute: number, second: number): void {
        let rtc = getRTC();
        rtc.hour = hour;
        rtc.minute = minute;
        rtc.second = second;
        rtc.timeFormat = TimeFormat.Hour24;
        rtc.setDateTime();
    }

    /**
     * Set the current time on the RTC (12-hour format)
     */
    //% blockId=rtc_set_time_12
    //% block="RTC set time $hour|:$minute|:$second|$ampm"
    //% hour.min=1 hour.max=12 hour.defl=12
    //% minute.min=0 minute.max=59 minute.defl=0
    //% second.min=0 second.max=59 second.defl=0
    //% ampm.defl=AMPM.PM
    //% weight=98
    //% group="RV3028 Time"
    export function rtcSetTime12(hour: number, minute: number, second: number, ampm: AMPM): void {
        let rtc = getRTC();
        rtc.hour = hour;
        rtc.minute = minute;
        rtc.second = second;
        rtc.ampm = ampm;
        rtc.timeFormat = TimeFormat.Hour12;
        rtc.setDateTime();
    }

    /**
     * Set the day of the week on the RTC
     */
    //% blockId=rtc_set_weekday
    //% block="RTC set weekday $weekday"
    //% weekday.defl=Weekday.Monday
    //% weight=97
    //% group="RV3028 Time"
    export function rtcSetWeekday(weekday: Weekday): void {
        let rtc = getRTC();
        rtc.weekday = weekday;
        rtc.setDateTime();
    }

    /**
     * Get a date or time component from the RTC
     */
    //% blockId=rtc_get
    //% block="RTC $component"
    //% component.defl=DateTimeComponent.Hour
    //% weight=90
    //% group="RV3028 Time"
    export function rtcGet(component: DateTimeComponent): number {
        let rtc = getRTC();
        rtc.getDateTime();

        if (component === DateTimeComponent.Year) {
            return rtc.year + 2000;
        } else if (component === DateTimeComponent.Month) {
            return rtc.month;
        } else if (component === DateTimeComponent.Day) {
            return rtc.day;
        } else if (component === DateTimeComponent.Weekday) {
            return rtc.weekday;
        } else if (component === DateTimeComponent.Hour) {
            return rtc.hour;
        } else if (component === DateTimeComponent.Minute) {
            return rtc.minute;
        } else if (component === DateTimeComponent.Second) {
            return rtc.second;
        }
        return 0;
    }

    /**
     * Get a formatted timestamp string
     * Example: "2024-12-16 14:30:45"
     */
    //% blockId=rtc_get_timestamp
    //% block="RTC timestamp"
    //% weight=83
    //% group="RV3028 Time"
    export function rtcGetTimestamp(): string {
        let rtc = getRTC();
        return rtc.getTimestamp();
    }

    /**
     * Set an alarm to trigger at a specific time
     * Leave parameters empty to ignore that component
     */
    //% blockId=rtc_set_alarm
    //% block="RTC set alarm||minute $minute|hour $hour|weekday $weekday"
    //% minute.min=0 minute.max=59
    //% hour.min=0 hour.max=23
    //% weight=80
    //% group="RV3028 Time"
    //% expandableArgumentMode="toggle"
    export function rtcSetAlarm(minute?: number, hour?: number, weekday?: Weekday): void {
        let rtc = getRTC();
        rtc.setupAlarm(minute, hour, weekday, undefined, true);
        rtc.startEventPolling();
    }

    /**
     * Set an alarm to trigger on a specific date
     */
    //% blockId=rtc_set_alarm_date
    //% block="RTC set alarm||minute $minute|hour $hour|date $date"
    //% minute.min=0 minute.max=59
    //% hour.min=0 hour.max=23
    //% date.min=1 date.max=31
    //% weight=79
    //% group="RV3028 Time"
    //% expandableArgumentMode="toggle"
    export function rtcSetAlarmDate(minute?: number, hour?: number, date?: number): void {
        let rtc = getRTC();
        rtc.setupAlarm(minute, hour, undefined, date, true);
        rtc.startEventPolling();
    }

    /**
     * Disable the RTC alarm
     */
    //% blockId=rtc_disable_alarm
    //% block="RTC disable alarm"
    //% weight=78
    //% group="RV3028 Time"
    export function rtcDisableAlarm(): void {
        let rtc = getRTC();
        rtc.disableAlarm();
    }

    /**
     * Run code when the RTC alarm triggers
     */
    //% blockId=rtc_on_alarm
    //% block="on RTC alarm"
    //% weight=77
    //% group="RB3028 Time"
    export function onRTCAlarm(handler: () => void): void {
        let rtc = getRTC();
        rtc.startEventPolling();
        control.onEvent(rtc.getEventId(), 1, handler);
    }

    /**
     * Get Unix timestamp (seconds since Jan 1, 1970)
     */
    //% blockId=rtc_get_unix_time
    //% block="RTC Unix time"
    //% weight=70
    //% group="RV3028 Time"
    //% advanced=true
    export function rtcGetUnixTime(): number {
        let rtc = getRTC();
        return rtc.getUnixTime();
    }
}
