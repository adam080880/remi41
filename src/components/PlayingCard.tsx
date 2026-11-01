import type { ReactNode } from 'react'
import { SUIT_NAMES } from '../game/engine'
import type { Card, Rank, Suit } from '../game/engine'

const W = 200
const H = 280

const SUIT_PATHS: Record<Suit, string> = {
  spade:
    'M0-22C-5-13-20-5-20 7c0 7 5 11 11 11 3 0 6-1 7-4-1 5-3 8-6 10h16c-3-2-5-5-6-10 1 3 4 4 7 4 6 0 11-4 11-11C20-5 5-13 0-22Z',
  heart: 'M0 21C-6 13-21 3-21-9c0-7 5-12 11-12 4 0 8 2 10 7 2-5 6-7 10-7 6 0 11 5 11 12C21 3 6 13 0 21Z',
  diamond: 'M0-23 17 0 0 23-17 0Z',
  club:
    'M0-22a10 10 0 0 1 8 16 10 10 0 1 1-5 16c1 5 3 8 6 10H-9c3-2 5-5 6-10a10 10 0 1 1-5-16 10 10 0 0 1 8-16Z',
}

const RED = '#b3261e'
const INK = '#1b1f2a'
const GOLD = '#d9a441'

const suitColor = (suit: Suit) => (suit === 'heart' || suit === 'diamond' ? RED : INK)

/** Pip positions in card units; those past the middle are drawn upside down. */
const COLS = { left: 66, mid: 100, right: 134 }
const ROWS = { top: 62, upper: 114, high: 101, mid: 140, low: 179, lower: 166, bottom: 218 }
const { left: L, mid: M, right: R } = COLS
const { top: T, upper: U, high: G, mid: C, low: D, lower: O, bottom: B } = ROWS
const PIPS: Partial<Record<Rank, [number, number][]>> = {
  '2': [[M, T], [M, B]],
  '3': [[M, T], [M, C], [M, B]],
  '4': [[L, T], [R, T], [L, B], [R, B]],
  '5': [[L, T], [R, T], [M, C], [L, B], [R, B]],
  '6': [[L, T], [R, T], [L, C], [R, C], [L, B], [R, B]],
  '7': [[L, T], [R, T], [M, G], [L, C], [R, C], [L, B], [R, B]],
  '8': [[L, T], [R, T], [M, G], [L, C], [R, C], [M, D], [L, B], [R, B]],
  '9': [[L, T], [R, T], [L, U], [R, U], [M, C], [L, O], [R, O], [L, B], [R, B]],
  '10': [[L, T], [R, T], [M, 88], [L, U], [R, U], [L, O], [R, O], [M, 192], [L, B], [R, B]],
}

function Pip({ suit, x, y, size = 1, flip = false }: { suit: Suit; x: number; y: number; size?: number; flip?: boolean }) {
  return (
    <path
      d={SUIT_PATHS[suit]}
      fill={suitColor(suit)}
      transform={`translate(${x} ${y}) scale(${size}) ${flip ? 'rotate(180)' : ''}`}
    />
  )
}

/** Javanese-inspired court figures: blangkon (J), sanggul with flower (Q), crowned raja (K). */
function CourtHalf({ rank, suit }: { rank: Rank; suit: Suit }): ReactNode {
  const color = suitColor(suit)
  const skin = '#e8bd8f'
  const head = (
    <>
      <path d="M-13 -30h26v14c0 10-6 17-13 17s-13-7-13-17Z" fill={skin} stroke={INK} strokeWidth="1.5" />
      <path d="M-6-17h3M3-17h3" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M-4-6q4 3 8 0" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
    </>
  )
  const robe = (
    <>
      <path d="M-40 28C-38 8-24 2-12 0L0 12 12 0c12 2 26 8 28 28Z" fill={color} stroke={INK} strokeWidth="1.5" />
      <path d="M-12 0 0 12 12 0v6L0 20-12 6Z" fill={GOLD} />
      <circle cx="-24" cy="17" r="3" fill={GOLD} />
      <circle cx="24" cy="17" r="3" fill={GOLD} />
    </>
  )
  const headwear =
    rank === 'K' ? (
      <path d="M-18-28-22-54l11 12 11-18 11 18 11-12-4 26Z" fill={GOLD} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
    ) : rank === 'Q' ? (
      <>
        <path d="M-16-22c-3-18 8-26 16-26s19 8 16 26c-8-7-24-7-32 0Z" fill={INK} />
        <circle cx="13" cy="-40" r="7" fill={GOLD} stroke={INK} strokeWidth="1" />
        <circle cx="13" cy="-40" r="2.5" fill={RED} />
      </>
    ) : (
      <>
        <path d="M-16-22c-1-14 7-20 16-20s17 6 16 20c-9-5-23-5-32 0Z" fill={color} stroke={INK} strokeWidth="1.5" />
        <path d="M14-34c8-1 12 3 11 10-4-1-9-3-12-6Z" fill={GOLD} stroke={INK} strokeWidth="1.2" />
      </>
    )
  return (
    <>
      {robe}
      {head}
      {headwear}
    </>
  )
}

function CardFace({ card }: { card: Card }) {
  const { suit, rank } = card
  const color = suitColor(suit)
  const isCourt = rank === 'J' || rank === 'Q' || rank === 'K'
  const index = (
    <g>
      <text
        x="27"
        y="46"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize={rank === '10' ? 30 : 36}
        letterSpacing={rank === '10' ? -2 : 0}
        fill={color}
      >
        {rank}
      </text>
      <Pip suit={suit} x={27} y={68} size={0.62} />
    </g>
  )
  return (
    <>
      <rect x="2" y="2" width={W - 4} height={H - 4} rx="16" fill="#fffdf6" stroke="#c9c2ad" strokeWidth="2" />
      {index}
      <g transform={`rotate(180 ${W / 2} ${H / 2})`}>{index}</g>
      {rank === 'A' && (
        <>
          <circle cx={W / 2} cy={H / 2} r="50" fill="none" stroke={GOLD} strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
          <Pip suit={suit} x={W / 2} y={H / 2} size={1.75} />
        </>
      )}
      {isCourt && (
        <>
          <rect x="50" y="34" width="100" height="212" rx="6" fill="#f6edd6" stroke={GOLD} strokeWidth="2.5" />
          <clipPath id={`court-${card.id}`}>
            <rect x="52" y="36" width="96" height="104" />
          </clipPath>
          <g clipPath={`url(#court-${card.id})`}>
            <g transform="translate(100 104)">
              <CourtHalf rank={rank} suit={suit} />
            </g>
          </g>
          <g transform={`rotate(180 ${W / 2} ${H / 2})`} clipPath={`url(#court-${card.id})`}>
            <g transform="translate(100 104)">
              <CourtHalf rank={rank} suit={suit} />
            </g>
          </g>
          <path d="M52 140h96" stroke={GOLD} strokeWidth="2.5" />
          <Pip suit={suit} x={132} y={56} size={0.5} />
          <Pip suit={suit} x={68} y={224} size={0.5} flip />
        </>
      )}
      {PIPS[rank]?.map(([x, y]) => <Pip key={`${x}-${y}`} suit={suit} x={x} y={y} size={0.8} flip={y > H / 2} />)}
    </>
  )
}

/** The back uses a kawung batik motif: overlapping ovals in a repeating diamond grid. */
function CardBack() {
  const cells = []
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 6; x++) {
      const cx = 22 + x * 31
      const cy = 24 + y * 33
      cells.push(
        <g key={`${x}-${y}`} transform={`translate(${cx} ${cy})`}>
          {[0, 90, 180, 270].map((angle) => (
            <ellipse key={angle} cx="0" cy="-9" rx="5.6" ry="9" fill="#d9a441" opacity="0.9" transform={`rotate(${angle})`} />
          ))}
          <circle r="2.2" fill="#6e1f23" />
        </g>,
      )
    }
  }
  return (
    <>
      <rect x="2" y="2" width={W - 4} height={H - 4} rx="16" fill="#fffdf6" stroke="#c9c2ad" strokeWidth="2" />
      <clipPath id="back-clip">
        <rect x="12" y="12" width={W - 24} height={H - 24} rx="9" />
      </clipPath>
      <g clipPath="url(#back-clip)">
        <rect x="12" y="12" width={W - 24} height={H - 24} fill="#6e1f23" />
        {cells}
      </g>
      <rect x="12" y="12" width={W - 24} height={H - 24} rx="9" fill="none" stroke="#d9a441" strokeWidth="3" />
    </>
  )
}

export function PlayingCard({ card, faceDown = false }: { card?: Card; faceDown?: boolean }) {
  const hidden = faceDown || !card
  return (
    <svg
      className="card-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={hidden ? 'Kartu tertutup' : `${card.rank} ${SUIT_NAMES[card.suit]}`}
    >
      {hidden ? <CardBack /> : <CardFace card={card} />}
    </svg>
  )
}
