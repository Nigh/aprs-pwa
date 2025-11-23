# APRS-TX Installation and Usage Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```
Open `http://localhost:4321` in your browser.

### 3. Build Production
```bash
npm run build
```

### 4. Preview Production Build
```bash
npm run preview
```

## Features Overview

### 📍 GPS Location
- Click "📍 Get GPS Location" to retrieve your current location
- Requires browser geolocation permission
- Displays accuracy information

### 📤 Manual Transmission
- Enter CALLSIGN and PASSCODE (required)
- Get GPS location
- Click "📤 Send Packet" to transmit immediately

### ⏰ Scheduled Transmission
1. Set interval in seconds (minimum 30 seconds)
2. Click "▶ Start Schedule"
3. Packets transmit immediately and then at specified intervals
4. Click "⏹ Stop Schedule" to stop

## APRS Packet Format

Generated packets follow this format:
```
CALLSIGN>APRS,RELAY:/hhmmz/DDmm.mmN/DDDmm.mmE/AdditionalText
```

Example:
```
N0CALL-1>APRS,RELAY:/123456z/4530.50N/09319.50W/Mobile
```

## Key Parameters

- **Callsign**: Amateur radio callsign (max 9 chars), e.g., N0CALL-1
- **Passcode**: APRS validation passcode (required)
- **Additional Text**: Optional beacon text (max 50 chars)
- **Interval**: Transmission interval in seconds (min: 30, max: 3600)

## Technical Details

### Files
- **APRSTransmitter.svelte** - Main UI component
- **aprs.ts** - APRS packet generation and GPS handling
- **aprs-transmit.ts** - Backend API endpoint (POST only)

### APIs Used
- **Geolocation API** - GPS location retrieval
- **Browser Storage** - Optional future enhancement
- **HTTP POST** - Backend transmission endpoint

## Browser Requirements

- Modern browser with Geolocation support
- HTTPS connection (except localhost)
- Service Worker support for PWA features
- JavaScript enabled

## Supported Browsers

- Chrome/Chromium 50+
- Firefox 40+
- Safari 10+
- Edge 15+

## Troubleshooting

### "Permission Denied" for Geolocation
- Grant location permission when browser prompts
- Check browser privacy settings
- Ensure HTTPS connection (except on localhost)

### Transmission Not Showing
- Verify CALLSIGN and PASSCODE are entered
- Check browser console for errors (F12)
- Ensure GPS location is retrieved

### Scheduled Transmission Not Starting
- Check interval value (minimum 30 seconds)
- Verify all required fields are filled
- Ensure GPS location is available

## APRS Resources

- **APRS.fi**: https://aprs.fi/ - Live network map
- **APRS.org**: http://www.aprs.org/ - Official website
- **Protocol Doc**: http://www.aprs.org/doc/APRS101.PDF - Specification

## Future Backend Integration

To enable actual APRS network transmission:

1. Implement TCP/IP connection to rotate.aprs.net:14580
2. Send login packet with callsign and passcode
3. Send APRS data packet
4. Handle connection lifecycle

Backend endpoint: `POST /api/aprs-transmit`

Request format:
```json
{
  "callsign": "N0CALL-1",
  "passcode": "12345",
  "packet": "N0CALL-1>APRS,RELAY:/123456z/4530.50N/09319.50W/"
}
```

## PWA Installation

The application is installable as a PWA:

1. Visit the application in a compatible browser
2. Click install prompt (if shown)
3. Grant necessary permissions
4. Application is now accessible from home screen/app drawer

## Support & Issues

For issues, feature requests, or questions:
- Check the APRS_TX_README.md for detailed documentation
- Review IMPLEMENTATION_SUMMARY.md for technical details
- Check browser console (F12) for error messages

## License

Part of the Astro PWA Template project.
