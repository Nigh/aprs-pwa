export interface APRSConfig {
  callsign: string;
  passcode: string;
  additionalText?: string;
}

export interface APRSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  timestamp?: number;
}

export interface APRSTransmissionResult {
  success: boolean;
  message: string;
  timestamp: Date;
  callsign?: string;
}

const APRS_SERVER = 'rotate.aprs.net';
const APRS_PORT = 14580;

export function generateAPRSPacket(
  callsign: string,
  latitude: number,
  longitude: number,
  additionalText?: string
): string {
  const cleanCallsign = callsign.toUpperCase();
  
  // Format latitude and longitude in APRS format
  const lat = formatLatitude(latitude);
  const lon = formatLongitude(longitude);
  
  // Build the APRS packet
  // Format: CALLSIGN>APRS,TCPIP*:!LAT/LON[additionaltext
  let packet = `${cleanCallsign}>APRS,TCPIP*:!${lat}/${lon}[`;
  
  if (additionalText) {
    packet += `${additionalText}`;
  }
  
  packet += `\r\n`;
  
  return packet;
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

export async function getGPSLocation(): Promise<APRSLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude ?? undefined,
          timestamp: Date.now(),
        });
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      }
    );
  });
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

export async function transmitAPRSPacket(
  packet: string,
  callsign: string,
  passcode: string
): Promise<APRSTransmissionResult> {
  try {
    const response = await fetch('https://aprs-proxy.jiyucheng007.workers.dev/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callsign: callsign,
        passcode: passcode,
        packet: packet,
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
