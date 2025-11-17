# Getting Started - Testing the Extension

This guide explains how to import and test the makecode-piicodev extension in the MakeCode editor.

## Method 1: Import from GitHub

### Prerequisites
1. Create a GitHub repository at `https://github.com/zarify/makecode-piicodev`
2. Push all the files from this directory to the repository

### Steps to Test

1. **Push to GitHub:**
   ```powershell
   cd d:\Code\piico_pxt
   git init
   git add .
   git commit -m "Phase 1: Initial extension structure and sensor stubs"
   git remote add origin https://github.com/zarify/makecode-piicodev.git
   git push -u origin main
   ```

2. **Open MakeCode:**
   - Navigate to [https://makecode.microbit.org](https://makecode.microbit.org)
   - Click "New Project"

3. **Add Extension:**
   - Click the gear icon (⚙️) in the top right
   - Select "Extensions"
   - Paste the GitHub URL: `https://github.com/zarify/makecode-piicodev`
   - Click "Import"

4. **Verify Blocks:**
   - Look for "PiicoDev" category in the toolbox
   - Check that all sensor subcategories are present
   - Verify blocks render correctly

## Method 2: Local Testing (Advanced)

### Prerequisites
- Node.js 16+ installed
- PXT command line tools

### Setup PXT CLI

```powershell
npm install -g pxt
cd d:\Code\piico_pxt
pxt target microbit
pxt install
```

### Run Local Server

```powershell
pxt serve
```

This will:
1. Start a local web server
2. Open your browser to the MakeCode editor
3. Your extension will be automatically loaded
4. Changes to TypeScript files will auto-reload

## What to Check

### Block Categories
Verify these categories appear in the toolbox:
- ✅ PiicoDev (main category)
  - BME280 blocks (blue)
  - VL53L1X blocks (brown)
  - VEML6040 blocks (pink)
  - CAP1203 blocks (orange)
  - Buzzer blocks (purple)
  - RGB blocks (lime green)

### Basic Blocks (Should be visible)
- [ ] "create BME280 sensor"
- [ ] "create VL53L1X distance sensor"
- [ ] "create VEML6040 color sensor"
- [ ] "create CAP1203 touch sensor"
- [ ] "create PiicoDev Buzzer"
- [ ] "create PiicoDev RGB"

### Advanced Blocks (Under "Advanced" or "...More")
- [ ] Configuration blocks for each sensor
- [ ] Address change blocks
- [ ] Advanced reading functions

### Block Parameters
- [ ] Dropdowns show enum values correctly
- [ ] Number inputs have appropriate min/max
- [ ] Default values appear as expected
- [ ] Expandable parameters work (|| syntax)

### Variable Auto-Creation
When you drag a "create..." block:
- [ ] A variable is automatically created
- [ ] Variable name matches the sensor type
- [ ] Variable can be used with instance methods

## Testing the Test Programs

1. **Open the Blocks Editor**
2. **Add Extension** (if not already added)
3. **Copy a test function from test.ts**
4. **Convert to blocks manually or use JavaScript mode**
5. **Verify:**
   - Blocks connect properly
   - No type errors
   - Parameters work as expected

## Example Test: RGB LEDs

```blocks
let rgbLED = piicodev.createRGB()
basic.forever(function () {
    rgbLED.setPixelColor(0, RGBColor.Red)
    rgbLED.setPixelColor(1, RGBColor.Green)
    rgbLED.setPixelColor(2, RGBColor.Blue)
    rgbLED.show()
    basic.pause(1000)
    rgbLED.clear()
    basic.pause(1000)
})
```

## Example Test: Touch Sensor

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

## Common Issues

### Extension Not Loading
**Problem:** "Extension not found" error  
**Solution:** 
- Verify GitHub repository is public
- Check that `pxt.json` is in the root directory
- Ensure all files listed in `pxt.json` exist

### Blocks Not Appearing
**Problem:** No PiicoDev category in toolbox  
**Solution:**
- Check browser console for errors
- Verify `main.ts` has the `//% weight=100 color=#00A4CC icon="\uf2db" block="PiicoDev"` annotation
- Clear browser cache and reload

### Compilation Errors
**Problem:** TypeScript errors in the editor  
**Solution:**
- Expected during Phase 1 (stubs not fully implemented)
- Errors about `pins`, `basic`, etc. will resolve in MakeCode environment
- Check that all files are included in `pxt.json`

### Blocks Look Wrong
**Problem:** Block text doesn't match specification  
**Solution:**
- Check `//% block` annotations
- Verify parameter names match `$paramName` syntax
- Ensure enums have `//% block` for each value

## Next Steps After Verification

Once you've verified the structure works:

1. **Phase 2: Implement RGB and Buzzer**
   - Complete the TODO sections in `picodev-rgb.ts`
   - Complete the TODO sections in `picodev-buzzer.ts`
   - Test with actual hardware

2. **Create Example Projects**
   - Rainbow LED animation
   - Musical note player
   - Touch-activated lights

3. **Update Documentation**
   - Add screenshots of blocks
   - Create video tutorials
   - Write lesson plans

## Hardware Connection Guide

When you're ready to test with actual hardware:

### Wiring
```
micro:bit V2
├── 3V → PiicoDev Red (Power)
├── GND → PiicoDev Black (Ground)
├── Pin 19 (SCL) → PiicoDev Yellow (I2C Clock)
└── Pin 20 (SDA) → PiicoDev Blue (I2C Data)
```

### PiicoDev Adapter
The PiicoDev adapter for micro:bit handles the connection automatically.
Just plug sensors into the PiicoDev ports using PiicoDev cables.

### Multiple Sensors
Chain sensors together using PiicoDev cables. All sensors can share the same I2C bus as long as they have different addresses.

## Success Criteria

Before moving to Phase 2, confirm:
- ✅ Extension loads in MakeCode without errors
- ✅ All 6 sensor categories appear
- ✅ Factory blocks create variables automatically
- ✅ Block colors match specification
- ✅ Parameters and dropdowns work correctly
- ✅ Can build example programs without errors
- ✅ Generated JavaScript looks correct

## Support

If you encounter issues:
1. Check the [MakeCode documentation](https://makecode.com/defining-blocks)
2. Review the error console in browser developer tools
3. Compare against [working extensions](https://github.com/microsoft/pxt-microbit)
4. Ask in [MakeCode forums](https://forum.makecode.com)

---

**Ready to test?** Push to GitHub and import the extension!
