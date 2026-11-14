import { useEffect, useEffectEvent, useState, type HTMLAttributes } from 'react'
import { annonces, signeSommeil } from '../textes/marmite'
import { classes } from './classes'
import { estUnEtat, type EtatMarmite } from './etatsMarmite'
import { sansInteraction, type Interactif } from './nonInteractif'

export type PotProps = Omit<HTMLAttributes<HTMLSpanElement>, Interactif | 'aria-hidden' | 'aria-label' | 'aria-labelledby' | 'children'> & {
  etat: EtatMarmite
  /**
   * Faire annoncer l'état aux lecteurs d'écran. `false` par défaut : la marmite est décorative, et un écran d'état n'a qu'UNE région
   * `status`, la sienne (une annonce par défaut dirait « Popote se réveille » sur l'écran « trop de demandes »). `true` : la phrase du
   * catalogue ; un texte : il remplace la phrase. La région existe dès le premier rendu, vide, et reçoit sa phrase après le montage :
   * c'est ce qui la fait annoncer ; elle reste vide au repos. C'est un `<output>` : hors d'un `<form>` (`form.reset()` en réécrit le contenu).
   */
  annonce?: boolean | string
  /** Un nom la rend `role="img"` (rare : une marmite seule, sans texte à côté). Sans nom, elle est cachée des lecteurs d'écran. */
  nom?: string
  /**
   * Combien de temps dure la joie avant le retour au repos, en ms ; `Infinity` : jamais (le banc fige la joie pour la comparer).
   * Changé en cours de joie, il relance le compte ; changé après, il ne rejoue rien.
   */
  joieMs?: number
  /** Appelée une seule fois, quand la joie s'achève d'elle-même (non quand l'état change avant la fin). */
  onJoieFinie?: () => void
}

/**
 * La marmite du système (`.marmite`) : le visage de Popote et de son assistant. Un SVG, sept états posés par `data-etat` ; le CSS du
 * système dessine les signes (lisibles sans mouvement) et fait bouger. Les couleurs viennent de classes qui lisent les jetons.
 * Décorative : c'est le texte qui l'accompagne (une bulle, un écran d'état) qui parle ; `annonce` n'est que pour une marmite qui
 * porterait seule son état. `joie` dure `joieMs`, puis elle retombe au repos d'elle-même.
 */
export function Pot({ etat, annonce = false, nom, joieMs = JOIE_PAR_DEFAUT_MS, onJoieFinie, className, ...reste }: PotProps) {
  const demande: EtatMarmite = estUnEtat(etat) ? etat : 'repos'
  // La joie qui s'achève se rattache à l'état demandé : un autre état, puis `joie` de nouveau, la rejoue.
  const [joieVue, setJoieVue] = useState(demande)
  const [joieFinie, setJoieFinie] = useState(false)
  if (joieVue !== demande) {
    setJoieVue(demande)
    setJoieFinie(false)
  }
  const affiche: EtatMarmite = demande === 'joie' && joieFinie ? 'repos' : demande

  const prevenu = useEffectEvent(() => onJoieFinie?.())
  const attente = dureeDeJoie(joieMs)
  useEffect(() => {
    // `joieFinie` : une joie achevée ne repart pas (un `joieMs` qui change ensuite n'appelle pas `onJoieFinie` une seconde fois).
    if (demande !== 'joie' || joieFinie || attente === Infinity) return
    const minuteur = setTimeout(() => {
      setJoieFinie(true)
      prevenu()
    }, attente)
    return () => clearTimeout(minuteur)
  }, [demande, joieFinie, attente])

  const phrase = annonce === false || affiche === 'repos' ? '' : annonce === true ? annonces[affiche] : annonce
  const [dite, setDite] = useState('')
  // La région doit exister, vide, avant que son texte n'arrive : seul un effet vient après le montage (voir `annonce`).
  // oxlint-disable-next-line react/set-state-in-effect -- synchroniser une région `status` (technologie d'assistance), pas dériver un état
  useEffect(() => setDite(phrase), [phrase])

  return (
    <>
      <span
        {...sansInteraction(reste)}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- un dessin SVG, pas une image fichier
        role={nom ? 'img' : undefined}
        aria-label={nom || undefined}
        aria-hidden={nom ? undefined : true}
        data-etat={affiche}
        className={classes('marmite', className)}
      >
        <Dessin />
      </span>
      {annonce !== false && <output className="sr-seul">{dite}</output>}
    </>
  )
}

const JOIE_PAR_DEFAUT_MS = 1400
// Au-delà, `setTimeout` déborde (entier de 32 bits) et part aussitôt.
const DELAI_MAX_MS = 2 ** 31 - 1

/** `Infinity` : jamais ; `NaN` : la durée par défaut ; un négatif vaut 0 ; un excès est ramené au délai maximal d'un minuteur. */
function dureeDeJoie(joieMs: number): number {
  if (joieMs === Infinity) return Infinity
  if (Number.isNaN(joieMs)) return JOIE_PAR_DEFAUT_MS
  return Math.min(Math.max(joieMs, 0), DELAI_MAX_MS)
}

/** Le SVG de `reference.html` (`POT`), en JSX : les couleurs sont des classes (`m-fond-*`, `m-trait-*`) qui lisent les jetons. */
function Dessin() {
  return (
    <svg viewBox="0 0 200 200" focusable="false">
      <g className="vapeur m-trait-gris" fill="none" strokeWidth="6" strokeLinecap="round">
        <path d="M78 40q-10-12 0-24" />
        <path d="M122 40q10-12 0-24" />
      </g>
      <text className="zzz m-fond-encre" x="150" y="50" fontSize="30" fontWeight="600">{signeSommeil}</text>
      <g className="ondes m-trait-encre" fill="none" strokeWidth="5" strokeLinecap="round">
        <path d="M4 84q-10 21 0 42" />
        <path d="M-12 74q-16 31 0 62" />
        <path d="M196 84q10 21 0 42" />
        <path d="M212 74q16 31 0 62" />
      </g>
      <rect className="m-fond-tomate m-trait-encre" x="12" y="96" width="30" height="18" rx="9" strokeWidth="5" />
      <rect className="m-fond-tomate m-trait-encre" x="158" y="96" width="30" height="18" rx="9" strokeWidth="5" />
      <path className="m-fond-tomate m-trait-encre" d="M34 84h132v54a40 40 0 01-40 40H74a40 40 0 01-40-40z" strokeWidth="5" strokeLinejoin="round" />
      <path className="m-trait-papier" d="M48 98v34" strokeWidth="8" strokeLinecap="round" opacity=".45" />
      <circle className="m-fond-rose" cx="62" cy="142" r="9" opacity=".85" />
      <circle className="m-fond-rose" cx="138" cy="142" r="9" opacity=".85" />
      <g className="yeux">
        <ellipse className="m-fond-papier m-trait-encre" cx="78" cy="122" rx="13" ry="15" strokeWidth="4" />
        <ellipse className="m-fond-papier m-trait-encre" cx="122" cy="122" rx="13" ry="15" strokeWidth="4" />
        <g className="pupilles">
          <circle className="m-fond-encre" cx="80" cy="124" r="6.5" />
          <circle className="m-fond-encre" cx="124" cy="124" r="6.5" />
          <circle className="m-fond-papier" cx="82" cy="121" r="2" />
          <circle className="m-fond-papier" cx="126" cy="121" r="2" />
        </g>
      </g>
      <g className="dodo m-trait-encre" fill="none" strokeWidth="5" strokeLinecap="round">
        <path d="M66 124q12 9 24 0" />
        <path d="M110 124q12 9 24 0" />
      </g>
      <g className="joie m-trait-encre" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M66 128l12-12 12 12" />
        <path d="M110 128l12-12 12 12" />
      </g>
      <path className="bouche m-trait-encre" d="M88 147q12 12 24 0" fill="none" strokeWidth="5" strokeLinecap="round" />
      <ellipse className="bouche-ouverte m-fond-encre" cx="100" cy="152" rx="12" ry="10" />
      <path className="goutte m-fond-ciel m-trait-encre" d="M158 60q9 13 0 19q-9-6 0-19z" strokeWidth="4" strokeLinejoin="round" />
      <g className="couvercle">
        <rect className="m-fond-jaune m-trait-encre" x="36" y="64" width="128" height="24" rx="12" strokeWidth="5" />
        <circle className="m-fond-tomate m-trait-encre" cx="100" cy="56" r="11" strokeWidth="5" />
      </g>
    </svg>
  )
}
