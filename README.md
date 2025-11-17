# PiicoDev Extension for MakeCode micro:bit

![PiicoDev Logo](https://core-electronics.com.au/media/wysiwyg/logo/Piicodev_MasterLogo_Whitebackground_RGB_150ppi.png)

This extension provides block-based programming support for the Core Electronics PiicoDev sensor ecosystem on the BBC micro:bit V2.

## Supported Sensors

### 🌡️ BME280 - Environment Sensor
Temperature, humidity, and atmospheric pressure sensor with altitude calculation.

### 📏 VL53L1X - Distance Sensor  
Time-of-flight laser ranging sensor (4mm to 4000mm).

### 🎨 VEML6040 - Color Sensor
RGB and white light sensor with color classification and ambient light detection.

### 👆 CAP1203 - Touch Sensor
3-pad capacitive touch sensor with adjustable sensitivity.

### 🔊 Buzzer - Sound Module
Programmable buzzer with tone generation and volume control.

### 💡 RGB - LED Module
3-pixel programmable RGB LED strip with color wheel effects.

## Installation

1. Open your micro:bit project in [MakeCode](https://makecode.microbit.org)
2. Click on **Extensions** under the gearwheel menu
3. Search for **piicodev** or **makecode-piicodev**
4. Click on the extension to add it to your project

Or add this repository directly:
```
https://github.com/zarify/makecode-piicodev
```

## Quick Start Examples

### Read Temperature
```blocks
let bme280 = piicodev.createBME280()
basic.forever(function () {
    basic.showNumber(bme280.readTemperature())
    basic.pause(1000)
})
```

### Measure Distance
```blocks
let distanceSensor = piicodev.createVL53L1X()
basic.forever(function () {
    basic.showNumber(distanceSensor.readDistance())
    basic.pause(100)
})
```

### Detect Touch
```blocks
let touchSensor = piicodev.createCAP1203(TouchMode.Multi, 3)
basic.forever(function () {
    if (touchSensor.isPadPressed(1)) {
        basic.showIcon(IconNames.Happy)
    } else {
        basic.clearScreen()
    }
})
```

### Play Tones
```blocks
let buzzer = piicodev.createBuzzer()
buzzer.playTone(440, 1000)
basic.pause(1100)
buzzer.playTone(880, 500)
```

### Control RGB LEDs
```blocks
let rgbLED = piicodev.createRGB()
rgbLED.setPixelColor(0, RGBColor.Red)
rgbLED.setPixelColor(1, RGBColor.Green)
rgbLED.setPixelColor(2, RGBColor.Blue)
rgbLED.show()
```

### Classify Colors
```blocks
let colorSensor = piicodev.createVEML6040()
basic.forever(function () {
    basic.showString(colorSensor.classifyColor())
    basic.pause(500)
})
```

## Features

- ✅ **Complete Feature Parity** - All MicroPython library functionality
- 🎯 **Beginner Friendly** - Simple blocks for basic operations
- ⚙️ **Advanced Options** - Configuration available in Advanced section
- 🎨 **Color Coded** - Each sensor category has distinct colors
- 📖 **Well Documented** - Tooltips and examples for every block
- 🔌 **No Configuration** - Uses micro:bit I2C defaults automatically

## Sensor Details

### BME280 Environment Sensor
**I2C Address:** 0x77 (119)

**Basic Blocks:**
- Read temperature in °C
- Read humidity in %
- Read pressure in hPa
- Calculate altitude

**Advanced Blocks:**
- Configure oversampling modes
- Set IIR filter
- High-precision pressure reading

### VL53L1X Distance Sensor
**I2C Address:** 0x29 (41)

**Basic Blocks:**
- Read distance in mm
- Get measurement status

**Advanced Blocks:**
- Reset sensor
- Change I2C address
- Configure timing budget
- Set distance mode

### VEML6040 Color Sensor
**I2C Address:** 0x10 (16)

**Basic Blocks:**
- Read red, green, blue, white light
- Classify color (returns color name)
- Read hue, saturation, brightness

**Advanced Blocks:**
- Read ambient light in lux
- Read color temperature in Kelvin
- Set brightness threshold

### CAP1203 Touch Sensor
**I2C Address:** 0x28 (40)

**Basic Blocks:**
- Check if pad is pressed
- Read all pads
- Get raw touch values

**Advanced Blocks:**
- Set sensitivity (0-7)
- Configure touch mode (single/multi)
- Clear interrupt

### Buzzer Module
**I2C Address:** 0x5C (92)

**Basic Blocks:**
- Play tone with frequency and duration
- Stop tone
- Set volume

**Advanced Blocks:**
- Change I2C address
- Read firmware version
- Control power LED

### RGB LED Module
**I2C Address:** 0x08 (8)

**Basic Blocks:**
- Set pixel by RGB values
- Set pixel by color name
- Set all pixels
- Set brightness
- Show changes
- Clear all

**Advanced Blocks:**
- Use color wheel
- Change I2C address
- Read firmware version
- Control power LED

## Troubleshooting

### Sensor Not Detected
- Check that sensor is connected to the micro:bit I2C pins
- Verify PiicoDev cable is fully inserted
- Ensure micro:bit is powered adequately (use USB or 3xAAA battery pack)
- Try different I2C address if sensor is configurable

### Unexpected Readings
- Allow sensor to warm up (especially BME280)
- Check for interference near sensors
- Verify sensor is not covered or obstructed
- Ensure proper timing between reads

### Extension Not Loading
- Clear browser cache and reload MakeCode
- Check internet connection
- Try using the GitHub URL directly

## Hardware Requirements

- BBC micro:bit V2 (required)
- PiicoDev adapter for micro:bit
- PiicoDev sensors (any combination)
- PiicoDev cables

**Note:** This extension is designed specifically for micro:bit V2 and may not work with V1 due to memory constraints.

## License

MIT License - Based on the MIT-licensed PiicoDev libraries from [Core Electronics](https://core-electronics.com.au).

## Credits

Original MicroPython libraries by Core Electronics.  
MakeCode extension by zarify.

## Support

- [Core Electronics PiicoDev Documentation](https://core-electronics.com.au/tutorials/piicodev-quickstart-guide-for-microbit.html)
- [Report Issues](https://github.com/zarify/makecode-piicodev/issues)
- [MakeCode Forums](https://forum.makecode.com)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Made with ❤️ for the maker community**

## Metadata (for PXT)
for PXT/microbit

<script src="https://makecode.com/gh-pages-embed.js"></script>
<script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
