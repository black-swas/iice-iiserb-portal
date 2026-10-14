"use client";

import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { SmartLink } from "@/components/ui/SmartLink";
import { t } from "@/lib/i18n";

export interface Tile {
  id: string;
  icon: string;
  title: string;
  short: string;
  long: string;
  /** Present only when the page exists. */
  href: string | null;
}

/**
 * "Why IICE" tiles (SPEC §3 #5). Each tile is a button: tap or Enter expands it to its longer text, and a visitor with a
 * mouse also sees it expand on hover. Nothing important is hover-only, because the button does the same.
 */
export function WhyTiles({ tiles }: { tiles: Tile[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="tiles">
      {tiles.map((tile) => {
        const expanded = open === tile.id;
        return (
          <li key={tile.id} className="tile" data-open={expanded}>
            <button
              type="button"
              data-action="toggle-tile"
              className="tile__button"
              aria-expanded={expanded}
              aria-controls={`tile-${tile.id}`}
              onClick={() => setOpen(expanded ? null : tile.id)}
            >
              <Icon name={tile.icon} className="tile__icon" />
              <span className="tile__title">{tile.title}</span>
              <span className="tile__short">{tile.short}</span>
            </button>
            <div id={`tile-${tile.id}`} className="tile__more">
              <p>{tile.long}</p>
              {tile.href ? (
                <SmartLink href={tile.href}>{t("home.tileMore", { title: tile.title })}</SmartLink>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface OrbitalNode {
  id: string;
  label: string;
  legal: string;
  sector: "bio" | "clean" | "iot" | "cif";
  sectorLabel: string;
  ring: 1 | 2 | 3;
  stageLabel: string;
  angle: number;
  speed: number;
  summary: string;
  cifLink: string;
  href: string;
}

const ORBITAL_NODES: OrbitalNode[] = [
  {
    id: "plabeltech",
    label: "Plabeltech",
    legal: "Plabeltech Pvt Ltd",
    sector: "clean",
    sectorLabel: "CleanTech & Sustainable Packaging",
    ring: 3,
    stageLabel: "Stage 03 · Commercialise",
    angle: 0.2,
    speed: 0.0022,
    summary: "Plant-based biodegradable active packaging films extending shelf-life of fresh agricultural produce without synthetic preservatives.",
    cifLink: "Utilizes CIF Polymer Rheology, FTIR & FESEM surface characterization suites.",
    href: "/startups/plabeltech/",
  },
  {
    id: "intisen",
    label: "Intisen Tech",
    legal: "Intisen Technology Pvt Ltd",
    sector: "iot",
    sectorLabel: "IoT & Precision Sensing",
    ring: 3,
    stageLabel: "Stage 03 · Commercialise",
    angle: 1.1,
    speed: 0.0022,
    summary: "Industrial and agricultural telemetry sensors with edge-AI anomaly detection for power grids and smart irrigation.",
    cifLink: "Supported by IICE Prototyping Lab & MPSeDC AI-DroneTech telemetry testbed.",
    href: "/startups/intisen-technology/",
  },
  {
    id: "adit-bio",
    label: "Adit Bioscience",
    legal: "Adit Bioscience Pvt Ltd",
    sector: "bio",
    sectorLabel: "Healthcare & Diagnostics",
    ring: 3,
    stageLabel: "Stage 03 · Commercialise",
    angle: 2.0,
    speed: 0.0022,
    summary: "Point-of-care molecular diagnostics and recombinant assay kits designed for rapid pathogen detection in primary health centres.",
    cifLink: "Leverages BIRAC Bio-Incubation Wet Lab, RT-PCR & Confocal Microscopy.",
    href: "/startups/adit-bioscience/",
  },
  {
    id: "powernet",
    label: "Powernet Tech",
    legal: "Powernet Technology Pvt Ltd",
    sector: "clean",
    sectorLabel: "Clean Energy & Grid Hardware",
    ring: 3,
    stageLabel: "Stage 03 · Commercialise",
    angle: 2.9,
    speed: 0.0022,
    summary: "Smart micro-grid controllers and solid-state power conversion hardware for distributed solar and EV charging infrastructure.",
    cifLink: "Tested at IISER Bhopal EECS Power Electronics & High-Voltage Characterization Lab.",
    href: "/startups/powernet-technology/",
  },
  {
    id: "richnex",
    label: "Richnex Skinscience",
    legal: "Richnex Skinscience Laboratory Pvt Ltd",
    sector: "bio",
    sectorLabel: "Dermaceuticals & Cosmeceuticals",
    ring: 2,
    stageLabel: "Stage 02 · Culture (Incubation)",
    angle: 3.7,
    speed: 0.0031,
    summary: "Clinically validated bioactive peptide formulations and transdermal delivery matrices developed from indigenous phytochemicals.",
    cifLink: "Uses CIF HR-MS/LC-MS metabolomics and NMR 500 MHz structural elucidation.",
    href: "/startups/richnex-skinscience-laboratory/",
  },
  {
    id: "konarq",
    label: "Konarq Tech",
    legal: "Konarq Technologies",
    sector: "iot",
    sectorLabel: "Deep-Tech Electronics & Quantum",
    ring: 2,
    stageLabel: "Stage 02 · Culture (Incubation)",
    angle: 4.5,
    speed: 0.0031,
    summary: "Precision photonic and embedded instrumentation modules for scientific laboratories and defence research.",
    cifLink: "Aligned with IISER Bhopal ATRI Quantum & Advanced Materials vertical.",
    href: "/startups/konarq-technologies/",
  },
  {
    id: "protomate",
    label: "Protomate AI",
    legal: "Protomate AI Pvt Ltd",
    sector: "iot",
    sectorLabel: "AI & Automated Design",
    ring: 2,
    stageLabel: "Stage 02 · Culture (Incubation)",
    angle: 5.3,
    speed: 0.0031,
    summary: "Generative AI workflow automation and rapid hardware-software co-design toolchains for engineering teams.",
    cifLink: "Hosted at IICE Co-Working Computing Cluster & Data Science Facility.",
    href: "/startups/protomate-ai/",
  },
  {
    id: "simdaas",
    label: "SimDaas Autonomy",
    legal: "SimDaas Autonomy Pvt Ltd",
    sector: "iot",
    sectorLabel: "Autonomous Systems & DroneTech",
    ring: 3,
    stageLabel: "Stage 03 · Commercialise",
    angle: 0.65,
    speed: 0.0022,
    summary: "Simulation-as-a-Service and autonomous navigation stacks for UAV swarms, ADAS validation, and mobile robotics.",
    cifLink: "Core startup partner in IISER Bhopal's ₹85.51 Cr MPSeDC AI-Driven DroneTech Hub.",
    href: "/startups/simdaas-autonomy/",
  },
  {
    id: "miniguru",
    label: "Miniguru T-Labs",
    legal: "Miniguru T-Labs",
    sector: "iot",
    sectorLabel: "EdTech & Maker Hardware",
    ring: 1,
    stageLabel: "Stage 01 · Catalyse (Pre-Incubation)",
    angle: 1.55,
    speed: 0.004,
    summary: "Experiential STEM hardware kits and DIY robotics workstations for school and undergraduate innovation labs.",
    cifLink: "Supported by IICE Innovation Club & Student Maker Prototyping Studio.",
    href: "/startups/miniguru-t-labs/",
  },
  {
    id: "beyond-limit",
    label: "Beyond Limit",
    legal: "Beyond Limit Devices",
    sector: "bio",
    sectorLabel: "Assistive MedTech Devices",
    ring: 1,
    stageLabel: "Stage 01 · Catalyse (Pre-Incubation)",
    angle: 2.5,
    speed: 0.004,
    summary: "Affordable assistive medical devices and ergonomic rehabilitation hardware for rural and semi-urban hospitals.",
    cifLink: "Uses 3D Additive Manufacturing & Mechanical Testing Lab at IISER Bhopal.",
    href: "/startups/beyond-limit-devices/",
  },
  {
    id: "xtalsphere",
    label: "Xtalsphere",
    legal: "Xtalsphere Pvt Ltd",
    sector: "clean",
    sectorLabel: "Advanced Crystalline Materials",
    ring: 2,
    stageLabel: "Stage 02 · Culture (Incubation)",
    angle: 3.95,
    speed: 0.0031,
    summary: "Functional single-crystal and MOF materials for gas separation, catalysis, and next-generation battery electrodes.",
    cifLink: "Direct spin-out utilizing Single-Crystal XRD (SC-XRD) & Powder XRD at CIF.",
    href: "/startups/xtalsphere/",
  },
  {
    id: "luminojen",
    label: "Luminojen",
    legal: "Luminojen Pvt Ltd",
    sector: "bio",
    sectorLabel: "Molecular Probes & Bio-Imaging",
    ring: 2,
    stageLabel: "Stage 02 · Culture (Incubation)",
    angle: 4.85,
    speed: 0.0031,
    summary: "Fluorescent molecular probes and cellular imaging reagents for oncology research and high-throughput drug screening.",
    cifLink: "Validated on CIF Confocal Laser Scanning & Fluorescence Spectroscopy suites.",
    href: "/startups/luminojen/",
  },
  {
    id: "mbiosys",
    label: "MBiosys",
    legal: "MBiosys Pvt Ltd",
    sector: "bio",
    sectorLabel: "Microbial Bioprocessing",
    ring: 1,
    stageLabel: "Stage 01 · Catalyse (Pre-Incubation)",
    angle: 5.75,
    speed: 0.004,
    summary: "Engineered microbial consortia for sustainable agricultural bio-inputs and industrial effluent bioremediation.",
    cifLink: "Incubated in BIRAC Bio-Incubation Wet Lab & BSL-2 Culture Facility.",
    href: "/startups/mbiosys/",
  },
  {
    id: "cytoforge",
    label: "Cytoforge",
    legal: "Cytoforge Therapeutics Pvt Ltd",
    sector: "bio",
    sectorLabel: "Cell & Immunotherapeutics",
    ring: 2,
    stageLabel: "Stage 02 · Culture (Incubation)",
    angle: 1.9,
    speed: 0.0031,
    summary: "Targeted cellular therapeutics and biologics delivery platforms translating foundational immunology research from IISER Bhopal.",
    cifLink: "Commercialization accelerated via IISER Bhopal–BCIL New Delhi Tech Transfer MoA.",
    href: "/startups/cytoforge-therapeutics/",
  },
  {
    id: "cif-nmr",
    label: "NMR 400/500/700 MHz",
    legal: "CIF High-Field NMR Facility",
    sector: "cif",
    sectorLabel: "Central Instrumentation Facility (CIF)",
    ring: 2,
    stageLabel: "Core Analytical Infrastructure",
    angle: 0.9,
    speed: 0.0018,
    summary: "Bruker Avance III 400, 500, and 700 MHz Nuclear Magnetic Resonance spectrometers for molecular structure determination.",
    cifLink: "Open to all IICE incubatees and external MSMEs under RAMP & NIDHI-TBI.",
    href: "/incubation/facilities/",
  },
  {
    id: "cif-hrms",
    label: "HR-MS & LC-MS Suite",
    legal: "CIF Mass Spectrometry Facility",
    sector: "cif",
    sectorLabel: "Central Instrumentation Facility (CIF)",
    ring: 2,
    stageLabel: "Core Analytical Infrastructure",
    angle: 2.4,
    speed: 0.0018,
    summary: "High-Resolution Quadrupole Time-of-Flight (Q-TOF) LC-MS/MS and GC-MS for proteomics, metabolomics, and purity profiling.",
    cifLink: "Supports biotech and pharmaceutical startups in BIRAC BIG & EDGE cohorts.",
    href: "/incubation/facilities/",
  },
  {
    id: "cif-xrd",
    label: "SC-XRD & Powder XRD",
    legal: "CIF X-Ray Diffraction Lab",
    sector: "cif",
    sectorLabel: "Central Instrumentation Facility (CIF)",
    ring: 2,
    stageLabel: "Core Analytical Infrastructure",
    angle: 4.1,
    speed: 0.0018,
    summary: "Single-Crystal and High-Resolution Powder X-Ray Diffractometers for polymorph screening and materials crystallography.",
    cifLink: "Foundational instrument for deep-tech materials ventures like Xtalsphere.",
    href: "/incubation/facilities/",
  },
  {
    id: "cif-fesem",
    label: "FESEM & Confocal",
    legal: "CIF Nanoscale Imaging Suite",
    sector: "cif",
    sectorLabel: "Central Instrumentation Facility (CIF)",
    ring: 2,
    stageLabel: "Core Analytical Infrastructure",
    angle: 5.5,
    speed: 0.0018,
    summary: "Field-Emission Scanning Electron Microscopy (FESEM), AFM, and Confocal Microscopy for nanoscale surface and bio-imaging.",
    cifLink: "Accessible via subsidized IICE internal booking tariff for incubated founders.",
    href: "/incubation/facilities/",
  },
];

const SECTOR_COLORS: Record<OrbitalNode["sector"], string> = {
  bio: "#f59e0b",
  clean: "#34d399",
  iot: "#38bdf8",
  cif: "#c084fc",
};

/**
 * Interactive Deep-Tech Innovation Constellation & Lab-to-Market Orbital Radar.
 */
export function ConstellationSection() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [filter, setFilter] = useState<"all" | OrbitalNode["sector"]>("all");
  const [selected, setSelected] = useState<OrbitalNode>(ORBITAL_NODES[7]!);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    const angles = ORBITAL_NODES.map((n) => n.angle);
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const maxR = Math.min(w, h) * 0.43;
      const rings = [maxR * 0.36, maxR * 0.68, maxR * 0.96];

      ctx.clearRect(0, 0, w, h);

      // Subtle radial grid
      rings.forEach((r, idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = idx === 1 ? "rgba(245, 158, 11, 0.28)" : "rgba(148, 163, 184, 0.22)";
        ctx.lineWidth = 1;
        ctx.setLineDash(idx === 1 ? [4, 4] : []);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Crosshair axes
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
      ctx.stroke();

      // Central IICE + IISERB Core
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 34);
      grad.addColorStop(0, "rgba(245, 158, 11, 0.95)");
      grad.addColorStop(0.55, "rgba(11, 37, 69, 0.95)");
      grad.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fillStyle = "#0b2545";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fbbf24";
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("IICE·IISERB", cx, cy);

      // Draw nodes
      ORBITAL_NODES.forEach((node, i) => {
        if (!paused && !prefersReduced) {
          angles[i] = (angles[i] ?? node.angle) + node.speed * 0.45;
        }
        const a = angles[i] ?? node.angle;
        const r = rings[node.ring - 1] ?? rings[0]!;
        const nx = cx + Math.cos(a) * r;
        const ny = cy + Math.sin(a) * r;
        const visible = filter === "all" || filter === node.sector;
        const isSel = selected.id === node.id;

        if (isSel || visible) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(nx, ny);
          ctx.strokeStyle = isSel ? "rgba(251, 191, 36, 0.65)" : "rgba(148, 163, 184, 0.12)";
          ctx.lineWidth = isSel ? 1.8 : 0.8;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(nx, ny, isSel ? 8.5 : visible ? 6 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = visible ? SECTOR_COLORS[node.sector] : "rgba(148, 163, 184, 0.25)";
        ctx.fill();
        if (isSel) {
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
        }

        if (visible) {
          ctx.fillStyle = isSel ? "#fde68a" : "#e2e8f0";
          ctx.font = isSel ? "700 11px sans-serif" : "500 10px sans-serif";
          ctx.textAlign = nx >= cx ? "left" : "right";
          ctx.fillText(node.label, nx + (nx >= cx ? 10 : -10), ny + 3);
        }
      });

      ctx.restore();
      animId = window.requestAnimationFrame(render);
    };

    animId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animId);
  }, [filter, selected, paused]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = rect.width * 0.5;
    const cy = rect.height * 0.5;
    const maxR = Math.min(rect.width, rect.height) * 0.43;
    const rings = [maxR * 0.36, maxR * 0.68, maxR * 0.96];

    let closest: OrbitalNode | null = null;
    let bestDist = 28;
    ORBITAL_NODES.forEach((node) => {
      if (filter !== "all" && filter !== node.sector) return;
      const r = rings[node.ring - 1] ?? rings[0]!;
      const nx = cx + Math.cos(node.angle) * r;
      const ny = cy + Math.sin(node.angle) * r;
      const d = Math.hypot(mx - nx, my - ny);
      if (d < bestDist) {
        bestDist = d;
        closest = node;
      }
    });
    if (closest) setSelected(closest);
  };

  return (
    <section className="constellation-showcase" aria-labelledby="constellation-heading">
      <div className="wrapper-wide">
        <div className="constellation-head">
          <div>
            <p className="constellation-eyebrow">
              Interactive Deep-Tech Ecosystem Radar · IISER Bhopal × DST NIDHI-TBI × BIRAC
            </p>
            <h2 id="constellation-heading" className="constellation-title">
              Lab-to-Market Innovation Constellation (14 Startups &amp; CIF Suites)
            </h2>
            <p className="constellation-sub">
              Explore how foundational research labs and Central Instrumentation Facility (CIF) suites at IISER Bhopal power incubated deep-tech ventures across Catalyse, Culture, and Commercialise rings.
            </p>
          </div>
          <div className="constellation-controls" role="toolbar" aria-label="Filter constellation by sector">
            <button
              type="button"
              data-action="constellation-filter-all"
              className="constellation-btn"
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All Nodes (18)
            </button>
            <button
              type="button"
              data-action="constellation-filter-bio"
              className="constellation-btn"
              aria-pressed={filter === "bio"}
              onClick={() => setFilter("bio")}
            >
              Healthcare &amp; Bio (6)
            </button>
            <button
              type="button"
              data-action="constellation-filter-clean"
              className="constellation-btn"
              aria-pressed={filter === "clean"}
              onClick={() => setFilter("clean")}
            >
              CleanTech &amp; Materials (3)
            </button>
            <button
              type="button"
              data-action="constellation-filter-iot"
              className="constellation-btn"
              aria-pressed={filter === "iot"}
              onClick={() => setFilter("iot")}
            >
              AI, DroneTech &amp; IoT (5)
            </button>
            <button
              type="button"
              data-action="constellation-filter-cif"
              className="constellation-btn"
              aria-pressed={filter === "cif"}
              onClick={() => setFilter("cif")}
            >
              CIF Instruments (4)
            </button>
            <button
              type="button"
              data-action="constellation-toggle-orbit"
              className="constellation-btn"
              aria-pressed={paused}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? "▶ Resume Orbit" : "⏸ Pause Orbit"}
            </button>
          </div>
        </div>

        <div className="constellation-grid">
          <div className="constellation-canvas-wrap">
            <canvas
              ref={canvasRef}
              id="constellation-canvas"
              onClick={handleCanvasClick}
              aria-label="Interactive orbital map of IICE startups and IISER Bhopal Central Instrumentation Facility suites"
            />
            <div className="constellation-legend">
              <span><i className="legend-dot" style={{ background: "#f59e0b" }} /> Healthcare &amp; Bio-Incubation</span>
              <span><i className="legend-dot" style={{ background: "#34d399" }} /> CleanTech &amp; Materials</span>
              <span><i className="legend-dot" style={{ background: "#38bdf8" }} /> AI, DroneTech &amp; IoT</span>
              <span><i className="legend-dot" style={{ background: "#c084fc" }} /> IISERB CIF Analytical Suites</span>
            </div>
          </div>

          <aside className="constellation-inspector" aria-live="polite">
            <div>
              <div className="constellation-inspector__meta">
                <span className="constellation-tag constellation-tag--amber">{selected.stageLabel}</span>
                <span className="constellation-tag">{selected.sectorLabel}</span>
              </div>
              <h3 className="constellation-inspector__title">{selected.legal}</h3>
              <p className="constellation-inspector__sub">Node ID: {selected.id.toUpperCase()} · IISER Bhopal Ecosystem</p>
              <p className="constellation-inspector__body">{selected.summary}</p>
              <div className="constellation-pipeline">
                <strong>Lab-to-Market Linkage:</strong> {selected.cifLink}
              </div>
            </div>

            <div>
              <p className="constellation-eyebrow" style={{ marginBottom: "0.35rem" }}>
                Quick-Select Portfolio &amp; CIF Node (Keyboard Accessible):
              </p>
              <div className="constellation-node-list" role="group" aria-label="Select a startup or CIF node">
                {ORBITAL_NODES.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    data-action={`select-node-${n.id}`}
                    className="constellation-node-pill"
                    aria-pressed={selected.id === n.id}
                    onClick={() => setSelected(n)}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: "0.95rem", display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                <ButtonLink href={selected.href} variant="accent">
                  Inspect {selected.label} Dossier →
                </ButtonLink>
                <ButtonLink href="/apply/" variant="inverse">
                  Apply for Incubation
                </ButtonLink>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
