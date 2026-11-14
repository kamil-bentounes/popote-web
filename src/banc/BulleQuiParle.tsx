import { useState } from 'react'
import { Bubble } from '../ui/Bubble'
import { Button } from '../ui/Button'

const PHRASES = ['Voici ta semaine.', 'Il reste deux repas à choisir.']

/** Une région `status` est annoncée quand son texte CHANGE : le bouton le change, la bulle reste le même nœud. */
export function BulleQuiParle() {
  const [rang, setRang] = useState(0)
  return (
    <div className="rangee">
      <div className="avec-queue"><Bubble announce>{PHRASES[rang]}</Bubble></div>
      <Button variant="blanc" size="petit" onClick={() => setRang((rang + 1) % PHRASES.length)}>Changer la phrase</Button>
    </div>
  )
}
