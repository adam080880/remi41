import { describe, expect, it } from 'vitest'
import { chooseDiscard, chooseDraw } from './bot'
import { canDrawDiscard, createDeck, discard, draw, GAME_MODES, handScore, newRound } from './engine'
import type { Card, GameState, Rank, Suit } from './engine'

const card = (suit: Suit, rank: Rank): Card => ({ id: `${suit}-${rank}`, suit, rank })

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

describe('handScore', () => {
  it('scores ace, king, queen, jack of one suit as 41', () => {
    const hand = (['A', 'K', 'Q', 'J'] as Rank[]).map((r) => card('spade', r))
    expect(handScore(hand, 'ketat')).toBe(41)
  })

  it('subtracts cards outside the best suit', () => {
    expect(
      handScore([card('heart', 'A'), card('heart', '9'), card('club', '5'), card('spade', '2')], 'ketat'),
    ).toBe(13)
  })

  it('can be negative', () => {
    expect(
      handScore([card('heart', '2'), card('club', '2'), card('spade', '2'), card('diamond', '2')], 'ketat'),
    ).toBe(-4)
  })
})

describe('game modes', () => {
  const mixedColors = [card('spade', 'A'), card('club', 'K'), card('heart', 'Q'), card('diamond', 'J')]
  const blackOnly = [card('spade', 'A'), card('club', 'K'), card('spade', 'Q'), card('club', 'J')]

  it('ketat only counts a single suit', () => {
    expect(handScore(blackOnly, 'ketat')).toBe(1)
  })

  it('medium counts one color across its suits', () => {
    expect(handScore(blackOnly, 'medium')).toBe(41)
    expect(handScore(mixedColors, 'medium')).toBe(1)
  })

  it('mudah counts every card', () => {
    expect(handScore(mixedColors, 'mudah')).toBe(41)
  })

  const overHand = [card('spade', 'A'), card('heart', 'A'), card('club', 'K'), card('diamond', 'Q')]

  it('rejects a discard that leaves the hand over 41', () => {
    const base = newRound({ mode: 'mudah', random: seeded(1) })
    const hands = [...base.hands]
    hands[0] = [...overHand, card('club', '2')]
    const state: GameState = { ...base, hands, current: 0, phase: 'discard' }
    expect(() => discard(state, 'club-2')).toThrow()
    expect(discard(state, 'spade-A').hands[0]).toHaveLength(4)
  })

  it('wins on exactly 41 with mixed suits', () => {
    const base = newRound({ mode: 'mudah', random: seeded(1) })
    const hands = [...base.hands]
    hands[0] = [...overHand, card('club', 'J')]
    const over = discard({ ...base, hands, current: 0, phase: 'discard' }, 'heart-A')
    expect(over.endReason).toBe('remi')
    expect(over.winners).toEqual([0])
  })

  it('refuses a discard pile card when nothing could be thrown after it', () => {
    const base = newRound({ mode: 'mudah', random: seeded(1) })
    const hands = [...base.hands]
    hands[1] = [card('spade', 'A'), card('heart', 'A'), card('club', 'A'), card('club', 'K')]
    const discards = [[card('diamond', 'Q')], [], [], []]
    const turn: GameState = { ...base, hands, discards, current: 1, phase: 'draw' }
    expect(canDrawDiscard(turn)).toBe(false)
    expect(chooseDraw(turn)).toBe('deck')
    expect(() => draw(turn, 'discard')).toThrow()
  })

  it('never deals a hand over 41', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const state = newRound({ mode: 'mudah', random: seeded(seed) })
      expect(state.hands.every((h) => handScore(h, 'mudah') <= 41)).toBe(true)
    }
  })
})

describe('game rules', () => {
  const playing = (): GameState => {
    for (let seed = 1; ; seed++) {
      const state = newRound({ random: seeded(seed) })
      if (state.phase === 'draw') return state
    }
  }

  it('deals a full deck without duplicates', () => {
    const state = playing()
    const ids = [...state.deck, ...state.hands.flat()].map((c) => c.id)
    expect(new Set(ids).size).toBe(createDeck().length)
    expect(state.hands.every((h) => h.length === 4)).toBe(true)
  })

  it('takes the discard from the previous player and locks that card', () => {
    let state = playing()
    state = draw(state, 'deck')
    const thrown = state.hands[0][0]
    state = discard(state, thrown.id)
    expect(state.current).toBe(1)
    state = draw(state, 'discard')
    expect(state.discards[0]).toEqual([])
    expect(state.hands[1]).toContainEqual(thrown)
    expect(() => discard(state, thrown.id)).toThrow()
  })

  it('logs takes and discards but keeps deck draws secret', () => {
    let state = playing()
    state = draw(state, 'deck')
    expect(state.log.at(-1)).toEqual({ type: 'deck', player: 0 })
    const thrown = state.hands[0][0]
    state = discard(state, thrown.id)
    expect(state.log.at(-1)).toEqual({ type: 'discard', player: 0, card: thrown })
    state = draw(state, 'discard')
    expect(state.log.at(-1)).toEqual({ type: 'take', player: 1, from: 0, card: thrown })
  })

  it('wins immediately on a 41 after discarding', () => {
    const state = playing()
    const remi = (['A', 'K', 'Q', 'J'] as Rank[]).map((r) => card('spade', r))
    const hands = [...state.hands]
    hands[0] = [...remi, card('club', '2')]
    const over = discard({ ...state, hands, phase: 'discard' }, 'club-2')
    expect(over.phase).toBe('over')
    expect(over.endReason).toBe('remi')
    expect(over.winners).toEqual([0])
  })

  it('ends with the highest score when the deck runs out', () => {
    const state = playing()
    const hands = [
      [card('spade', 'A'), card('spade', 'K'), card('spade', '2'), card('club', '3'), card('heart', '2')],
      [card('heart', '3'), card('club', '4'), card('spade', '5'), card('diamond', '6')],
      [card('heart', '4'), card('club', '5'), card('spade', '6'), card('diamond', '7')],
      [card('heart', '5'), card('club', '6'), card('spade', '7'), card('diamond', '8')],
    ]
    const over = discard({ ...state, hands, deck: [], phase: 'discard' }, 'heart-2')
    expect(over.endReason).toBe('deck-empty')
    expect(over.winners).toEqual([0])
    expect(over.totals[0]).toBe(handScore(over.hands[0], 'ketat'))
  })
})

describe('bots', () => {
  it('take the card that completes a 41', () => {
    const state = newRound({ random: seeded(3) })
    const hands = [...state.hands]
    hands[1] = [card('spade', 'A'), card('spade', 'K'), card('spade', 'Q'), card('club', '2')]
    const discards = [[card('spade', 'J')], [], [], []]
    const turn: GameState = { ...state, hands, discards, current: 1, phase: 'draw' }
    expect(chooseDraw(turn)).toBe('discard')
    const drawn = draw(turn, 'discard')
    expect(chooseDiscard(drawn)).toBe('club-2')
  })

  it('always finish a round with legal moves and keep all 52 cards', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const mode = GAME_MODES[seed % GAME_MODES.length]
      let state = newRound({ mode, random: seeded(seed), starter: seed % 4 })
      let guard = 0
      while (state.phase !== 'over') {
        state = state.phase === 'draw' ? draw(state, chooseDraw(state)) : discard(state, chooseDiscard(state))
        expect(++guard).toBeLessThan(2000)
      }
      const all = [...state.deck, ...state.hands.flat(), ...state.discards.flat()]
      expect(new Set(all.map((c) => c.id)).size).toBe(52)
      expect(all.length).toBe(52)
      expect(state.winners.length).toBeGreaterThan(0)
      expect(state.hands.every((h) => handScore(h, mode) <= 41)).toBe(true)
    }
  })
})
