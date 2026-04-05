
import { useState, useMemo } from "react";

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

// ── crisi disponibili ───────────────────────────────────────────────────────
const CRISI = [
  { id:"ukraine",  label:"Russia-Ucraina",   query:"Russia Ukraine war ceasefire negotiations today 2026" },
  { id:"iran",     label:"Iran post-attacco", query:"Iran USA Israel aftermath nuclear 2026" },
  { id:"taiwan",   label:"Taiwan Strait",     query:"Taiwan China military tensions 2026" },
  { id:"korea",    label:"Corea del Nord",    query:"North Korea nuclear missiles 2026" },
  { id:"gaza",     label:"Gaza-Medio Oriente",query:"Gaza Israel Hamas ceasefire 2026" },
];

// ── formula ─────────────────────────────────────────────────────────────────
function calcIndex({ L1, L2, L3, E, Kn, Ki, Kd, Ke }) {
  return (L1 + L2 + L3) * E + Kn + Ki + Kd + Ke;
}
function zone(idx) {
  if (idx < 100) return { label:"VERDE",   color:C.green,  bg:C.greenBg,  risk:"Guerra improbabile" };
  if (idx < 120) return { label:"GIALLA",  color:C.yellow, bg:C.yellowBg, risk:"Guerra possibile"    };
  if (idx < 200) return { label:"ROSSA",   color:C.red,    bg:C.redBg,    risk:"Guerra probabile"    };
  return               { label:"CRITICA", color:"#ffffff", bg:"rgba(180,0,255,0.12)", risk:"Guerra in corso / imminente" };
}

// ── sistema prompt ───────────────────────────────────────────────────────────
function buildPrompt(crisi) {
  return `Sei un analista geopolitico che applica la Teoria dell'Allineamento (Alignment Theory) alle crisi internazionali.

Il modello calcola: IndiceGuerra = (L1 + L2 + L3) × E + Kn + Ki + Kd + Ke

VARIABILI (scala e significato):
- L1 [0-30]: Cause interne — volontà di potenza, crisi di legittimità, pressione lobby/gruppi interesse
- L2 [0-30]: Struttura internazionale — dilemma sicurezza, distribuzione potere, punti strozzatura geopolitici  
- L3 [0-30]: Motori storici — ciclo egemonico, rendita imperiale sotto pressione, pressione demografica
- E  [1.0-3.0]: Moltiplicatore escatologico — intensità strutture escatologiche attive (1.0=assente, 3.0=accelerazionismo pieno)
- Kn [−15 a 0]: Katechon nucleare — deterrenza MAD. REGOLA CRITICA: Kn = 0 SEMPRE se uno dei due attori principali NON è uno Stato nucleare riconosciuto (es. Iran, Iraq, Libia). MAD richiede simmetria nucleare bilaterale con secondo strike credibile. Non applicare Kn negativo se un attore non ha armi nucleari.
- Ki [−10 a 0]: Katechon istituzionale — NATO/ONU/norme multilaterali funzionanti
- Kd [−10 a 0]: Katechon diplomatico — canali negoziazione attivi e credibili
- Ke [−8  a 0]: Katechon economico — interdipendenza economica come freno

SOGLIE IndiceGuerra: <100 verde (guerra improbabile) · 100-119 gialla (possibile) · 120-199 rossa (probabile) · ≥200 CRITICA (guerra in corso o imminente)

Cerca notizie di oggi sulla crisi: ${crisi.label} (query: ${crisi.query})

Analizza i fatti di oggi e assegna valori numerici precisi a ciascuna variabile basandoti sulle notizie trovate.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo prima o dopo, senza backtick, in questo formato esatto:
{
  "L1": <numero>,
  "L2": <numero>,
  "L3": <numero>,
  "E": <numero con decimale es. 2.2>,
  "Kn": <numero negativo o 0>,
  "Ki": <numero negativo o 0>,
  "Kd": <numero negativo o 0>,
  "Ke": <numero negativo o 0>,
  "note_L1": "<spiegazione 1-2 frasi basata su notizie di oggi>",
  "note_L2": "<spiegazione 1-2 frasi>",
  "note_L3": "<spiegazione 1-2 frasi>",
  "note_E": "<spiegazione 1-2 frasi>",
  "note_K": "<spiegazione 1-2 frasi su quale katechon regge e quale no>",
  "evento_chiave": "<titolo sintetico dell'evento più rilevante trovato oggi>",
  "fonte": "<nome testata o fonte principale>",
  "trend": "<STABILE|IN_AUMENTO|IN_CALO>",
  "variabile_critica": "<quale variabile sta cambiando di più oggi e perché>"
}`;
}

// ── chiamata API con web search ──────────────────────────────────────────────
async function analizzaCrisi(crisi, onChunk) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
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

  // estrai testo da tutti i blocchi content
  let raw = "";
  for (const block of data.content || []) {
    if (block.type === "text") raw += block.text;
  }

  // pulizia e parsing JSON
  const clean = raw.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end   = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Risposta non JSON: " + clean.slice(0,200));
  return JSON.parse(clean.slice(start, end + 1));
}

// ── strip HTML/cite tags from AI notes ───────────────────────────────────────
function clean(text) {
  if (!text) return "";
  return text.replace(/<[^>]+>/g, "").trim();
}

// ── gauge SVG ───────────────────────────────────────────────────────────────
function GaugeSVG({ value }) {
  const MAX = 250;
  const pct = Math.max(0, Math.min(value, MAX)) / MAX;
  const cx = 120, cy = 108, r = 88;
  function polar(a) { return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; }
  function arc(fa, ta, color) {
    const [x1,y1] = polar(fa), [x2,y2] = polar(ta);
    const lg = Math.abs(ta-fa) > Math.PI ? 1 : 0;
    const sw = fa > ta ? 1 : 0;
    return <path d={`M${x1} ${y1} A${r} ${r} 0 ${lg} ${sw} ${x2} ${y2}`}
      stroke={color} strokeWidth={15} fill="none" strokeLinecap="butt"/>;
  }
  const S = Math.PI, E2 = 0, range = Math.PI;
  const gEnd = S - (100/MAX)*range, yEnd = S - (120/MAX)*range, cEnd = S - (200/MAX)*range;
  const angle = S - pct*range;
  const [nx,ny] = polar(angle);
  const z = zone(value);
  return (
    <svg viewBox="0 0 240 140" style={{width:"100%",maxWidth:300}}>
      {arc(S, gEnd,  "rgba(34,201,122,0.2)")}
      {arc(gEnd, yEnd,"rgba(240,180,41,0.2)")}
      {arc(yEnd, cEnd,"rgba(232,68,68,0.2)")}
      {arc(cEnd, E2,  "rgba(180,0,255,0.2)")}
      {arc(S, Math.max(angle,E2), z.color)}
      <text x={22}  y={128} fill="#22c97a" fontFamily="monospace" fontSize="9" textAnchor="middle">0</text>
      <text x={90}  y={16}  fill="#f0b429" fontFamily="monospace" fontSize="7" textAnchor="middle">100│120</text>
      <text x={168} y={16}  fill="#e84444" fontFamily="monospace" fontSize="7" textAnchor="middle">200</text>
      <text x={218} y={128} fill="#b400ff" fontFamily="monospace" fontSize="9" textAnchor="middle">250</text>
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={z.color} strokeWidth={2.5} strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={6} fill={z.color}/>
      <text x={cx} y={cy+30} fill={z.color} fontFamily="monospace" fontSize="30"
        fontWeight="700" textAnchor="middle">{Math.round(value)}</text>
      <text x={cx} y={cy+44} fill={z.color} fontFamily="monospace" fontSize="9"
        textAnchor="middle">INDICE GUERRA</text>
    </svg>
  );
}

// ── barra variabile ──────────────────────────────────────────────────────────
function VarBar({ label, value, min, max, color, note }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
        <span style={{fontFamily:SERIF,fontSize:12,color:C.text}}>{label}</span>
        <span style={{fontFamily:MONO,fontSize:12,color,fontWeight:700}}>{value}</span>
      </div>
      <div style={{height:5,background:C.border,borderRadius:3,marginBottom:4}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:3}}/>
      </div>
      {note && <div style={{fontFamily:MONO,fontSize:10,color:C.dim,lineHeight:1.5}}>{clean(note)}</div>}
    </div>
  );
}

// ── history entry ────────────────────────────────────────────────────────────
function HistoryRow({ entry, onClick, active }) {
  const idx = calcIndex(entry);
  const z = zone(idx);
  return (
    <div onClick={onClick} style={{
      display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
      background: active ? `${z.color}14` : "transparent",
      border:`1px solid ${active ? z.color+"50" : C.border}`,
      borderRadius:6,cursor:"pointer",marginBottom:6,transition:"all 0.15s"
    }}>
      <div style={{fontFamily:MONO,fontSize:10,color:C.dim,width:60,flexShrink:0}}>
        {entry.time}
      </div>
      <div style={{flex:1}}>
        <div style={{fontFamily:SERIF,fontSize:12,color:C.text}}>{entry.crisi}</div>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim}}>{entry.evento_chiave}</div>
      </div>
      <div style={{
        fontFamily:MONO,fontSize:13,fontWeight:700,color:z.color,flexShrink:0
      }}>{Math.round(idx)}</div>
      <div style={{
        fontFamily:MONO,fontSize:9,color:z.color,
        background:z.bg,borderRadius:3,padding:"2px 6px",flexShrink:0
      }}>{z.label}</div>
    </div>
  );
}

// ── componente principale ────────────────────────────────────────────────────
export default function MonitorCrisi() {
  const [crisiId, setCrisiId] = useState("ukraine");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [result, setResult]   = useState(null);
  const [history, setHistory] = useState([]);
  const [activeHist, setActiveHist] = useState(null);

  const crisi = CRISI.find(c => c.id === crisiId);
  const displayed = activeHist || result;
  const idx = displayed ? calcIndex(displayed) : null;
  const z   = idx !== null ? zone(idx) : null;

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    setActiveHist(null);
    try {
      const data = await analizzaCrisi(crisi);
      const entry = {
        ...data,
        crisi: crisi.label,
        time: new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}),
        date: new Date().toLocaleDateString("it-IT"),
        crisiId,
      };
      setResult(entry);
      setHistory(h => [entry, ...h].slice(0, 20));
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const panel = { background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:"14px 16px", marginBottom:12 };
  const label = { fontFamily:MONO, fontSize:10, color:C.dim, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10, display:"block" };

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:SERIF,padding:"18px 16px",
      backgroundImage:"radial-gradient(ellipse at 20% 0%,rgba(26,39,68,0.6) 0%,transparent 60%)"}}>

      {/* header */}
      <div style={{marginBottom:16,borderBottom:`1px solid ${C.border}`,paddingBottom:12}}>
        <div style={{fontFamily:MONO,fontSize:10,color:C.accent,letterSpacing:"0.2em",marginBottom:4}}>
          ALIGNMENT THEORY / MONITOR CRISI QUOTIDIANO
        </div>
        <h1 style={{fontFamily:SERIF,fontSize:19,fontWeight:700,color:"#e8edf5",margin:0}}>
          Analisi AI delle crisi internazionali
        </h1>
        <div style={{fontFamily:MONO,fontSize:10,color:C.dim,marginTop:4}}>
          Claude analizza le notizie di oggi e aggiorna l'IndiceGuerra in tempo reale · IndiceGuerra = (L₁+L₂+L₃)×E+K
        </div>
      </div>

      <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>

        {/* ── colonna sinistra: controlli + variabili ── */}
        <div style={{flex:"0 0 280px",minWidth:260}}>

          {/* selettore crisi */}
          <div style={panel}>
            <span style={label}>Seleziona crisi</span>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
              {CRISI.map(c => (
                <button key={c.id} onClick={() => { setCrisiId(c.id); setResult(null); setActiveHist(null); }}
                  style={{
                    background: crisiId===c.id ? "rgba(226,169,58,0.12)" : "transparent",
                    border:`1px solid ${crisiId===c.id ? C.accent+"60" : C.border}`,
                    borderRadius:5,padding:"7px 12px",cursor:"pointer",textAlign:"left",
                    fontFamily:SERIF,fontSize:13,
                    color: crisiId===c.id ? "#e8edf5" : C.dim,
                    fontWeight: crisiId===c.id ? 700 : 400,
                  }}>{c.label}</button>
              ))}
            </div>

            <button onClick={runAnalysis} disabled={loading}
              style={{
                width:"100%",padding:"11px",borderRadius:6,cursor:loading?"not-allowed":"pointer",
                background: loading ? C.border : C.accent,
                border:"none",
                fontFamily:MONO,fontSize:12,fontWeight:700,
                color: loading ? C.dim : "#080d18",
                transition:"all 0.2s",
              }}>
              {loading ? "⟳  Analisi in corso…" : "▶  Analizza oggi"}
            </button>

            {error && (
              <div style={{fontFamily:MONO,fontSize:10,color:C.red,marginTop:10,
                background:"rgba(232,68,68,0.1)",borderRadius:4,padding:"8px 10px",lineHeight:1.6}}>
                {error}
              </div>
            )}
          </div>

          {/* variabili L */}
          {displayed && (
            <div style={panel}>
              <span style={label}>Vettori causali L</span>
              <VarBar label="L₁ — Cause interne"         value={displayed.L1} min={0} max={30} color={C.accent} note={displayed.note_L1}/>
              <VarBar label="L₂ — Struttura internaz."   value={displayed.L2} min={0} max={30} color={C.accent} note={displayed.note_L2}/>
              <VarBar label="L₃ — Motori storici"        value={displayed.L3} min={0} max={30} color={C.accent} note={displayed.note_L3}/>
              <div style={{fontFamily:MONO,fontSize:11,color:C.accent,
                background:"rgba(226,169,58,0.08)",borderRadius:4,padding:"6px 10px",
                display:"flex",justifyContent:"space-between",marginTop:4}}>
                <span>L totale</span>
                <span style={{fontWeight:700}}>{displayed.L1+displayed.L2+displayed.L3}</span>
              </div>
            </div>
          )}

          {/* E + K */}
          {displayed && (
            <div style={panel}>
              <span style={label}>E e K</span>
              <VarBar label="E — Moltiplicatore escatologico" value={displayed.E}  min={1} max={3}   color={C.purple} note={displayed.note_E}/>
              <VarBar label="K — Deterrenza nucleare MAD"     value={displayed.Kn} min={-15} max={0} color={C.green}/>
              <VarBar label="K — Katechon istituzionale"      value={displayed.Ki} min={-10} max={0} color={C.green}/>
              <VarBar label="K — Canali diplomatici"          value={displayed.Kd} min={-10} max={0} color={C.green}/>
              <VarBar label="K — Interdipendenza economica"   value={displayed.Ke} min={-8}  max={0} color={C.green} note={displayed.note_K}/>
              <div style={{fontFamily:MONO,fontSize:11,color:C.green,
                background:"rgba(34,201,122,0.08)",borderRadius:4,padding:"6px 10px",
                display:"flex",justifyContent:"space-between",marginTop:4}}>
                <span>K totale</span>
                <span style={{fontWeight:700}}>{displayed.Kn+displayed.Ki+displayed.Kd+displayed.Ke}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── colonna centro: gauge + risultato ── */}
        <div style={{flex:"0 0 280px",minWidth:260}}>

          {/* placeholder o gauge */}
          {!displayed && !loading && (
            <div style={{...panel,textAlign:"center",padding:"40px 20px",color:C.dim}}>
              <div style={{fontFamily:MONO,fontSize:32,marginBottom:12,opacity:0.3}}>◎</div>
              <div style={{fontFamily:SERIF,fontSize:14}}>Seleziona una crisi e clicca</div>
              <div style={{fontFamily:MONO,fontSize:11,marginTop:6}}>▶ Analizza oggi</div>
              <div style={{fontFamily:SERIF,fontSize:12,marginTop:12,color:C.dim,lineHeight:1.6}}>
                Claude cerca le notizie di oggi e calcola l'IndiceGuerra in base ai vettori causali
              </div>
            </div>
          )}

          {loading && (
            <div style={{...panel,textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontFamily:MONO,fontSize:13,color:C.accent,marginBottom:16}}>
                Ricerca notizie in corso…
              </div>
              <div style={{fontFamily:SERIF,fontSize:12,color:C.dim,lineHeight:1.8}}>
                Claude sta cercando le notizie di oggi<br/>
                sulla crisi selezionata e analizzando<br/>
                i vettori causali del modello
              </div>
            </div>
          )}

          {displayed && z && (
            <>
              <div style={{
                ...panel,
                background: idx >= 120 ? "rgba(232,68,68,0.06)" : idx >= 100 ? "rgba(240,180,41,0.06)" : "rgba(34,201,122,0.06)",
                border:`1px solid ${z.color}40`,
                display:"flex",flexDirection:"column",alignItems:"center",
              }}>
                <div style={{fontFamily:MONO,fontSize:10,color:C.dim,marginBottom:6,alignSelf:"flex-start"}}>
                  {displayed.date} · {displayed.time} · {displayed.crisi}
                </div>
                <GaugeSVG value={idx}/>
                <div style={{
                  fontFamily:MONO,fontSize:11,color:z.color,
                  background:z.bg,border:`1px solid ${z.color}40`,
                  borderRadius:4,padding:"5px 14px",marginTop:4,
                  textAlign:"center",letterSpacing:"0.08em"
                }}>ZONA {z.label} — {z.risk}</div>
              </div>

              {/* decomposizione */}
              <div style={panel}>
                <span style={label}>Decomposizione</span>
                {[
                  {l:"(L₁+L₂+L₃)", v: displayed.L1+displayed.L2+displayed.L3, c:C.accent},
                  {l:`× E`, v:`×${displayed.E}`, c:C.purple},
                  {l:"pre-K", v:((displayed.L1+displayed.L2+displayed.L3)*displayed.E).toFixed(1), c:C.dim},
                  {l:"+ K totale", v:displayed.Kn+displayed.Ki+displayed.Kd+displayed.Ke, c:C.green},
                  {l:"= IndiceGuerra", v:Math.round(idx), c:z.color, bold:true},
                ].map(r => (
                  <div key={r.l} style={{display:"flex",justifyContent:"space-between",
                    fontFamily:MONO,fontSize:12,marginBottom:5,color:r.c,
                    fontWeight:r.bold?700:400,paddingBottom:r.bold?0:3,
                    borderBottom:r.bold?"none":`1px solid ${C.border}`}}>
                    <span>{r.l}</span><span>{r.v}</span>
                  </div>
                ))}
              </div>

              {/* evento + trend */}
              <div style={{...panel,borderColor:`${z.color}40`}}>
                <span style={label}>Analisi AI</span>
                <div style={{fontFamily:SERIF,fontSize:13,color:"#e8edf5",marginBottom:8,fontWeight:700,lineHeight:1.4}}>
                  {displayed.evento_chiave}
                </div>
                <div style={{fontFamily:MONO,fontSize:10,color:C.dim,marginBottom:8}}>
                  Fonte: {displayed.fonte}
                </div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <span style={{fontFamily:MONO,fontSize:10,padding:"3px 8px",borderRadius:3,
                    background: displayed.trend==="IN_AUMENTO"?"rgba(232,68,68,0.15)":
                               displayed.trend==="IN_CALO"?"rgba(34,201,122,0.15)":"rgba(74,90,122,0.3)",
                    color: displayed.trend==="IN_AUMENTO"?C.red:
                           displayed.trend==="IN_CALO"?C.green:C.dim,
                  }}>
                    {displayed.trend==="IN_AUMENTO"?"↑ IN AUMENTO":
                     displayed.trend==="IN_CALO"?"↓ IN CALO":"→ STABILE"}
                  </span>
                </div>
                <div style={{fontFamily:MONO,fontSize:10,color:C.yellow,lineHeight:1.6,
                  background:"rgba(240,180,41,0.06)",borderRadius:4,padding:"8px 10px"}}>
                  <span style={{opacity:0.6}}>Variabile critica oggi: </span>
                  {displayed.variabile_critica}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── colonna destra: storico ── */}
        <div style={{flex:"1 1 220px",minWidth:200}}>
          <div style={panel}>
            <span style={label}>Storico analisi ({history.length})</span>
            {history.length === 0 && (
              <div style={{fontFamily:MONO,fontSize:11,color:C.dim,textAlign:"center",padding:"20px 0"}}>
                Le analisi appariranno qui
              </div>
            )}
            {history.map((h,i) => (
              <HistoryRow key={i} entry={h}
                active={activeHist===h}
                onClick={() => setActiveHist(activeHist===h ? null : h)}
              />
            ))}
          </div>

          {/* legenda variabili */}
          <div style={panel}>
            <span style={label}>Guida variabili</span>
            {[
              {v:"L₁ 0-30", d:"Cause interne", c:C.accent},
              {v:"L₂ 0-30", d:"Struttura internazionale", c:C.accent},
              {v:"L₃ 0-30", d:"Motori storici", c:C.accent},
              {v:"E  1-3",  d:"Moltiplicatore escatologico", c:C.purple},
              {v:"Kn 0/-15",d:"Deterrenza nucleare", c:C.green},
              {v:"Ki 0/-10",d:"Katechon istituzionale", c:C.green},
              {v:"Kd 0/-10",d:"Canali diplomatici", c:C.green},
              {v:"Ke 0/-8", d:"Interdipendenza economica", c:C.green},
            ].map(r => (
              <div key={r.v} style={{display:"flex",justifyContent:"space-between",
                marginBottom:6,gap:8}}>
                <span style={{fontFamily:MONO,fontSize:10,color:r.c,flexShrink:0}}>{r.v}</span>
                <span style={{fontFamily:SERIF,fontSize:11,color:C.dim,textAlign:"right"}}>{r.d}</span>
              </div>
            ))}
          </div>

          <div style={panel}>
            <span style={label}>Soglie IndiceGuerra</span>
            {[
              {v:"< 100",   l:"VERDE",   c:C.green,   d:"Guerra improbabile"},
              {v:"100-119", l:"GIALLA",  c:C.yellow,  d:"Guerra possibile"},
              {v:"120-199", l:"ROSSA",   c:C.red,     d:"Guerra probabile"},
              {v:"≥ 200",   l:"CRITICA", c:"#ffffff",  d:"Guerra in corso / imminente"},
            ].map(r => (
              <div key={r.v} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:r.c,flexShrink:0}}/>
                <span style={{fontFamily:MONO,fontSize:10,color:r.c,width:52}}>{r.v}</span>
                <span style={{fontFamily:SERIF,fontSize:11,color:C.dim}}>{r.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:10,
        borderTop:`1px solid ${C.border}`,paddingTop:10,
        display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
        <span>Teoria dell'Allineamento · Monitor AI quotidiano</span>
        <span>IndiceGuerra = (L₁+L₂+L₃)×E+K · powered by Claude + web search</span>
      </div>
    </div>
  );
}
