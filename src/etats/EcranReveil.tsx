import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useRef, type Ref } from 'react'
import { annonces, reveil as textes } from '../textes/reveil'
import { Block } from '../ui/Block'
import { classes } from '../ui/classes'
import { Enter } from '../ui/Enter'
import { Pot } from '../ui/Pot'
import { useMouvementReduit } from '../ui/useMouvementReduit'
import { variantesEcran } from './mouvement-reveil'
import { reveil, useReveil, type EtatReveil, type Reveil } from './reveil'
import { useFocusDuReveil } from './useFocusDuReveil'

type EtatAffiche = Exclude<EtatReveil, { phase: 'repos' }>

interface ContenuProps {
  etat: EtatAffiche
  titreRef?: Ref<HTMLHeadingElement>
  /** La mise en page du cadre : l'écran réel le pose sur toute la fenêtre, le banc dans une scène. */
  className?: string
}

/**
 * Ce que l'on voit : la marmite qui dort, un bloc avec le titre et la phrase du moment. Rien ici ne sait le temps qui passe : la
 * machine (`reveil.ts`) donne le `palier`, la phrase change, et c'est tout (un changement de phrase est visuel, il ne s'annonce
 * pas). Les deux seules annonces sont celles de la région de la marmite, présente dès l'ouverture : « se réveille », puis « prêt ».
 * La marmite est la seule région `status` de l'écran.
 */
export function ContenuReveil({ etat, titreRef, className }: ContenuProps) {
  const pret = etat.phase === 'pret'
  return (
    <div className={classes('flex h-full flex-col items-center justify-center gap-7 bg-ciel p-6', className)}>
      <Enter rang={0} className="flex">
        {/* `joieMs` infini : l'écran s'efface de lui-même, la joie n'a pas à retomber sous « C'est prêt ». */}
        <Pot etat={pret ? 'joie' : 'sommeil'} annonce={pret ? annonces.pret : annonces.reveil} joieMs={Infinity} className="size-52" />
      </Enter>
      <Enter rang={1} className="w-full max-w-sm">
        <Block className="px-6 py-5 text-center">
          <h1 ref={titreRef} tabIndex={-1} className="titre text-titre-s outline-none">
            {textes.titre}
          </h1>
          <p className="mt-2 min-h-[2.7em]">{pret ? textes.pret : textes.phrases[etat.palier]}</p>
        </Block>
      </Enter>
    </div>
  )
}

function Cadre({ etat, titreRef }: ContenuProps) {
  // Lu ici, non dans `EcranReveil` : la racine n'a pas besoin du fournisseur tant que l'écran n'est pas affiché.
  const reduit = useMouvementReduit()
  return (
    <m.div {...variantesEcran(reduit)} className="fixed inset-0 z-[60] pt-[env(safe-area-inset-top)]">
      <ContenuReveil etat={etat} titreRef={titreRef} />
    </m.div>
  )
}

/**
 * L'écran de réveil, branché sur la machine (`magasin`) : il est posé dans `<Transverses />`, hors de `#coque` (que la racine rend
 * inerte tant que l'écran existe), prend le focus à son ouverture et le rend à sa fermeture.
 */
export function EcranReveil({ magasin = reveil }: { magasin?: Reveil }) {
  const etat = useReveil(magasin)
  const titre = useRef<HTMLHeadingElement>(null)
  useFocusDuReveil(etat.phase !== 'repos', titre)
  return <AnimatePresence>{etat.phase !== 'repos' && <Cadre key="reveil" etat={etat} titreRef={titre} />}</AnimatePresence>
}
