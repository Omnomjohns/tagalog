// Mata, an original Philippine tarsier drawn from flat SVG shapes. No raster images.
import type { ReactElement } from 'react';

export type MascotState = 'happy' | 'encouraging' | 'thinking' | 'celebrating' | 'sleepy' | 'surprised';
export const FUR = '#B9793F';
export const FUR_DARK = '#8A5527';
export const BELLY = '#F4E3C3';
export const EYE = '#3B2314';

type Pt = [number, number];
const ARMS: Record<MascotState, [Pt, Pt]> = {
  happy: [[33, 99], [87, 99]],
  encouraging: [[33, 99], [100, 62]],
  thinking: [[33, 99], [70, 73]],
  celebrating: [[18, 58], [102, 58]],
  sleepy: [[35, 101], [85, 101]],
  surprised: [[24, 86], [96, 86]],
};
const MOUTHS: Record<MascotState, ReactElement> = {
  happy: <path d="M53 65 Q60 72 67 65" />,
  encouraging: <path d="M51 64 Q60 74 69 64" />,
  thinking: <path d="M55 68 L64 66" />,
  celebrating: <path d="M52 64 Q60 77 68 64 Z" fill={EYE} />,
  sleepy: <path d="M55 68 Q60 65 65 68" />,
  surprised: <ellipse cx="60" cy="69" rx="3.5" ry="4.5" fill={EYE} />,
};

/** An arm with a three-fingered gripping hand at its end. */
function Arm({ from, to }: { from: Pt; to: Pt }): ReactElement {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={FUR} strokeWidth="7" strokeLinecap="round" />
      <circle cx={to[0]} cy={to[1]} r="5" fill={FUR} />
      {[-0.8, 0, 0.8].map((d) => (
        <circle key={d} cx={to[0] + Math.cos(angle + d) * 6.5} cy={to[1] + Math.sin(angle + d) * 6.5} r="2.4" fill={BELLY} />
      ))}
    </g>
  );
}

function Eye({ cx, state }: { cx: number; state: MascotState }): ReactElement {
  const cy = 45;
  if (state === 'celebrating') {
    return (
      <g>
        <circle cx={cx} cy={cy} r="17" fill={BELLY} />
        <path d={`M${cx - 9} ${cy + 3} Q${cx} ${cy - 10} ${cx + 9} ${cy + 3}`} fill="none" stroke={EYE} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  const big = state === 'surprised';
  const [dx, dy] = state === 'thinking' ? [2, -4] : [0, 0];
  return (
    <g>
      <circle cx={cx} cy={cy} r={big ? 18.5 : 17} fill={BELLY} />
      <g className="mascot-blink" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={cx + dx} cy={cy + dy} r={big ? 14.5 : 13} fill={EYE} />
        <circle cx={cx + dx - 4} cy={cy + dy - 5} r="4" fill="#fff" />
        <circle cx={cx + dx + 4} cy={cy + dy + 4} r="1.8" fill="#fff" opacity="0.8" />
      </g>
      {state === 'sleepy' && <path d={`M${cx - 17.5} ${cy + 2} A17.5 17.5 0 0 1 ${cx + 17.5} ${cy + 2} Z`} fill={FUR_DARK} />}
    </g>
  );
}

const CONFETTI: [number, number, string, number][] = [
  [14, 22, '#0F766E', 20], [30, 8, '#C98A1B', -15], [60, 3, '#7B1E26', 40], [90, 9, '#0F766E', 10], [106, 24, '#C98A1B', -30], [8, 44, '#7B1E26', 25], [112, 46, '#0F766E', -20],
];

export function Mascot({ state = 'happy', size = 120, title }: { state?: MascotState; size?: number; title?: string }): ReactElement {
  const [left, right] = ARMS[state];
  const droop = state === 'sleepy' ? 22 : 0;
  return (
    <svg className={`mascot mascot-${state}`} viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={title ?? `Mata the tarsier, ${state}`}>
      <path d="M72 96 C100 108 116 86 103 66 C98 58 105 51 110 56" fill="none" stroke={FUR_DARK} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="60" cy="88" rx="24" ry="23" fill={FUR} />
      <ellipse cx="60" cy="92" rx="15" ry="16" fill={BELLY} />
      <ellipse cx="47" cy="110" rx="10" ry="5" fill={FUR_DARK} />
      <ellipse cx="73" cy="110" rx="10" ry="5" fill={FUR_DARK} />
      <g transform={`rotate(${-24 - droop} 28 40) translate(0 ${droop / 3})`}>
        <ellipse cx="22" cy="34" rx="12" ry="15" fill={FUR} />
        <ellipse cx="22" cy="35" rx="6.5" ry="9" fill={BELLY} />
      </g>
      <g transform={`rotate(${24 + droop} 92 40) translate(0 ${droop / 3})`}>
        <ellipse cx="98" cy="34" rx="12" ry="15" fill={FUR} />
        <ellipse cx="98" cy="35" rx="6.5" ry="9" fill={BELLY} />
      </g>
      <ellipse cx="60" cy="46" rx="39" ry="33" fill={FUR} />
      <Eye cx={41} state={state} />
      <Eye cx={79} state={state} />
      <ellipse cx="60" cy="60" rx="3.5" ry="2.5" fill={FUR_DARK} />
      <g fill="none" stroke={EYE} strokeWidth="2.5" strokeLinecap="round">{MOUTHS[state]}</g>
      <Arm from={[41, 84]} to={left} />
      <Arm from={[79, 84]} to={right} />
      {state === 'celebrating' && CONFETTI.map(([x, y, fill, rot]) => (
        <rect key={`${x}-${y}`} className="mascot-confetti" x={x} y={y} width="6" height="3.5" rx="1" fill={fill} transform={`rotate(${rot} ${x} ${y})`} />
      ))}
    </svg>
  );
}
