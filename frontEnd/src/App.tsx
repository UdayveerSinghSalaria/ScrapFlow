import { useMemo, useState, type ReactNode } from "react";
import { useBatches } from "./hooks/useBatches";
import { useBuyers, type BuyerWithRates } from "./hooks/useBuyers";
import { useSettings } from "./hooks/useSettings";
import type { MaterialCategory, BatchStatus } from "./types/database";

/* ───────────── Types ───────────── */
type Page = "Dashboard" | "Scan Scrap" | "Buyer Network" | "Inventory" | "Reports" | "Settings";
type Mat = MaterialCategory;
type Status = BatchStatus;
type Depth = "Quick" | "Standard" | "Detailed";

interface Batch { id: string; date: string; material: Mat; grade: string; qty: number; buyer: string; value: number; status: Status }
interface Buyer { name: string; state: string; rating: number; active: boolean; rates: Partial<Record<Mat, number>> }
interface Cfg { name: string; factory: string; alerts: boolean; email: boolean; autoRoute: boolean }
interface Det { material: Mat; qty: number; grade: string; conf: number; purity: number }
type NewBatch = Omit<Batch, "id" | "date" | "status">;
interface Extra { kg: number; val: number; n: number }

/* ───────────── Data ───────────── */
const PAGES: Page[] = ["Dashboard", "Scan Scrap", "Buyer Network", "Inventory", "Reports", "Settings"];
const PICON: Record<Page, string> = { Dashboard: "grid", "Scan Scrap": "scan", "Buyer Network": "net", Inventory: "inv", Reports: "rep", Settings: "set" };
const FACTORIES = ["Factory 1 – Ludhiana", "Factory 2 – Rajpura", "Factory 3 – Mohali"];
const MATS: Mat[] = ["Copper", "Aluminium", "Steel", "Brass"];
const MCOL: Record<Mat, string> = { Copper: "#f08a3c", Aluminium: "#e9f2ed", Steel: "#4da3ff", Brass: "#e6c04a", "Stainless Steel": "#a8b0b8", Plastic: "#5cb85c", "Mixed Scrap": "#9aa0a6" };
const PAL: Record<string, string[]> = {
  mix: ["#5a5f66", "#2b2f35", "#8a5a3a", "#b87333", "#9aa0a6", "#3a3f45"],
  Copper: ["#3b2a22", "#b87333", "#6b4a35", "#d99058", "#2b2f35"],
  Aluminium: ["#cfd4d9", "#8b9096", "#5b6067", "#e9edf0", "#3a3f45"],
  Steel: ["#4a4f57", "#2b2f35", "#8b9096", "#1d2126", "#6a7079"],
};

/* ───────────── Helpers ───────────── */
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const num = (n: number) => Math.round(n).toLocaleString("en-IN");
const bestBuyer = (bs: Buyer[], m: Mat) => bs.filter((b) => b.active && b.rates[m]).sort((a, b) => b.rates[m]! - a.rates[m]!)[0];
const csv = (name: string, rows: (string | number)[][]) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
  a.download = name;
  a.click();
};
/** Integration point: replace with a call to your real vision model / API. */
const detectScrap = async (_file: File | null, kg: number, depth: Depth): Promise<Det[]> => {
  await new Promise((r) => setTimeout(r, { Quick: 900, Standard: 1800, Detailed: 3000 }[depth]));
  const c = { Quick: 0, Standard: 4, Detailed: 7 }[depth];
  const cu = Math.round(kg * 0.18), al = Math.round(kg * 0.32);
  return [
    { material: "Copper", qty: cu, grade: "A", conf: 89 + c, purity: 98 },
    { material: "Aluminium", qty: al, grade: "B", conf: 87 + c, purity: 94 },
    { material: "Steel", qty: kg - cu - al, grade: "A", conf: 90 + c, purity: 97 },
  ];
};

/* ───────────── Icons & art ───────────── */
const P: Record<string, string> = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  scan: "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  net: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
  inv: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8",
  rep: "M3 3v18h18M8 17v-5M13 17V8M18 17v-9",
  set: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  cal: "M3 5h18v16H3zM16 2v4M8 2v4M3 10h18",
  box: "M21 8l-9-5-9 5v8l9 5 9-5zM3.3 7L12 12l8.7-5M12 22V12",
  coins: "M12 8c4.4 0 8-1.1 8-2.5S16.4 3 12 3 4 4.1 4 5.5 7.6 8 12 8zM4 5.5v4C4 10.9 7.6 12 12 12s8-1.1 8-2.5v-4M4 9.5v4c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-4M4 13.5v4c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-4",
  bars: "M5 21V12M12 21V5M19 21v-9",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  cam: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  arr: "M5 12h14M12 5l7 7-7 7",
  up: "M12 19V5M5 12l7-7 7 7",
  chev: "M6 9l6 6 6-6",
  bld: "M4 21V3h10v18M14 8h6v13M8 7h2M8 11h2M8 15h2M4 21h16",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  layers: "M12 2l10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5",
  leaf: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.5 5-7",
  dl: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  plus: "M12 5v14M5 12h14",
  check: "M20 6L9 17l-5-5",
  menu: "M3 6h18M3 12h18M3 18h18",
};
const I = ({ n, s = 20 }: { n: string; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={P[n]} /></svg>
);

/** Procedural scrap-metal art (seeded, so it is stable between renders). */
function Scrap({ w, h, pal, seed = 1, pile = false }: { w: number; h: number; pal: string[]; seed?: number; pile?: boolean }) {
  const polys = useMemo(() => {
    let s = seed;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    return Array.from({ length: pile ? 90 : 46 }, () => {
      const cy = pile ? h * (0.22 + 0.78 * r()) : r() * h;
      const cx = pile ? w / 2 + (r() - 0.5) * w * (0.2 + 0.8 * (cy / h)) : r() * w;
      const c = pal[Math.floor(r() * pal.length)];
      const pts = Array.from({ length: 4 }, () => `${(cx + (r() - 0.5) * w * 0.4).toFixed(1)},${(cy + (r() - 0.5) * h * 0.4).toFixed(1)}`).join(" ");
      return { pts, c };
    });
  }, [w, h, pal, seed, pile]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }}>
      <rect width={w} height={h} fill="#111815" />
      {polys.map((p, i) => <polygon key={i} points={p.pts} fill={p.c} opacity=".9" />)}
    </svg>
  );
}

function Spark({ pts }: { pts: number[] }) {
  const w = 243, h = 58, n = pts.length;
  const xy = pts.map((v, i) => [(i * w) / (n - 1), h - 4 - v * (h - 8)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34e6a0" stopOpacity=".28" /><stop offset="1" stopColor="#34e6a0" stopOpacity="0" /></linearGradient></defs>
      <path d={`${d}L${w} ${h}L0 ${h}Z`} fill="url(#sg)" />
      <path d={d} fill="none" stroke="#34e6a0" strokeWidth="2" />
      {xy.map(([x, y], i) => ([0, 2, 4, n - 1].includes(i) ? <circle key={i} cx={x} cy={y} r="3.5" fill="#34e6a0" /> : null))}
    </svg>
  );
}

const IndiaMap = () => (
  <svg width="132" height="98" viewBox="0 0 132 98">
    <polygon points="48,2 60,6 68,4 76,12 74,22 84,26 98,28 118,30 128,36 112,40 104,44 96,42 92,52 86,58 80,72 72,88 66,96 60,88 54,74 42,66 28,58 20,46 22,38 30,32 32,26 42,22 42,12" fill="#18262a" stroke="#24363c" />
    {[[22, 38], [56, 47], [128, 49], [27, 71], [69, 91], [104, 77]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#34e6a0" />)}
  </svg>
);

/* ───────────── Dashboard ───────────── */
function Kpi({ icon, label, val, delta, note = "vs last week", right, period = true }: { icon: string; label: string; val: (k: number) => string; delta: string; note?: string; right: ReactNode; period?: boolean }) {
  const [p, setP] = useState("This Week");
  const k = ({ Today: 0.15, "This Week": 1, "This Month": 4.2 } as Record<string, number>)[p];
  return (
    <div className="card kpi">
      <div className="kico"><I n={icon} s={34} /></div>
      <div><div className="mut">{label}</div><div className="big">{val(k)}</div><div className="delta"><I n="up" s={14} />{delta}<span>{note}</span></div></div>
      {period && (
        <label className="per"><I n="cal" s={14} /><select value={p} onChange={(e) => setP(e.target.value)}>{["Today", "This Week", "This Month"].map((o) => <option key={o}>{o}</option>)}</select><I n="chev" s={14} /></label>
      )}
      <div className="kright">{right}</div>
    </div>
  );
}

function Dashboard({ batches, ex, go }: { batches: Batch[]; ex: Extra; go: (p: Page) => void }) {
  const bars: [string, number, boolean][] = [["Cu", 56, true], ["Al", 42, true], ["Steel", 32, false], ["Brass", 21, false], ["Others", 19, false]];
  const mats: [Mat, string, string, string, string, string][] = [
    ["Copper", "180 kg | Grade A", "Buyer B", "₹720 / kg", "#f08a3c", "bld"],
    ["Aluminium", "320 kg | Grade B", "Buyer D", "₹175 / kg", "#e9f2ed", "box"],
    ["Steel", "500 kg | Grade A", "Buyer A", "₹48 / kg", "#4da3ff", "cam"],
  ];
  return (
    <>
      <div className="card hero">
        <div className="hl">
          <div className="mut" style={{ fontSize: 15 }}>Good evening, Sakshi</div>
          <h1>Turn Scrap into <em>Real Value</em></h1>
          <p className="mut" style={{ fontSize: 17, margin: "5px 0 16px" }}>Identify. Separate. Value. Route to the best buyer.</p>
          <button className="btn" onClick={() => go("Scan Scrap")}><I n="cam" s={20} /> Scan New Scrap <I n="arr" s={16} /></button>
        </div>
        <div className="art"><Scrap w={340} h={224} pal={["#3b2a22", "#b87333", "#6b4a35", "#2b2f35", "#8b8f95", "#d99058"]} seed={3} pile /></div>
        <div className="hr"><h3>SAME<br />SCRAP.<br />HIGHER<br />VALUE.</h3><hr /><p className="mut">Smart solutions for a sustainable industry.</p></div>
      </div>

      <Kpi icon="box" label="Total Scrap Processed" val={(k) => `${num((2840 + ex.kg) * k)} kg`} delta="18.6%" right={<Spark pts={[0.05, 0.14, 0.3, 0.3, 0.5, 0.6, 0.7, 0.86]} />} />
      <Kpi icon="coins" label="Total Value Recovered" val={(k) => inr((482640 + ex.val) * k)} delta="24.3%" right={<Spark pts={[0.05, 0.2, 0.32, 0.3, 0.5, 0.55, 0.7, 0.88]} />} />
      <Kpi icon="bars" label="Material Streams Created" val={(k) => String(Math.round((18 + ex.n) * k))} delta="12.5%" right={
        <div className="bars">{bars.map(([l, h, on]) => <div key={l}><div style={{ height: h, background: on ? "linear-gradient(#22a26d,#0f5a3f)" : "#243740" }} /><small>{l}</small></div>)}</div>} />
      <Kpi icon="users" label="Active Buyers" val={() => "24"} delta="9.1%" note="across 5 states" period={false} right={
        <div className="mapw"><IndiaMap /><div className="sts"><b>5</b><br />States</div></div>} />

      <div className="card">
        <div className="between"><div><h2>Latest Scan Result</h2><div className="mut" style={{ marginTop: 4 }}>Mixed scrap identified and routed to best buyers</div></div><div className="mut" style={{ display: "flex", gap: 10, alignItems: "center" }}>15 Apr 2025, 02:14 PM <span className="ok">Completed</span></div></div>
        <div className="ovf">
          <div className="flow">
            <div className="mixed"><div className="mimg"><Scrap w={180} h={110} pal={PAL.mix} seed={7} pile /></div><div className="mut" style={{ color: "#e9f2ed" }}>Mixed Scrap</div><b style={{ fontSize: 18 }}>1,000 kg</b><small className="mut">Input from factory</small></div>
            <div className="mid"><I n="arr" s={18} /></div>
            <div className="ai"><span style={{ color: "var(--g)" }}><I n="scan" s={30} /></span><b>AI Sorting</b><span>Material + Grade Detection</span></div>
            <svg width="60" height="196" viewBox="0 0 60 196" fill="none" strokeWidth="1.5">
              <path d="M0 98C28 98 26 30 54 30M48 25l7 5-7 5" stroke="#f08a3c" />
              <path d="M0 98H55M49 93l7 5-7 5" stroke="#fff" />
              <path d="M0 98C28 98 26 166 54 166M48 161l7 5-7 5" stroke="#4da3ff" />
            </svg>
            <div className="col">{mats.map(([m, d, , , c]) => <div className="mrow" key={m}><div className="thumb"><Scrap w={58} h={60} pal={PAL[m]} seed={m.length} /></div><div><b>{m}</b><div className="mut" style={{ color: c === "#e9f2ed" ? undefined : undefined }}>{d}</div></div></div>)}</div>
            <div className="col mid">{mats.map(([m, , , , c]) => <span key={m} style={{ color: c }}><I n="arr" s={18} /></span>)}</div>
            <div className="col">{mats.map(([m, , b, r, , ic]) => <div className="buy" key={m}><span className="bico"><I n={ic} s={20} /></span><div><b style={{ color: "var(--g)" }}>{b}</b><div style={{ fontWeight: 600 }}>{r}</div></div></div>)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Value Comparison</h2>
        <div className="vc">
          <div className="vbox"><span className="vico"><I n="trash" s={26} /></span><div><small className="mut">Current Method (Mixed Lot)</small><div style={{ fontSize: 16, fontWeight: 600 }}>1,000 kg</div><small className="mut">₹58 / kg</small><div className="vnum">₹58,000</div></div></div>
          <div className="mid"><I n="arr" s={22} /></div>
          <div className="vbox good">
            <span className="vico g"><I n="layers" s={26} /></span>
            <div style={{ flex: 1 }}><small style={{ color: "var(--g)" }}>With ScrapFlow (Separated)</small><div style={{ fontSize: 16, fontWeight: 600 }}>1,000 kg</div><small className="mut">Sold to best buyers</small><div className="vnum">₹94,600</div></div>
            <div className="gain"><span style={{ color: "var(--g)" }}><I n="trend" s={30} /></span><div><b style={{ fontSize: 24, color: "var(--g)" }}>+₹36,600</b><div>Potential Value Gain</div></div></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="between"><h2>Recent Batches</h2><a className="link" onClick={() => go("Inventory")}>View All <I n="arr" s={14} /></a></div>
        <div className="ovf"><table className="tbl rb"><thead><tr>{["#", "Date & Time", "Material", "Grade", "Quantity", "Buyer", "Value", "Status"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{batches.slice(0, 3).map((b) => (
            <tr key={b.id}><td>{b.id}</td><td>{b.date}</td><td style={{ color: MCOL[b.material] === "#e9f2ed" ? undefined : MCOL[b.material] }}>{b.material}</td><td>{b.grade}</td><td>{b.qty} kg</td><td>{b.buyer}</td><td><b>{inr(b.value)}</b></td><td><Pill s={b.status} /></td></tr>))}</tbody></table></div>
      </div>
    </>
  );
}

const Pill = ({ s }: { s: Status }) => <span className={"st " + s.replace(" ", "")}>{s}</span>;

/* ───────────── Scan Scrap ───────────── */
function Scan({ buyers, batches, onAdd, go }: { buyers: Buyer[]; batches: Batch[]; onAdd: (x: NewBatch[]) => void; go: (p: Page) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [kg, setKg] = useState(1000);
  const [depth, setDepth] = useState<Depth>("Standard");
  const [source, setSource] = useState("Factory line");
  const [check, setCheck] = useState(true);
  const [opt, setOpt] = useState(true);
  const [res, setRes] = useState<Det[] | null>(null);
  const [busy, setBusy] = useState(false);
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const run = async () => { setBusy(true); setRes(null); setRes(await detectScrap(file, kg, depth)); setBusy(false); };
  const rows = (res || []).map((d) => {
    const all = buyers.filter((b) => b.active && b.rates[d.material]);
    const best = bestBuyer(buyers, d.material), pick = opt ? best : all[0];
    const adj = check ? d.purity / 100 : 1, rate = pick?.rates[d.material] || 0;
    return { ...d, buyer: pick?.name || "—", rate, value: rate * d.qty * adj, edge: ((best?.rates[d.material] || 0) - (all[0]?.rates[d.material] || 0)) * d.qty * adj };
  });
  const total = rows.reduce((a, r) => a + r.value, 0), mixed = kg * 58;
  const conf = Math.round(rows.reduce((a, r) => a + r.conf * r.qty, 0) / kg);
  const contam = (100 - rows.reduce((a, r) => a + r.purity * r.qty, 0) / kg).toFixed(1) + "%";
  const confirm = () => { onAdd(rows.map((r) => ({ material: r.material, grade: r.grade, qty: r.qty, buyer: r.buyer, value: Math.round(r.value) }))); setRes(null); go("Inventory"); };
  const hint = { Quick: "About 1 second, lower confidence", Standard: "About 2 seconds, balanced", Detailed: "About 3 seconds, highest confidence" }[depth];
  return (
    <div className="g2">
      <div className="stack">
        <div className="card">
          <h2>Scan New Scrap</h2><p className="mut" style={{ margin: "4px 0 14px" }}>Upload a photo of the mixed lot and enter its weight.</p>
          <label className="drop">{url ? <img src={url} alt="Uploaded scrap" /> : <Scrap w={360} h={220} pal={PAL.mix} seed={5} pile />}
            <span className="cap"><I n="cam" s={16} /> {file ? file.name : "Choose a photo (optional)"}</span>
            <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
          <div className="fld" style={{ marginBottom: 0 }}><span className="mut">Total weight (kg)</span><input type="number" min={10} value={kg} onChange={(e) => setKg(Math.max(10, +e.target.value || 10))} /></div>
        </div>
        <div className="card">
          <h2 style={{ marginBottom: 12 }}>Analysis options</h2>
          <div className="fld"><span className="mut">Scrap source</span><select value={source} onChange={(e) => setSource(e.target.value)}>{["Factory line", "Storage yard", "Incoming truck"].map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="fld"><span className="mut">Analysis depth</span><div className="seg">{(["Quick", "Standard", "Detailed"] as Depth[]).map((d) => <button key={d} className={depth === d ? "on" : ""} onClick={() => setDepth(d)}>{d}</button>)}</div><small className="mut">{hint}</small></div>
          <Tg on={check} set={setCheck} label="Contamination check (adjusts value for impurities)" />
          <Tg on={opt} set={setOpt} label="Route to the best-paying buyer" />
          <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} disabled={busy} onClick={run}>{busy ? "Scanning…" : "Run AI Scan"}</button>
        </div>
      </div>
      <div className="stack">
        <div className="card">
          <div className="between"><h2>Scan result</h2>{res && <span className="ok">{source} · {depth}</span>}</div>
          {busy && <><div className="prog"><i /></div><p className="mut" style={{ marginTop: 10 }}>Analysing {source.toLowerCase()} in {depth.toLowerCase()} mode…</p></>}
          {!res && !busy && <>
            <p className="mut" style={{ margin: "4px 0 0" }}>Run a scan to see each material, its grade and the best buyer.</p>
            <ol className="steps">{["Upload a photo and enter the weight", "AI detects each material in the lot", "Grade and purity are checked", "Each stream goes to its best buyer"].map((t, i) => <li key={t}><b>{i + 1}</b>{t}</li>)}</ol></>}
          {res && <>
            <div className="comp">{rows.map((r) => <i key={r.material} style={{ width: `${(r.qty / kg) * 100}%`, background: MCOL[r.material] }} />)}</div>
            <div className="leg">{rows.map((r) => <span key={r.material}><i style={{ background: MCOL[r.material] }} />{r.material} {Math.round((r.qty / kg) * 100)}%</span>)}</div>
            {rows.map((r) => <div className="rr" key={r.material}><div><b style={{ color: MCOL[r.material] }}>{r.material}</b><div className="mut">{r.qty} kg · Grade {r.grade} · {r.conf}% sure</div></div><div><b>{inr(r.value)}</b><div className="mut">{r.buyer} · ₹{r.rate}/kg</div></div></div>)}
            <div className="mini" style={{ marginTop: 14 }}>
              <div><small className="mut">Mixed lot @ ₹58/kg</small><b>{inr(mixed)}</b></div>
              <div><small className="mut">Separated</small><b>{inr(total)}</b></div>
              <div><small className="mut">Value gain</small><b style={{ color: "var(--g)" }}>{total >= mixed ? "+" : "−"}{inr(Math.abs(total - mixed))}</b></div></div>
            <div className="mini">
              <div><small className="mut">Confidence</small><b>{conf}%</b></div>
              <div><small className="mut">Contamination</small><b>{check ? contam : "Off"}</b></div>
              <div><small className="mut">{opt ? "Best-buyer gain" : "Gain if optimised"}</small><b>{inr(rows.reduce((a, r) => a + r.edge, 0))}</b></div></div>
            <button className="btn" onClick={confirm}><I n="check" s={18} /> Confirm & route to buyers</button></>}
        </div>
        <div className="card">
          <h2>Today's best rates</h2><p className="mut" style={{ margin: "4px 0 8px" }}>From your active buyers. Detected materials are highlighted.</p>
          {MATS.map((m) => {
            const rs = buyers.filter((b) => b.active && b.rates[m]), best = bestBuyer(buyers, m);
            if (!best) return null;
            const avg = rs.reduce((a, b) => a + b.rates[m]!, 0) / rs.length, top = best.rates[m]!;
            return <div className={"rr" + (rows.some((r) => r.material === m) ? " hl" : "")} key={m}><div><b style={{ color: MCOL[m] }}>{m}</b><div className="mut">{best.name} · {best.state}</div></div><div><b>₹{top}/kg</b><div className="mut">avg ₹{Math.round(avg)} · +{(((top - avg) / avg) * 100).toFixed(1)}%</div></div></div>;
          })}
        </div>
        <div className="card">
          <div className="between"><h2>Recent scans</h2><a className="link" onClick={() => go("Inventory")}>View all <I n="arr" s={14} /></a></div>
          {batches.slice(0, 4).map((b) => <div className="rs" key={b.id}><b style={{ color: MCOL[b.material] }}>{b.material}</b><span className="mut">{b.id} · {b.qty} kg</span><b>{inr(b.value)}</b><Pill s={b.status} /></div>)}
          {!batches.length && <p className="mut" style={{ marginTop: 10 }}>No scans yet. Run your first scan.</p>}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Buyer Network ───────────── */
function Buyers({ buyers, setBuyers }: { buyers: Buyer[]; setBuyers: (b: Buyer[]) => void }) {
  const [s, setS] = useState("");
  const [m, setM] = useState<"All" | Mat>("All");
  const [f, setF] = useState({ name: "", state: "", mat: "Copper" as Mat, rate: "" });
  const list = buyers.filter((b) => (m === "All" || b.rates[m]) && (b.name + b.state).toLowerCase().includes(s.toLowerCase()));
  const add = () => {
    if (!f.name.trim() || !+f.rate) return;
    const rates: Buyer["rates"] = {}; rates[f.mat] = +f.rate;
    setBuyers([...buyers, { name: f.name.trim(), state: f.state.trim() || "—", rating: 4, active: true, rates }]);
    setF({ ...f, name: "", rate: "" });
  };
  return (
    <>
      <div className="card">
        <div className="between"><h2>Buyer Network</h2>
          <div className="tools"><input className="in" placeholder="Search buyer or state" value={s} onChange={(e) => setS(e.target.value)} />
            <select className="in" value={m} onChange={(e) => setM(e.target.value as "All" | Mat)}>{["All", ...MATS].map((x) => <option key={x}>{x}</option>)}</select></div></div>
        <div className="ovf"><table className="tbl"><thead><tr>{["Buyer", "State", "Rating", "Rates (₹/kg)", "Status"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{list.map((b) => (
            <tr key={b.name}><td><b>{b.name}</b></td><td>{b.state}</td><td>★ {b.rating}</td>
              <td>{(Object.entries(b.rates) as [Mat, number][]).map(([k, v]) => <span key={k} className="chip" style={{ color: MCOL[k] }}>{k} {v}</span>)}</td>
              <td><button className={"tgl " + (b.active ? "on" : "")} onClick={() => setBuyers(buyers.map((x) => (x === b ? { ...x, active: !x.active } : x)))}>{b.active ? "Active" : "Paused"}</button></td></tr>))}
            {!list.length && <tr><td colSpan={5} className="mut">No buyers match. Clear the filters or add a buyer below.</td></tr>}</tbody></table></div>
      </div>
      <div className="card"><h2 style={{ marginBottom: 12 }}>Add buyer</h2>
        <div className="tools">
          <input className="in" placeholder="Buyer name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="in" placeholder="State" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} />
          <select className="in" value={f.mat} onChange={(e) => setF({ ...f, mat: e.target.value as Mat })}>{MATS.map((x) => <option key={x}>{x}</option>)}</select>
          <input className="in" type="number" placeholder="₹ / kg" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} />
          <button className="btn" onClick={add}><I n="plus" s={16} /> Add buyer</button></div></div>
    </>
  );
}

/* ───────────── Inventory ───────────── */
function Inventory({ batches, setBatches, q, setQ }: { batches: Batch[]; setBatches: (b: Batch[]) => void; q: string; setQ: (s: string) => void }) {
  const [st, setSt] = useState<"All" | Status>("All");
  const [m, setM] = useState<"All" | Mat>("All");
  const list = batches.filter((b) => (st === "All" || b.status === st) && (m === "All" || b.material === m) && Object.values(b).join(" ").toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="card">
      <div className="between"><h2>Inventory</h2>
        <div className="tools"><input className="in" placeholder="Search batches…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="in" value={m} onChange={(e) => setM(e.target.value as "All" | Mat)}>{["All", ...MATS].map((x) => <option key={x}>{x}</option>)}</select>
          <select className="in" value={st} onChange={(e) => setSt(e.target.value as "All" | Status)}>{["All", "Delivered", "In Transit", "Scheduled"].map((x) => <option key={x}>{x}</option>)}</select>
          <button className="btn ghost" onClick={() => csv("inventory.csv", [["ID", "Date", "Material", "Grade", "Qty", "Buyer", "Value", "Status"], ...list.map((b) => [b.id, `"${b.date}"`, b.material, b.grade, b.qty, b.buyer, b.value, b.status])])}><I n="dl" s={16} /> Export CSV</button></div></div>
      <div className="ovf"><table className="tbl"><thead><tr>{["#", "Date & Time", "Material", "Grade", "Quantity", "Buyer", "Value", "Status", ""].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{list.map((b) => (
          <tr key={b.id}><td>{b.id}</td><td>{b.date}</td><td style={{ color: MCOL[b.material] }}>{b.material}</td><td>{b.grade}</td><td>{b.qty} kg</td><td>{b.buyer}</td><td><b>{inr(b.value)}</b></td>
            <td><select className={"stsel st " + b.status.replace(" ", "")} value={b.status} onChange={(e) => setBatches(batches.map((x) => (x.id === b.id ? { ...x, status: e.target.value as Status } : x)))}>{["Delivered", "In Transit", "Scheduled"].map((x) => <option key={x}>{x}</option>)}</select></td>
            <td><button className="ib" aria-label={`Delete ${b.id}`} onClick={() => setBatches(batches.filter((x) => x.id !== b.id))}><I n="trash" s={16} /></button></td></tr>))}
          {!list.length && <tr><td colSpan={9} className="mut">No batches found. Change the filters or scan new scrap.</td></tr>}</tbody></table></div>
    </div>
  );
}

/* ───────────── Reports ───────────── */
function BarList({ title, rows }: { title: string; rows: [string, { q: number; v: number }][] }) {
  const max = Math.max(1, ...rows.map(([, r]) => r.v));
  return (
    <div className="card"><h2 style={{ marginBottom: 12 }}>{title}</h2>
      {rows.map(([k, r]) => <div className="hb" key={k}><span>{k}</span><div><i style={{ width: `${(r.v / max) * 100}%`, background: MCOL[k as Mat] || "#1f9d6b" }} /></div><b>{inr(r.v)}</b><small className="mut">{num(r.q)} kg</small></div>)}
      {!rows.length && <p className="mut">No data yet.</p>}
    </div>
  );
}
function Reports({ batches }: { batches: Batch[] }) {
  const by = (key: (b: Batch) => string) => {
    const o: Record<string, { q: number; v: number }> = {};
    batches.forEach((b) => { const k = key(b); o[k] = o[k] || { q: 0, v: 0 }; o[k].q += b.qty; o[k].v += b.value; });
    return Object.entries(o).sort((a, b) => b[1].v - a[1].v);
  };
  const kg = batches.reduce((a, b) => a + b.qty, 0), val = batches.reduce((a, b) => a + b.value, 0);
  const stats: [string, string][] = [["Batches", String(batches.length)], ["Scrap sorted", `${num(kg)} kg`], ["Value recovered", inr(val)], ["Average rate", `${inr(kg ? val / kg : 0)} / kg`]];
  return (
    <>
      <div className="between" style={{ marginBottom: 12 }}><h2>Reports</h2><button className="btn ghost" onClick={() => csv("report.csv", [["Material", "Qty", "Value"], ...by((b) => b.material).map(([k, r]) => [k, r.q, r.v])])}><I n="dl" s={16} /> Export CSV</button></div>
      <div className="stats">{stats.map(([l, v]) => <div className="card" key={l}><div className="mut">{l}</div><div className="big">{v}</div></div>)}</div>
      <div className="g2"><BarList title="Value by material" rows={by((b) => b.material)} /><BarList title="Value by buyer" rows={by((b) => b.buyer)} /></div>
      <BarList title="Value by status" rows={by((b) => b.status)} />
    </>
  );
}

/* ───────────── Settings ───────────── */
const Tg = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => (
  <div className="between srow"><span>{label}</span><button role="switch" aria-checked={on} aria-label={label} className={"sw " + (on ? "on" : "")} onClick={() => set(!on)}><i /></button></div>
);
function Settings({ cfg, setCfg, reset }: { cfg: Cfg; setCfg: (c: Cfg) => void; reset: () => void }) {
  return (
    <div className="g2">
      <div className="card"><h2 style={{ marginBottom: 12 }}>Profile</h2>
        <div className="fld"><span className="mut">Name</span><input value={cfg.name} onChange={(e) => setCfg({ ...cfg, name: e.target.value })} /></div>
        <div className="fld"><span className="mut">Factory</span><select value={cfg.factory} onChange={(e) => setCfg({ ...cfg, factory: e.target.value })}>{FACTORIES.map((f) => <option key={f}>{f}</option>)}</select></div>
        <p className="mut">Changes apply instantly.</p></div>
      <div className="card"><h2 style={{ marginBottom: 6 }}>Preferences</h2>
        <Tg on={cfg.alerts} set={(v) => setCfg({ ...cfg, alerts: v })} label="In-app alerts for new price changes" />
        <Tg on={cfg.email} set={(v) => setCfg({ ...cfg, email: v })} label="Email a summary after each batch" />
        <Tg on={cfg.autoRoute} set={(v) => setCfg({ ...cfg, autoRoute: v })} label="Auto-route scans to the best buyer" />
        <button className="btn ghost" style={{ marginTop: 16 }} onClick={reset}>Reset demo data</button></div>
    </div>
  );
}

/* ───────────── App shell ───────────── */
export default function App() {
  const [page, setPage] = useState<Page>("Dashboard");
  const [q, setQ] = useState("");
  const [bell, setBell] = useState(false);
  const [unread, setUnread] = useState(true);
  const [menu, setMenu] = useState(false);

  // Supabase hooks
  const { batches: dbBatches, loading: batchesLoading, addBatchBulk, updateBatchStatus, deleteBatch } = useBatches();
  const { buyers: dbBuyers, loading: buyersLoading, addBuyer, toggleBuyer } = useBuyers();
  const { settings, loading: settingsLoading, updateSettings } = useSettings();

  // Convert DB batches to UI format
  const batches: Batch[] = useMemo(() => {
    const buyerMap: Record<string, string> = {};
    dbBuyers.forEach(b => { buyerMap[b.id] = b.name; });
    return dbBatches.map(b => ({
      id: b.id,
      date: new Date(b.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      material: b.material as Mat,
      grade: b.grade,
      qty: b.quantity,
      buyer: buyerMap[b.buyer_id] || "—",
      value: b.value,
      status: b.status as Status,
    }));
  }, [dbBatches, dbBuyers]);

  // Convert DB buyers to UI format
  const buyers: Buyer[] = useMemo(() => {
    return dbBuyers.map(b => ({
      name: b.name,
      state: b.state,
      rating: b.rating,
      active: b.active,
      rates: b.rates,
    }));
  }, [dbBuyers]);

  // Config from settings
  const cfg: Cfg = useMemo(() => ({
    name: settings?.user_name || "Sakshi",
    factory: settings?.factory || FACTORIES[0],
    alerts: settings?.alerts ?? true,
    email: settings?.email_notifications ?? true,
    autoRoute: settings?.auto_route ?? false,
  }), [settings]);

  // Extra stats for dashboard
  const ex: Extra = useMemo(() => ({
    kg: batches.reduce((a, b) => a + b.qty, 0),
    val: batches.reduce((a, b) => a + b.value, 0),
    n: batches.length,
  }), [batches]);

  // Add batches from scan
  const addBatches = async (xs: NewBatch[]) => {
    const buyerMap: Record<string, string> = {};
    dbBuyers.forEach(b => { buyerMap[b.name] = b.id; });
    const rows = xs.map(x => ({
      material: x.material as MaterialCategory,
      grade: x.grade,
      quantity: x.qty,
      buyer_id: buyerMap[x.buyer] || null,
      value: x.value,
    }));
    await addBatchBulk(rows);
  };

  // Update settings
  const setCfg = (updates: Partial<Cfg>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.user_name = updates.name;
    if (updates.factory !== undefined) dbUpdates.factory = updates.factory;
    if (updates.alerts !== undefined) dbUpdates.alerts = updates.alerts;
    if (updates.email !== undefined) dbUpdates.email_notifications = updates.email;
    if (updates.autoRoute !== undefined) dbUpdates.auto_route = updates.autoRoute;
    updateSettings(dbUpdates);
  };

  // Reset to seed data
  const resetData = () => {
    // For now, just reload — in production, could re-seed
    window.location.reload();
  };

  if (batchesLoading || buyersLoading || settingsLoading) {
    return (
      <div className="app">
        <style>{CSS}</style>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <div className="prog" style={{ width: 200, margin: "0 auto 16px" }}><i /></div>
            <p className="mut">Loading ScrapFlow...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <style>{CSS}</style>
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <aside className={"side" + (menu ? " open" : "")}>
        <div className="logo"><span className="lg"><I n="leaf" s={26} /></span><div><b>Scrap<i>Flow</i></b><small>Sort. Value. Route.</small></div></div>
        {PAGES.map((p) => <button key={p} className={"nav" + (page === p ? " on" : "")} onClick={() => { setPage(p); setMenu(false); }}><I n={PICON[p]} s={22} />{p}</button>)}
        <div className="tag"><span style={{ color: "var(--g)" }}><I n="leaf" s={30} /></span><h4>Towards a Cleaner, More Valuable Tomorrow.</h4><hr /><span className="mut" style={{ fontSize: 14, lineHeight: 1.5 }}>Smarter sorting. Higher returns.</span></div>
      </aside>
      <main className="main">
        <header className="top">
          <button className="ib burger" aria-label="Open menu" onClick={() => setMenu(true)}><I n="menu" s={24} /></button>
          <div className="srch"><I n="search" s={18} /><input placeholder="Search materials, buyers, batches..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setPage("Inventory")} /></div>
          <div className="sp" />
          <label className="box"><I n="bld" s={18} /><select value={cfg.factory} onChange={(e) => setCfg({ factory: e.target.value as Cfg["factory"] })}>{FACTORIES.map((f) => <option key={f}>{f}</option>)}</select><I n="chev" s={16} /></label>
          <div className="rel">
            <button className="ib" aria-label="Notifications" onClick={() => { setBell(!bell); setUnread(false); }}><I n="bell" s={22} />{unread && <i className="dot" />}</button>
            {bell && <div className="dropm"><b>Notifications</b><p>Real-time updates from Supabase</p></div>}
          </div>
          <div className="me" onClick={() => setPage("Settings")}><span className="av">{(cfg.name[0] || "?").toUpperCase()}</span><div><b>{cfg.name || "User"}</b><small className="mut">Admin</small></div><I n="chev" s={16} /></div>
        </header>
        {page === "Dashboard" && <Dashboard batches={batches} ex={ex} go={setPage} />}
        {page === "Scan Scrap" && <Scan buyers={buyers} batches={batches} onAdd={addBatches} go={setPage} />}
        {page === "Buyer Network" && <Buyers buyers={buyers} setBuyers={(bs) => {
          // Handle buyer updates
          bs.forEach(b => {
            const existing = dbBuyers.find(db => db.name === b.name);
            if (existing && existing.active !== b.active) {
              toggleBuyer(existing.id, b.active);
            }
          });
        }} />}
        {page === "Inventory" && <Inventory batches={batches} setBatches={(bs) => {
          // Handle batch updates (status changes, deletes)
          bs.forEach(b => {
            const existing = dbBatches.find(db => db.id === b.id);
            if (!existing) return;
            if (existing.status !== b.status) {
              updateBatchStatus(b.id, b.status as BatchStatus);
            }
          });
          // Check for deletions
          dbBatches.forEach(db => {
            if (!bs.find(b => b.id === db.id)) {
              deleteBatch(db.id);
            }
          });
        }} q={q} setQ={setQ} />}
        {page === "Reports" && <Reports batches={batches} />}
        {page === "Settings" && <Settings cfg={cfg} setCfg={setCfg} reset={resetData} />}
      </main>
    </div>
  );
}

/* ───────────── Styles ───────────── */
const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
:root{--bg:#09130f;--card:#0e1b17;--bd:#182a24;--g:#34e6a0;--mut:#8ea198;--tx:#e9f2ed}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg)}
.app{display:flex;min-height:100vh;color:var(--tx);font:13px Inter,system-ui,sans-serif;background:var(--bg)}
button{font:inherit;color:inherit;cursor:pointer}input,select{background:transparent;border:0;color:inherit;font:inherit;outline:0}select option{background:#0d1a16}
:focus-visible{outline:2px solid var(--g);outline-offset:2px}
.mut{color:var(--mut)}.sp{flex:1}.rel{position:relative}.between{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
h1{font-size:32px;font-weight:600;margin:6px 0}h1 em{font-style:normal;color:var(--g)}h2{font-size:18px;font-weight:600}
.side{width:185px;flex:none;border-right:1px solid var(--bd);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;padding:14px 0 16px}
.logo{display:flex;gap:10px;align-items:center;padding:6px 18px 22px}.logo b{font-size:20px;font-weight:600}.logo i{font-style:normal;color:var(--g)}.logo small{display:block;font-size:11px;color:var(--mut)}
.lg{color:var(--g);width:30px;height:30px;display:grid;place-items:center}
.nav{display:flex;align-items:center;gap:14px;padding:14px 26px;color:#c9d6cf;border:0;background:none;width:100%;text-align:left;font-size:14px}
.nav.on{background:linear-gradient(90deg,#128a5f,#0d5a40);color:#fff;border-left:3px solid var(--g);padding-left:23px}
.tag{margin:auto 16px 0;padding:18px 16px;border:1px solid var(--bd);border-radius:12px;background:#0b1713}.tag h4{font-size:17px;line-height:1.25;margin:10px 0 18px}.tag hr{width:32px;border:0;border-top:2px solid #2a3b35;margin-bottom:14px}
.main{flex:1;min-width:0;padding:14px 16px 24px}.top{display:flex;gap:14px;align-items:center;margin-bottom:14px}
.srch,.box,.me{display:flex;gap:10px;align-items:center;height:40px;border:1px solid var(--bd);background:var(--card);border-radius:10px;padding:0 14px;color:var(--mut)}.srch{flex:1;max-width:366px}.srch input{flex:1}
.box{color:var(--tx)}.box select{appearance:none;padding-right:6px}.me{border:0;background:none;color:var(--tx);cursor:pointer;height:auto}.me small{display:block}
.av{width:38px;height:38px;border-radius:50%;background:#26383d;display:grid;place-items:center;font-size:17px}
.ib{background:none;border:0;color:var(--tx);position:relative;padding:6px}.dot{position:absolute;top:4px;right:6px;width:9px;height:9px;border-radius:50%;background:#ff4d4d}
.dropm{position:absolute;right:0;top:44px;width:270px;background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:12px;z-index:9}.dropm p{padding:8px 0;border-top:1px solid var(--bd);margin-top:8px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:16px 18px;margin-bottom:12px}
.hero{position:relative;overflow:hidden;display:grid;grid-template-columns:1fr 200px;min-height:224px;padding:0}.hl{padding:22px 24px;position:relative;z-index:2}
.art{position:absolute;right:200px;top:0;bottom:0;width:360px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 45%);mask-image:linear-gradient(90deg,transparent,#000 45%)}
.hr{border-left:1px solid var(--bd);margin:24px 0;padding:0 24px;position:relative;z-index:2}.hr h3{font-size:17px;letter-spacing:.06em;line-height:1.35;margin-top:0}.hr hr{width:60px;border:0;border-top:1px solid #34463f;margin:14px 0}.hr p{font-size:13px}
.btn{display:inline-flex;gap:10px;align-items:center;background:var(--g);color:#04231a;border:0;border-radius:8px;padding:0 20px;height:42px;font-weight:600}.btn:disabled{opacity:.6}.btn.ghost{background:transparent;color:var(--tx);border:1px solid var(--bd);height:36px}
.kpi{display:grid;grid-template-columns:56px 250px 1fr;gap:18px;align-items:center;position:relative;height:112px;padding:0 18px}
.kico{width:56px;height:56px;border-radius:12px;background:#12392c;color:var(--g);display:grid;place-items:center}
.big{font-size:28px;font-weight:600;margin:2px 0 6px}.delta{color:var(--g);font-weight:600;font-size:15px;display:flex;align-items:center;gap:4px}.delta span{color:var(--mut);font-weight:400;font-size:13px;margin-left:6px}
.per{position:absolute;right:16px;top:12px;display:flex;align-items:center;gap:8px;border:1px solid var(--bd);padding:6px 10px;border-radius:8px;background:#0a1512}.per select{appearance:none}
.kright{display:flex;justify-content:center}.bars{display:flex;gap:16px;align-items:flex-end;margin-top:14px}.bars>div{display:flex;flex-direction:column;align-items:center;gap:8px;width:44px}.bars div div{width:28px;border-radius:3px 3px 0 0}.bars small{font-size:11px}
.mapw{display:flex;justify-content:space-between;align-items:center;width:100%;max-width:520px;padding:0 40px 0 30px}.sts{font-size:14px}.sts b{font-size:22px;font-weight:500}
.ok{background:#12472f;color:var(--g);padding:5px 12px;border-radius:6px;font-size:12px}
.ovf{overflow-x:auto}.flow{display:grid;grid-template-columns:172px 34px 112px 60px minmax(190px,1fr) 44px minmax(190px,1fr);align-items:center;margin-top:12px;min-width:820px}
.mixed{border:1px solid var(--bd);border-radius:10px;padding:5px 5px 10px;text-align:center;display:flex;flex-direction:column;gap:2px;background:#0b1713}.mimg{height:106px;border-radius:6px;overflow:hidden;margin-bottom:6px}
.mid{display:flex;justify-content:center;color:#cfe0d8}.col{display:grid;gap:8px;grid-auto-rows:60px;align-items:center}.col.mid{justify-items:center}
.ai{border:1px solid #1d6a4f;background:#0c2a20;border-radius:8px;padding:14px 6px;text-align:center;font-size:11px;color:var(--mut);display:flex;flex-direction:column;gap:4px;align-items:center}.ai b{font-size:14px;color:var(--tx)}
.mrow{display:flex;gap:10px;align-items:center;height:60px;border:1px solid var(--bd);background:#0b1713;border-radius:8px;overflow:hidden;padding-right:10px}.thumb{width:58px;height:60px;flex:none}.mrow b{font-size:14px}
.buy{display:flex;gap:12px;align-items:center;height:60px;border:1px solid #1d5a44;background:#0c2a20;border-radius:8px;padding:0 12px}.bico{width:36px;height:36px;border-radius:8px;background:#12392c;color:var(--g);display:grid;place-items:center}
.vc{display:grid;grid-template-columns:1fr 44px 2.3fr;align-items:center}.vbox{display:flex;gap:14px;align-items:center;border:1px solid var(--bd);background:#0b1713;border-radius:10px;padding:14px}
.vbox.good{border-color:#1d5a44;background:#0a2018}.vico{width:52px;height:52px;border-radius:10px;background:#1a2628;display:grid;place-items:center;color:#c9d6cf;flex:none}.vico.g{background:#12392c;color:var(--g)}.vnum{font-size:26px;font-weight:600;margin-top:4px}
.gain{display:flex;gap:14px;align-items:center;border:1px solid #1d6a4f;border-radius:10px;padding:16px 22px}
.link{color:var(--g);display:inline-flex;gap:6px;align-items:center;cursor:pointer;font-size:14px}
.tbl{width:100%;border-collapse:collapse;min-width:640px}.tbl th{text-align:left;font-weight:400;color:var(--mut);padding:10px 12px;background:#0a1512}.tbl td{padding:12px;border-top:1px solid var(--bd);vertical-align:middle}.tbl th:first-child{border-radius:8px 0 0 8px}.tbl th:last-child{border-radius:0 8px 8px 0}
.st{display:inline-block;min-width:92px;text-align:center;padding:5px 10px;border-radius:6px;font-size:13px}.Delivered{background:#1a7f57;color:#e5fff5}.InTransit{background:#12467a;color:#cfe6ff}.Scheduled{background:#3b3a78;color:#dedcff}
.stsel{appearance:none;cursor:pointer}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}.g2 .card{margin-bottom:0}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.in{border:1px solid var(--bd);background:#0a1512;border-radius:8px;padding:0 12px;height:36px;min-width:130px}
.chip{display:inline-block;border:1px solid var(--bd);border-radius:6px;padding:3px 8px;margin-right:6px;background:#0a1512}
.tgl{border:1px solid var(--bd);background:#0a1512;border-radius:6px;padding:5px 12px;color:var(--mut)}.tgl.on{background:#12472f;color:var(--g);border-color:#1d5a44}
.drop{display:block;position:relative;height:220px;border:1px dashed #2a3f37;border-radius:10px;overflow:hidden;cursor:pointer;margin-bottom:14px}.drop img{width:100%;height:100%;object-fit:cover}
.cap{position:absolute;left:10px;bottom:10px;background:#000a;padding:6px 10px;border-radius:6px;display:flex;gap:8px;align-items:center}
.fld{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}.fld input,.fld select{border:1px solid var(--bd);background:#0a1512;border-radius:8px;padding:0 12px;height:40px}
.prog{height:6px;background:#12261f;border-radius:4px;overflow:hidden;margin-top:14px}.prog i{display:block;height:100%;width:40%;background:var(--g);animation:mv 1s infinite linear}@keyframes mv{from{margin-left:-40%}to{margin-left:100%}}
.hb{display:grid;grid-template-columns:90px 1fr 90px 60px;gap:10px;align-items:center;margin-bottom:10px}.hb div{height:10px;background:#12261f;border-radius:5px;overflow:hidden}.hb i{display:block;height:100%;border-radius:5px}
.srow{padding:12px 0;border-top:1px solid var(--bd)}.sw{width:44px;height:24px;border-radius:12px;border:0;background:#26383d;padding:3px;text-align:left}.sw i{display:block;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s}.sw.on{background:#1f9d6b}.sw.on i{transform:translateX(20px)}
.app{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.logo{padding:6px 18px 39px}.nav{padding:15px 26px}.nav.on{padding-left:23px}
.main{padding:15px 16px 24px}.top{margin-bottom:27px}.burger,.scrim{display:none}
.hero{grid-template-columns:1fr 148px}.hl{padding:16px 25px}.art{right:148px;width:330px}
.hr{padding:0 10px 0 25px;margin:24px 0 18px}.hr h3{font-size:17px;letter-spacing:.07em;line-height:1.32}
h1{font-size:clamp(24px,3.2vw,32px);line-height:1.2;margin:9px 0 4px}
.kpi{grid-template-columns:68px 220px 1fr;gap:26px;min-height:112px;height:auto;padding:16px 18px}.kico{width:68px;height:68px}.kpi .mut{font-size:14px}.big{font-size:30px;margin:3px 0 7px}.delta{font-size:16px}
.per{width:119px;height:31px;justify-content:space-between;font-size:12px;padding:0 10px;top:11px;right:15px}.per select{flex:1}
.kright{justify-content:flex-start;margin-left:5px;min-width:0}.kright svg{max-width:100%;height:auto}
.bars{gap:0;margin:6px 0 0 4px}.bars>div{width:54px}
.mapw{max-width:none;justify-content:flex-start;padding:0 0 0 78px}.sts{margin:0 66px 0 auto}
.ok{border:1px solid #1c6b4d;background:#0f3d2d;padding:4px 12px}
.flow{grid-template-columns:180px 33px 112px 62px 1.15fr 48px 1fr;min-width:740px}.ai{height:110px;justify-content:center}
.vc{grid-template-columns:1fr 46px 1.8fr}.vbox{gap:20px;padding:12px 14px 12px 9px;min-height:110px}.vbox.good{padding:8px 6px 8px 12px}.good .vnum{color:var(--g)}
.gain{width:192px;flex:none;height:94px;padding:0 12px;gap:12px;background:#0d2a21}
.tbl th{padding:7px 10px}.tbl td{padding:9px 10px}
.rb{table-layout:fixed}.rb th:nth-child(1){width:10%}.rb th:nth-child(2){width:16%}.rb th:nth-child(3){width:11%}.rb th:nth-child(4){width:10%}.rb th:nth-child(5){width:12%}.rb th:nth-child(6){width:12%}.rb th:nth-child(7){width:15%}.rb th:nth-child(8){width:14%}
.stack{display:grid;gap:12px;align-content:start;min-width:0}.stack .card{margin-bottom:0}
.seg{display:flex;border:1px solid var(--bd);border-radius:8px;overflow:hidden}.seg button{flex:1;height:38px;border:0;background:#0a1512;color:var(--mut)}.seg button.on{background:#12472f;color:var(--g);font-weight:600}
.steps{list-style:none;display:grid;gap:12px;margin-top:16px}.steps li{display:flex;gap:12px;align-items:center}.steps b{width:26px;height:26px;border-radius:50%;background:#12392c;color:var(--g);display:grid;place-items:center;flex:none}
.comp{display:flex;height:12px;border-radius:6px;overflow:hidden;margin:14px 0 8px;gap:2px}.comp i{display:block;height:100%}.leg{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}.leg span{display:flex;gap:6px;align-items:center}.leg i{width:8px;height:8px;border-radius:50%}
.rr{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--bd)}.rr>div:last-child{text-align:right}.rr .mut{margin-top:2px}.rr.hl{background:#0c2a20;margin:0 -8px;padding:10px 8px;border-radius:8px;border-color:transparent}
.rs{display:grid;grid-template-columns:90px 1fr auto auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--bd)}.rs .st{min-width:84px}
.mini{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:12px}.mini>div{border:1px solid var(--bd);background:#0a1512;border-radius:10px;padding:12px}.mini b{display:block;font-size:19px;margin-top:4px}
@media(max-width:980px){.stats{grid-template-columns:repeat(2,1fr)}}
@media(max-width:900px){
.burger{display:inline-flex}.scrim{display:block;position:fixed;inset:0;background:#000b;z-index:20}
.side{position:fixed;left:0;top:0;z-index:30;width:230px;background:var(--bg);transform:translateX(-100%);transition:transform .2s}.side.open{transform:none}
.main{padding:12px}.top{margin-bottom:16px;gap:10px}
.hero{grid-template-columns:1fr}.hr{display:none}.art{right:0;width:60%;opacity:.55}
.kpi{grid-template-columns:68px 1fr;gap:14px 18px}.per{position:static;justify-self:start;grid-column:1/-1}.kright{grid-column:1/-1;margin-left:0}.mapw{padding-left:0}.sts{margin:0 0 0 auto}
.g2{grid-template-columns:1fr}.vc{grid-template-columns:1fr}.vc .mid{transform:rotate(90deg);padding:10px 0}.vbox.good{flex-wrap:wrap}.gain{width:100%}}
@media(max-width:640px){.box,.me>div,.me>svg{display:none}.srch{max-width:none}.kico{width:52px;height:52px}.kpi{grid-template-columns:52px 1fr}.big{font-size:26px}.stats{grid-template-columns:1fr}.hb{grid-template-columns:70px 1fr 80px}.hb small{display:none}.hl{padding:16px}.tools .in{flex:1 1 130px}}
@media(prefers-reduced-motion:reduce){.prog i,.sw i{animation:none;transition:none}}
`;
