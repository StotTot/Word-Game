import { useEffect, useRef, useState } from 'react'
import './App.css'

type LetterState = 'correct' | 'present' | 'absent' | ''

function getFeedback(guess: string, answer: string): LetterState[] {
  const feedback: LetterState[] = Array(answer.length).fill('')
  const answerArr = answer.split('')
  const guessArr = guess.split('')
  const used = Array(answer.length).fill(false)

  // First pass: correct letters
  for (let i = 0; i < answer.length; i++) {
    if (guessArr[i] === answerArr[i]) {
      feedback[i] = 'correct'
      used[i] = true
    }
  }
  // Second pass: present letters
  for (let i = 0; i < answer.length; i++) {
    if (feedback[i]) continue
    const idx = answerArr.findIndex((ch, j) => ch === guessArr[i] && !used[j])
    if (idx !== -1) {
      feedback[i] = 'present'
      used[idx] = true
    } else {
      feedback[i] = 'absent'
    }
  }
  return feedback
}

const KEYBOARD_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m','Backspace']
]

export default function App() {
  const [wordLength, setWordLength] = useState<5 | 6>(6)
  const [wordsList, setWordsList] = useState<string[]>([])
  const [answer, setAnswer] = useState<string>('')
  const [guesses, setGuesses] = useState<string[]>([])
  const [input, setInput] = useState<string[]>(Array(wordLength).fill(''))
  const [feedbacks, setFeedbacks] = useState<LetterState[][]>([])
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [animRows, setAnimRows] = useState<number[]>([])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Keyboard state for coloring
  const [keyStates, setKeyStates] = useState<Record<string, LetterState>>({})

  // Load words when wordLength changes
  useEffect(() => {
    const file = wordLength === 5 ? '5letterwords.json' : '6letterwords.json'
    fetch(file)
      .then(res => res.json())
      .then((data: { words: string[] }) => {
        const words = data.words.map(w => w.toLowerCase())
        setWordsList(words)
        if (words.length > 0) {
          const word = words[Math.floor(Math.random() * words.length)]
          setAnswer(word)
        }
      })
    setGuesses([])
    setFeedbacks([])
    setInput(Array(wordLength).fill(''))
    setStatus('playing')
    setKeyStates({})
    setAnimRows([])
    setTimeout(() => {
      inputRefs.current[0]?.focus()
    }, 0)
    // eslint-disable-next-line
  }, [wordLength])

  // Listen for real keyboard input
  useEffect(() => {
    if (status !== 'playing') return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Enter') {
        submitGuess()
      } else if (e.key === 'Backspace') {
        handleVirtualKey('Backspace')
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleVirtualKey(e.key.toLowerCase())
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line
  }, [input, status, guesses, wordsList, answer])

  function handleInputChange(i: number, val: string) {
    if (status !== 'playing') return
    val = val.replace(/[^a-zA-Z]/, '').toLowerCase()
    if (val.length > 1) return
    const newInput = [...input]
    newInput[i] = val
    setInput(newInput)
    if (val && i < wordLength - 1) {
      inputRefs.current[i + 1]?.focus()
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !input[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
    if (e.key === 'Enter') {
      submitGuess()
    }
  }

  function submitGuess() {
    if (status !== 'playing') return
    if (input.some(ch => ch.length !== 1)) return
    const guess = input.join('')
    if (!wordsList.includes(guess)) {
      alert('Not in word list')
      return
    }
    const fb = getFeedback(guess, answer)
    const newGuesses = [...guesses, guess]
    const newFeedbacks = [...feedbacks, fb]
    setGuesses(newGuesses)
    setFeedbacks(newFeedbacks)
    setInput(Array(wordLength).fill(''))
    inputRefs.current[0]?.focus()
    setAnimRows(rows => [...rows, newGuesses.length - 1]) // animate this row

    // Update keyboard coloring
    setKeyStates(prev => {
      const next = { ...prev }
      guess.split('').forEach((ch, i) => {
        const state = fb[i]
        if (
          state === 'correct' ||
          (state === 'present' && next[ch] !== 'correct') ||
          (state === 'absent' && !next[ch])
        ) {
          next[ch] = state
        }
      })
      return next
    })

    if (guess === answer) {
      setStatus('won')
    } else if (newGuesses.length === (wordLength === 5 ? 6 : 7)) {
      setStatus('lost')
    }
  }

  function handleRestart() {
    if (wordsList.length === 0) return
    const word = wordsList[Math.floor(Math.random() * wordsList.length)]
    setAnswer(word)
    setGuesses([])
    setFeedbacks([])
    setInput(Array(wordLength).fill(''))
    setStatus('playing')
    setKeyStates({})
    setAnimRows([])
    inputRefs.current[0]?.focus()
  }

  // Virtual keyboard handler
  function handleVirtualKey(key: string) {
    if (status !== 'playing') return
    if (key === 'Enter') {
      submitGuess()
    } else if (key === 'Backspace') {
      const idx = input.findIndex(ch => ch === '')
      const pos = idx === -1 ? wordLength - 1 : Math.max(0, idx - 1)
      if (input[pos]) {
        const newInput = [...input]
        newInput[pos] = ''
        setInput(newInput)
        inputRefs.current[pos]?.focus()
      }
    } else if (/^[a-z]$/.test(key)) {
      const idx = input.findIndex(ch => ch === '')
      if (idx !== -1) {
        const newInput = [...input]
        newInput[idx] = key
        setInput(newInput)
        inputRefs.current[idx]?.focus()
      }
    }
  }

  // Animation end handler
  function handleAnimationEnd(row: number) {
    setAnimRows(rows => rows.filter(r => r !== row))
  }

  return (
    <div className="App" style={{ maxWidth: 350, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>Wordle Clone</h2>
      <div style={{ marginBottom: 16 }}>
        <label>
          <input
            type="radio"
            name="wordlen"
            value={5}
            checked={wordLength === 5}
            onChange={() => setWordLength(5)}
            style={{ marginRight: 4 }}
          />
          5 Letters
        </label>
        <label style={{ marginLeft: 16 }}>
          <input
            type="radio"
            name="wordlen"
            value={6}
            checked={wordLength === 6}
            onChange={() => setWordLength(6)}
            style={{ marginRight: 4 }}
          />
          6 Letters
        </label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: wordLength === 5 ? 6 : 7 }).map((_, row) => (
          <div key={row} style={{ display: 'flex', gap: 4 }}>
            {(guesses[row] ? guesses[row].split('') : input).map((_ch, i) => (
              <input
                key={i}
                ref={el => {
                  if (row === guesses.length) inputRefs.current[i] = el
                }}
                maxLength={1}
                style={{
                  width: 40,
                  height: 40,
                  textAlign: 'center',
                  fontSize: '2rem',
                  border: '2px solid #ccc',
                  borderRadius: 4,
                  background:
                    guesses[row] && feedbacks[row]
                      ? feedbacks[row][i] === 'correct'
                        ? '#6aaa64'
                        : feedbacks[row][i] === 'present'
                        ? '#c9b458'
                        : '#787c7e'
                      : '#fff',
                  color: guesses[row] ? '#fff' : '#222',
                  transition: 'background 0.2s, transform 0.2s',
                  transform:
                    animRows.includes(row) && guesses[row]
                      ? 'scale(1.15)'
                      : 'scale(1)'
                }}
                className={animRows.includes(row) && guesses[row] ? 'bounce' : ''}
                type="text"
                inputMode="text"
                autoComplete="off"
                value={
                  guesses[row]
                    ? guesses[row][i]
                    : row === guesses.length
                    ? input[i]
                    : ''
                }
                disabled={!!guesses[row] || row !== guesses.length || status !== 'playing'}
                data-idx={i}
                onChange={e => handleInputChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onAnimationEnd={() => handleAnimationEnd(row)}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Virtual Keyboard */}
      <div style={{ marginTop: 24, userSelect: 'none' }}>
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            {row.map(key => (
              <button
                key={key}
                onClick={() => handleVirtualKey(key)}
                style={{
                  minWidth: key === 'Enter' || key === 'Backspace' ? 56 : 32,
                  height: 40,
                  margin: 2,
                  borderRadius: 4,
                  border: 'none',
                  fontSize: 18,
                  background:
                    keyStates[key] === 'correct'
                      ? '#6aaa64'
                      : keyStates[key] === 'present'
                      ? '#c9b458'
                      : keyStates[key] === 'absent'
                      ? '#787c7e'
                      : '#ddd',
                  color:
                    keyStates[key] === 'correct' ||
                    keyStates[key] === 'present' ||
                    keyStates[key] === 'absent'
                      ? '#fff'
                      : '#222',
                  cursor: 'pointer',
                  fontWeight: key === 'Enter' || key === 'Backspace' ? 'bold' : 'normal',
                  transition: 'background 0.2s'
                }}
                disabled={status !== 'playing'}
              >
                {key === 'Backspace' ? '⌫' : key}
              </button>
            ))}
          </div>
        ))}
      </div>
      <button
        style={{ marginTop: 16, padding: '8px 16px', fontSize: 16 }}
        onClick={submitGuess}
        disabled={status !== 'playing'}
      >
        Submit
      </button>
      {status === 'won' && (
        <div style={{ marginTop: 16, color: 'green', fontWeight: 'bold' }}>
          🎉 You guessed it! The word was <strong>{answer}</strong>
          <br />
          <button onClick={handleRestart} style={{ marginTop: 8 }}>Play Again</button>
        </div>
      )}
      {status === 'lost' && (
        <div style={{ marginTop: 16, color: 'red', fontWeight: 'bold' }}>
          ❌ Out of guesses! The word was <strong>{answer}</strong>
          <br />
          <button onClick={handleRestart} style={{ marginTop: 8 }}>Try Again</button>
        </div>
      )}
      {/* Animations CSS */}
      <style>{`
        .bounce {
          animation: bounce 0.25s;
        }
        @keyframes bounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.15); }
          60% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}