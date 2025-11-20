// Test scenarios for PiicoDev extension
// These tests verify basic functionality of each sensor

// Test BME280 Environment Sensor
function testBME280() {
    piicodev.createBME280(0x77)
    basic.showString("BME280")

    // Test temperature reading
    let temp = piicodev.bme280ReadTemperature()
    basic.showNumber(Math.round(temp))
    basic.pause(1000)

    // Test humidity reading
    let humidity = piicodev.bme280ReadHumidity()
    basic.showNumber(Math.round(humidity))
    basic.pause(1000)

    // Test pressure reading
    let pressure = piicodev.bme280ReadPressure()
    basic.showNumber(Math.round(pressure))
    basic.pause(1000)

    // Test altitude
    let altitude = piicodev.bme280Altitude(1013.25)
    basic.showNumber(Math.round(altitude))
    basic.pause(1000)
}

// Test VL53L1X Distance Sensor
function testVL53L1X() {
    piicodev.createVL53L1X(0x29)
    basic.showString("VL53L1X")

    // Test distance reading
    for (let i = 0; i < 10; i++) {
        let distance = piicodev.vl53l1xReadDistance()
        basic.showNumber(distance)
        basic.pause(100)
    }
}

// Test VEML6040 Color Sensor
function testVEML6040() {
    piicodev.createVEML6040(0x10)
    basic.showString("VEML6040")

    // Test color classification
    let color = piicodev.veml6040ClassifyColor()
    basic.showString(color)
    basic.pause(1000)

    // Test RGB readings
    let red = piicodev.veml6040ReadRed()
    let green = piicodev.veml6040ReadGreen()
    let blue = piicodev.veml6040ReadBlue()
    basic.showNumber(red)
    basic.pause(500)
    basic.showNumber(green)
    basic.pause(500)
    basic.showNumber(blue)
    basic.pause(500)

    // Test HSV values
    let hue = piicodev.veml6040GetHue()
    let sat = piicodev.veml6040GetSaturation()
    let brightness = piicodev.veml6040GetBrightness()
    basic.showNumber(hue)
    basic.pause(500)
}

// Test CAP1203 Touch Sensor
function testCAP1203() {
    piicodev.createCAP1203(piicodev.TouchMode.Multi, 3, 0x28)
    basic.showString("CAP1203")

    // Test touch detection
    basic.forever(function () {
        if (piicodev.cap1203IsPadPressed(1)) {
            basic.showNumber(1)
        } else if (piicodev.cap1203IsPadPressed(2)) {
            basic.showNumber(2)
        } else if (piicodev.cap1203IsPadPressed(3)) {
            basic.showNumber(3)
        } else {
            basic.clearScreen()
        }
        basic.pause(100)
    })
}

// Test Buzzer
function testBuzzer() {
    piicodev.createBuzzer(0x5C)
    basic.showString("BUZZER")

    // Play musical scale
    piicodev.playTone(262, 250) // C
    basic.pause(300)
    piicodev.playTone(294, 250) // D
    basic.pause(300)
    piicodev.playTone(330, 250) // E
    basic.pause(300)
    piicodev.playTone(349, 250) // F
    basic.pause(300)
    piicodev.playTone(392, 250) // G
    basic.pause(300)
    piicodev.stopTone()
}

// Test RGB LED
function testRGB() {
    piicodev.createRGB(0x08)
    basic.showString("RGB")

    // Test basic colors
    piicodev.setPixelColor(0, piicodev.RGBColor.Red)
    piicodev.setPixelColor(1, piicodev.RGBColor.Green)
    piicodev.setPixelColor(2, piicodev.RGBColor.Blue)
    piicodev.rgbShow()
    basic.pause(1000)

    // Test color wheel
    for (let i = 0; i < 100; i++) {
        piicodev.setPixelColorWheel(0, i / 100)
        piicodev.setPixelColorWheel(1, (i + 33) / 100)
        piicodev.setPixelColorWheel(2, (i + 66) / 100)
        piicodev.rgbShow()
        basic.pause(20)
    }

    piicodev.rgbClear()
}

// Test TMP117 Temperature Sensor
function testTMP117() {
    piicodev.createTMP117(0x48)
    basic.showString("TMP117")

    // Test temperature readings
    for (let i = 0; i < 5; i++) {
        let tempC = piicodev.readTMP117TempC()
        basic.showNumber(Math.round(tempC))
        basic.pause(500)
    }
}

// Test Switch Button
function testSwitch() {
    piicodev.createSwitch(0x42)
    basic.showString("SWITCH")

    // Test button detection
    basic.forever(function () {
        if (piicodev.switchIsPressed()) {
            basic.showString("P")
        } else {
            basic.clearScreen()
        }
        basic.pause(100)
    })
}

// Test Potentiometer
function testPotentiometer() {
    piicodev.createPotentiometer(0x35, 0, 100)
    basic.showString("POT")

    // Test potentiometer reading
    for (let i = 0; i < 10; i++) {
        let value = piicodev.readPotScaled()
        basic.showNumber(Math.round(value))
        basic.pause(300)
    }
}

// Test LIS3DH Accelerometer
function testLIS3DH() {
    piicodev.createLIS3DH(0x18, piicodev.AccelRange.Range2G, piicodev.SampleRate.Rate400Hz)
    basic.showString("LIS3DH")

    // Test acceleration reading
    for (let i = 0; i < 10; i++) {
        let x = piicodev.readLIS3DHAccelX()
        basic.showNumber(Math.round(x))
        basic.pause(300)
    }
}

// Test MMC5603 Magnetometer
function testMMC5603() {
    piicodev.createMMC5603(0x30)
    basic.showString("MMC5603")

    // Test heading
    for (let i = 0; i < 10; i++) {
        let heading = piicodev.getMMC5603Heading()
        basic.showNumber(Math.round(heading))
        basic.pause(500)
    }
}

// Test ENS160 Air Quality
function testENS160() {
    piicodev.createENS160(0x53)
    basic.showString("ENS160")

    // Test AQI reading
    for (let i = 0; i < 5; i++) {
        let aqi = piicodev.readENS160AQI()
        let rating = piicodev.getENS160AQIRating()
        basic.showNumber(aqi)
        basic.pause(500)
        basic.showString(rating)
        basic.pause(500)
    }
}

// Test VEML6030 Ambient Light
function testVEML6030() {
    piicodev.createVEML6030(0x10)
    basic.showString("VEML6030")

    // Test light measurement
    for (let i = 0; i < 10; i++) {
        let lux = piicodev.readVEML6030Lux()
        basic.showNumber(Math.round(lux))
        basic.pause(300)
    }
}

// Test Servo
function testServo() {
    basic.showString("SERVO")

    // Test servo on AnalogPin P0
    piicodev.initServo(AnalogPin.P0, 0, 180)

    // Sweep servo
    for (let angle = 0; angle <= 180; angle += 10) {
        piicodev.servoSetAngle(AnalogPin.P0, angle)
        basic.showNumber(angle)
        basic.pause(100)
    }

    piicodev.servoRelease(AnalogPin.P0)
}

// Test RFID
function testRFID() {
    piicodev.createRFID(0x2C)
    basic.showString("RFID")

    // Test tag reading
    basic.forever(function () {
        if (piicodev.rfidIsTagPresent()) {
            let tagID = piicodev.rfidReadTagID()
            basic.showString(tagID)
            basic.pause(1000)
        } else {
            basic.clearScreen()
        }
        basic.pause(100)
    })
}

// Test Ultrasonic
function testUltrasonic() {
    piicodev.createUltrasonic(0x35)
    basic.showString("ULTRASONIC")

    // Test distance reading
    for (let i = 0; i < 10; i++) {
        let distance = piicodev.readUltrasonicCM()
        basic.showNumber(distance)
        basic.pause(300)
    }
}

// Test Transceiver
function testTransceiver() {
    piicodev.createTransceiver(0x1A, 1, 0)
    basic.showString("XCEIVER")

    basic.forever(function () {
        if (piicodev.transceiverMessageAvailable()) {
            let message = piicodev.transceiverReceiveMessage()
            basic.showString(message)
            basic.pause(1000)
        }
        basic.pause(100)
    })
}

// Run all tests (uncomment the test you want to run)
// testBME280()
// testVL53L1X()
// testVEML6040()
// testCAP1203()
// testBuzzer()
// testRGB()
// testTMP117()
// testSwitch()
// testPotentiometer()
// testLIS3DH()
// testMMC5603()
// testENS160()
// testVEML6030()
// testServo()
// testRFID()
// testUltrasonic()
// testTransceiver()
