import '../styles/index.css'
import './banc.css'
import { MotionGlobalConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionProvider } from '../ui/MotionProvider'
import { Banc } from './Banc'

// `?fige` : les animations de Motion sautent à leur état final (la comparaison de F8b en a besoin). Axe et la garde de
// CSP parcourent le banc SANS : `skipAnimations` court-circuite ce que Motion injecte à l'exécution.
if (new URLSearchParams(location.search).has('fige')) MotionGlobalConfig.skipAnimations = true

const racine = document.getElementById('banc')
if (!racine) throw new Error('#banc introuvable dans banc.html')
createRoot(racine).render(<StrictMode><MotionProvider><Banc /></MotionProvider></StrictMode>)
