import './attente.css'
import { registerSW } from 'virtual:pwa-register'
import { nettoieAncienFront } from './ancien-front'

nettoieAncienFront(window.localStorage)
registerSW({ immediate: true })
