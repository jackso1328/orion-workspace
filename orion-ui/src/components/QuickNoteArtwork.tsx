export const QUICK_NOTE_THEMES = [
  'none', 'mountains', 'distant-hills', 'pine-forest', 'leafy-forest',
  'river', 'lakeside', 'meadow', 'grassland', 'wildflowers',
  'flower-corner', 'botanical-leaves', 'clouds', 'sunrise', 'daytime-sky',
  'sunset', 'moonlit-sky', 'stars', 'crescent-moon', 'rain',
  'mist', 'abstract-curves', 'abstract-waves', 'abstract-dots', 'organic-shapes',
  'geometric-pattern', 'paper-breeze', 'woodland', 'garden', 'small-birds',
  'branches', 'coastal-horizon', 'night-landscape', 'city-silhouette', 'stationery-minimal'
] as const;

export type QuickNoteTheme = typeof QUICK_NOTE_THEMES[number];

interface QuickNoteArtworkProps {
  theme: string;
  color: string;
}

export default function QuickNoteArtwork({ theme, color }: QuickNoteArtworkProps) {
  if (theme === 'none' || !theme) return null;

  let artwork = null;

  switch (theme) {
    case 'mountains':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '120px', display: 'block' }}>
          <path d="M0,50 L20,20 L35,40 L60,10 L85,35 L100,20 L100,50 Z" fill="currentColor" />
          <path d="M30,50 L45,30 L65,45 L80,25 L100,45 L100,50 Z" fill="currentColor" opacity="0.6" />
        </svg>
      );
      break;
    case 'distant-hills':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '100px', display: 'block' }}>
          <path d="M-10,50 Q20,30 50,45 T110,40 L110,50 Z" fill="currentColor" opacity="0.8" />
          <path d="M-10,50 Q40,20 70,40 T110,35 L110,50 Z" fill="currentColor" opacity="0.5" />
          <path d="M-10,50 Q30,10 60,35 T110,25 L110,50 Z" fill="currentColor" opacity="0.3" />
        </svg>
      );
      break;
    case 'pine-forest':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '80px', display: 'block' }}>
          {[5, 15, 28, 40, 55, 68, 80, 92].map((x, i) => (
            <g key={i} transform={`translate(${x}, ${50 - (15 + (i % 3) * 4)})`}>
              <path d="M0,0 L-4,12 L-1.5,12 L-6,24 L-2,24 L-8,36 L8,36 L2,24 L6,24 L1.5,12 L4,12 Z" fill="currentColor" opacity={0.6 + (i % 2) * 0.2} />
            </g>
          ))}
        </svg>
      );
      break;
    case 'leafy-forest':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '80px', display: 'block' }}>
          {[10, 30, 50, 70, 90].map((x, i) => (
            <g key={i} transform={`translate(${x}, ${50 - (20 + (i % 2) * 5)})`}>
              <rect x="-1" y="0" width="2" height="30" fill="currentColor" opacity="0.8" />
              <circle cx="0" cy="-5" r="12" fill="currentColor" opacity="0.6" />
              <circle cx="-6" cy="2" r="9" fill="currentColor" opacity="0.5" />
              <circle cx="6" cy="0" r="10" fill="currentColor" opacity="0.5" />
            </g>
          ))}
        </svg>
      );
      break;
    case 'river':
      artwork = (
        <svg viewBox="0 0 100 20" preserveAspectRatio="none" style={{ width: '100%', height: '40px', display: 'block' }}>
          <path d="M0,10 Q12.5,20 25,10 T50,10 T75,10 T100,10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M10,15 Q22.5,25 35,15 T60,15 T85,15 T110,15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </svg>
      );
      break;
    case 'lakeside':
      artwork = (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '60px', display: 'block' }}>
          <path d="M0,25 Q25,25 50,28 T100,25 L100,40 L0,40 Z" fill="currentColor" opacity="0.3" />
          <path d="M15,25 L15,15 L18,25 Z" fill="currentColor" opacity="0.7" />
          <path d="M22,25 L22,12 L26,25 Z" fill="currentColor" opacity="0.6" />
          <path d="M85,25 L85,18 L87,25 Z" fill="currentColor" opacity="0.8" />
          <path d="M10,27 L90,27" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          <path d="M20,32 L80,32" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
        </svg>
      );
      break;
    case 'meadow':
      artwork = (
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: '100%', height: '50px', display: 'block' }}>
          <path d="M-10,30 Q30,10 70,30 T110,20 L110,30 Z" fill="currentColor" opacity="0.4" />
          {[...Array(15)].map((_, i) => (
            <path key={i} d={`M${5 + i * 6},30 Q${7 + i * 6},22 ${6 + i * 6},15`} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          ))}
          {[...Array(8)].map((_, i) => (
            <circle key={i} cx={8 + i * 11} cy={14 + (i % 3)} r="1.5" fill="currentColor" opacity="0.8" />
          ))}
        </svg>
      );
      break;
    case 'grassland':
      artwork = (
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: '100%', height: '40px', display: 'block' }}>
          {[...Array(25)].map((_, i) => (
            <path key={i} d={`M${i * 4 + (i % 3)},30 Q${i * 4 + 2},15 ${i * 4 + (i % 2 === 0 ? 4 : -1)},5`} fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity={0.4 + (i % 3) * 0.2} />
          ))}
        </svg>
      );
      break;
    case 'wildflowers':
      artwork = (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '60px', display: 'block' }}>
          {[10, 25, 45, 60, 75, 90].map((x, i) => (
            <g key={i} transform={`translate(${x}, 40)`}>
              <path d={`M0,0 Q${(i % 2 === 0 ? -4 : 4)},-15 0,-30`} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
              <circle cx="0" cy="-30" r="2.5" fill="currentColor" opacity="0.9" />
              <path d={`M0,-10 Q${(i % 2 === 0 ? 5 : -5)},-15 ${(i % 2 === 0 ? 8 : -8)},-20`} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            </g>
          ))}
        </svg>
      );
      break;
    case 'flower-corner':
      artwork = (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, right: 0, width: '120px', height: '120px', display: 'block' }}>
          <g transform="translate(80, 80)">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <ellipse key={i} cx="0" cy="-15" rx="5" ry="15" fill="currentColor" opacity="0.5" transform={`rotate(${angle})`} />
            ))}
            <circle cx="0" cy="0" r="6" fill="currentColor" opacity="0.8" />
          </g>
          <path d="M80,80 Q50,90 20,100" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
          <path d="M80,80 Q90,50 100,20" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        </svg>
      );
      break;
    case 'botanical-leaves':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '80px', display: 'block' }}>
          {[20, 50, 80].map((x, i) => (
            <g key={i} transform={`translate(${x}, 50)`}>
              <path d="M0,0 Q-10,-20 0,-40 Q10,-20 0,0 Z" fill="currentColor" opacity="0.4" />
              <path d="M0,0 L0,-38" stroke="currentColor" strokeWidth="1" opacity="0.6" />
              <path d="M0,-10 L-4,-15 M0,-20 L-5,-25 M0,-15 L4,-20 M0,-25 L5,-30" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
            </g>
          ))}
        </svg>
      );
      break;
    case 'clouds':
      artwork = (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '70px', display: 'block' }}>
          <g fill="currentColor" opacity="0.6">
            <path d="M20,30 A8,8 0 0,1 25,15 A10,10 0 0,1 42,17 A6,6 0 0,1 45,28 Z" />
            <path d="M60,35 A6,6 0 0,1 64,24 A8,8 0 0,1 78,26 A5,5 0 0,1 80,34 Z" opacity="0.4" />
          </g>
        </svg>
      );
      break;
    case 'sunrise':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '90px', display: 'block' }}>
          <circle cx="50" cy="40" r="15" fill="currentColor" opacity="0.8" />
          <path d="M-10,50 Q25,40 50,40 T110,50 Z" fill="currentColor" opacity="0.5" />
          <path d="M-10,50 Q25,45 50,45 T110,50 Z" fill="currentColor" opacity="0.7" />
        </svg>
      );
      break;
    case 'daytime-sky':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '80px', display: 'block' }}>
          <circle cx="85" cy="15" r="8" fill="currentColor" opacity="0.7" />
          <path d="M10,30 Q15,20 25,20 Q35,15 45,25 Q55,25 60,30 Z" fill="currentColor" opacity="0.4" />
          <path d="M30,40 Q40,30 55,32 Q65,28 75,38 Z" fill="currentColor" opacity="0.3" />
        </svg>
      );
      break;
    case 'sunset':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '90px', display: 'block' }}>
          <circle cx="50" cy="40" r="20" fill="currentColor" opacity="0.4" />
          <circle cx="50" cy="40" r="14" fill="currentColor" opacity="0.6" />
          <circle cx="50" cy="40" r="8" fill="currentColor" opacity="0.8" />
          <path d="M0,45 L100,45 M0,48 L100,48" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        </svg>
      );
      break;
    case 'moonlit-sky':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '80px', display: 'block' }}>
          <circle cx="80" cy="20" r="10" fill="currentColor" opacity="0.8" />
          <path d="M20,35 Q30,25 45,28 Q55,22 65,33 Z" fill="currentColor" opacity="0.3" />
          {[10, 25, 40, 55, 70].map((x, i) => (
            <circle key={i} cx={x} cy={5 + (i % 3) * 8} r="0.8" fill="currentColor" opacity="0.9" />
          ))}
        </svg>
      );
      break;
    case 'stars':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '80px', display: 'block' }}>
          {[...Array(20)].map((_, i) => (
            <circle key={i} cx={5 + (i * 17) % 95} cy={5 + (i * 11) % 40} r={0.5 + (i % 3) * 0.4} fill="currentColor" opacity={0.4 + (i % 3) * 0.2} />
          ))}
          <path d="M20,10 L22,14 L26,14 L23,17 L24,21 L20,18 L16,21 L17,17 L14,14 L18,14 Z" fill="currentColor" opacity="0.6" />
          <path d="M70,30 L71,33 L74,33 L72,35 L73,38 L70,36 L67,38 L68,35 L66,33 L69,33 Z" fill="currentColor" opacity="0.5" transform="scale(0.7) translate(30,-10)" />
        </svg>
      );
      break;
    case 'crescent-moon':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '90px', display: 'block' }}>
          <path d="M80,15 A12,12 0 1,0 95,30 A14,14 0 0,1 80,15 Z" fill="currentColor" opacity="0.8" />
          {[15, 35, 55, 75].map((x, i) => (
            <circle key={i} cx={x} cy={10 + (i % 2) * 15} r="1" fill="currentColor" opacity="0.6" />
          ))}
        </svg>
      );
      break;
    case 'rain':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '80px', display: 'block' }}>
          {[...Array(15)].map((_, i) => (
            <line key={i} x1={5 + i * 6.5} y1={((i * 7) % 30)} x2={3 + i * 6.5} y2={((i * 7) % 30) + 12} stroke="currentColor" strokeWidth="0.8" opacity={0.3 + (i % 4) * 0.15} />
          ))}
        </svg>
      );
      break;
    case 'mist':
      artwork = (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '70px', display: 'block' }}>
          <path d="M-10,30 Q20,15 50,25 T110,20 L110,40 L-10,40 Z" fill="currentColor" opacity="0.2" />
          <path d="M-10,35 Q30,25 60,32 T110,30 L110,40 L-10,40 Z" fill="currentColor" opacity="0.3" />
          <path d="M-10,40 Q40,35 70,38 T110,36 L110,40 L-10,40 Z" fill="currentColor" opacity="0.4" />
        </svg>
      );
      break;
    case 'abstract-curves':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '90px', display: 'block' }}>
          <path d="M0,50 Q25,20 50,50 T100,50" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
          <path d="M0,50 Q30,30 60,50 T100,50" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <path d="M0,50 Q35,40 70,50 T100,50" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
        </svg>
      );
      break;
    case 'abstract-waves':
      artwork = (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '80px', display: 'block' }}>
          <path d="M-10,20 Q15,0 40,20 T90,20 T110,20 L110,40 L-10,40 Z" fill="currentColor" opacity="0.3" />
          <path d="M-10,28 Q20,12 50,28 T110,28 L110,40 L-10,40 Z" fill="currentColor" opacity="0.4" />
        </svg>
      );
      break;
    case 'abstract-dots':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '90px', display: 'block' }}>
          {[...Array(24)].map((_, i) => (
            <circle key={i} cx={((i * 13) % 95) + 2.5} cy={((i * 17) % 45) + 2.5} r={0.5 + (i % 4) * 0.5} fill="currentColor" opacity={0.3 + (i % 3) * 0.2} />
          ))}
        </svg>
      );
      break;
    case 'organic-shapes':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '90px', display: 'block' }}>
          <path d="M10,40 Q25,15 45,30 Q60,40 50,50 L0,50 Z" fill="currentColor" opacity="0.4" />
          <path d="M55,50 Q65,25 85,35 Q100,45 95,50 Z" fill="currentColor" opacity="0.5" />
          <circle cx="80" cy="20" r="4" fill="currentColor" opacity="0.6" />
          <circle cx="20" cy="15" r="2" fill="currentColor" opacity="0.4" />
        </svg>
      );
      break;
    case 'geometric-pattern':
      artwork = (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '70px', display: 'block' }}>
          {[...Array(5)].map((_, i) => (
            <g key={i} transform={`translate(${i * 20}, 20)`}>
              <polygon points="10,0 20,10 10,20 0,10" fill="currentColor" opacity="0.3" />
              <polygon points="10,-10 20,0 10,10 0,0" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
            </g>
          ))}
        </svg>
      );
      break;
    case 'paper-breeze':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '90px', display: 'block' }}>
          <path d="M-10,30 Q30,40 60,20 T110,10" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <path d="M10,40 Q40,50 70,30 T110,20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          <path d="M75,10 Q80,5 85,10 Q80,15 75,10 Z" fill="currentColor" opacity="0.6" />
          <path d="M25,25 Q30,20 35,25 Q30,30 25,25 Z" fill="currentColor" opacity="0.4" transform="rotate(-15 30 25)" />
        </svg>
      );
      break;
    case 'woodland':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '90px', display: 'block' }}>
          <rect x="15" y="20" width="3" height="30" fill="currentColor" opacity="0.7" />
          <rect x="50" y="10" width="4" height="40" fill="currentColor" opacity="0.6" />
          <rect x="85" y="25" width="2" height="25" fill="currentColor" opacity="0.8" />
          <path d="M16,30 L25,22 M15,35 L5,28 M52,25 L65,15 M50,32 L35,22 M86,35 L95,30 M85,38 L78,32" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        </svg>
      );
      break;
    case 'garden':
      artwork = (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '70px', display: 'block' }}>
          <path d="M10,40 Q15,20 25,15 M35,40 Q30,25 20,20 M60,40 Q65,15 75,10 M90,40 Q85,25 75,20" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
          <circle cx="25" cy="15" r="3" fill="currentColor" opacity="0.8" />
          <circle cx="20" cy="20" r="2" fill="currentColor" opacity="0.7" />
          <circle cx="75" cy="10" r="4" fill="currentColor" opacity="0.8" />
          <circle cx="75" cy="20" r="2" fill="currentColor" opacity="0.7" />
        </svg>
      );
      break;
    case 'small-birds':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '80px', display: 'block' }}>
          {[
            { x: 20, y: 15, s: 1 },
            { x: 35, y: 10, s: 0.7 },
            { x: 45, y: 22, s: 0.8 },
            { x: 75, y: 12, s: 1.2 },
            { x: 88, y: 18, s: 0.9 }
          ].map((b, i) => (
            <path key={i} d={`M${b.x},${b.y} Q${b.x+3*b.s},${b.y-3*b.s} ${b.x+6*b.s},${b.y} Q${b.x+3*b.s},${b.y-1.5*b.s} ${b.x},${b.y}`} fill="none" stroke="currentColor" strokeWidth={1*b.s} opacity="0.8" />
          ))}
        </svg>
      );
      break;
    case 'branches':
      artwork = (
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100px', display: 'block' }}>
          <path d="M-5,-5 Q30,10 60,5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
          <path d="M20,2 Q35,25 50,20" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <path d="M10,8 Q20,30 30,25" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          {[
            { x: 10, y: 8 }, { x: 25, y: 7 }, { x: 45, y: 6 },
            { x: 22, y: 15 }, { x: 40, y: 22 }, { x: 18, y: 20 }
          ].map((l, i) => (
            <ellipse key={i} cx={l.x} cy={l.y} rx="3" ry="1.5" fill="currentColor" opacity="0.6" transform={`rotate(${15 + i*20} ${l.x} ${l.y})`} />
          ))}
        </svg>
      );
      break;
    case 'coastal-horizon':
      artwork = (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '70px', display: 'block' }}>
          <path d="M0,25 L100,25" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <path d="M10,25 Q30,30 50,25 T90,25" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          <path d="M20,30 Q40,35 60,30 T100,30" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <circle cx="70" cy="20" r="8" fill="currentColor" opacity="0.4" />
        </svg>
      );
      break;
    case 'night-landscape':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '90px', display: 'block' }}>
          <path d="M0,50 L20,30 L45,45 L70,25 L100,45 L100,50 Z" fill="currentColor" opacity="0.4" />
          <path d="M10,50 L35,35 L60,48 L85,30 L100,40 L100,50 Z" fill="currentColor" opacity="0.6" />
          <circle cx="20" cy="15" r="3" fill="currentColor" opacity="0.8" />
          <circle cx="85" cy="10" r="0.5" fill="currentColor" opacity="0.9" />
          <circle cx="75" cy="15" r="0.5" fill="currentColor" opacity="0.7" />
          <circle cx="90" cy="20" r="0.5" fill="currentColor" opacity="0.8" />
        </svg>
      );
      break;
    case 'city-silhouette':
      artwork = (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '70px', display: 'block' }}>
          <path d="M0,40 L0,25 L8,25 L8,15 L16,15 L16,28 L22,28 L22,10 L32,10 L32,22 L40,22 L40,18 L50,18 L50,8 L60,8 L60,25 L68,25 L68,12 L78,12 L78,20 L88,20 L88,16 L100,16 L100,40 Z" fill="currentColor" opacity="0.5" />
          <path d="M10,40 L10,30 L14,30 L14,40 M24,40 L24,32 L30,32 L30,40 M52,40 L52,25 L58,25 L58,40 M70,40 L70,28 L76,28 L76,40 M90,40 L90,30 L96,30 L96,40" fill="var(--bg-panel)" opacity="0.3" />
        </svg>
      );
      break;
    case 'stationery-minimal':
      artwork = (
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '80px', display: 'block' }}>
          <line x1="10" y1="20" x2="90" y2="20" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />
          <line x1="10" y1="30" x2="90" y2="30" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />
          <line x1="10" y1="40" x2="90" y2="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.5" />
          <circle cx="50" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        </svg>
      );
      break;
    default:
      return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: theme === 'branches' ? 'auto' : 0,
        top: theme === 'branches' ? 0 : 'auto',
        left: 0,
        right: 0,
        color: color,
        opacity: 0.1, // Subtle, 10% opacity as requested
        pointerEvents: 'none',
        overflow: 'hidden',
        borderBottomLeftRadius: theme === 'branches' ? 0 : '12px',
        borderBottomRightRadius: theme === 'branches' ? 0 : '12px',
        borderTopLeftRadius: theme === 'branches' ? '12px' : 0,
        borderTopRightRadius: theme === 'branches' ? '12px' : 0,
      }}
    >
      {artwork}
    </div>
  );
}
