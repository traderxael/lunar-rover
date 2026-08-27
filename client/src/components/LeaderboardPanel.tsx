/**
 * Dirección visual: bitácora de misión; la clasificación se presenta como una
 * tarjeta de telemetría, no como un tablero social externo.
 */
import { useMemo, useState } from "react";
import { getLeaderboard, getSectorMedal, type MapId } from "@/game/Progression";

type Filter = "all" | MapId;
const filters: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "General" },
  { id: "tranquility", label: "Mare" },
  { id: "tycho", label: "Tycho" },
  { id: "selenite", label: "Selenita" },
];

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export default function LeaderboardPanel() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [revision, setRevision] = useState(0);
  const entries = useMemo(() => getLeaderboard(filter === "all" ? undefined : filter), [filter, revision]);

  const showBoard = () => {
    setRevision((value) => value + 1);
    setOpen(true);
  };

  return (
    <div className="leaderboard-control">
      <button type="button" className="board-trigger" onClick={showBoard}>Bitácora de récords <span>↗</span></button>
      {open && (
        <section className="leaderboard-panel" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title">
          <div className="board-topline"><span>Archivo local · 15 registros máximos</span><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar clasificación">×</button></div>
          <h2 id="leaderboard-title">Clasificación de expediciones</h2>
          <p className="board-caption">Puntuación = eficiencia, energía conservada, desafío auxiliar y dificultad del sector.</p>
          <div className="board-filters" aria-label="Filtrar clasificación por sector">
            {filters.map((item) => <button key={item.id} type="button" className={filter === item.id ? "is-active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>)}
          </div>
          {entries.length ? (
            <div className="board-table-wrap">
              <table className="board-table">
                <thead><tr><th>#</th><th>Sello</th><th>Sector</th><th>Grado</th><th>Puntos</th><th>Tiempo</th><th>Aux.</th></tr></thead>
                <tbody>{entries.map((entry, index) => {
                  const medal = getSectorMedal(entry);
                  return <tr key={entry.id}><td>{index + 1}</td><td>{medal ? <span className={`medal medal-${medal.tone}`} role="img" aria-label={medal.label} title={medal.label}>{medal.code}</span> : <span className="medal-placeholder" aria-label="Sin medalla">—</span>}</td><td>{entry.mapName}</td><td><b className={`grade grade-${entry.grade.toLowerCase()}`}>{entry.grade}</b></td><td>{entry.score.toLocaleString("es-ES")}</td><td>{formatTime(entry.elapsed)}</td><td>{entry.optionalCollected}/{entry.optionalTotal}</td></tr>;
                })}</tbody>
              </table>
            </div>
          ) : (
            <div className="board-empty"><span>∿</span><strong>Sin expediciones registradas</strong><p>Completa una misión para dejar tu primer registro en la bitácora local.</p></div>
          )}
          <div className="medal-legend" aria-label="Leyenda de medallas"><span><i className="medal medal-gold">I</i> Órbita I · récord de sector</span><span><i className="medal medal-silver">II</i> Órbita II</span><span><i className="medal medal-bronze">III</i> Órbita III</span></div>
          <p className="board-note">Los récords se guardan únicamente en este navegador.</p>
        </section>
      )}
    </div>
  );
}
