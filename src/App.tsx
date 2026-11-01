import { useEffect, useLayoutEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { PlayingCard } from './components/PlayingCard'
import { chooseDiscard, chooseDraw } from './game/bot'
import {
  canDiscard as isLegalDiscard,
  canDrawDiscard,
  cardValue,
  discard,
  draw,
  GAME_MODES,
  handScore,
  newRound,
  PLAYER_COUNT,
  previousPlayer,
  SUIT_NAMES,
  suitOrder,
  WIN_SCORE,
} from './game/engine'
import type { Card, GameMode, GameState, LogEntry } from './game/engine'

type Config = { humanCount: number; mode: GameMode }

const BOT_DELAY_MS = 850
/** Keep in sync with the fly animation in index.css. */
const FLY_MS = 650
const BOT_NAMES = ['Ujang', 'Siti', 'Made']
const PLAYER_COUNTS = Array.from({ length: PLAYER_COUNT }, (_, i) => i + 1)
/** Seats follow turn order clockwise, so whoever is viewing always takes from the right-hand seat. */
const SEATS = ['bottom', 'left', 'top', 'right']

const MODE_INFO: Record<GameMode, { label: string; summary: string; goal: string; scoring: string }> = {
  ketat: {
    label: 'Ketat',
    summary: 'Harus satu jenis: sekop, hati, wajik, atau keriting.',
    goal: 'Kejar 4 kartu satu jenis yang totalnya 41: As + tiga kartu bernilai 10.',
    scoring: 'Skor = total kartu di jenis terbaik, dikurangi total kartu jenis lain.',
  },
  medium: {
    label: 'Medium',
    summary: 'Harus satu warna, merah atau hitam. Jenisnya boleh campur.',
    goal: 'Kejar 4 kartu satu warna (merah atau hitam) yang totalnya pas 41. Jenisnya boleh campur.',
    scoring: 'Skor = total kartu di warna terbaik, dikurangi total kartu warna lain.',
  },
  mudah: {
    label: 'Mudah',
    summary: 'Warna dan jenis bebas campur.',
    goal: 'Kejar 4 kartu yang totalnya pas 41. Warna dan jenis bebas campur.',
    scoring: 'Skor = total semua kartu di tangan.',
  },
}

const playerNames = (humanCount: number) =>
  Array.from({ length: PLAYER_COUNT }, (_, i) => {
    if (i >= humanCount) return BOT_NAMES[i - 1]
    return humanCount === 1 ? 'Kamu' : `Pemain ${i + 1}`
  })

const sortHand = (hand: Card[], mode: GameMode) => {
  const order = suitOrder(mode)
  return [...hand].sort(
    (a, b) => order.indexOf(a.suit) - order.indexOf(b.suit) || cardValue(b) - cardValue(a),
  )
}

const cardName = (card: Card) => `${card.rank} ${SUIT_NAMES[card.suit]}`

function logText(entry: LogEntry, names: string[]): string {
  switch (entry.type) {
    case 'start':
      return `Ronde ${entry.round} dimulai`
    case 'deck':
      return `${names[entry.player]} ambil kartu dari dek`
    case 'take':
      return `${names[entry.player]} ambil ${cardName(entry.card)} dari buangan ${names[entry.from]}`
    case 'discard':
      return `${names[entry.player]} buang ${cardName(entry.card)}`
    case 'end': {
      const winners = entry.winners.map((i) => names[i]).join(' & ')
      return entry.reason === 'remi' ? `${winners} menang, pas ${WIN_SCORE}!` : `Dek habis, ${winners} menang`
    }
  }
}

function GameLog({ log, names, open }: { log: LogEntry[]; names: string[]; open: boolean }) {
  return (
    <aside id="game-log" className={`log ${open ? 'open' : ''}`} aria-label="Log permainan">
      <h2>Log</h2>
      <ol>
        {log.map((entry, i) => ({ entry, i })).reverse().map(({ entry, i }) => (
          <li key={i} className={`log-${entry.type}`}>{logText(entry, names)}</li>
        ))}
      </ol>
    </aside>
  )
}

type Flight = { card: Card; left: number; top: number; width: number; dx: number; dy: number }

function Setup({ onStart }: { onStart: (config: Config) => void }) {
  const [humanCount, setHumanCount] = useState(1)
  const [mode, setMode] = useState<GameMode>('ketat')
  const botCount = PLAYER_COUNT - humanCount
  return (
    <div className="overlay">
      <form
        className="panel setup"
        onSubmit={(e) => {
          e.preventDefault()
          onStart({ humanCount, mode })
        }}
      >
        <h2>Remi 41</h2>
        <fieldset>
          <legend>Berapa orang yang main?</legend>
          <div className="count-options">
            {PLAYER_COUNTS.map((count) => (
              <label key={count} className="choice">
                <input
                  type="radio"
                  name="humans"
                  checked={humanCount === count}
                  onChange={() => setHumanCount(count)}
                />
                <span>{count}</span>
              </label>
            ))}
          </div>
          <p className="muted">
            {botCount > 0 ? `Sisanya ${botCount} pemain AI.` : 'Semua orang, tanpa AI.'}
            {humanCount > 1 && ' Main gantian di satu layar.'}
          </p>
        </fieldset>
        <fieldset>
          <legend>Mode</legend>
          <div className="mode-options">
            {GAME_MODES.map((option) => (
              <label key={option} className="choice">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === option}
                  onChange={() => setMode(option)}
                />
                <span>
                  {MODE_INFO[option].label}
                  <small>{MODE_INFO[option].summary}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <button className="btn primary start" type="submit">Mulai main</button>
      </form>
    </div>
  )
}

function Rules({ mode, onClose }: { mode: GameMode; onClose: () => void }) {
  const info = MODE_INFO[mode]
  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel" role="dialog" aria-label="Cara main" onClick={(e) => e.stopPropagation()}>
        <h2>Cara main Remi 41</h2>
        <p className="muted">Mode {info.label}</p>
        <ul>
          <li>Tiap pemain pegang 4 kartu. {info.goal}</li>
          <li>Nilai kartu: As 11, K/Q/J 10, sisanya sesuai angka.</li>
          <li>{info.scoring}</li>
          <li>Di giliranmu, ambil satu kartu dari dek atau kartu buangan terakhir pemain sebelummu, lalu buang satu.</li>
          <li>Kartu yang baru diambil dari buangan nggak boleh langsung dibuang lagi.</li>
          <li>Begitu skor tangan pas {WIN_SCORE} setelah buang kartu, ronde langsung dimenangkan.</li>
          <li>Skor tangan nggak boleh lebih dari {WIN_SCORE}. Kartu yang bikin skor lewat {WIN_SCORE} kalau dibuang nggak bisa dipilih.</li>
          <li>Kalau dek habis, skor tertinggi yang menang. Kalau skor tertingginya sama, semuanya menang. Skor tiap ronde dijumlahkan ke papan skor.</li>
        </ul>
        <button className="btn primary" onClick={onClose}>Paham</button>
      </div>
    </div>
  )
}

function Handoff({ name, onReady }: { name: string; onReady: () => void }) {
  return (
    <div className="overlay">
      <div className="panel" role="dialog" aria-label={`Giliran ${name}`}>
        <h2>Giliran {name}</h2>
        <p className="muted">Kasih layarnya ke {name}. Kartunya baru kebuka setelah tombol ini ditekan.</p>
        <button className="btn primary" autoFocus onClick={onReady}>Lihat kartu</button>
      </div>
    </div>
  )
}

function RoundResult({
  game,
  names,
  solo,
  onNext,
  onSettings,
}: {
  game: GameState
  names: string[]
  solo: boolean
  onNext: () => void
  onSettings: () => void
}) {
  const score = (player: number) => handScore(game.hands[player], game.mode)
  const winnerNames = game.winners.map((i) => names[i]).join(' & ')
  const title = solo && game.winners.length === 1 && game.winners[0] === 0 ? 'Kamu menang!' : `${winnerNames} menang`
  const order = names.map((_, i) => i).sort((a, b) => score(b) - score(a))
  return (
    <div className="overlay">
      <div className="panel result" role="dialog" aria-label="Hasil ronde">
        <p className="eyebrow">Ronde {game.round}</p>
        <h2>{title}</h2>
        <p className="muted">
          {game.endReason === 'remi' ? `Pas ${WIN_SCORE}!` : 'Dek habis, skor tertinggi yang menang.'}
        </p>
        <ol className="result-list">
          {order.map((player) => (
            <li key={player} className={game.winners.includes(player) ? 'winner' : ''}>
              <div className="result-name">
                <strong>{names[player]}</strong>
                <span>{score(player)} poin</span>
              </div>
              <div className="result-cards">
                {sortHand(game.hands[player], game.mode).map((card) => (
                  <PlayingCard key={card.id} card={card} />
                ))}
              </div>
            </li>
          ))}
        </ol>
        <div className="result-actions">
          <button className="btn primary" autoFocus onClick={onNext}>Ronde berikutnya</button>
          <button className="btn secondary" onClick={onSettings}>Ganti pemain atau mode</button>
        </div>
      </div>
    </div>
  )
}

function Seat({
  game,
  player,
  name,
  seat,
  takeRole,
  canTake,
  onTake,
}: {
  game: GameState
  player: number
  name: string
  seat: string
  takeRole: string | null
  canTake: boolean
  onTake: () => void
}) {
  const top = game.discards[player].at(-1)
  const isActive = game.current === player && game.phase !== 'over'
  return (
    <section className={`seat seat-${seat} ${isActive ? 'active' : ''}`} aria-label={name}>
      <div className="nameplate">
        <span className="dot" />
        <strong>{name}</strong>
        <span className="total">{game.totals[player]}</span>
        {takeRole && <span className="take-badge">{takeRole}</span>}
      </div>
      <div className="seat-row">
        <div className="bot-hand" data-hand={player} aria-label={`${game.hands[player].length} kartu`}>
          {game.hands[player].map((card) => (
            <PlayingCard key={card.id} faceDown />
          ))}
        </div>
        <button
          className={`pile ${canTake ? 'takeable' : ''}`}
          data-pile={player}
          disabled={!canTake}
          onClick={onTake}
          aria-label={top ? `Ambil buangan ${name}` : `Buangan ${name} kosong`}
        >
          {top ? (
            <span key={top.id} className="pile-top">
              <PlayingCard card={top} />
            </span>
          ) : (
            <span className="pile-empty">buangan</span>
          )}
        </button>
      </div>
    </section>
  )
}

function Game({ config, onSettings }: { config: Config; onSettings: () => void }) {
  const { humanCount, mode } = config
  const shared = humanCount > 1
  const names = playerNames(humanCount)
  const [game, setGame] = useState(() => newRound({ mode }))
  const [showRules, setShowRules] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [flight, setFlight] = useState<Flight | null>(null)
  /** The human whose side of the table is on screen. */
  const [viewer, setViewer] = useState(0)
  /** On a shared screen, hands stay covered until the next human confirms they hold the device. */
  const [handHidden, setHandHidden] = useState(shared)

  const isBotTurn = game.current >= humanCount

  useEffect(() => {
    if (game.phase === 'over' || !isBotTurn) return
    const timer = setTimeout(() => {
      setGame((g) => (g.phase === 'draw' ? draw(g, chooseDraw(g)) : discard(g, chooseDiscard(g))))
    }, BOT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [game, isBotTurn])

  const lastEntry = game.log.at(-1)

  // Fly the taken card from the pile it left to the taker's hand. Both spots stay on screen.
  useLayoutEffect(() => {
    if (lastEntry?.type !== 'take') return
    const from = document.querySelector(`[data-pile="${lastEntry.from}"]`)?.getBoundingClientRect()
    const to = document.querySelector(`[data-hand="${lastEntry.player}"]`)?.getBoundingClientRect()
    if (!from || !to) return
    setFlight({
      card: lastEntry.card,
      left: from.left,
      top: from.top,
      width: from.width,
      dx: to.left + to.width / 2 - (from.left + from.width / 2),
      dy: to.top + to.height / 2 - (from.top + from.height / 2),
    })
  }, [lastEntry])

  useEffect(() => {
    if (!flight) return
    const timer = setTimeout(() => setFlight(null), FLY_MS)
    return () => clearTimeout(timer)
  }, [flight])

  const lastTake = lastEntry?.type === 'take' && game.phase === 'discard' ? lastEntry : null
  const takeRole = (player: number) => {
    if (lastTake?.player === player) return 'ngambil'
    return lastTake?.from === player ? 'diambil' : null
  }

  const needsHandoff = handHidden && !isBotTurn && game.phase !== 'over'
  const myTurn = game.current === viewer && !handHidden && game.phase !== 'over'
  const canDraw = myTurn && game.phase === 'draw'
  const canDiscard = myTurn && game.phase === 'discard'
  const hand = game.hands[viewer]
  const score = canDiscard || handHidden ? null : handScore(hand, mode)

  const nextRound = () => {
    setHandHidden(shared)
    setGame((g) =>
      newRound({ mode, round: g.round + 1, starter: g.winners[0] ?? 0, totals: g.totals }),
    )
  }

  const throwCard = (cardId: string) => {
    setGame((g) => discard(g, cardId))
    setHandHidden(shared)
  }

  const statusText = () => {
    if (game.phase === 'over') return 'Ronde selesai'
    if (!myTurn) {
      if (lastTake) {
        return `${names[lastTake.player]} ngambil ${cardName(lastTake.card)} dari buangan ${names[lastTake.from]}!`
      }
      return `${names[game.current]} ${game.phase === 'draw' ? 'lagi mikir' : 'mau buang kartu'}…`
    }
    if (game.phase === 'discard') return 'Pilih satu kartu buat dibuang'
    return canDrawDiscard(game)
      ? `Ambil dari dek, atau kartu buangan ${names[previousPlayer(viewer)]}`
      : 'Ambil kartu dari dek'
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Remi <em>41</em></h1>
        <span className="muted">{MODE_INFO[mode].label} · Ronde {game.round}</span>
        <button
          className="btn ghost log-toggle"
          aria-expanded={logOpen}
          aria-controls="game-log"
          onClick={() => setLogOpen((open) => !open)}
        >
          Log
        </button>
        <button className="btn ghost" onClick={() => setShowRules(true)}>Cara main</button>
      </header>

      <div className="layout">
      <main className="table">
        {[1, 2, 3].map((offset) => {
          const player = (viewer + offset) % PLAYER_COUNT
          return (
            <Seat
              key={player}
              game={game}
              player={player}
              name={names[player]}
              seat={SEATS[offset]}
              takeRole={takeRole(player)}
              canTake={canDraw && player === previousPlayer(viewer) && canDrawDiscard(game)}
              onTake={() => setGame((g) => draw(g, 'discard'))}
            />
          )
        })}

        <div className="center">
          <button
            className={`deck ${canDraw ? 'takeable' : ''}`}
            disabled={!canDraw}
            onClick={() => setGame((g) => draw(g, 'deck'))}
            aria-label={`Ambil dari dek, sisa ${game.deck.length} kartu`}
          >
            <PlayingCard faceDown />
            <span className="deck-count">{game.deck.length}</span>
          </button>
          <p className="status" role="status">{statusText()}</p>
        </div>

        <section className={`seat seat-bottom ${myTurn ? 'active' : ''}`} aria-label={`Tangan ${names[viewer]}`}>
          <div className="me-bar">
            <div className="nameplate">
              <span className="dot" />
              <strong>{names[viewer]}</strong>
              <span className="total">{game.totals[viewer]}</span>
              {takeRole(viewer) && <span className="take-badge">{takeRole(viewer)}</span>}
            </div>
            <div className="my-pile" data-pile={viewer}>
              {game.discards[viewer].at(-1) && <PlayingCard card={game.discards[viewer].at(-1)} />}
            </div>
            {score !== null && <span className="score">Skor tangan <b>{score}</b></span>}
          </div>
          <div className="hand" data-hand={viewer}>
            {handHidden
              ? hand.map((card) => (
                  <div key={card.id} className="hand-card">
                    <PlayingCard faceDown />
                  </div>
                ))
              : sortHand(hand, mode).map((card) => {
                  const locked = card.id === game.lockedCardId
                  const resulting = handScore(hand.filter((c) => c !== card), mode)
                  const legal = canDiscard && isLegalDiscard(game, card)
                  const previewText = locked ? 'kunci' : resulting > WIN_SCORE ? `> ${WIN_SCORE}` : `→ ${resulting}`
                  return (
                    <button
                      key={card.id}
                      className={`hand-card ${legal ? 'playable' : ''} ${card.id === game.drawnCardId ? 'fresh' : ''}`}
                      disabled={!legal}
                      onClick={() => throwCard(card.id)}
                      aria-label={`Buang ${card.rank} ${SUIT_NAMES[card.suit]}, skor jadi ${resulting}`}
                    >
                      {canDiscard && <span className="preview">{previewText}</span>}
                      <PlayingCard card={card} />
                    </button>
                  )
                })}
          </div>
        </section>
      </main>
      <GameLog log={game.log} names={names} open={logOpen} />
      </div>

      {flight && (
        <div
          className="fly"
          aria-hidden="true"
          style={{
            left: flight.left,
            top: flight.top,
            width: flight.width,
            '--dx': `${flight.dx}px`,
            '--dy': `${flight.dy}px`,
          } as CSSProperties}
        >
          <PlayingCard card={flight.card} />
        </div>
      )}

      {game.phase === 'over' && (
        <RoundResult game={game} names={names} solo={!shared} onNext={nextRound} onSettings={onSettings} />
      )}
      {needsHandoff && (
        <Handoff
          name={names[game.current]}
          onReady={() => {
            setViewer(game.current)
            setHandHidden(false)
          }}
        />
      )}
      {showRules && <Rules mode={mode} onClose={() => setShowRules(false)} />}
    </div>
  )
}

export default function App() {
  const [config, setConfig] = useState<Config | null>(null)
  return config ? (
    <Game config={config} onSettings={() => setConfig(null)} />
  ) : (
    <Setup onStart={setConfig} />
  )
}
