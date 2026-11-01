export const SUITS = ['spade', 'heart', 'diamond', 'club'] as const
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const

export type Suit = (typeof SUITS)[number]
export type Rank = (typeof RANKS)[number]
export type Card = { id: string; suit: Suit; rank: Rank }

export const SUIT_NAMES: Record<Suit, string> = {
  spade: 'sekop',
  heart: 'hati',
  diamond: 'wajik',
  club: 'keriting',
}

export const PLAYER_COUNT = 4
export const HAND_SIZE = 4
export const WIN_SCORE = 41

export const GAME_MODES = ['ketat', 'medium', 'mudah'] as const
export type GameMode = (typeof GAME_MODES)[number]

/** Suits that count together in each mode; a hand scores on its best group. */
const SCORING_GROUPS: Record<GameMode, Suit[][]> = {
  ketat: SUITS.map((suit) => [suit]),
  medium: [['spade', 'club'], ['heart', 'diamond']],
  mudah: [[...SUITS]],
}

export type DrawSource = 'deck' | 'discard'
export type EndReason = 'remi' | 'deck-empty'

/** Public table history. A card drawn from the deck stays secret, so it isn't recorded. */
export type LogEntry =
  | { type: 'start'; round: number }
  | { type: 'deck'; player: number }
  | { type: 'take'; player: number; from: number; card: Card }
  | { type: 'discard'; player: number; card: Card }
  | { type: 'end'; winners: number[]; reason: EndReason }

export type GameState = {
  mode: GameMode
  round: number
  deck: Card[]
  hands: Card[][]
  /** Each player has their own pile; the last item is the visible top card. */
  discards: Card[][]
  current: number
  phase: 'draw' | 'discard' | 'over'
  /** A card taken from a discard pile can't be thrown back in the same turn. */
  lockedCardId: string | null
  /** The card most recently picked up, so the UI can highlight it. */
  drawnCardId: string | null
  winners: number[]
  endReason: EndReason | null
  totals: number[]
  log: LogEntry[]
}

export function cardValue(card: Card): number {
  if (card.rank === 'A') return 11
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10
  return Number(card.rank)
}

/** Best result over the mode's groups: cards in the group count up, every other card counts down. */
export function handScore(hand: Card[], mode: GameMode): number {
  const total = hand.reduce((sum, card) => sum + cardValue(card), 0)
  return Math.max(
    ...SCORING_GROUPS[mode].map((group) => {
      const inGroup = hand.filter((c) => group.includes(c.suit)).reduce((sum, c) => sum + cardValue(c), 0)
      return inGroup - (total - inGroup)
    }),
  )
}

export function isRemi(hand: Card[], mode: GameMode): boolean {
  return handScore(hand, mode) === WIN_SCORE
}

/** Mixed groups can pass 41 (A + A + K + Q = 42), which isn't allowed. */
export function isOverLimit(hand: Card[], mode: GameMode): boolean {
  return handScore(hand, mode) > WIN_SCORE
}

/** A discard is legal unless it's the card just taken or it leaves the hand over 41. */
export function canDiscard(state: GameState, card: Card): boolean {
  const hand = state.hands[state.current]
  return card.id !== state.lockedCardId && !isOverLimit(hand.filter((c) => c !== card), state.mode)
}

/** Display order that keeps cards scoring together next to each other. */
export function suitOrder(mode: GameMode): Suit[] {
  return SCORING_GROUPS[mode].flat()
}

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ id: `${suit}-${rank}`, suit, rank })))
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function previousPlayer(player: number): number {
  return (player + PLAYER_COUNT - 1) % PLAYER_COUNT
}

export function newRound(
  options: {
    mode?: GameMode
    round?: number
    starter?: number
    totals?: number[]
    random?: () => number
  } = {},
): GameState {
  const { mode = 'ketat', round = 1, starter = 0, totals = Array(PLAYER_COUNT).fill(0), random } = options
  let deck: Card[]
  let hands: Card[][]
  // Redeal over-limit hands. With every hand legal, throwing back a card drawn from the deck is
  // always allowed, so a player can never get stuck.
  do {
    deck = shuffle(createDeck(), random)
    hands = Array.from({ length: PLAYER_COUNT }, () => deck.splice(0, HAND_SIZE))
  } while (hands.some((hand) => isOverLimit(hand, mode)))
  const state: GameState = {
    mode,
    round,
    deck,
    hands,
    discards: hands.map(() => []),
    current: starter,
    phase: 'draw',
    lockedCardId: null,
    drawnCardId: null,
    winners: [],
    endReason: null,
    totals,
    log: [{ type: 'start', round }],
  }
  const dealtWinners = hands.flatMap((hand, i) => (isRemi(hand, mode) ? [i] : []))
  return dealtWinners.length > 0 ? finish(state, dealtWinners, 'remi') : state
}

function finish(state: GameState, winners: number[], endReason: EndReason): GameState {
  return {
    ...state,
    phase: 'over',
    winners,
    endReason,
    log: [...state.log, { type: 'end', winners, reason: endReason }],
    totals: state.totals.map((total, i) => total + handScore(state.hands[i], state.mode)),
  }
}

export function canDrawDiscard(state: GameState): boolean {
  const top = state.discards[previousPlayer(state.current)].at(-1)
  if (!top) return false
  // The taken card is locked, so one of the current cards must be a legal throw.
  const hand = state.hands[state.current]
  return hand.some((card) => !isOverLimit([...hand, top].filter((c) => c !== card), state.mode))
}

export function draw(state: GameState, source: DrawSource): GameState {
  if (state.phase !== 'draw') throw new Error('Not in the draw phase')
  const hands = [...state.hands]
  if (source === 'deck') {
    const [card, ...deck] = state.deck
    if (!card) throw new Error('Deck is empty')
    hands[state.current] = [...hands[state.current], card]
    return { ...state, deck, hands, phase: 'discard', lockedCardId: null, drawnCardId: card.id, log: [...state.log, { type: 'deck', player: state.current }] }
  }

  const from = previousPlayer(state.current)
  const card = state.discards[from].at(-1)
  if (!card) throw new Error('Discard pile is empty')
  if (!canDrawDiscard(state)) throw new Error('Taking this card leaves no legal discard')
  const discards = [...state.discards]
  discards[from] = discards[from].slice(0, -1)
  hands[state.current] = [...hands[state.current], card]
  return { ...state, discards, hands, phase: 'discard', lockedCardId: card.id, drawnCardId: card.id, log: [...state.log, { type: 'take', player: state.current, from, card }] }
}

export function discard(state: GameState, cardId: string): GameState {
  if (state.phase !== 'discard') throw new Error('Not in the discard phase')
  if (cardId === state.lockedCardId) throw new Error('Cannot discard the card just taken')
  const hand = state.hands[state.current]
  const card = hand.find((c) => c.id === cardId)
  if (!card) throw new Error('Card is not in hand')
  if (!canDiscard(state, card)) throw new Error('Hand would go over 41')

  const hands = [...state.hands]
  hands[state.current] = hand.filter((c) => c.id !== cardId)
  const discards = [...state.discards]
  discards[state.current] = [...discards[state.current], card]
  const next: GameState = {
    ...state,
    hands,
    discards,
    lockedCardId: null,
    drawnCardId: null,
    log: [...state.log, { type: 'discard', player: state.current, card }],
  }

  if (isRemi(hands[state.current], state.mode)) return finish(next, [state.current], 'remi')
  if (next.deck.length === 0) {
    const scores = hands.map((h) => handScore(h, state.mode))
    const best = Math.max(...scores)
    return finish(next, scores.flatMap((score, i) => (score === best ? [i] : [])), 'deck-empty')
  }
  return { ...next, phase: 'draw', current: (state.current + 1) % PLAYER_COUNT }
}
