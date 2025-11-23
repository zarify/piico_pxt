// Test scenarios for PiicoDev extension

// LIS3DH Accelerometer Tests
basic.showString("LIS3DH")

// Test 1: Read acceleration values
let x = piicodev.lis3dhReadX()
let y = piicodev.lis3dhReadY()
let z = piicodev.lis3dhReadZ()
serial.writeLine("Accel X: " + x)
serial.writeLine("Accel Y: " + y)
serial.writeLine("Accel Z: " + z)

// Test 2: Read tilt angles
let angleX = piicodev.lis3dhAngleX()
let angleY = piicodev.lis3dhAngleY()
let angleZ = piicodev.lis3dhAngleZ()
serial.writeLine("Angle X: " + angleX)
serial.writeLine("Angle Y: " + angleY)
serial.writeLine("Angle Z: " + angleZ)

// Test 3: Configure range
piicodev.lis3dhSetRange(piicodev.AccelRange.Range4G)
serial.writeLine("Range set to 4G")

// Test 4: Configure data rate
piicodev.lis3dhSetRate(piicodev.DataRate.Rate200Hz)
serial.writeLine("Rate set to 200Hz")

// Test 5: Configure tap detection
piicodev.lis3dhSetTap(piicodev.TapMode.SingleTap)
serial.writeLine("Single tap enabled")

// Test 6: Check data ready
if (piicodev.lis3dhDataReady()) {
    serial.writeLine("Data ready")
}

// Test 7: Shake detection
if (piicodev.lis3dhShake()) {
    serial.writeLine("Shake detected")
}

// Test 8: Tap detection
if (piicodev.lis3dhTapped()) {
    serial.writeLine("Tap detected")
}

basic.showIcon(IconNames.Yes)