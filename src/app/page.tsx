"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import Matter from "matter-js";
import {
  Activity,
  CircleDot,
  Gauge,
  Grip,
  Hexagon,
  Image as ImageIcon,
  Layers,
  Mountain,
  Pause,
  Play,
  RotateCcw,
  Scan,
  Terminal,
  Triangle,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const { Engine, Bodies, Composite, Constraint } = Matter;

const W = 800;
const H = 520;
const STEP = 1000 / 60;
const SUB = 3;
const MAX_BALLS = 120;
const COLORS = ["#f59e0b", "#22d3ee", "#fb7185", "#a3e635", "#c084fc"];
const GRAV = { Earth: 1, Moon: 0.165, Jupiter: 2.53 } as const;

type Shape = { x: number; y: number; w: number; h: number; a?: number; r?: number; dyn?: boolean; pin?: boolean };
type Preset = {
  id: string;
  name: string;
  icon: LucideIcon;
  drop: [number, number];
  shapes: Shape[];
  draw: (c: CanvasRenderingContext2D) => void;
};

const rect = (x: number, y: number, w: number, h: number, a = 0): Shape => ({ x, y, w, h, a });
const seg = (x1: number, y1: number, x2: number, y2: number, t = 16, ext = 0): Shape =>
  rect((x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1) + ext, t, Math.atan2(y2 - y1, x2 - x1));
const peg = (x: number, y: number, r: number): Shape => ({ x, y, w: 0, h: 0, r });

const paint = (c: CanvasRenderingContext2D, s: Shape, fill: string, stroke: string, lw = 3) => {
  c.save();
  c.translate(s.x, s.y);
  c.rotate(s.a ?? 0);
  c.fillStyle = fill;
  c.strokeStyle = stroke;
  c.lineWidth = lw;
  c.lineJoin = "round";
  c.beginPath();
  if (s.r) c.arc(0, 0, s.r, 0, Math.PI * 2);
  else c.rect(-s.w / 2, -s.h / 2, s.w, s.h);
  c.fill();
  c.stroke();
  c.restore();
};

const rampShapes: Shape[] = [
  seg(30, 110, 310, 190),
  seg(560, 235, 280, 315),
  { x: 230, y: 440, w: 240, h: 12, dyn: true, pin: true },
  rect(110, 500, 40, 40),
  rect(350, 500, 40, 40),
  peg(470, 430, 20),
  peg(620, 380, 16),
  peg(720, 470, 24),
];

const drawRamp = (c: CanvasRenderingContext2D) => {
  c.fillStyle = "#f3ecd9";
  c.fillRect(0, 0, W, H);
  c.strokeStyle = "#e0d5b8";
  c.lineWidth = 1;
  c.beginPath();
  for (let x = 0; x <= W; x += 20) {
    c.moveTo(x, 0);
    c.lineTo(x, H);
  }
  for (let y = 0; y <= H; y += 20) {
    c.moveTo(0, y);
    c.lineTo(W, y);
  }
  c.stroke();
  c.font = "600 11px ui-monospace, monospace";
  c.fillStyle = "#64748b";
  c.fillText("DROP ZONE", 44, 92);
  rampShapes.forEach((s) => {
    if (s.dyn) return;
    if (s.r) paint(c, s, "#fde68a", "#92400e");
    else paint(c, s, s.h > 20 ? "#fecaca" : "#bfdbfe", s.h > 20 ? "#7f1d1d" : "#1e3a8a");
  });
  c.fillStyle = "#fecaca";
  c.strokeStyle = "#7f1d1d";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(196, 520);
  c.lineTo(264, 520);
  c.lineTo(230, 447);
  c.closePath();
  c.fill();
  c.stroke();
};

const plinkoShapes: Shape[] = [
  ...Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: r % 2 ? 10 : 11 }, (_, i) => peg((r % 2 ? 95 : 60) + i * 70, 110 + r * 45, 6)),
  ).flat(),
  ...Array.from({ length: 7 }, (_, i) => rect((i + 1) * 100, 480, 8, 80)),
];

const drawPlinko = (c: CanvasRenderingContext2D) => {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0b1226");
  g.addColorStop(1, "#1e1b4b");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  plinkoShapes.forEach((s) => {
    if (s.r) {
      const rg = c.createRadialGradient(s.x - 2, s.y - 2, 1, s.x, s.y, s.r);
      rg.addColorStop(0, "#f0abfc");
      rg.addColorStop(1, "#a21caf");
      c.fillStyle = rg;
      c.beginPath();
      c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      c.fill();
    } else paint(c, s, "#334155", "#94a3b8", 1.5);
  });
  c.font = "700 13px ui-monospace, monospace";
  c.fillStyle = "#fbbf24";
  c.textAlign = "center";
  ["x2", "x1", "x.5", "x5", "x5", "x.5", "x1", "x2"].forEach((t, i) => c.fillText(t, 50 + i * 100, 508));
  c.textAlign = "start";
};

const platShapes: Shape[] = [
  rect(150, 505, 300, 30),
  rect(590, 505, 420, 30),
  rect(120, 400, 170, 16),
  rect(330, 330, 140, 16, 0.2),
  rect(520, 270, 150, 16, -0.15),
  rect(700, 370, 160, 16),
  rect(420, 430, 110, 16),
];

const drawPlat = (c: CanvasRenderingContext2D) => {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#7dd3fc");
  g.addColorStop(1, "#e0f2fe");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.fillStyle = "#fde047";
  c.beginPath();
  c.arc(690, 90, 34, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#ffffff";
  [[140, 80], [420, 60], [560, 140]].forEach(([x, y]) => {
    c.beginPath();
    c.ellipse(x, y, 38, 14, 0, 0, Math.PI * 2);
    c.ellipse(x + 24, y - 10, 26, 14, 0, 0, Math.PI * 2);
    c.ellipse(x - 24, y - 6, 24, 12, 0, 0, Math.PI * 2);
    c.fill();
  });
  c.fillStyle = "#86efac";
  c.beginPath();
  c.arc(200, 560, 190, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#4ade80";
  c.beginPath();
  c.arc(620, 580, 200, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#ea580c";
  c.fillRect(300, 505, 80, 15);
  platShapes.forEach((s) => {
    c.save();
    c.translate(s.x, s.y);
    c.rotate(s.a ?? 0);
    c.fillStyle = "#a16207";
    c.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
    c.fillStyle = "#22c55e";
    c.fillRect(-s.w / 2, -s.h / 2, s.w, Math.min(7, s.h / 2));
    c.strokeStyle = "#422006";
    c.lineWidth = 2;
    c.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h);
    c.restore();
  });
  [[100, 370], [140, 370], [180, 370], [330, 298], [520, 238], [700, 338]].forEach(([x, y]) => {
    c.fillStyle = "#facc15";
    c.strokeStyle = "#a16207";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x, y, 7, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  });
  c.fillStyle = "#475569";
  c.fillRect(770, 430, 4, 60);
  c.fillStyle = "#ef4444";
  c.beginPath();
  c.moveTo(774, 430);
  c.lineTo(796, 438);
  c.lineTo(774, 446);
  c.fill();
};

const PRESETS: Preset[] = [
  { id: "ramp", name: "Ramp + Seesaw", icon: Triangle, drop: [45, 140], shapes: rampShapes, draw: drawRamp },
  { id: "plinko", name: "Plinko Pegs", icon: Grip, drop: [60, 740], shapes: plinkoShapes, draw: drawPlinko },
  { id: "platformer", name: "Platformer Level", icon: Mountain, drop: [40, 290], shapes: platShapes, draw: drawPlat },
];

const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

const trace = (m: Uint8Array, w: number, h: number, sx: number, sy: number) => {
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  const pts: number[][] = [[sx, sy]];
  let x = sx;
  let y = sy;
  let d = 4;
  for (let guard = 0; guard < w * h * 4; guard++) {
    let moved = false;
    for (let i = 1; i <= 8; i++) {
      const nd = (d + i) % 8;
      const nx = x + DIRS[nd][0];
      const ny = y + DIRS[nd][1];
      if (!on(nx, ny)) continue;
      const pd = (d + i - 1) % 8;
      const bx = x + DIRS[pd][0] - nx;
      const by = y + DIRS[pd][1] - ny;
      d = DIRS.findIndex((v) => v[0] === bx && v[1] === by);
      x = nx;
      y = ny;
      moved = true;
      break;
    }
    if (!moved || d < 0 || (x === sx && y === sy)) break;
    pts.push([x, y]);
  }
  return pts;
};

const dp = (p: number[][], e: number): number[][] => {
  if (p.length < 3) return p;
  const a = p[0];
  const b = p[p.length - 1];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  let md = 0;
  let mi = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const d = Math.abs(dy * (p[i][0] - a[0]) - dx * (p[i][1] - a[1])) / L;
    if (d > md) {
      md = d;
      mi = i;
    }
  }
  if (md <= e) return [a, b];
  return [...dp(p.slice(0, mi + 1), e).slice(0, -1), ...dp(p.slice(mi), e)];
};

const extract = (img: HTMLImageElement) => {
  const lines: string[] = [];
  const k = Math.min(W / img.width, H / img.height);
  const dw = Math.round(img.width * k);
  const dh = Math.round(img.height * k);
  const ox = Math.round((W - dw) / 2);
  const oy = Math.round((H - dh) / 2);
  const gw = Math.max(8, Math.round(dw / 5));
  const gh = Math.max(8, Math.round(dh / 5));
  const sx = dw / gw;
  const sy = dh / gh;
  const n = gw * gh;
  lines.push(`fit ${img.width}×${img.height} → ${dw}×${dh}px · analysis grid ${gw}×${gh}`);

  const oc = document.createElement("canvas");
  oc.width = gw;
  oc.height = gh;
  const o = oc.getContext("2d", { willReadFrequently: true })!;
  o.fillStyle = "#ffffff";
  o.fillRect(0, 0, gw, gh);
  o.imageSmoothingQuality = "high";
  o.drawImage(img, 0, 0, gw, gh);
  const px = o.getImageData(0, 0, gw, gh).data;
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
  const at = (a: Float32Array, x: number, y: number) =>
    a[Math.min(gh - 1, Math.max(0, y)) * gw + Math.min(gw - 1, Math.max(0, x))];
  lines.push("grayscale conversion (Rec.601 luma)");

  const bl = new Float32Array(n);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) s += at(g, x + dx, y + dy) * (dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1);
      bl[y * gw + x] = s / 16;
    }
  lines.push("gaussian blur 3×3 applied");

  const mag = new Float32Array(n);
  let sum = 0;
  let sq = 0;
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const gx = -at(bl, x - 1, y - 1) - 2 * at(bl, x - 1, y) - at(bl, x - 1, y + 1) + at(bl, x + 1, y - 1) + 2 * at(bl, x + 1, y) + at(bl, x + 1, y + 1);
      const gy = -at(bl, x - 1, y - 1) - 2 * at(bl, x, y - 1) - at(bl, x + 1, y - 1) + at(bl, x - 1, y + 1) + 2 * at(bl, x, y + 1) + at(bl, x + 1, y + 1);
      const m = Math.hypot(gx, gy) / 4;
      mag[y * gw + x] = m;
      sum += m;
      sq += m * m;
    }
  const mean = sum / n;
  const sd = Math.sqrt(Math.max(0, sq / n - mean * mean));
  let th = Math.max(14, mean + sd);
  lines.push(`sobel gradients · mean ${mean.toFixed(1)} σ ${sd.toFixed(1)} → threshold ${th.toFixed(1)}`);

  let mask = new Uint8Array(n);
  let raw = 0;
  for (let it = 0; it < 6; it++) {
    raw = 0;
    mask = new Uint8Array(n);
    for (let i = 0; i < n; i++)
      if (mag[i] > th) {
        mask[i] = 1;
        raw++;
      }
    if (raw / n < 0.2) break;
    th *= 1.5;
    lines.push(`edge density ${((100 * raw) / n).toFixed(0)}% too high → threshold ${th.toFixed(1)}`);
  }

  const d = new Uint8Array(n);
  let dc = 0;
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      let hit = 0;
      for (let dy = -1; dy <= 1 && !hit; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && mask[ny * gw + nx]) {
            hit = 1;
            break;
          }
        }
      d[y * gw + x] = hit;
      dc += hit;
    }
  lines.push(`edge pixels ${raw} → ${dc} after 3×3 dilation`);

  const lab = new Int32Array(n);
  const comps: { x: number; y: number; n: number }[] = [];
  const stack: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!d[i] || lab[i]) continue;
    const id = comps.length + 1;
    let cnt = 0;
    lab[i] = id;
    stack.push(i);
    while (stack.length) {
      const p = stack.pop()!;
      cnt++;
      const x = p % gw;
      const y = (p / gw) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const q = ny * gw + nx;
          if (d[q] && !lab[q]) {
            lab[q] = id;
            stack.push(q);
          }
        }
    }
    comps.push({ x: i % gw, y: (i / gw) | 0, n: cnt });
  }
  const keep = comps.filter((c) => c.n >= 6).sort((a, b) => b.n - a.n).slice(0, 40);
  lines.push(`connected components: ${comps.length} found · ${keep.length} kept (≥6px, top 40)`);

  const loops = keep.map((c) => trace(d, gw, gh, c.x, c.y));
  const total = loops.reduce((s, l) => s + l.length, 0);
  lines.push(`moore-neighbour contour tracing → ${loops.length} outlines · ${total} boundary points`);

  const make = (eps: number) => {
    const shapes: Shape[] = [];
    let verts = 0;
    for (const l of loops) {
      const pts = l.map(([x, y]) => [ox + (x + 0.5) * sx, oy + (y + 0.5) * sy]);
      let v: number[][] = pts;
      if (pts.length >= 3) {
        const cl = [...pts, pts[0]];
        let kk = 1;
        let md = 0;
        cl.forEach((p, i) => {
          const dd = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]);
          if (dd > md) {
            md = dd;
            kk = i;
          }
        });
        v = [...dp(cl.slice(0, kk + 1), eps).slice(0, -1), ...dp(cl.slice(kk), eps).slice(0, -1)];
      }
      verts += v.length;
      if (v.length === 1) {
        shapes.push(peg(v[0][0], v[0][1], 5));
        continue;
      }
      const cnt = v.length === 2 ? 1 : v.length;
      for (let i = 0; i < cnt; i++) {
        const a = v[i];
        const b = v[(i + 1) % v.length];
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 1) shapes.push(seg(a[0], a[1], b[0], b[1], 10, 6));
      }
    }
    return { shapes, verts };
  };

  let eps = 4;
  let res = make(eps);
  while (res.shapes.length > 700 && eps < 40) {
    eps *= 1.7;
    res = make(eps);
  }
  lines.push(`douglas-peucker ε=${eps.toFixed(1)}px → ${res.verts} vertices`);
  lines.push(
    res.shapes.length
      ? `✓ ${res.shapes.length} static collision segments generated`
      : "✗ no contours found — only world boundaries are active",
  );
  return { shapes: res.shapes, lines, ox, oy, dw, dh };
};

const render = (c: CanvasRenderingContext2D, e: Matter.Engine, wire: boolean, pins: Shape[]) => {
  c.clearRect(0, 0, W, H);
  if (wire) {
    c.strokeStyle = "rgba(34,211,238,0.08)";
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 0; x <= W; x += 20) {
      c.moveTo(x, 0);
      c.lineTo(x, H);
    }
    for (let y = 0; y <= H; y += 20) {
      c.moveTo(0, y);
      c.lineTo(W, y);
    }
    c.stroke();
  }
  for (const b of Composite.allBodies(e.world)) {
    if (b.label === "bound" || (b.isStatic && !wire)) continue;
    c.beginPath();
    if (b.circleRadius) c.arc(b.position.x, b.position.y, b.circleRadius, 0, Math.PI * 2);
    else {
      const v = b.vertices;
      c.moveTo(v[0].x, v[0].y);
      for (let i = 1; i < v.length; i++) c.lineTo(v[i].x, v[i].y);
      c.closePath();
    }
    if (b.isStatic) {
      c.fillStyle = "rgba(34,211,238,0.10)";
      c.strokeStyle = "#22d3ee";
      c.lineWidth = 1.2;
    } else if (wire) {
      c.fillStyle = "rgba(245,158,11,0.15)";
      c.strokeStyle = "#f59e0b";
      c.lineWidth = 1.5;
    } else {
      c.fillStyle = b.render.fillStyle ?? "#f59e0b";
      c.strokeStyle = "rgba(15,23,42,0.85)";
      c.lineWidth = 2;
    }
    c.fill();
    c.stroke();
    if (b.circleRadius && !b.isStatic) {
      c.beginPath();
      c.moveTo(b.position.x, b.position.y);
      c.lineTo(b.position.x + Math.cos(b.angle) * b.circleRadius, b.position.y + Math.sin(b.angle) * b.circleRadius);
      c.strokeStyle = wire ? "#f59e0b" : "rgba(15,23,42,0.6)";
      c.lineWidth = 1.5;
      c.stroke();
    }
  }
  if (wire)
    pins.forEach((p) => {
      c.beginPath();
      c.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      c.fillStyle = "#22d3ee";
      c.fill();
    });
};

const Stat = ({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: "cyan" | "amber" }) => (
  <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
    <Icon className={`h-4 w-4 ${tone === "cyan" ? "text-cyan-300" : "text-amber-300"}`} />
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`font-mono text-sm font-semibold ${tone === "cyan" ? "text-cyan-200" : "text-amber-200"}`}>{value}</div>
    </div>
  </div>
);

const Slider = ({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) => (
  <label className="block">
    <div className="mb-1 flex justify-between font-mono text-[11px] uppercase tracking-wider text-slate-400">
      <span>{label}</span>
      <span className="text-cyan-300">{hint}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="h-1.5 w-full cursor-pointer accent-cyan-400"
    />
  </label>
);

export default function Page() {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const eng = useRef<Matter.Engine | null>(null);
  const shapes = useRef<Shape[]>([]);
  const drop = useRef<[number, number]>([60, 740]);
  const colorIdx = useRef(0);

  const [playing, setPlaying] = useState(true);
  const [view, setView] = useState<"image" | "wire">("image");
  const [grav, setGrav] = useState(1);
  const [bounce, setBounce] = useState(0.5);
  const [fric, setFric] = useState(0.2);
  const [fps, setFps] = useState(0);
  const [dyn, setDyn] = useState(0);
  const [sta, setSta] = useState(0);
  const [source, setSource] = useState("ramp");
  const [logs, setLogs] = useState<string[]>([]);
  const [over, setOver] = useState(false);

  const live = useRef({ playing, view, bounce, fric, grav });
  live.current = { playing, view, bounce, fric, grav };

  const log = useCallback(
    (m: string) => setLogs((l) => [...l.slice(-79), `${new Date().toLocaleTimeString([], { hour12: false })}  ${m}`]),
    [],
  );

  const material = useCallback(() => {
    const e = eng.current;
    if (!e) return;
    for (const b of Composite.allBodies(e.world)) {
      b.restitution = live.current.bounce;
      b.friction = live.current.fric;
    }
  }, []);

  const build = useCallback(() => {
    const e = eng.current;
    if (!e) return;
    Composite.clear(e.world, false, true);
    const bound = { isStatic: true, label: "bound" };
    Composite.add(e.world, [
      Bodies.rectangle(W / 2, H + 30, W * 3, 60, bound),
      Bodies.rectangle(-30, -400, 60, 2000, bound),
      Bodies.rectangle(W + 30, -400, 60, 2000, bound),
    ]);
    for (const s of shapes.current) {
      const o: Matter.IBodyDefinition = {
        isStatic: !s.dyn,
        angle: s.a ?? 0,
        label: s.dyn ? "part" : "solid",
        density: s.dyn ? 0.0008 : 0.003,
        frictionAir: s.dyn ? 0.03 : 0.01,
        render: { fillStyle: "#f59e0b" },
      };
      const b = s.r ? Bodies.circle(s.x, s.y, s.r, o) : Bodies.rectangle(s.x, s.y, s.w, s.h, o);
      Composite.add(e.world, b);
      if (s.pin)
        Composite.add(
          e.world,
          Constraint.create({ pointA: { x: s.x, y: s.y }, bodyB: b, length: 0, stiffness: 1, render: { visible: false } }),
        );
    }
    material();
  }, [material]);

  const loadPreset = useCallback(
    (p: Preset) => {
      const c = bgRef.current!.getContext("2d")!;
      c.clearRect(0, 0, W, H);
      p.draw(c);
      shapes.current = p.shapes;
      drop.current = p.drop;
      setSource(p.id);
      build();
      log(`▸ preset "${p.name}" loaded`);
      log(`${p.shapes.filter((s) => !s.dyn).length} analytic static bodies · ${p.shapes.filter((s) => s.dyn).length} dynamic parts`);
    },
    [build, log],
  );

  const importImage = useCallback(
    (img: HTMLImageElement, name: string) => {
      log(`▸ ${name}`);
      const r = extract(img);
      const c = bgRef.current!.getContext("2d")!;
      c.fillStyle = "#0f172a";
      c.fillRect(0, 0, W, H);
      c.drawImage(img, r.ox, r.oy, r.dw, r.dh);
      shapes.current = r.shapes;
      drop.current = [r.ox + 30, Math.max(r.ox + 40, r.ox + r.dw - 30)];
      setSource("custom");
      build();
      r.lines.forEach(log);
    },
    [build, log],
  );

  const loadFile = useCallback(
    (f: File) => {
      if (!f.type.startsWith("image/")) {
        log("✗ not an image file");
        return;
      }
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        importImage(img, f.name);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        log("✗ could not decode image");
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [importImage, log],
  );

  const dropBall = useCallback((px?: number, py?: number) => {
    const e = eng.current;
    if (!e) return;
    const r = 9 + Math.random() * 7;
    const [lo, hi] = drop.current;
    const ball = Bodies.circle(px ?? lo + Math.random() * (hi - lo), py ?? -r - 4, r, {
      restitution: live.current.bounce,
      friction: live.current.fric,
      density: 0.0012,
      label: "ball",
      render: { fillStyle: COLORS[colorIdx.current++ % COLORS.length] },
    });
    Composite.add(e.world, ball);
    const balls = Composite.allBodies(e.world).filter((x) => x.label === "ball");
    if (balls.length > MAX_BALLS) Composite.remove(e.world, balls[0]);
  }, []);

  const onPointer = (ev: RPointerEvent<HTMLCanvasElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    dropBall(
      Math.max(12, Math.min(W - 12, ((ev.clientX - r.left) * W) / r.width)),
      Math.max(12, ((ev.clientY - r.top) * H) / r.height),
    );
  };

  useEffect(() => {
    const e = Engine.create({ positionIterations: 8, velocityIterations: 6 });
    e.gravity.y = live.current.grav;
    eng.current = e;
    setLogs([]);
    log("glyph engine online · matter-js · 3× substeps @ 60 Hz");
    loadPreset(PRESETS[0]);
    const ctx = fxRef.current!.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let mark = last;
    let acc = 0;
    let frames = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      acc += Math.min(100, t - last);
      last = t;
      if (live.current.playing) {
        let n = 0;
        while (acc >= STEP && n++ < 4) {
          for (let i = 0; i < SUB; i++) Engine.update(e, STEP / SUB);
          acc -= STEP;
        }
        if (acc > STEP) acc = 0;
      } else acc = 0;
      render(ctx, e, live.current.view === "wire", shapes.current.filter((s) => s.pin));
      frames++;
      if (t - mark >= 500) {
        setFps(Math.round((frames * 1000) / (t - mark)));
        const bs = Composite.allBodies(e.world);
        setDyn(bs.filter((b) => !b.isStatic).length);
        setSta(bs.filter((b) => b.isStatic && b.label !== "bound").length);
        frames = 0;
        mark = t;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      Composite.clear(e.world, false, true);
      Engine.clear(e);
      eng.current = null;
    };
  }, [loadPreset, log]);

  useEffect(() => {
    material();
  }, [bounce, fric, material]);

  useEffect(() => {
    if (eng.current) eng.current.gravity.y = grav;
  }, [grav]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs]);

  const gName = Object.entries(GRAV).find(([, v]) => Math.abs(v - grav) < 0.005)?.[0] ?? "Custom";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-400/10 ring-1 ring-cyan-400/40">
            <Hexagon className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">Glyph</h1>
            <p className="text-xs text-slate-400">Sketch → rigid-body physics workbench</p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-cyan-300">{fps} FPS</span>
          <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-amber-300">{dyn} OBJ</span>
        </div>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat icon={Activity} label="Frame rate" value={`${fps} fps`} tone="cyan" />
            <Stat icon={CircleDot} label="Active objects" value={`${dyn}`} tone="amber" />
            <Stat icon={Layers} label="Static bodies" value={`${sta}`} tone="cyan" />
            <Stat icon={Gauge} label="Gravity" value={`${gName} ${grav.toFixed(2)}g`} tone="amber" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              onClick={() => {
                build();
                log("world reset · dynamic bodies cleared");
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button
              onClick={() => dropBall()}
              className="flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              <CircleDot className="h-4 w-4" /> Drop Ball
            </button>
            <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-700">
              {(
                [
                  ["image", "Image View", ImageIcon],
                  ["wire", "Wireframe", Scan],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm transition ${
                    view === id ? "bg-cyan-400/15 text-cyan-200" : "bg-slate-900 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              const f = e.dataTransfer.files[0];
              if (f) loadFile(f);
            }}
            className={`relative aspect-[800/520] w-full overflow-hidden rounded-xl border bg-slate-950 ${
              over ? "border-amber-400" : "border-slate-800"
            }`}
          >
            <canvas
              ref={bgRef}
              width={W}
              height={H}
              className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${view === "image" ? "opacity-100" : "opacity-20"}`}
            />
            <canvas
              ref={fxRef}
              width={W}
              height={H}
              onPointerDown={onPointer}
              className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
            />
            <div className="pointer-events-none absolute left-3 top-3 rounded bg-slate-950/80 px-2 py-1 font-mono text-[11px] text-cyan-300">
              {view === "image" ? "IMAGE VIEW" : "WIREFRAME · COLLISION"}
            </div>
            {!playing && (
              <div className="pointer-events-none absolute right-3 top-3 rounded bg-slate-950/80 px-2 py-1 font-mono text-[11px] text-amber-300">
                PAUSED
              </div>
            )}
          </div>
          <p className="font-mono text-[11px] text-slate-500">
            Click the canvas to drop a ball at the cursor · drag an image onto it to extract contours
          </p>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-slate-400">Source</h2>
            <div className="grid gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadPreset(p)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                    source === p.id
                      ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <p.icon className="h-4 w-4" /> {p.name}
                </button>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className={`flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-left text-sm transition ${
                  source === "custom"
                    ? "border-amber-400/60 bg-amber-400/10 text-amber-200"
                    : "border-slate-600 text-slate-300 hover:border-amber-400/60 hover:text-amber-200"
                }`}
              >
                <Upload className="h-4 w-4" /> Upload sketch or photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-slate-400">Physics</h2>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(GRAV).map(([name, v]) => (
                <button
                  key={name}
                  onClick={() => setGrav(v)}
                  className={`rounded-lg border px-2 py-1.5 text-xs transition ${
                    gName === name
                      ? "border-amber-400/60 bg-amber-400/10 text-amber-200"
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <Slider label="Gravity" hint={`${(grav * 9.81).toFixed(2)} m/s²`} value={grav} min={0.05} max={3} step={0.01} onChange={setGrav} />
            <Slider label="Bounciness" hint={bounce.toFixed(2)} value={bounce} min={0} max={1} step={0.01} onChange={setBounce} />
            <Slider label="Friction" hint={fric.toFixed(2)} value={fric} min={0} max={1} step={0.01} onChange={setFric} />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-slate-400">
              <Terminal className="h-3.5 w-3.5" /> Console
            </h2>
            <div ref={logRef} className="h-52 overflow-y-auto rounded-lg border border-slate-800 bg-black/50 p-3 font-mono text-[11px] leading-relaxed">
              {logs.map((l, i) => (
                <div key={i} className={l.includes("✗") ? "text-rose-400" : l.includes("▸") ? "text-amber-300" : "text-cyan-200/80"}>
                  {l}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
