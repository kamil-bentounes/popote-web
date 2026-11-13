import { fusionne, type Section } from './section'

const modules = import.meta.glob<{ section: Section }>('./sections/*.tsx', { eager: true })
const sections = fusionne(Object.keys(modules).sort().map((chemin) => modules[chemin]!.section))

export function Banc() {
  return (
    <div className="page">
      <header>
        <h1 className="titre">Banc de Popote</h1>
        <p className="texte-doux">Chaque composant du système « Jeu », dans chacun de ses états. Cette page n’est jamais livrée.</p>
      </header>
      {sections.map(({ titre, cas }) => (
        <section key={titre} data-section={titre} aria-labelledby={`titre-${titre}`}>
          <h2 className="titre" id={`titre-${titre}`}>{titre}</h2>
          <div className="grille">
            {cas.map((unCas) => (
              <div className="cas" key={unCas.legende} data-cas={unCas.legende}>
                {unCas.rendu}
                <small>{unCas.legende}</small>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

