import { canDiscard, canDrawDiscard, cardValue, draw, handScore, WIN_SCORE } from './engine'
import type { Card, DrawSource, GameState } from './engine'

/** A visible card must beat the current hand by this much to be worth revealing intent. */
const TAKE_THRESHOLD = 4

function bestScoreAfterDiscard(state: GameState): number {
  const hand = state.hands[state.current]
  return Math.max(
    ...hand.filter((c) => canDiscard(state, c)).map((c) => handScore(hand.filter((o) => o !== c), state.mode)),
  )
}

export function chooseDraw(state: GameState): DrawSource {
  if (!canDrawDiscard(state)) return 'deck'
  const after = bestScoreAfterDiscard(draw(state, 'discard'))
  if (after === WIN_SCORE) return 'discard'
  return after - handScore(state.hands[state.current], state.mode) >= TAKE_THRESHOLD ? 'discard' : 'deck'
}

export function chooseDiscard(state: GameState): string {
  const hand = state.hands[state.current]
  const options = hand.filter((c) => canDiscard(state, c))
  const score = (card: Card) => handScore(hand.filter((c) => c !== card), state.mode)
  // On equal scores, throw the cheaper card so the next player gains less from it.
  return options.reduce((best, card) => {
    const diff = score(card) - score(best)
    if (diff !== 0) return diff > 0 ? card : best
    return cardValue(card) < cardValue(best) ? card : best
  }).id
}
