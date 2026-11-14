import { useState } from 'react'
import { LinkButton } from '../ui/LinkButton'
import { Stamp } from '../ui/Stamp'

/** Un tampon qui se pose ; « Poser le tampon » le remonte, donc le rejoue depuis son départ. */
export function TamponQuiArrive() {
  const [fois, setFois] = useState(0)
  return (
    <>
      <div className="rangee" data-tampon-banc>
        <Stamp key={fois}>Mangé !</Stamp>
      </div>
      <small><LinkButton onClick={() => setFois(fois + 1)}>Poser le tampon</LinkButton></small>
    </>
  )
}
