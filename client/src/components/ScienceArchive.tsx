/** Dirección visual: archivo de misión con tarjetas científicas y fuentes históricas verificables. */
import { availableResearch, completeResearch, RESEARCH_NODES } from "@/game/ResearchManager";
import type { TycoonState } from "@/game/TycoonState";

type Props = { state: TycoonState; open: boolean; onClose: () => void; onResearch: (id: string) => void };

const TIMELINE = [
  { era: "1959–1976 · Unión Soviética", title: "Programa Luna", note: "Las misiones Luna constituyen uno de los primeros programas sistemáticos de exploración lunar robótica.", source: "Lunar and Planetary Institute", url: "https://www.lpi.usra.edu/lunar/missions/luna/" },
  { era: "1975 · Estados Unidos / Unión Soviética", title: "Apollo–Soyuz", note: "El acoplamiento de naves de 1975 estableció un referente para la cooperación posterior en vuelos espaciales.", source: "NASA", url: "https://www.nasa.gov/apollo-soyuz-test-project/" },
  { era: "2000–actualidad · Cooperación internacional", title: "Laboratorio orbital", note: "La Estación Espacial Internacional convirtió la cooperación científica prolongada en una infraestructura compartida.", source: "NASA", url: "https://www.nasa.gov/international-space-station/" },
  { era: "2000–actualidad · Europa", title: "Exploración humana y robótica", note: "Las actividades europeas de exploración integran investigación robótica, humana y desarrollo de capacidades para misiones más lejanas.", source: "ESA", url: "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration" },
  { era: "2004–actualidad · China", title: "Programa Chang’e", note: "La secuencia de orbitadores, aterrizadores y retorno de muestras inspira la ciencia robótica del asentamiento.", source: "CNSA", url: "https://www.cnsa.gov.cn/english/n6465652/n6465653/c6810557/content.html" },
  { era: "2008–actualidad · India", title: "Programa Chandrayaan", note: "Chandrayaan-3 demostró alunizaje suave, movilidad de rover y experimentación científica en superficie.", source: "ISRO", url: "https://www.isro.gov.in/Chandrayaan3_Details.html" },
  { era: "Cooperación lunar · Japón / socios", title: "Acuerdos y exploración", note: "JAXA participa en actividades de exploración internacional vinculadas a la generación Artemis.", source: "JAXA", url: "https://www.exploration.jaxa.jp/e/activities/" },
  { era: "Actualidad · alianza internacional", title: "Generación Artemis", note: "La exploración lunar sostenida combina infraestructura, entrega de carga, rovers y colaboración internacional.", source: "NASA", url: "https://www.nasa.gov/artemis/" },
];

export default function ScienceArchive({ state, open, onClose, onResearch }: Props) {
  if (!open) return null;
  const available = new Set(availableResearch(state).map((node) => node.id));
  return <section className="science-archive" role="dialog" aria-modal="true" aria-labelledby="science-title">
    <div className="archive-frame">
      <header className="archive-header"><div><span>03 / Investigación y legado</span><h2 id="science-title">Archivo de exploración</h2></div><button type="button" onClick={onClose} aria-label="Cerrar archivo de investigación">×</button></header>
      <div className="archive-columns">
        <article className="research-column"><p className="archive-kicker">Proyectos de la base · Datos disponibles: <b>{Math.round(state.resources.data)} u</b></p><div className="research-grid">{RESEARCH_NODES.map((node) => {
          const complete = state.research.includes(node.id);
          const ready = available.has(node.id) && state.resources.data >= node.cost;
          const status = complete ? "complete" : ready ? "ready" : "locked";
          return <section key={node.id} className={`research-card ${status}`}><span>{node.era}</span><h3>{node.title}</h3><p>{node.description}</p><b>{node.effect}</b><div><small>{complete ? "Finalizada" : `${node.cost} datos`}</small><button type="button" disabled={!ready} onClick={() => onResearch(node.id)}>{complete ? "Activo" : ready ? "Investigar" : "Bloqueado"}</button></div></section>;
        })}</div></article>
        <article className="history-column"><p className="archive-kicker">Bitácora histórica internacional</p><div className="history-list">{TIMELINE.map((item) => <section key={item.title} className="history-card"><span>{item.era}</span><h3>{item.title}</h3><p>{item.note}</p><a href={item.url} target="_blank" rel="noreferrer">Fuente · {item.source} ↗</a></section>)}</div></article>
      </div>
      <footer className="archive-footer">La campaña se inspira en contribuciones de distintos programas espaciales. Sus nombres, identidades y decisiones pertenecen a la ficción del juego.</footer>
    </div>
  </section>;
}
