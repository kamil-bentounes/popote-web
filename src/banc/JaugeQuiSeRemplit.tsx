import { useState } from 'react'
import { Gauge } from '../ui/Gauge'
import { LinkButton } from '../ui/LinkButton'

const PARTS = [15, 85] as const

/** Une jauge qui repart : « Remplir de nouveau » change sa valeur, donc rejoue le remplissage (et les rayures, le temps qu'il dure). */
export function JaugeQuiSeRemplit() {
  const [rang, setRang] = useState(0)
  return (
    <>
      <div data-jauge-banc>
        <Gauge name="Énergie du jour" value={PARTS[rang]!} />
      </div>
      <small><LinkButton onClick={() => setRang((rang + 1) % PARTS.length)}>Remplir de nouveau</LinkButton></small>
    </>
  )
}
