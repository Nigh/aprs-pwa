export interface APRSConfig {
  callsign: string;
  passcode: string;
  commentText?: string;
  statuText?: string;
}

export interface APRSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  timestamp?: number;
  speed?: number;
}

export interface APRSTransmissionResult {
  success: boolean;
  message: string;
  timestamp: Date;
  callsign?: string;
}

export function generateAPRSPackets(
  callsign: string,
  latitude: number,
  longitude: number,
  commentText?: string,
  statuText?: string,
  speed?: number
): string[] {
  const cleanCallsign = callsign.toUpperCase();
  
  // Format latitude and longitude in APRS format
  const lat = formatLatitude(latitude);
  const lon = formatLongitude(longitude);
  
  // Build the APRS packet
  // Format: CALLSIGN>APRS,TCPIP*:!LAT/LON[commentText (or with speed: !LAT/LON/SPEED[commentText)
  // Format: CALLSIGN>APRS,TCPIP*:>statuText
  const head = `${cleanCallsign}>APRS,TCPIP*:`;
  let packets = []
  const formattedSpeed = formatSpeed(speed);
  
  if (formattedSpeed) {
    packets.push(`${head}!${lat}/${lon}/${formattedSpeed}[`);
  } else {
    packets.push(`${head}!${lat}/${lon}[`);
  }
  
  if (commentText) {
    packets[0] += `${commentText}`;
  }
  if (statuText) {
    packets.push(`${head}>${statuText}`);
  }
  return packets;
}

function formatLatitude(lat: number): string {
  const absLat = Math.abs(lat);
  const degrees = Math.floor(absLat);
  const minutes = (absLat - degrees) * 60;
  
  const dStr = String(degrees).padStart(2, '0');
  const mStr = String(minutes.toFixed(2)).padStart(5, '0');
  const dir = lat >= 0 ? 'N' : 'S';
  
  return `${dStr}${mStr}${dir}`;
}

function formatLongitude(lon: number): string {
  const absLon = Math.abs(lon);
  const degrees = Math.floor(absLon);
  const minutes = (absLon - degrees) * 60;
  
  const dStr = String(degrees).padStart(3, '0');
  const mStr = String(minutes.toFixed(2)).padStart(5, '0');
  const dir = lon >= 0 ? 'E' : 'W';
  
  return `${dStr}${mStr}${dir}`;
}

function formatSpeed(speedMps?: number): string | null {
  if (speedMps === undefined || speedMps === null || speedMps < 0) {
    return null;
  }
  
  const speedKnots = Math.round(speedMps * 1.94384);
  return String(speedKnots).padStart(3, '0');
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 First latitude in degrees
 * @param lon1 First longitude in degrees
 * @param lat2 Second latitude in degrees
 * @param lon2 Second longitude in degrees
 * @returns Distance in meters
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate average speed based on two GPS positions
 * @param previousLocation Previous GPS location
 * @param currentLocation Current GPS location
 * @returns Average speed in m/s, or null if calculation not possible
 */
export function calculateAverageSpeed(previousLocation: APRSLocation, currentLocation: APRSLocation): number | null {
  if (!previousLocation.timestamp || !currentLocation.timestamp) {
    return null;
  }

  const timeDifferenceMs = currentLocation.timestamp - previousLocation.timestamp;
  
  // Only calculate if previous position is less than 5 minutes old
  if (timeDifferenceMs > 300000) { // 5 minutes = 300000ms
    return null;
  }

  // Don't calculate if time difference is too small (less than 1 second)
  if (timeDifferenceMs < 1000) {
    return null;
  }

  const distance = calculateDistance(
    previousLocation.latitude,
    previousLocation.longitude,
    currentLocation.latitude,
    currentLocation.longitude
  );

  const timeDifferenceSeconds = timeDifferenceMs / 1000;
  const averageSpeed = distance / timeDifferenceSeconds;

  // Return null if calculated speed is unrealistic (e.g., > 200 m/s or ~720 km/h)
  if (averageSpeed > 200) {
    return null;
  }

  return averageSpeed;
}

export async function getGPSLocation(timeoutMs: number = 17000, previousLocation?: APRSLocation | null): Promise<APRSLocation> {
  return Promise.race([
    new Promise<APRSLocation>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLocation: APRSLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude ?? undefined,
            speed: position.coords.speed ?? undefined,
            timestamp: Date.now(),
          };

          // If GPS doesn't provide speed, try to calculate average speed from previous position
          if ((currentLocation.speed === null || currentLocation.speed === undefined) && previousLocation) {
            const calculatedSpeed = calculateAverageSpeed(previousLocation, currentLocation);
            if (calculatedSpeed !== null) {
              currentLocation.speed = calculatedSpeed;
            }
          }

          resolve(currentLocation);
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        }
      );
    }),
    new Promise<APRSLocation>((_, reject) =>
      setTimeout(() => reject(new Error('GPS location timeout')), timeoutMs)
    ),
  ]);
}

export function isGPSLocationStale(location: APRSLocation | null, maxAgeMs: number = 60000): boolean {
  if (!location || !location.timestamp) return true;
  return Date.now() - location.timestamp > maxAgeMs;
}

let wakeLock: any = null;

export async function acquireWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) {
    console.warn('Wake Lock API not supported');
    return;
  }
  
  try {
    wakeLock = await (navigator as any).wakeLock.request('screen');
  } catch (error) {
    console.warn('Failed to acquire wake lock:', error);
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (wakeLock !== null) {
    try {
      await wakeLock.release();
      wakeLock = null;
    } catch (error) {
      console.warn('Failed to release wake lock:', error);
    }
  }
}

export async function validateAPRSCallsign(callsign: string, passcode: string): Promise<boolean> {
  if (!callsign || callsign.trim().length === 0) {
    return false;
  }
  
  if (!passcode || passcode.trim().length === 0) {
    return false;
  }
  
  return true;
}

export async function transmitAPRSPackets(
  packets: string[],
  callsign: string,
  passcode: string
): Promise<APRSTransmissionResult> {
  try {
    const response = await fetch('https://aprs-api.tecnico.cc/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callsign: callsign,
        passcode: passcode,
        packets: packets,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      message: `APRS packet transmitted successfully for ${callsign}`,
      timestamp: new Date(),
      callsign: callsign,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to transmit APRS packet: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
      callsign: callsign,
    };
  }
}

export function generateValidationPasscode(callsign: string): string {
  const upperCallsign = callsign.toUpperCase();
  let hash = 0x73e2;
  
  for (let i = 0; i < upperCallsign.length; i++) {
    hash ^= (upperCallsign.charCodeAt(i) << 8) ^ upperCallsign.charCodeAt(i);
    hash = ((hash << 1) ^ ((hash & 0x8000) ? 0xFFFF : 0)) & 0xFFFF;
  }
  
  return String(hash & 0x7FFF);
}
