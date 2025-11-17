// Test scenarios for PiicoDev extension
// These tests verify basic functionality of each sensor

// Test BME280 Environment Sensor
function testBME280() {
    let sensor = piicodev.createBME280()
    basic.showString("BME280")

    // Test temperature reading
    let temp = sensor.readTemperature()
    basic.showNumber(temp)
    basic.pause(1000)

    // Test humidity reading
    let humidity = sensor.readHumidity()
    basic.showNumber(humidity)
    basic.pause(1000)

    // Test pressure reading
    let pressure = sensor.readPressure()
    basic.showNumber(pressure)
    basic.pause(1000)
}

// Test VL53L1X Distance Sensor
function testVL53L1X() {
    let sensor = piicodev.createVL53L1X()
    basic.showString("VL53L1X")

    // Test distance reading
    for (let i = 0; i < 10; i++) {
        let distance = sensor.readDistance()
        basic.showNumber(distance)
        basic.pause(100)
    }
}

// Test VEML6040 Color Sensor
function testVEML6040() {
    let sensor = piicodev.createVEML6040()
    basic.showString("VEML6040")

    // Test color classification
    let color = sensor.classifyColor()
    basic.showString(color)
    basic.pause(1000)

    // Test RGB readings
    let red = sensor.readRed()
    let green = sensor.readGreen()
    let blue = sensor.readBlue()
    basic.showNumber(red)
    basic.pause(500)
}

// Test CAP1203 Touch Sensor
function testCAP1203() {
    let sensor = piicodev.createCAP1203(TouchMode.Multi, 3)
    basic.showString("CAP1203")

    // Test touch detection
    basic.forever(function () {
        if (sensor.isPadPressed(1)) {
            basic.showNumber(1)
        } else if (sensor.isPadPressed(2)) {
            basic.showNumber(2)
        } else if (sensor.isPadPressed(3)) {
            basic.showNumber(3)
        } else {
            basic.clearScreen()
        }
        basic.pause(100)
    })
}

// Test Buzzer
function testBuzzer() {
    let buzzer = piicodev.createBuzzer()
    basic.showString("BUZZER")

    // Play musical scale
    buzzer.playTone(262, 250) // C
    basic.pause(300)
    buzzer.playTone(294, 250) // D
    basic.pause(300)
    buzzer.playTone(330, 250) // E
    basic.pause(300)
    buzzer.playTone(349, 250) // F
    basic.pause(300)
    buzzer.playTone(392, 250) // G
    basic.pause(300)
}

// Test RGB LED
function testRGB() {
    let rgb = piicodev.createRGB()
    basic.showString("RGB")

    // Test basic colors
    rgb.setPixelColor(0, RGBColor.Red)
    rgb.setPixelColor(1, RGBColor.Green)
    rgb.setPixelColor(2, RGBColor.Blue)
    rgb.show()
    basic.pause(1000)

    // Test color wheel
    for (let i = 0; i < 100; i++) {
        rgb.setPixelColorWheel(0, i / 100)
        rgb.setPixelColorWheel(1, (i + 33) / 100)
        rgb.setPixelColorWheel(2, (i + 66) / 100)
        rgb.show()
        basic.pause(20)
    }

    rgb.clear()
}

// Run all tests (uncomment the test you want to run)
// testBME280()
// testVL53L1X()
// testVEML6040()
// testCAP1203()
// testBuzzer()
// testRGB()
