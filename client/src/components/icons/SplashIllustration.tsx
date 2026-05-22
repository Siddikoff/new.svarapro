import { CardBack } from './CardBack';
import { Chip } from './Chip';
import { Coin } from './Coin';
import { PlayingCard } from './PlayingCard';

export type SplashKind = 'aces' | 'suits' | 'chips' | 'royal' | 'ace';

export interface SplashIllustrationProps {
  kind: SplashKind;
}

interface SplashStyle {
  bg: string;
  glow: string;
}

export function SplashIllustration({ kind }: SplashIllustrationProps) {
  const S: Record<SplashKind, SplashStyle> = {
      aces: {
        bg: 'linear-gradient(135deg,#2a1808,#7a4f12 45%,#c89026)',
        glow: 'rgba(255,210,120,0.55)',
      },
      suits: {
        bg: 'linear-gradient(135deg,#1a2440,#2a3a78 50%,#4256b8)',
        glow: 'rgba(150,180,255,0.45)',
      },
      chips: {
        bg: 'linear-gradient(135deg,#08291b,#1a6b48 55%,#2faa6e)',
        glow: 'rgba(120,230,170,0.45)',
      },
      royal: {
        bg: 'linear-gradient(135deg,#22050a,#7c1c20 50%,#b03038)',
        glow: 'rgba(255,150,110,0.55)',
      },
      ace: {
        bg: 'linear-gradient(135deg,#180428,#3e1278 50%,#7a35c8)',
        glow: 'rgba(225,168,255,0.55)',
      },
    },
    k = S[kind] || S.suits,
    T = {
      width: '100%',
      height: '100%',
      viewBox: '0 0 360 120',
      preserveAspectRatio: 'xMidYMid slice',
      style: {
        position: 'absolute' as const,
        inset: 0,
        display: 'block' as const,
      },
    },
    P =
      kind === 'aces' ? (
        <svg {...T}>
          <defs>
            <radialGradient id="acesG" cx="55%" cy="55%" r="70%">
              <stop offset="0%" stopColor={k.glow} />
              <stop offset="100%" stopColor="rgba(255,210,120,0)" />
            </radialGradient>
            <linearGradient id="boltG" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff5b8" />
              <stop offset="45%" stopColor="#ffd24a" />
              <stop offset="100%" stopColor="#ff8a00" />
            </linearGradient>
            <filter id="boltGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width={360} height={120} fill="url(#acesG)" />
          <g stroke="rgba(255,235,180,0.55)" strokeLinecap="round" fill="none">
            <line x1="40" y1="30" x2="110" y2="30" strokeWidth="2" opacity="0.5" />
            <line x1="20" y1="50" x2="130" y2="50" strokeWidth="3" opacity="0.7" />
            <line x1="30" y1="70" x2="100" y2="70" strokeWidth="2" opacity="0.45" />
            <line x1="50" y1="90" x2="120" y2="90" strokeWidth="2.5" opacity="0.6" />
            <line x1="15" y1="105" x2="95" y2="105" strokeWidth="1.5" opacity="0.4" />
          </g>
          <g filter="url(#boltGlow)">
            <path
              d="M180 8 L150 56 L172 60 L148 112 L210 50 L188 46 Z"
              fill="url(#boltG)"
              stroke="#ffe27a"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </g>
          <g opacity="0.35">
            <PlayingCard
              cx={232}
              cy={66}
              w={50}
              h={72}
              rotate={-6}
              rank="A"
              suit="spade"
              trim="#caa258"
            />
          </g>
          <g opacity="0.65">
            <PlayingCard
              cx={258}
              cy={62}
              w={52}
              h={74}
              rotate={6}
              rank="A"
              suit="heart"
              trim="#caa258"
            />
          </g>
          <PlayingCard
            cx={290}
            cy={56}
            w={56}
            h={78}
            rotate={14}
            rank="A"
            suit="diamond"
            trim="#caa258"
          />
          <g fill="#fff5b8" opacity="0.85">
            <circle cx="320" cy="30" r="2" />
            <circle cx="335" cy="100" r="2.4" />
            <circle cx="305" cy="108" r="1.6" />
            <circle cx="170" cy="95" r="1.8" />
          </g>
        </svg>
      ) : kind === 'suits' ? (
        <svg {...T}>
          <defs>
            <radialGradient id="suitsG" cx="55%" cy="55%" r="70%">
              <stop offset="0%" stopColor={k.glow} />
              <stop offset="100%" stopColor="rgba(150,180,255,0)" />
            </radialGradient>
            <linearGradient id="trophyG" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffe48a" />
              <stop offset="50%" stopColor="#f5b324" />
              <stop offset="100%" stopColor="#a86c0a" />
            </linearGradient>
            <linearGradient id="trophyHi" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <filter id="trophyGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width={360} height={120} fill="url(#suitsG)" />
          <g fill="#ffe9a3" opacity="0.85">
            {([
              [180, 18, 2.2],
              [210, 90, 1.6],
              [330, 30, 2],
              [315, 95, 1.8],
              [165, 55, 1.4],
              [345, 60, 1.6],
              [270, 108, 1.6],
              [360, 45, 1.2],
            ] as Array<[number, number, number]>).map(([_, L, x], R) => (
              <polygon
                key={R}
                points={`${_},${L - x * 2.4} ${_ + x * 0.55},${L - x * 0.55} ${_ + x * 2.4},${L} ${_ + x * 0.55},${L + x * 0.55} ${_},${L + x * 2.4} ${_ - x * 0.55},${L + x * 0.55} ${_ - x * 2.4},${L} ${_ - x * 0.55},${L - x * 0.55}`}
              />
            ))}
          </g>
          <ellipse
            cx="258"
            cy="60"
            rx="68"
            ry="50"
            fill={k.glow}
            opacity="0.6"
            filter="url(#trophyGlow)"
          />
          <path
            d="M222 35 C200 35, 195 60, 222 60"
            stroke="url(#trophyG)"
            strokeWidth="5.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M294 35 C316 35, 321 60, 294 60"
            stroke="url(#trophyG)"
            strokeWidth="5.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M222 28 L294 28 L290 70 C290 82, 280 88, 258 88 C236 88, 226 82, 226 70 Z"
            fill="url(#trophyG)"
            stroke="rgba(120,80,10,0.7)"
            strokeWidth="0.8"
          />
          <path d="M232 34 L240 34 L238 64 L232 64 Z" fill="url(#trophyHi)" opacity="0.6" />
          <ellipse cx="258" cy="30" rx="36" ry="4" fill="#7a5410" />
          <ellipse cx="258" cy="29" rx="35" ry="3" fill="#ffe48a" />
          <polygon
            points="258,42 263,53 275,54 266,62 269,74 258,68 247,74 250,62 241,54 253,53"
            fill="#a86c0a"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="0.5"
          />
          <rect x="252" y="88" width="12" height="10" fill="#a86c0a" />
          <ellipse cx="258" cy="100" rx="24" ry="4" fill="#7a5410" />
          <rect
            x="234"
            y="100"
            width="48"
            height="8"
            rx="2"
            fill="url(#trophyG)"
            stroke="rgba(120,80,10,0.7)"
            strokeWidth="0.6"
          />
          <g fill="#5dc88c" opacity="0.9" stroke="rgba(0,40,20,0.4)" strokeWidth="0.5">
            <ellipse cx="206" cy="58" rx="5" ry="3" transform="rotate(-30 206 58)" />
            <ellipse cx="199" cy="68" rx="5.5" ry="3" transform="rotate(-15 199 68)" />
            <ellipse cx="196" cy="80" rx="5" ry="3" transform="rotate(5 196 80)" />
            <ellipse cx="199" cy="92" rx="5" ry="3" transform="rotate(20 199 92)" />
            <ellipse cx="310" cy="58" rx="5" ry="3" transform="rotate(30 310 58)" />
            <ellipse cx="317" cy="68" rx="5.5" ry="3" transform="rotate(15 317 68)" />
            <ellipse cx="320" cy="80" rx="5" ry="3" transform="rotate(-5 320 80)" />
            <ellipse cx="317" cy="92" rx="5" ry="3" transform="rotate(-20 317 92)" />
          </g>
          <text
            x="258"
            y="63"
            textAnchor="middle"
            fontSize="16"
            fontWeight="900"
            fill="#ffe9a3"
            fontFamily="Georgia,serif"
            opacity="0"
          >
            {'1'}
          </text>
        </svg>
      ) : kind === 'chips' ? (
        <svg {...T}>
          <defs>
            <radialGradient id="chipsG" cx="45%" cy="60%" r="75%">
              <stop offset="0%" stopColor="rgba(80,200,140,0.30)" />
              <stop offset="100%" stopColor="rgba(0,40,30,0.55)" />
            </radialGradient>
            <radialGradient id="chipsHotspot" cx="60%" cy="55%" r="55%">
              <stop offset="0%" stopColor={k.glow} />
              <stop offset="100%" stopColor="rgba(120,230,170,0)" />
            </radialGradient>
          </defs>
          <rect width={360} height={120} fill="url(#chipsG)" />
          <rect width={360} height={120} fill="url(#chipsHotspot)" />
          <g opacity="0.25" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" fill="none">
            <ellipse cx="180" cy="180" rx="260" ry="110" />
            <ellipse cx="180" cy="190" rx="275" ry="118" />
          </g>
          <Chip cx={210} cy={104} r={22} color="#1a3c8a" />
          <Chip cx={210} cy={88} r={22} color="#a32a2a" />
          <Chip cx={210} cy={72} r={22} color="#0e6b3c" />
          <Chip cx={210} cy={56} r={22} color="#d4a017" />
          <Chip cx={210} cy={40} r={22} color="#7a2bb8" />
          <Chip cx={262} cy={102} r={18} color="#a32a2a" />
          <Chip cx={262} cy={88} r={18} color="#1a3c8a" />
          <Chip cx={262} cy={74} r={18} color="#0e6b3c" />
          <Chip cx={290} cy={106} r={14} color="#d4a017" />
          <Coin cx={300} cy={36} r={11} rotate={-15} />
          <Coin cx={325} cy={60} r={9} rotate={20} opacity={0.95} />
          <Coin cx={170} cy={36} r={9} rotate={10} opacity={0.85} />
          <Coin cx={150} cy={70} r={7} rotate={-25} opacity={0.75} />
          <Coin cx={335} cy={92} r={8} rotate={5} opacity={0.85} />
          <g fill="#fff5c0" opacity="0.9">
            <polygon points="320,20 322,26 328,28 322,30 320,36 318,30 312,28 318,26" />
            <polygon
              points="160,55 162,60 167,62 162,64 160,70 158,64 153,62 158,60"
              opacity="0.7"
            />
          </g>
        </svg>
      ) : kind === 'royal' ? (
        <svg {...T}>
          <defs>
            <radialGradient id="royalG" cx="68%" cy="55%" r="65%">
              <stop offset="0%" stopColor={k.glow} />
              <stop offset="100%" stopColor="rgba(255,150,110,0)" />
            </radialGradient>
            <pattern
              id="royalDiamond"
              x="0"
              y="0"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M12 4 L20 12 L12 20 L4 12 Z"
                fill="none"
                stroke="rgba(255,200,140,0.20)"
                strokeWidth="0.6"
              />
            </pattern>
            <linearGradient id="crownG" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffe48a" />
              <stop offset="100%" stopColor="#c8881e" />
            </linearGradient>
          </defs>
          <rect width={360} height={120} fill="url(#royalG)" />
          <rect width={360} height={120} fill="url(#royalDiamond)" />
          <g stroke="rgba(0,0,0,0.4)" strokeWidth="0.6">
            <path
              d="M218 18 L228 36 L243 22 L258 40 L273 22 L288 36 L298 18 L298 44 L218 44 Z"
              fill="url(#crownG)"
            />
            <rect x="218" y="44" width="80" height="5" rx="1.5" fill="url(#crownG)" />
            <circle cx="228" cy="18" r="2.6" fill="#ffe48a" />
            <circle cx="243" cy="22" r="2.2" fill="#fff5c0" />
            <circle
              cx="258"
              cy="22"
              r="3.2"
              fill="#ff5560"
              stroke="rgba(255,200,200,0.7)"
              strokeWidth="0.5"
            />
            <circle cx="273" cy="22" r="2.2" fill="#fff5c0" />
            <circle cx="288" cy="18" r="2.6" fill="#ffe48a" />
          </g>
          <PlayingCard
            cx={222}
            cy={84}
            w={54}
            h={78}
            rotate={-18}
            rank="A"
            suit="heart"
            trim="#caa258"
          />
          <PlayingCard
            cx={262}
            cy={78}
            w={56}
            h={80}
            rotate={0}
            rank="A"
            suit="spade"
            trim="#caa258"
          />
          <PlayingCard
            cx={302}
            cy={84}
            w={54}
            h={78}
            rotate={18}
            rank="A"
            suit="diamond"
            trim="#caa258"
          />
          <g fill="#ffe48a" opacity="0.9">
            <polygon points="180,30 183,38 191,41 183,44 180,52 177,44 169,41 177,38" />
            <polygon
              points="340,38 343,46 351,49 343,52 340,60 337,52 329,49 337,46"
              opacity="0.7"
            />
          </g>
        </svg>
      ) : (
        <svg {...T}>
          <defs>
            <radialGradient id="aceG" cx="58%" cy="50%" r="65%">
              <stop offset="0%" stopColor={k.glow} />
              <stop offset="100%" stopColor="rgba(225,168,255,0)" />
            </radialGradient>
            <filter id="aceGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width={360} height={120} fill="url(#aceG)" />
          <g fill="#ffffff" opacity="0.7">
            {[
              [180, 22, 1.4],
              [210, 90, 1],
              [240, 18, 0.8],
              [265, 108, 1.2],
              [305, 28, 1],
              [330, 55, 1.4],
              [315, 98, 1.2],
              [290, 108, 0.9],
              [195, 55, 0.9],
              [170, 90, 0.8],
              [155, 40, 1],
              [345, 80, 1.2],
            ].map(([_, L, x], R) => (
              <circle key={R} cx={_} cy={L} r={x} />
            ))}
          </g>
          <g fill="#fff" opacity="0.9" filter="url(#aceGlow)">
            {[
              [150, 30, 3],
              [345, 30, 3.2],
            ].map(([_, L, x], R) => (
              <polygon
                key={R}
                points={`${_},${L - x * 2.2} ${_ + x * 0.5},${L - x * 0.5} ${_ + x * 2.2},${L} ${_ + x * 0.5},${L + x * 0.5} ${_},${L + x * 2.2} ${_ - x * 0.5},${L + x * 0.5} ${_ - x * 2.2},${L} ${_ - x * 0.5},${L - x * 0.5}`}
              />
            ))}
          </g>
          <text
            x="258"
            y="82"
            textAnchor="middle"
            fontSize="110"
            fontWeight="900"
            fill="rgba(225,168,255,0.2)"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
            fontFamily="Georgia,serif"
          >
            {'?'}
          </text>
          <CardBack cx={210} cy={72} w={48} h={70} rotate={-20} color="#3e1278" accent="#caa258" />
          <CardBack cx={258} cy={62} w={52} h={76} rotate={0} color="#4a1782" accent="#e3c47a" />
          <CardBack cx={306} cy={72} w={48} h={70} rotate={20} color="#3e1278" accent="#caa258" />
        </svg>
      );
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 84,
        background: k.bg,
        overflow: 'hidden',
      } as React.CSSProperties}
    >
      {P}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.50) 100%)',
          pointerEvents: 'none',
        } as React.CSSProperties}
      />
    </div>
  );
}
