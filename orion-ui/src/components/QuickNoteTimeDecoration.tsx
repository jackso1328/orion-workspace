import { CloudSun, Sun, Sunset, Moon } from 'lucide-react';

export default function QuickNoteTimeDecoration({ color }: { color?: string }) {
  const hour = new Date().getHours();
  
  // Determine time of day
  // Early morning: 5 - 7 (inclusive)
  // Day: 8 - 16 (inclusive)
  // Evening: 17 - 19 (inclusive)
  // Night: 20 - 4 (inclusive)
  
  let icon = <Moon size={16} strokeWidth={2.5} />;
  if (hour >= 5 && hour < 8) icon = <CloudSun size={16} strokeWidth={2.5} />;
  else if (hour >= 8 && hour < 17) icon = <Sun size={16} strokeWidth={2.5} />;
  else if (hour >= 17 && hour < 20) icon = <Sunset size={16} strokeWidth={2.5} />;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.4, // Subtle
        pointerEvents: 'none',
        color: color,
      }}
    >
      {icon}
    </div>
  );
}
