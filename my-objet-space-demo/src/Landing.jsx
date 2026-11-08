import { useEffect, useState } from 'react'
import './landing.css'

const HEADLINE = 'Everyday life\nwith LG Objet'

export default function Landing({ onStart }) {
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [length, setLength] = useState(reducedMotion ? HEADLINE.length : 0)
  const [cursorVisible, setCursorVisible] = useState(!reducedMotion)
  const [finished, setFinished] = useState(reducedMotion)

  useEffect(() => {
    if (reducedMotion) return undefined
    let interval
    let cursorTimer
    let contentTimer
    const startTimer = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setLength((current) => {
          if (current + 1 >= HEADLINE.length) {
            window.clearInterval(interval)
            return HEADLINE.length
          }
          return current + 1
        })
      }, 65)
    }, 1300)
    cursorTimer = window.setTimeout(() => setCursorVisible(false), 1300 + HEADLINE.length * 65 + 500)
    contentTimer = window.setTimeout(() => setFinished(true), 1300 + HEADLINE.length * 65 + 500)
    return () => {
      window.clearTimeout(startTimer)
      window.clearInterval(interval)
      window.clearTimeout(cursorTimer)
      window.clearTimeout(contentTimer)
    }
  }, [reducedMotion])

  return (
    <section className="landing" aria-label="LG Objet Collection 소개">
      <div className="landing__shade" aria-hidden="true" />
      <div className="landing__content">
        <p className="landing__brand">LG Objet Collection</p>
        <h1 aria-label={HEADLINE}><span aria-hidden="true">{HEADLINE.slice(0, length)}{cursorVisible && <span className="landing__cursor">|</span>}</span></h1>
        <div className={`landing__reveal${finished ? ' landing__reveal--visible' : ''}`}>
          <p className="landing__copy">나의 공간에 오브제를 미리 담아보고,<br />나다운 일상을 직접 그려보세요.</p>
          <button className="landing__cta" type="button" onClick={onStart}>우리 집에 오브제 넣어보기 <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </section>
  )
}
