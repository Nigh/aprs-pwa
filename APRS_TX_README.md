# APRS-TX Transmitter

A Progressive Web Application (PWA) for transmitting Automatic Packet Reporting System (APRS) packets. This application is designed for amateur radio operators to share their location via APRS network.

## Features

- **GPS Location Retrieval**: Automatically retrieves the user's current GPS location with accuracy information
- **APRS Packet Assembly**: Properly formats APRS packets according to APRS protocol specifications
- **Manual Transmission**: Send APRS packets on demand with a single click
- **Scheduled Transmission**: Automatically transmit packets at set intervals (minimum 30 seconds)
- **Real-time Notifications**: Display transmission status with success/error messages
- **Offline Capable**: PWA technology enables offline usage with service worker support
- **Responsive Design**: Works on desktop and mobile devices

## User Interface

### Main Components

1. **Callsign & Passcode Section**
   - Required fields for APRS authentication
   - Callsign format: e.g., `N0CALL-1` (max 9 characters)
   - Passcode: Your APRS validation passcode

2. **Additional Text (Optional)**
   - Add custom beacon text (max 50 characters)
   - Useful for notes like "Mobile" or "Testing"

3. **GPS Section**
   - Get current GPS location with accuracy info
   - Displays latitude, longitude, and accuracy in meters
   - Requires browser geolocation permission

4. **Manual Transmission**
   - Send APRS packet immediately
   - Requires valid callsign, passcode, and GPS location

5. **Automatic Transmission (Scheduling)**
   - Set transmission interval in seconds (minimum 30)
   - Start/stop scheduled transmissions
   - Shows active scheduling status
   - Continues sending packets at specified intervals

6. **Status Display**
   - Shows latest transmission result
   - Displays success or error messages
   - Shows timestamp of last action

## Technical Details

### APRS Packet Format

The application generates APRS packets in the following format:

```
CALLSIGN>APRS,RELAY:/hhmmzLATLONadditionaltext
```

Example:
```
N0CALL-1>APRS,RELAY:/123456z/4530.50N/09319.50W/Mobile
```

Where:
- `CALLSIGN>APRS`: Source callsign to APRS destination
- `RELAY`: Relay path
- `/hhmmz`: Time in UTC (hours, minutes, zulu)
- `LATLON`: Latitude and longitude in APRS format
- `additionaltext`: Optional text beacon

### Latitude/Longitude Format

The application converts GPS coordinates to APRS format:

- **Latitude**: `DDmm.mmN/S` (degrees, minutes, direction)
- **Longitude**: `DDDmm.mmE/W` (degrees, minutes, direction)

### GPS Location

The application uses the browser's Geolocation API to retrieve:
- Latitude
- Longitude
- Accuracy (in meters)
- Altitude (if available)

### Scheduling

- Minimum interval: 30 seconds
- Maximum interval: 3600 seconds (1 hour)
- First transmission occurs immediately when schedule starts
- Subsequent transmissions occur at specified intervals
- Can be stopped at any time

## Installation & Usage

### Prerequisites

- Modern web browser with:
  - Geolocation API support
  - Service Worker support
  - HTTPS connection (or localhost)

### Installation

1. Visit the application URL
2. Click "Install" when prompted (PWA installation)
3. Grant geolocation permission when requested

### Basic Workflow

1. **Enter Your Callsign and Passcode**
   - Use your valid APRS callsign
   - Enter your APRS validation passcode

2. **Get GPS Location**
   - Click "📍 Get GPS Location"
   - Allow the browser to access your location
   - Wait for location to be retrieved

3. **Send Packet (Manual)**
   - Click "📤 Send Packet" to transmit immediately
   - Check the status message for confirmation

4. **Send Packets (Scheduled)**
   - Set desired interval (minimum 30 seconds)
   - Click "▶ Start Schedule"
   - Packets will transmit immediately and then at intervals
   - Click "⏹ Stop Schedule" to stop transmissions

## API Endpoint

### POST /api/aprs-transmit

Transmits an APRS packet to the APRS network.

**Request Body:**
```json
{
  "callsign": "N0CALL-1",
  "passcode": "12345",
  "packet": "N0CALL-1>APRS,RELAY:/123456z/4530.50N/09319.50W/Mobile"
}
```

**Response:**
```json
{
  "success": true,
  "message": "APRS packet transmitted successfully for N0CALL-1",
  "timestamp": "2024-01-01T12:34:56.789Z"
}
```

## File Structure

```
src/
├── components/
│   ├── APRSTransmitter.svelte    # Main UI component
│   ├── Counter.svelte             # Example component
│   └── ReloadPrompt.svelte        # PWA update prompt
├── lib/
│   └── aprs.ts                    # APRS utility functions
├── pages/
│   ├── api/
│   │   └── aprs-transmit.ts       # Backend API endpoint
│   └── index.astro                # Main page
├── layouts/
│   └── Layout.astro               # Base layout
└── styles/
    └── global.css                 # Global styles
```

## APRS Protocol Resources

- [APRS.fi](https://aprs.fi/) - APRS network map and information
- [APRS Protocol](http://www.aprs.org/doc/APRS101.PDF) - Official protocol documentation
- [APRS Callsign Validation](http://www.aprs.org/) - APRS organization website

## Limitations

- Direct TCP connection to APRS servers from browser is not possible
- Production deployment requires a backend service to handle APRS server communication
- GPS location requires HTTPS connection (except on localhost)
- Some browsers/devices may not support the Geolocation API

## Future Enhancements

- [ ] Backend implementation for actual APRS server connection
- [ ] WebSocket proxy for real-time transmission feedback
- [ ] Location history tracking
- [ ] Custom symbol selection
- [ ] Comment template library
- [ ] Transmission log and history
- [ ] Multiple simultaneous transmissions
- [ ] Weather data integration
- [ ] Dark mode theme
- [ ] Internationalization (i18n)

## License

This application is part of the Astro PWA Template project.

## Support

For issues, feature requests, or contributions, please visit the project repository.
