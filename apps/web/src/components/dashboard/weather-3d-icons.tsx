import React from "react";

interface WeatherIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// ☀️ 3D Sun with radial gradients, triangular rays, and glossy highlights
export function Sunny3DIcon({ size = 64, style }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible", ...style }}
    >
      <defs>
        {/* Sun body gradient */}
        <radialGradient id="sunBody3D" cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFF7A1" />
          <stop offset="35%" stopColor="#FFC800" />
          <stop offset="75%" stopColor="#FF9500" />
          <stop offset="100%" stopColor="#E66000" />
        </radialGradient>

        {/* Sun ray gradient */}
        <linearGradient id="sunRay3D" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD84D" />
          <stop offset="100%" stopColor="#FF7700" />
        </linearGradient>

        {/* Ambient glow shadow */}
        <filter id="sunGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#FF7700" floodOpacity="0.38" />
        </filter>
      </defs>

      {/* 8 Triangular 3D Rays */}
      <g filter="url(#sunGlowFilter)">
        {/* Top */}
        <path d="M 50 4 L 56 22 L 44 22 Z" fill="url(#sunRay3D)" />
        {/* Top-Right */}
        <path d="M 82 18 L 74 34 L 66 26 Z" fill="url(#sunRay3D)" />
        {/* Right */}
        <path d="M 96 50 L 78 56 L 78 44 Z" fill="url(#sunRay3D)" />
        {/* Bottom-Right */}
        <path d="M 82 82 L 66 74 L 74 66 Z" fill="url(#sunRay3D)" />
        {/* Bottom */}
        <path d="M 50 96 L 44 78 L 56 78 Z" fill="url(#sunRay3D)" />
        {/* Bottom-Left */}
        <path d="M 18 82 L 26 66 L 34 74 Z" fill="url(#sunRay3D)" />
        {/* Left */}
        <path d="M 4 50 L 22 44 L 22 56 Z" fill="url(#sunRay3D)" />
        {/* Top-Left */}
        <path d="M 18 18 L 34 26 L 26 34 Z" fill="url(#sunRay3D)" />

        {/* Sun Center Sphere */}
        <circle cx="50" cy="50" r="28" fill="url(#sunBody3D)" />

        {/* Glossy shine overlay */}
        <ellipse cx="43" cy="38" rx="10" ry="6" transform="rotate(-25 43 38)" fill="#FFFFFF" opacity="0.45" />
      </g>
    </svg>
  );
}

// ⛅ 3D Sun behind puffy volumetric Cloud (signature weather icon from the mockup)
export function PartlyCloudy3DIcon({ size = 72, style }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible", ...style }}
    >
      <defs>
        {/* Sun gradient */}
        <radialGradient id="pcSunGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FFF9B3" />
          <stop offset="40%" stopColor="#FFC800" />
          <stop offset="100%" stopColor="#FF7700" />
        </radialGradient>

        {/* Sun ray gradient */}
        <linearGradient id="pcRayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="100%" stopColor="#FF8800" />
        </linearGradient>

        {/* Cloud body 3D gradient */}
        <linearGradient id="pcCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#F0F6FF" />
          <stop offset="100%" stopColor="#BFD9FB" />
        </linearGradient>

        {/* Cloud shadow */}
        <filter id="cloudDepthShadow" x="-15%" y="-15%" width="135%" height="135%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#0F2850" floodOpacity="0.28" />
        </filter>

        {/* Sun shadow */}
        <filter id="sunSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#FF8800" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Sun positioned in upper-left background */}
      <g filter="url(#sunSoftGlow)">
        {/* Mini Sun Rays */}
        <path d="M 38 4 L 41 14 L 35 14 Z" fill="url(#pcRayGrad)" />
        <path d="M 54 11 L 49 19 L 45 15 Z" fill="url(#pcRayGrad)" />
        <path d="M 61 27 L 51 29 L 51 23 Z" fill="url(#pcRayGrad)" />
        <path d="M 18 13 L 26 19 L 22 23 Z" fill="url(#pcRayGrad)" />
        <path d="M 12 30 L 22 28 L 22 34 Z" fill="url(#pcRayGrad)" />

        {/* Sun Sphere */}
        <circle cx="38" cy="30" r="18" fill="url(#pcSunGrad)" />
        <ellipse cx="33" cy="23" rx="6" ry="3.5" transform="rotate(-20 33 23)" fill="#FFFFFF" opacity="0.5" />
      </g>

      {/* 3D Volumetric Cloud in Foreground */}
      <g filter="url(#cloudDepthShadow)">
        {/* Smooth unified puffy cloud path */}
        <path
          d="M 28 68
             C 20 68, 14 62, 14 54
             C 14 47, 19 41, 26 40
             C 27 31, 35 24, 45 24
             C 52 24, 58 27, 62 33
             C 65 30, 70 28, 76 28
             C 86 28, 94 36, 94 46
             C 94 47, 94 48, 93 50
             C 98 52, 102 57, 102 63
             C 102 70, 96 76, 88 76
             L 28 76
             C 24 76, 20 73, 20 69
             Z"
          fill="url(#pcCloudGrad)"
        />

        {/* Cloud Puff Highlights for 3D depth */}
        <circle cx="45" cy="38" r="16" fill="#FFFFFF" opacity="0.4" />
        <circle cx="76" cy="42" r="14" fill="#FFFFFF" opacity="0.35" />
        <ellipse cx="42" cy="28" rx="10" ry="4" fill="#FFFFFF" opacity="0.65" />
        <ellipse cx="73" cy="32" rx="8" ry="3.5" fill="#FFFFFF" opacity="0.6" />
      </g>
    </svg>
  );
}

// ☁️ 3D White/Silver Puffy Cloud
export function Cloudy3DIcon({ size = 68, style }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible", ...style }}
    >
      <defs>
        <linearGradient id="cloudBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#F1F6FD" />
          <stop offset="100%" stopColor="#BBD5F5" />
        </linearGradient>
        <linearGradient id="cloudBackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <filter id="cloudSoftShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#1E3A5F" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Back cloud for depth */}
      <g opacity="0.75" transform="translate(14, -8) scale(0.85)">
        <path
          d="M 22 58 C 14 58, 8 52, 8 44 C 8 37, 13 31, 20 30 C 21 21, 29 14, 39 14 C 47 14, 54 18, 57 25 C 61 22, 67 20, 73 20 C 83 20, 91 28, 91 38 C 96 40, 100 45, 100 51 C 100 58, 94 64, 86 64 L 22 64 Z"
          fill="url(#cloudBackGrad)"
        />
      </g>

      {/* Front 3D Cloud */}
      <g filter="url(#cloudSoftShadow)">
        <path
          d="M 22 62
             C 14 62, 8 56, 8 48
             C 8 41, 13 35, 20 34
             C 21 24, 30 16, 41 16
             C 49 16, 56 20, 60 26
             C 64 23, 70 21, 76 21
             C 86 21, 94 29, 94 39
             C 98 42, 101 47, 101 53
             C 101 60, 95 66, 87 66
             L 22 66 Z"
          fill="url(#cloudBodyGrad)"
        />
        {/* Highlights */}
        <ellipse cx="40" cy="20" rx="10" ry="4" fill="#FFFFFF" opacity="0.7" />
        <ellipse cx="73" cy="25" rx="8" ry="3" fill="#FFFFFF" opacity="0.6" />
      </g>
    </svg>
  );
}

// 🌧️ 3D Rain Cloud with teardrop raindrops
export function Rain3DIcon({ size = 68, style }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 95"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible", ...style }}
    >
      <defs>
        <linearGradient id="rainCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#D9E6F7" />
          <stop offset="100%" stopColor="#9CBEDF" />
        </linearGradient>
        <linearGradient id="dropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#67B3FF" />
          <stop offset="100%" stopColor="#1E6DEB" />
        </linearGradient>
        <filter id="rainCloudShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#183659" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Cloud */}
      <g filter="url(#rainCloudShadow)">
        <path
          d="M 22 54
             C 14 54, 8 48, 8 40
             C 8 33, 13 27, 20 26
             C 21 16, 30 8, 41 8
             C 49 8, 56 12, 60 18
             C 64 15, 70 13, 76 13
             C 86 13, 94 21, 94 31
             C 98 34, 101 39, 101 45
             C 101 52, 95 58, 87 58
             L 22 58 Z"
          fill="url(#rainCloudGrad)"
        />
        <ellipse cx="40" cy="12" rx="9" ry="3.5" fill="#FFFFFF" opacity="0.65" />
      </g>

      {/* 3D Rain Drops */}
      <g transform="translate(4, 0)">
        <path
          d="M 28 66 C 28 66, 32 72, 32 75 C 32 77.2, 30.2 79, 28 79 C 25.8 79, 24 77.2, 24 75 C 24 72, 28 66, 28 66 Z"
          fill="url(#dropGrad)"
        />
        <path
          d="M 48 68 C 48 68, 52 74, 52 77 C 52 79.2, 50.2 81, 48 81 C 45.8 81, 44 79.2, 44 77 C 44 74, 48 68, 48 68 Z"
          fill="url(#dropGrad)"
        />
        <path
          d="M 68 66 C 68 66, 72 72, 72 75 C 72 77.2, 70.2 79, 68 79 C 65.8 79, 64 77.2, 64 75 C 64 72, 68 66, 68 66 Z"
          fill="url(#dropGrad)"
        />
        <path
          d="M 38 78 C 38 78, 41 83, 41 85.5 C 41 87.2, 39.7 88.5, 38 88.5 C 36.3 88.5, 35 87.2, 35 85.5 C 35 83, 38 78, 38 78 Z"
          fill="url(#dropGrad)"
          opacity="0.85"
        />
        <path
          d="M 58 78 C 58 78, 61 83, 61 85.5 C 61 87.2, 59.7 88.5, 58 88.5 C 56.3 88.5, 55 87.2, 55 85.5 C 55 83, 58 78, 58 78 Z"
          fill="url(#dropGrad)"
          opacity="0.85"
        />
      </g>
    </svg>
  );
}

// ⛈️ 3D Storm Cloud with golden lightning bolt
export function Thunderstorm3DIcon({ size = 68, style }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible", ...style }}
    >
      <defs>
        {/* Dark stormy cloud */}
        <linearGradient id="stormCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7E8DA1" />
          <stop offset="60%" stopColor="#435269" />
          <stop offset="100%" stopColor="#253245" />
        </linearGradient>

        {/* Golden lightning */}
        <linearGradient id="boltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="60%" stopColor="#FFBA08" />
          <stop offset="100%" stopColor="#F48C06" />
        </linearGradient>

        <filter id="boltGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#FFBA08" floodOpacity="0.75" />
        </filter>

        <filter id="stormShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0A1424" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Storm Cloud */}
      <g filter="url(#stormShadow)">
        <path
          d="M 22 54
             C 14 54, 8 48, 8 40
             C 8 33, 13 27, 20 26
             C 21 16, 30 8, 41 8
             C 49 8, 56 12, 60 18
             C 64 15, 70 13, 76 13
             C 86 13, 94 21, 94 31
             C 98 34, 101 39, 101 45
             C 101 52, 95 58, 87 58
             L 22 58 Z"
          fill="url(#stormCloudGrad)"
        />
        <ellipse cx="40" cy="12" rx="9" ry="3.5" fill="#A8B7CC" opacity="0.45" />
      </g>

      {/* 3D Lightning Bolt */}
      <g filter="url(#boltGlow)">
        <path
          d="M 52 46
             L 40 68
             L 50 68
             L 44 94
             L 66 64
             L 55 64
             L 63 46
             Z"
          fill="url(#boltGrad)"
          stroke="#FFFBEB"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}

// Weather 3D Icon Dispatcher
export function Weather3DIcon({
  condition = "sunny",
  size = 64,
  style,
}: {
  condition?: "sunny" | "cloudy" | "rain" | "heavy-rain" | "thunderstorm" | "fog";
  size?: number;
  style?: React.CSSProperties;
}) {
  switch (condition) {
    case "sunny":
      return <Sunny3DIcon size={size} style={style} />;
    case "cloudy":
    case "fog":
      return <PartlyCloudy3DIcon size={size} style={style} />;
    case "rain":
      return <Rain3DIcon size={size} style={style} />;
    case "heavy-rain":
      return <Rain3DIcon size={size} style={style} />;
    case "thunderstorm":
      return <Thunderstorm3DIcon size={size} style={style} />;
    default:
      return <PartlyCloudy3DIcon size={size} style={style} />;
  }
}
