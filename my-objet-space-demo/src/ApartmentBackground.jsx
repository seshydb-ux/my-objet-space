import { useEffect, useRef } from 'react'

export default function ApartmentBackground() {
  const backgroundRef = useRef(null)

  useEffect(() => {
    const background = backgroundRef.current
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0

    const update = () => {
      frame = 0
      const viewportHeight = window.innerHeight || 1
      const distance = motion.matches ? 0 : viewportHeight * 0.13 * (1 - Math.exp(-window.scrollY / (viewportHeight * 3)))
      const dimming = Math.min(window.scrollY / viewportHeight, 1) * 0.42
      background.style.setProperty('--building-travel', `${distance}px`)
      background.style.setProperty('--background-dimming', dimming)
    }
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    motion.addEventListener('change', scheduleUpdate)
    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      motion.removeEventListener('change', scheduleUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="experience-background" ref={backgroundRef} aria-hidden="true">
      <div className="experience-background__scene landing__scene">
        <div className="experience-background__travel">
          <div className="experience-background__building landing__building">
            <div className="landing__photo" />
            {[1, 2, 3, 4, 5, 6, 7].map((number) => <div key={number} className={`landing__light landing__light--${number}`} />)}
          </div>
        </div>
      </div>
      <div className="experience-background__veil" />
    </div>
  )
}
