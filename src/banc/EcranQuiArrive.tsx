import { useState } from 'react'
import { Bubble } from '../ui/Bubble'
import { Button } from '../ui/Button'
import { Enter } from '../ui/Enter'
import { LinkButton } from '../ui/LinkButton'
import { Screen } from '../ui/Screen'

/** Un écran dont les éléments arrivent l'un après l'autre ; « Rejouer » le remonte, donc le rejoue depuis le début. */
export function EcranQuiArrive() {
  const [fois, setFois] = useState(0)
  return (
    <>
      <Screen key={fois} className="scene flex flex-col justify-end gap-3 p-4" data-ecran="essai">
        <Enter rang={0}><Bubble>Bonsoir !</Bubble></Enter>
        <Enter rang={1}><span className="titre">Ce soir, c’est lasagnes.</span></Enter>
        <Enter rang={2}><Button>Je l’ai mangé</Button></Enter>
        <Enter rang={3}><span className="texte-doux">Le quatrième arrive 210 ms après le premier.</span></Enter>
      </Screen>
      <small><LinkButton onClick={() => setFois(fois + 1)}>Rejouer l’entrée</LinkButton></small>
    </>
  )
}
