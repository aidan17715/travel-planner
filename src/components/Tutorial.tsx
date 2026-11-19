import { useEffect } from 'react'
import { TUTORIAL_STEPS } from '../tutorial.ts'

interface Props {
  step: number
  onStep: (step: number) => void
  onClose: () => void
}

export function Tutorial({ step, onStep, onClose }: Props) {
  const current = TUTORIAL_STEPS[step]
  const last = step === TUTORIAL_STEPS.length - 1

  useEffect(() => {
    const selector = current.scrollTo
    const timer = setTimeout(() => {
      const el = selector ? document.querySelector(selector) : null
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 150)
    return () => clearTimeout(timer)
  }, [current])

  return (
    <aside className="tutorial" role="dialog" aria-label="Tutorial">
      <div className="tutorial-card">
        <div className="tutorial-top">
          <small className="muted">Tutorial · step {step + 1} of {TUTORIAL_STEPS.length}</small>
          <button className="link" onClick={onClose}>Skip tutorial</button>
        </div>
        <h3>{current.title}</h3>
        <p>{current.body}</p>
        <div className="tutorial-dots" aria-hidden="true">
          {TUTORIAL_STEPS.map((_, i) => (
            <span key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
        <div className="row">
          <button disabled={step === 0} onClick={() => onStep(step - 1)}>← Back</button>
          <button className="primary" onClick={() => (last ? onClose() : onStep(step + 1))}>{last ? 'Finish' : 'Next →'}</button>
        </div>
      </div>
    </aside>
  )
}
