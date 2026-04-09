import { useState } from "react";

// ── palette ────────────────────────────────────────────────────────────────
const C = {
  bg:"#080d18", panel:"#0d1425", border:"#1a2744",
  text:"#c9d4e8", dim:"#4a5a7a", accent:"#e2a93a",
  green:"#22c97a", yellow:"#f0b429", red:"#e84444",
  purple:"#a78bfa",
  greenBg:"rgba(34,201,122,0.08)", yellowBg:"rgba(240,180,41,0.08)",
  redBg:"rgba(232,68,68,0.08)",
};
const MONO = "'IBM Plex Mono','Courier New',monospace";
const SERIF = "'Georgia','Times New Roman',serif";

// ── formula del paper: WI = α·ln(1 + S·E·exp(−γ·F)) ─────────────────────
const ALPHA = 37.5;
const GAMMA = 0.09;

function calcIndex({ L1, L2, L3, E, Kn, Ki, Kd, Ke }) {
  const S = L1 + L2 + L3;
  const F = -(Kn + Ki + Kd + Ke); // F positivo
  return ALPHA * Math.log(1 + S * E * Math.exp(-GAMMA * F));
}

function zone(idx) {
  if (idx < 100) return { label:"VERDE",   color:C.green,  bg:C.greenBg,  risk:"Guerra improbabile" };
  if (idx < 120) return { label:"GIALLA",  color:C.yellow, bg:C.yellowBg, risk:"Guerra possibile"    };
  if (idx < 200) return { label:"ROSSA",   color:C.red,    bg:C.redBg,    risk:"Guerra probabile"    };
  return               { label:"CRITICA", color:"#ffffff", bg:"rgba(180,0,255,0.12)", risk:"Guerra in corso / imminente" };
}

// ── 9 crisi storiche calibrate ───────────────────────────────────────────
const HISTORICAL = [
  { id:"cuba62", label:"Cuba 1962", anno:1962, esito:"NO WAR",
    L1:18, L2:27, L3:16, E:1.2, Kn:-15, Ki:-7, Kd:-9, Ke:-6,
    nota:"MAD pienamente operativa, backchannel Kennedy-Khrushchev, Friktion massima → guerra evitata." },
  { id:"vietnam64", label:"Vietnam 1964-65", anno:1964, esito:"WAR",
    L1:26, L2:20, L3:18, E:1.4, Kn:0, Ki:-4, Kd:-3, Ke:-2,
    nota:"Nessuna deterrenza nucleare simmetrica, Tonkin come innesco, debole opposizione istituzionale." },
  { id:"yomkippur73", label:"Yom Kippur 1973", anno:1973, esito:"WAR",
    L1:20, L2:25, L3:20, E:1.8, Kn:0, Ki:-4, Kd:-2, Ke:-2,
    nota:"Attacco a sorpresa, forte componente escatologica, Friktion diplomatica quasi assente." },
  { id:"falklands82", label:"Falklands 1982", anno:1982, esito:"WAR",
    L1:18, L2:16, L3:10, E:1.1, Kn:0, Ki:-5, Kd:-4, Ke:-3,
    nota:"Guerra limitata, bassa escatologia, Friktion istituzionale parziale ma insufficiente." },
  { id:"gulf91", label:"Gulf War 1991", anno:1991, esito:"WAR",
    L1:16, L2:24, L3:16, E:1.2, Kn:0, Ki:-5, Kd:-3, Ke:-3,
    nota:"Coalizione ONU-autorizzata, struttura unipolare post-bipolare, Iraq isolato." },
  { id:"iraq03", label:"Iraq 2003", anno:2003, esito:"WAR",
    L1:25, L2:25, L3:22, E:1.8, Kn:0, Ki:-2, Kd:-2, Ke:-1,
    nota:"Friktion deliberatamente rimossa. Ispezioni come copertura. Coalizione dei volenterosi." },
  { id:"iran12", label:"Iran 2012", anno:2012, esito:"NO WAR",
    L1:16, L2:22, L3:18, E:1.5, Kn:0, Ki:-8, Kd:-9, Ke:-6,
    nota:"Veto USA credibile, percorso JCPOA aperto, diplomazia reale → Friktion sufficiente." },
  { id:"ukraine22", label:"Ucraina 2022", anno:2022, esito:"WAR",
    L1:24, L2:27, L3:24, E:1.6, Kn:-10, Ki:-2, Kd:-2, Ke:-2,
    nota:"MAD limita escalation nucleare ma non impedisce guerra convenzionale. Katechon ortodosso attivo." },
  { id:"iran26", label:"Iran 2026", anno:2026, esito:"WAR",
    L1:26, L2:28, L3:25, E:2.4, Kn:0, Ki:-2, Kd:-1, Ke:-1,
    nota:"Friktion minima. Negoziato come copertura. Eschaton massimo: mahdismo + dispensazionalismo + Thiel." },
];

// ── crisi live ───────────────────────────────────────────────────────────
const CRISI_LIVE = [
  { id:"ukraine",  label:"Russia-Ucraina",   query:"Russia Ukraine war ceasefire negotiations today 2026" },
  { id:"iran",     label:"Iran post-attacco", query:"Iran USA Israel aftermath nuclear 2026" },
  { id:"taiwan",   label:"Taiwan Strait",     query:"Taiwan China military tensions 2026" },
  { id:"korea",    label:"Corea del Nord",    query:"North Korea nuclear missiles 2026" },
  { id:"gaza",     label:"Gaza-Medio Oriente",query:"Gaza Israel Hamas ceasefire 2026" },
];

// ── prompt di sistema ────────────────────────────────────────────────────
function buildPrompt(crisi) {
  return `Sei un analista geopolitico che applica la Teoria dell'Allineamento (Alignment Theory) alle crisi internazionali.

Il modello calcola: WarIndex = α·ln(1 + S·E·exp(−γ·F))
dove S = V1+V2+V3, F = |Fn+Fi+Fd+Fe|, α=37.5, γ=0.09

VARIABILI (scala e significato):
- V1 [0-30]: Vektoren interni — volontà di potenza, crisi di legittimità, pressione lobby/gruppi interesse
- V2 [0-30]: Vektoren strutturali — dilemma sicurezza, distribuzione potere, punti strozzatura geopolitici  
- V3 [0-30]: Vektoren storici — ciclo egemonico, rendita imperiale sotto pressione, pressione demografica
- E  [1.0-3.0]: Eschaton — intensità strutture escatologiche attive (1.0=assente, 3.0=accelerazionismo pieno)
- Fn [−15 a 0]: Friktion nucleare — deterrenza MAD. REGOLA: Fn=0 se un attore NON è Stato nucleare riconosciuto con secondo strike credibile.
- Fi [−10 a 0]: Friktion istituzionale — NATO/ONU/norme multilaterali funzionanti
- Fd [−10 a 0]: Friktion diplomatica — canali negoziazione attivi e credibili
- Fe [−8  a 0]: Friktion economica — interdipendenza economica come freno

SOGLIE: <100 verde (improbabile) · 100-119 gialla (possibile) · 120-199 rossa (probabile) · ≥200 CRITICA

Cerca notizie di oggi sulla crisi: ${crisi.label} (query: ${crisi.query})

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo prima o dopo, senza backtick:
{
  "L1": <numero>,
  "L2": <numero>,
  "L3": <numero>,
  "E": <numero con decimale>,
  "Kn": <numero negativo o 0>,
  "Ki": <numero negativo o 0>,
  "Kd": <numero negativo o 0>,
  "Ke": <numero negativo o 0>,
  "note_L1": "<1-2 frasi>",
  "note_L2": "<1-2 frasi>",
  "note_L3": "<1-2 frasi>",
  "note_E": "<1-2 frasi>",
  "note_K": "<1-2 frasi>",
  "evento_chiave": "<titolo sintetico>",
  "fonte": "<nome testata>",
  "trend": "<STABILE|IN_AUMENTO|IN_CALO>",
  "variabile_critica": "<quale variabile cambia di più oggi>"
}`;
}

// ── API call ─────────────────────────────────────────────────────────────
async function analizzaCrisi(crisi) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": "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",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: buildPrompt(crisi) }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  let raw = "";
  for (const block of data.content || []) {
    if (block.type === "text") raw += block.text;
  }
  raw = raw.replace(/```json|```/g, "").replace(/<[^>]+>/g, "").trim();
  const match = raw.match(/\{[\s\S]*"L1"[\s\S]*"variabile_critica"[\s\S]*\}/);
  if (!match) throw new Error("Risposta non JSON: " + raw.slice(0, 300));
  return JSON.parse(match[0]);
}

// ── strip tags ───────────────────────────────────────────────────────────
function clean(text) {
  if (!text) return "";
  return text.replace(/<[^>]+>/g, "").trim();
}

// ── gauge SVG ────────────────────────────────────────────────────────────
function GaugeSVG({ value }) {
  const MAX = 250;
  const pct = Math.max(0, Math.min(value, MAX)) / MAX;
  const cx = 120, cy = 108, r = 88;
  function polar(a) { return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; }
  function arc(fa, ta, color) {
    const [x1, y1] = polar(fa), [x2, y2] = polar(ta);
    const lg = Math.abs(ta - fa) > Math.PI ? 1 : 0;
    const sw = fa > ta ? 1 : 0;
    return <path d={`M${x1} ${y1} A${r} ${r} 0 ${lg} ${sw} ${x2} ${y2}`}
      stroke={color} strokeWidth={15} fill="none" strokeLinecap="butt" />;
  }
  const S = Math.PI, E2 = 0, range = Math.PI;
  const gEnd = S - (100 / MAX) * range, yEnd = S - (120 / MAX) * range, cEnd = S - (200 / MAX) * range;
  const angle = S - pct * range;
  const [nx, ny] = polar(angle);
  const z = zone(value);
  return (
    <svg viewBox="0 0 240 140" style={{ width: "100%", maxWidth: 300 }}>
      {arc(S, gEnd, "rgba(34,201,122,0.2)")}
      {arc(gEnd, yEnd, "rgba(240,180,41,0.2)")}
      {arc(yEnd, cEnd, "rgba(232,68,68,0.2)")}
      {arc(cEnd, E2, "rgba(180,0,255,0.2)")}
      {arc(S, Math.max(angle, E2), z.color)}
      <text x={22} y={128} fill="#22c97a" fontFamily="monospace" fontSize="9" textAnchor="middle">0</text>
      <text x={90} y={16} fill="#f0b429" fontFamily="monospace" fontSize="7" textAnchor="middle">100│120</text>
      <text x={168} y={16} fill="#e84444" fontFamily="monospace" fontSize="7" textAnchor="middle">200</text>
      <text x={218} y={128} fill="#b400ff" fontFamily="monospace" fontSize="9" textAnchor="middle">250</text>
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={z.color} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill={z.color} />
      <text x={cx} y={cy + 30} fill={z.color} fontFamily="monospace" fontSize="30"
        fontWeight="700" textAnchor="middle">{Math.round(value)}</text>
      <text x={cx} y={cy + 44} fill={z.color} fontFamily="monospace" fontSize="9"
        textAnchor="middle">WARINDEX</text>
    </svg>
  );
}

// ── barra variabile ──────────────────────────────────────────────────────
function VarBar({ label, value, min, max, color, note }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontFamily: SERIF, fontSize: 12, color: C.text }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 12, color, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 5, background: C.border, borderRadius: 3, marginBottom: 4 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
      {note && <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, lineHeight: 1.5 }}>{clean(note)}</div>}
    </div>
  );
}

// ── historical case row ──────────────────────────────────────────────────
function CaseRow({ c, onClick, active }) {
  const idx = calcIndex(c);
  const z = zone(idx);
  const isWar = c.esito === "WAR";
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
      background: active ? `${z.color}14` : "transparent",
      border: `1px solid ${active ? z.color + "50" : C.border}`,
      borderRadius: 6, cursor: "pointer", marginBottom: 5, transition: "all 0.15s"
    }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, width: 32, flexShrink: 0 }}>
        {c.anno}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: SERIF, fontSize: 12, color: C.text }}>{c.label}</div>
      </div>
      <div style={{
        fontFamily: MONO, fontSize: 9, padding: "2px 5px", borderRadius: 3,
        background: isWar ? "rgba(232,68,68,0.15)" : "rgba(34,201,122,0.15)",
        color: isWar ? C.red : C.green,
      }}>{c.esito}</div>
      <div style={{
        fontFamily: MONO, fontSize: 13, fontWeight: 700, color: z.color, width: 32, textAlign: "right"
      }}>{Math.round(idx)}</div>
    </div>
  );
}

// ── history row (live) ───────────────────────────────────────────────────
function HistoryRow({ entry, onClick, active }) {
  const idx = calcIndex(entry);
  const z = zone(idx);
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
      background: active ? `${z.color}14` : "transparent",
      border: `1px solid ${active ? z.color + "50" : C.border}`,
      borderRadius: 6, cursor: "pointer", marginBottom: 5, transition: "all 0.15s"
    }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, width: 40, flexShrink: 0 }}>
        {entry.time}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: SERIF, fontSize: 12, color: C.text }}>{entry.crisi}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{entry.evento_chiave}</div>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: z.color }}>{Math.round(idx)}</div>
    </div>
  );
}

// ── tabs ─────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(226,169,58,0.15)" : "transparent",
      border: `1px solid ${active ? C.accent + "60" : C.border}`,
      borderRadius: 5, padding: "6px 14px", cursor: "pointer",
      fontFamily: MONO, fontSize: 11, color: active ? "#e8edf5" : C.dim,
      fontWeight: active ? 700 : 400,
    }}>{label}</button>
  );
}

// ── main ─────────────────────────────────────────────────────────────────
export default function MonitorCrisi() {
  const [mode, setMode] = useState("historical"); // "historical" | "live"
  const [crisiId, setCrisiId] = useState("ukraine");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeHist, setActiveHist] = useState(null);
  const [selectedCase, setSelectedCase] = useState(HISTORICAL[8]); // Iran 2026 default

  const crisi = CRISI_LIVE.find(c => c.id === crisiId);
  const displayed = mode === "historical"
    ? selectedCase
    : (activeHist || result);
  const idx = displayed ? calcIndex(displayed) : null;
  const z = idx !== null ? zone(idx) : null;

  async function runAnalysis() {
    setLoading(true); setError(null); setActiveHist(null);
    try {
      const data = await analizzaCrisi(crisi);
      const entry = {
        ...data, crisi: crisi.label,
        time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        date: new Date().toLocaleDateString("it-IT"), crisiId,
      };
      setResult(entry);
      setHistory(h => [entry, ...h].slice(0, 20));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const panel = { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px", marginBottom: 12 };
  const label = { fontFamily: MONO, fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10, display: "block" };

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", color: C.text, fontFamily: SERIF, padding: "18px 16px",
      backgroundImage: "radial-gradient(ellipse at 20% 0%,rgba(26,39,68,0.6) 0%,transparent 60%)"
    }}>

      {/* header */}
      <div style={{ marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.accent, letterSpacing: "0.2em", marginBottom: 4 }}>
          ALIGNMENT THEORY · WARINDEX MONITOR
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 700, color: "#e8edf5", margin: 0 }}>
          WarIndex Monitor
        </h1>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginTop: 4 }}>
          WI = α·ln(1 + S·E·exp(−γ·F)) · α={ALPHA} γ={GAMMA} · 9 casi storici + analisi live
        </div>

        {/* mode tabs */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Tab label="📚 Casi Storici" active={mode === "historical"} onClick={() => setMode("historical")} />
          <Tab label="🔴 Analisi Live" active={mode === "live"} onClick={() => setMode("live")} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>

        {/* ── colonna sinistra ── */}
        <div style={{ flex: "0 0 280px", minWidth: 260 }}>

          {mode === "historical" ? (
            <div style={panel}>
              <span style={label}>9 Crisi Post-1945</span>
              {HISTORICAL.map(c => (
                <CaseRow key={c.id} c={c} active={selectedCase?.id === c.id}
                  onClick={() => setSelectedCase(c)} />
              ))}
            </div>
          ) : (
            <div style={panel}>
              <span style={label}>Seleziona crisi</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {CRISI_LIVE.map(c => (
                  <button key={c.id} onClick={() => { setCrisiId(c.id); setResult(null); setActiveHist(null); }}
                    style={{
                      background: crisiId === c.id ? "rgba(226,169,58,0.12)" : "transparent",
                      border: `1px solid ${crisiId === c.id ? C.accent + "60" : C.border}`,
                      borderRadius: 5, padding: "7px 12px", cursor: "pointer", textAlign: "left",
                      fontFamily: SERIF, fontSize: 13,
                      color: crisiId === c.id ? "#e8edf5" : C.dim,
                      fontWeight: crisiId === c.id ? 700 : 400,
                    }}>{c.label}</button>
                ))}
              </div>
              <button onClick={runAnalysis} disabled={loading}
                style={{
                  width: "100%", padding: "11px", borderRadius: 6,
                  cursor: loading ? "not-allowed" : "pointer",
                  background: loading ? C.border : C.accent, border: "none",
                  fontFamily: MONO, fontSize: 12, fontWeight: 700,
                  color: loading ? C.dim : "#080d18", transition: "all 0.2s",
                }}>
                {loading ? "⟳  Analisi in corso…" : "▶  Analizza oggi"}
              </button>
              {error && (
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.red, marginTop: 10,
                  background: "rgba(232,68,68,0.1)", borderRadius: 4, padding: "8px 10px", lineHeight: 1.6 }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* variabili V */}
          {displayed && (
            <div style={panel}>
              <span style={label}>Vektoren V</span>
              <VarBar label="V₁ — Interni" value={displayed.L1} min={0} max={30} color={C.accent} note={displayed.note_L1} />
              <VarBar label="V₂ — Strutturali" value={displayed.L2} min={0} max={30} color={C.accent} note={displayed.note_L2} />
              <VarBar label="V₃ — Storici" value={displayed.L3} min={0} max={30} color={C.accent} note={displayed.note_L3} />
              <div style={{
                fontFamily: MONO, fontSize: 11, color: C.accent,
                background: "rgba(226,169,58,0.08)", borderRadius: 4, padding: "6px 10px",
                display: "flex", justifyContent: "space-between", marginTop: 4
              }}>
                <span>S totale</span>
                <span style={{ fontWeight: 700 }}>{displayed.L1 + displayed.L2 + displayed.L3}</span>
              </div>
            </div>
          )}

          {/* E + F */}
          {displayed && (
            <div style={panel}>
              <span style={label}>Eschaton E · Friktion F</span>
              <VarBar label="E — Eschaton" value={displayed.E} min={1} max={3} color={C.purple} note={displayed.note_E} />
              <VarBar label="Fn — Nucleare (MAD)" value={displayed.Kn} min={-15} max={0} color={C.green} />
              <VarBar label="Fi — Istituzionale" value={displayed.Ki} min={-10} max={0} color={C.green} />
              <VarBar label="Fd — Diplomatica" value={displayed.Kd} min={-10} max={0} color={C.green} />
              <VarBar label="Fe — Economica" value={displayed.Ke} min={-8} max={0} color={C.green} note={displayed.note_K} />
              <div style={{
                fontFamily: MONO, fontSize: 11, color: C.green,
                background: "rgba(34,201,122,0.08)", borderRadius: 4, padding: "6px 10px",
                display: "flex", justifyContent: "space-between", marginTop: 4
              }}>
                <span>F totale</span>
                <span style={{ fontWeight: 700 }}>{-(displayed.Kn + displayed.Ki + displayed.Kd + displayed.Ke)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── colonna centro: gauge + decomposizione ── */}
        <div style={{ flex: "0 0 300px", minWidth: 270 }}>

          {!displayed && !loading && (
            <div style={{ ...panel, textAlign: "center", padding: "40px 20px", color: C.dim }}>
              <div style={{ fontFamily: MONO, fontSize: 32, marginBottom: 12, opacity: 0.3 }}>◎</div>
              <div style={{ fontFamily: SERIF, fontSize: 14 }}>Seleziona una crisi</div>
            </div>
          )}

          {loading && (
            <div style={{ ...panel, textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontFamily: MONO, fontSize: 13, color: C.accent, marginBottom: 16 }}>
                Ricerca notizie in corso…
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 12, color: C.dim, lineHeight: 1.8 }}>
                Claude cerca le notizie di oggi<br />e calcola il WarIndex
              </div>
            </div>
          )}

          {displayed && z && (
            <>
              {/* gauge */}
              <div style={{
                ...panel,
                background: idx >= 120 ? "rgba(232,68,68,0.06)" : idx >= 100 ? "rgba(240,180,41,0.06)" : "rgba(34,201,122,0.06)",
                border: `1px solid ${z.color}40`,
                display: "flex", flexDirection: "column", alignItems: "center",
              }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginBottom: 6, alignSelf: "flex-start" }}>
                  {mode === "historical"
                    ? `${displayed.label} · ${displayed.anno} · ${displayed.esito}`
                    : `${displayed.date} · ${displayed.time} · ${displayed.crisi}`}
                </div>
                <GaugeSVG value={idx} />
                <div style={{
                  fontFamily: MONO, fontSize: 11, color: z.color,
                  background: z.bg, border: `1px solid ${z.color}40`,
                  borderRadius: 4, padding: "5px 14px", marginTop: 4,
                  textAlign: "center", letterSpacing: "0.08em"
                }}>ZONA {z.label} — {z.risk}</div>
              </div>

              {/* decomposizione formula */}
              <div style={panel}>
                <span style={label}>Decomposizione formula</span>
                {(() => {
                  const S = displayed.L1 + displayed.L2 + displayed.L3;
                  const F = -(displayed.Kn + displayed.Ki + displayed.Kd + displayed.Ke);
                  const inner = S * displayed.E * Math.exp(-GAMMA * F);
                  return [
                    { l: "S = V₁+V₂+V₃", v: S, c: C.accent },
                    { l: `E (Eschaton)`, v: displayed.E, c: C.purple },
                    { l: `S × E`, v: (S * displayed.E).toFixed(1), c: C.dim },
                    { l: `F (Friktion)`, v: F, c: C.green },
                    { l: `exp(−γ·F)`, v: Math.exp(-GAMMA * F).toFixed(3), c: C.green },
                    { l: `S·E·exp(−γ·F)`, v: inner.toFixed(1), c: C.dim },
                    { l: `= WarIndex`, v: Math.round(idx), c: z.color, bold: true },
                  ].map(r => (
                    <div key={r.l} style={{
                      display: "flex", justifyContent: "space-between",
                      fontFamily: MONO, fontSize: 12, marginBottom: 5, color: r.c,
                      fontWeight: r.bold ? 700 : 400, paddingBottom: r.bold ? 0 : 3,
                      borderBottom: r.bold ? "none" : `1px solid ${C.border}`
                    }}>
                      <span>{r.l}</span><span>{r.v}</span>
                    </div>
                  ));
                })()}
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 8, lineHeight: 1.6 }}>
                  WI = {ALPHA}·ln(1 + {(displayed.L1 + displayed.L2 + displayed.L3)}·{displayed.E}·exp(−{GAMMA}·{-(displayed.Kn + displayed.Ki + displayed.Kd + displayed.Ke)}))
                </div>
              </div>

              {/* nota / analisi */}
              <div style={{ ...panel, borderColor: `${z.color}40` }}>
                <span style={label}>{mode === "historical" ? "Nota analitica" : "Analisi AI"}</span>
                {mode === "historical" ? (
                  <div style={{ fontFamily: SERIF, fontSize: 12, color: C.text, lineHeight: 1.7 }}>
                    {displayed.nota}
                  </div>
                ) : displayed.evento_chiave ? (
                  <>
                    <div style={{ fontFamily: SERIF, fontSize: 13, color: "#e8edf5", marginBottom: 8, fontWeight: 700, lineHeight: 1.4 }}>
                      {displayed.evento_chiave}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginBottom: 8 }}>
                      Fonte: {displayed.fonte}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <span style={{
                        fontFamily: MONO, fontSize: 10, padding: "3px 8px", borderRadius: 3,
                        background: displayed.trend === "IN_AUMENTO" ? "rgba(232,68,68,0.15)" :
                          displayed.trend === "IN_CALO" ? "rgba(34,201,122,0.15)" : "rgba(74,90,122,0.3)",
                        color: displayed.trend === "IN_AUMENTO" ? C.red :
                          displayed.trend === "IN_CALO" ? C.green : C.dim,
                      }}>
                        {displayed.trend === "IN_AUMENTO" ? "↑ IN AUMENTO" :
                          displayed.trend === "IN_CALO" ? "↓ IN CALO" : "→ STABILE"}
                      </span>
                    </div>
                    <div style={{
                      fontFamily: MONO, fontSize: 10, color: C.yellow, lineHeight: 1.6,
                      background: "rgba(240,180,41,0.06)", borderRadius: 4, padding: "8px 10px"
                    }}>
                      <span style={{ opacity: 0.6 }}>Variabile critica: </span>
                      {displayed.variabile_critica}
                    </div>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* ── colonna destra ── */}
        <div style={{ flex: "1 1 220px", minWidth: 200 }}>

          {/* storico live */}
          {mode === "live" && (
            <div style={panel}>
              <span style={label}>Storico analisi ({history.length})</span>
              {history.length === 0 && (
                <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, textAlign: "center", padding: "20px 0" }}>
                  Le analisi appariranno qui
                </div>
              )}
              {history.map((h, i) => (
                <HistoryRow key={i} entry={h} active={activeHist === h}
                  onClick={() => setActiveHist(activeHist === h ? null : h)} />
              ))}
            </div>
          )}

          {/* benchmark 9 casi (sempre visibile) */}
          <div style={panel}>
            <span style={label}>Benchmark 9 crisi</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {HISTORICAL.map(c => {
                const wi = calcIndex(c);
                const zz = zone(wi);
                const barW = Math.min((wi / 250) * 100, 100);
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, width: 28, flexShrink: 0 }}>{c.anno}</span>
                    <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, position: "relative" }}>
                      <div style={{ height: "100%", width: `${barW}%`, background: zz.color, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: zz.color, width: 28, textAlign: "right" }}>{Math.round(wi)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* guida variabili */}
          <div style={panel}>
            <span style={label}>Formula</span>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.accent, lineHeight: 2, marginBottom: 8 }}>
              WI = α·ln(1 + S·E·exp(−γ·F))
            </div>
            {[
              { v: "S = V₁+V₂+V₃", d: "0-90", c: C.accent },
              { v: "E  Eschaton", d: "1.0-3.0", c: C.purple },
              { v: "F  Friktion", d: "0-43", c: C.green },
              { v: "α  scala", d: String(ALPHA), c: C.dim },
              { v: "γ  attenuaz.", d: String(GAMMA), c: C.dim },
            ].map(r => (
              <div key={r.v} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: r.c }}>{r.v}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{r.d}</span>
              </div>
            ))}
          </div>

          {/* soglie */}
          <div style={panel}>
            <span style={label}>Soglie WarIndex</span>
            {[
              { v: "< 100", l: "VERDE", c: C.green, d: "Guerra improbabile" },
              { v: "100-119", l: "GIALLA", c: C.yellow, d: "Guerra possibile" },
              { v: "120-199", l: "ROSSA", c: C.red, d: "Guerra probabile" },
              { v: "≥ 200", l: "CRITICA", c: "#ffffff", d: "Guerra in corso" },
            ].map(r => (
              <div key={r.v} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: r.c, flexShrink: 0 }} />
                <span style={{ fontFamily: MONO, fontSize: 10, color: r.c, width: 52 }}>{r.v}</span>
                <span style={{ fontFamily: SERIF, fontSize: 11, color: C.dim }}>{r.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 10,
        borderTop: `1px solid ${C.border}`, paddingTop: 10,
        display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6
      }}>
        <span>WarIndex Monitor · Alignment Theory</span>
        <span>WI = α·ln(1+S·E·exp(−γ·F)) · calibrato su 9 crisi 1962-2026</span>
      </div>
    </div>
  );
}
