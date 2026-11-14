import { useState } from 'react'
import { Button } from '../ui/Button'
import { Pot } from '../ui/Pot'

/** La joie de `reference.html` (« Touche le bouton ») : un geste abouti, deux sauts, puis elle retombe d'elle-même. */
export function MarmiteEnJoie() {
  const [etat, setEtat] = useState<'repos' | 'joie'>('repos')
  return (
    <div className="marmite-centre">
      <Pot etat={etat} onJoieFinie={() => setEtat('repos')} />
      <Button size="petit" onClick={() => setEtat('joie')}>Je l’ai mangé</Button>
    </div>
  )
}
