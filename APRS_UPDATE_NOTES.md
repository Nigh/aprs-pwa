# APRS-TX Update Notes

## Changes Made

### APRS Packet Format Update

**Previous Format (Deprecated):**
```
CALLSIGN>APRS,RELAY:/hhmmz/DDmm.mmN/DDDmm.mmE/AdditionalText
```

**New Format (Active):**
```
CALLSIGN>APRS,TCPIP*:!DDmm.mmN/DDDmm.mmE[AdditionalText\r\n
```

The new format is more suitable for TCPIP connections and includes proper line termination.

### Transmission API Update

**Previous Implementation:**
- Simulated APRS transmission via local endpoint
- Backend endpoint: `/api/aprs-transmit` (POST)
- No actual network transmission

**New Implementation:**
- Real APRS transmission via external proxy service
- API endpoint: `https://aprs-proxy.jiyucheng007.workers.dev/`
- Sends CALLSIGN, PASSCODE, and PACKET data
- Proper error handling with HTTP status checks

### Modified Files

#### `src/lib/aprs.ts`

**Function: `generateAPRSPacket()`**
- Updated packet format to use TCPIP path
- Removed timestamp generation (not needed in new format)
- Simplified additional text formatting
- Added `\r\n` line termination

**Function: `transmitAPRSPacket()`**
- Replaced simulation with real HTTP POST request
- Uses external APRS proxy API
- Includes proper error handling and HTTP response validation
- Parses JSON response from API

### API Integration Details

**Request Format:**
```json
{
  "callsign": "N0CALL-1",
  "passcode": "12345",
  "packet": "N0CALL-1>APRS,TCPIP*:!4530.50N/09319.50W[Mobile\r\n"
}
```

**Expected Response:**
- HTTP 200 with JSON body on success
- HTTP error status on failure
- Application handles both cases with appropriate user feedback

### Packet Example

**Input:**
- Callsign: `N0CALL-1`
- Latitude: `45.508333` (45°30.50'N)
- Longitude: `-93.325000` (093°19.50'W)
- Additional Text: `Mobile`

**Generated Packet:**
```
N0CALL-1>APRS,TCPIP*:!4530.50N/09319.50W[Mobile\r\n
```

### Benefits of New Implementation

1. **Real Transmission**: Packets are now transmitted to actual APRS network
2. **Simplified Format**: Shorter, more efficient packet structure
3. **TCPIP Compatible**: Works with IP-based APRS infrastructure
4. **Proper Termination**: Line endings ensure correct parsing on server
5. **Robust Error Handling**: Better handling of network errors and API issues

### Browser Compatibility

- Works with all modern browsers that support:
  - Fetch API
  - CORS (if proxy allows cross-origin)
  - JSON serialization

### Testing the Updates

To verify the changes work correctly:

1. **Manual Test:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Open in Browser:**
   - Navigate to the application
   - Enter CALLSIGN and PASSCODE
   - Get GPS location
   - Send a packet (manual or scheduled)
   - Check transmission feedback

3. **Verify Packet Format:**
   - Check browser console (F12 → Network tab)
   - Look for POST request to `aprs-proxy.jiyucheng007.workers.dev`
   - Verify JSON payload structure

### Future Enhancements

- Add transmission log viewing
- Implement packet retry mechanism
- Add timeout handling for slow network
- Cache failed packets for retry
- Add custom API endpoint configuration

### Troubleshooting

**"Failed to transmit APRS packet"**
- Check callsign and passcode are correct
- Verify internet connection is active
- Check CORS settings if using custom proxy
- Review browser console for detailed error

**Packets not appearing on APRS.fi**
- Verify callsign is valid and registered
- Ensure GPS coordinates are realistic
- Check that passcode is correct
- Wait a few minutes for network propagation

### Support

For issues with the APRS network transmission:
1. Check APRS.fi website for network status
2. Verify callsign registration at arrl.net
3. Test passcode with official APRS tools
4. Contact APRS network administrators for support
