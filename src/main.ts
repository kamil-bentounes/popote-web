import './attente.css'
import { registerSW } from 'virtual:pwa-register'
import { nettoieAncienFrontDe } from './ancien-front'

nettoieAncienFrontDe(window)
registerSW({ immediate: true })
