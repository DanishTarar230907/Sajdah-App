// src/services/prayerEngine.ts

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type Madhhab = 'Hanafi' | 'Shafi\'i' | 'Maliki' | 'Hanbali' | 'Jafari';

export type CalculationMethod =
  | 'MWL'      // Muslim World League (Fajr: 18, Isha: 17)
  | 'ISNA'     // Islamic Society of North America (Fajr: 15, Isha: 15)
  | 'EGYPT'    // Egyptian General Authority of Survey (Fajr: 19.5, Isha: 17.5)
  | 'KARACHI'  // University of Islamic Sciences, Karachi (Fajr: 18, Isha: 18)
  | 'TEHRAN'   // Institute of Geophysics, University of Tehran (Fajr: 17.7, Isha: 14)
  | 'GULF';    // Gulf Region (Fajr: 19.5, Isha: 90 min after Maghrib)

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Witr: string;
}

/**
 * Calculates prayer times using standard solar calculations.
 * For offline-first capability, if coordinates are empty, it defaults to calculated timezone fallback.
 */
export function calculatePrayerTimes(
  coords: Coordinates,
  date: Date,
  madhhab: Madhhab,
  method: CalculationMethod,
  timezoneOffsetHours: number = -(new Date().getTimezoneOffset() / 60),
  offsets: Record<string, number> = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0, Witr: 0 }
): PrayerTimes {
  const latitude = coords.latitude;
  const longitude = coords.longitude;

  // 1. Calculate Day of Year
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // 2. Solar declination & Equation of time approximations
  // Mean anomaly of the Sun (g) in radians
  const g = (357.5291 + 0.98560028 * dayOfYear) * (Math.PI / 180);
  // Ecliptic longitude of the Sun (q) in radians
  const q = (280.459 + 0.98564736 * dayOfYear) * (Math.PI / 180);
  // Obliquity of the ecliptic (e) in radians
  const e = (23.439 - 0.00000036 * dayOfYear) * (Math.PI / 180);

  // Solar declination (d)
  const d = Math.asin(Math.sin(e) * Math.sin(q));

  // Equation of time (EoT) in hours
  // Simplified EoT formula
  const EoT = 9.87 * Math.sin(2 * q) - 7.53 * Math.cos(g) - 1.5 * Math.sin(g); // in minutes
  const EoTHours = EoT / 60;

  // Solar noon (transit) in hours local time
  // Noon = 12 + Timezone - Longitude / 15 - EoT
  let noon = 12 + timezoneOffsetHours - longitude / 15 - EoTHours;

  // Let's establish angle parameters for Fajr and Isha based on the calculation method
  let fajrAngle = 18;
  let ishaAngle = 17;

  // Link selected Madhab to default calculation method:
  let activeMethod = method;
  if (madhhab === 'Hanafi') {
    activeMethod = 'KARACHI';
  } else if (madhhab === 'Jafari') {
    activeMethod = 'TEHRAN';
  } else if (!activeMethod || activeMethod === 'MWL') {
    activeMethod = 'MWL';
  }

  switch (activeMethod) {
    case 'ISNA':
      fajrAngle = 15;
      ishaAngle = 15;
      break;
    case 'EGYPT':
      fajrAngle = 19.5;
      ishaAngle = 17.5;
      break;
    case 'KARACHI':
      fajrAngle = 18;
      ishaAngle = 18;
      break;
    case 'TEHRAN':
      fajrAngle = 17.7;
      ishaAngle = 14;
      break;
    case 'GULF':
      fajrAngle = 19.5;
      ishaAngle = 0; // Handled specially (Maghrib + 90 mins)
      break;
    case 'MWL':
    default:
      fajrAngle = 18;
      ishaAngle = 17;
      break;
  }

  const latRad = latitude * (Math.PI / 180);

  // Helper to calculate hour angle for a given zenith / altitude
  const calculateHourAngle = (angle: number, sign: 1 | -1 = 1): number => {
    const angleRad = angle * (Math.PI / 180);
    const cosH = (Math.sin(sign * angleRad) - Math.sin(latRad) * Math.sin(d)) /
                 (Math.cos(latRad) * Math.cos(d));
    if (cosH > 1) return 0; // Always sun or never sun
    if (cosH < -1) return 0;
    return Math.acos(cosH) * (180 / Math.PI) / 15; // Convert to hours
  };

  // 3. Calculate Dhuhr
  const dhuhrTime = noon + (2 / 60); // 2 minutes added after solar transit for precaution

  // 4. Sunrise & Sunset
  // Sunrise/sunset angle is 0.833 degrees due to atmospheric refraction
  const sunsetHourAngle = calculateHourAngle(0.833, -1);
  const sunriseTime = dhuhrTime - sunsetHourAngle;
  const maghribTime = dhuhrTime + sunsetHourAngle;

  // 5. Fajr
  const fajrHourAngle = calculateHourAngle(fajrAngle, -1);
  const fajrTime = dhuhrTime - fajrHourAngle;

  // 6. Asr (shadow-based)
  // Shadow ratio (s) is 1 for Shafi'i/Maliki/Hanbali and 2 for Hanafi
  const shadowRatio = madhhab === 'Hanafi' ? 2 : 1;
  const acotVal = shadowRatio + Math.tan(Math.abs(latRad - d));
  const asrAltitudeRad = Math.atan(1 / acotVal);
  const asrAltitudeDeg = asrAltitudeRad * (180 / Math.PI);
  const asrHourAngle = calculateHourAngle(asrAltitudeDeg, 1);
  const asrTime = dhuhrTime + asrHourAngle;

  // 7. Isha
  let ishaTime = 0;
  if (method === 'GULF') {
    ishaTime = maghribTime + 1.5; // 90 minutes after Maghrib
  } else {
    const ishaHourAngle = calculateHourAngle(ishaAngle, -1);
    ishaTime = dhuhrTime + ishaHourAngle;
  }

  // 8. Witr
  const witrTime = ishaTime + 0.75; // Approx 45 minutes after Isha as a fallback tracker helper

  // Format Helper
  const formatTime = (timeInHours: number): string => {
    let hours = Math.floor(timeInHours);
    let minutes = Math.floor((timeInHours - hours) * 60);
    
    // Check overflow/underflow
    if (hours >= 24) hours -= 24;
    if (hours < 0) hours += 24;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    const dispHours = hours % 12 === 0 ? 12 : hours % 12;
    const dispMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${dispHours}:${dispMinutes} ${ampm}`;
  };

  const fajrAdjusted = fajrTime + ((offsets.Fajr || 0) / 60);
  const dhuhrAdjusted = dhuhrTime + ((offsets.Dhuhr || 0) / 60);
  const asrAdjusted = asrTime + ((offsets.Asr || 0) / 60);
  const maghribAdjusted = maghribTime + ((offsets.Maghrib || 0) / 60);
  const ishaAdjusted = ishaTime + ((offsets.Isha || 0) / 60);
  const witrAdjusted = witrTime + ((offsets.Witr || 0) / 60);

  return {
    Fajr: formatTime(fajrAdjusted),
    Sunrise: formatTime(sunriseTime),
    Dhuhr: formatTime(dhuhrAdjusted),
    Asr: formatTime(asrAdjusted),
    Maghrib: formatTime(maghribAdjusted),
    Isha: formatTime(ishaAdjusted),
    Witr: formatTime(witrAdjusted),
  };
}

/**
 * Calculates a list of standard prayer coordinates for fallbacks
 */
export const DEFAULT_LOCATIONS = {
  Makkah: { latitude: 21.4225, longitude: 39.8262, name: 'Makkah' },
  Medina: { latitude: 24.4672, longitude: 39.6111, name: 'Medina' },
  London: { latitude: 51.5074, longitude: -0.1278, name: 'London' },
  NewYork: { latitude: 40.7128, longitude: -74.0060, name: 'New York' },
  Karachi: { latitude: 24.8607, longitude: 67.0011, name: 'Karachi' },
  Cairo: { latitude: 30.0444, longitude: 31.2357, name: 'Cairo' },
  KualaLumpur: { latitude: 3.1390, longitude: 101.6869, name: 'Kuala Lumpur' }
};

export function getHijriDate(date: Date): { day: number; month: string; year: number } {
  // Convert standard date to julian days
  const w = date.getTime();
  const julianDay = Math.floor(w / 86400000) + 2440587.5;

  const epoch = 1948439.5;
  const cycle = 10631;
  const cycleYears = 30;
  const daysInYear = 354.3671;

  const shift = julianDay - epoch;
  const cycleCount = Math.floor(shift / cycle);
  const cycleRem = shift % cycle;

  const yearInCycle = Math.floor(cycleRem / daysInYear);
  const yearRem = Math.floor(cycleRem - (yearInCycle * daysInYear));

  const hijriYear = (cycleCount * cycleYears) + yearInCycle + 1;
  let hijriDay = Math.floor(yearRem);

  const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
  const monthsEN = [
    "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
    "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
    "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
  ];

  let hijriMonthIdx = 0;
  for (let i = 0; i < 12; i++) {
    const length = monthLengths[i];
    if (hijriDay <= length) {
      break;
    }
    hijriDay -= length;
    hijriMonthIdx = i + 1;
  }

  if (hijriDay === 0) {
    hijriDay = 29;
    hijriMonthIdx = hijriMonthIdx > 0 ? hijriMonthIdx - 1 : 11;
  }

  return {
    day: hijriDay,
    month: monthsEN[hijriMonthIdx] || "Ramadan",
    year: hijriYear,
  };
}
