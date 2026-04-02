import { escapeHtml, formatNumber } from "./html-helpers.js";

export type SlideType =
  | "title"
  | "content"
  | "stat"
  | "chart"
  | "two_column"
  | "closing";

export interface SlideData {
  type: SlideType;
  title: string;
  content?: string;
  subtitle?: string;
  statValue?: number | string;
  statLabel?: string;
  leftContent?: string;
  rightContent?: string;
  chartData?: {
    labels: string[];
    values: number[];
    chartType?: string;
  };
}

function renderSlide(slide: SlideData, index: number): string {
  switch (slide.type) {
    case "title":
      return renderTitleSlide(slide);
    case "stat":
      return renderStatSlide(slide);
    case "chart":
      return renderChartSlide(slide, index);
    case "two_column":
      return renderTwoColumnSlide(slide);
    case "closing":
      return renderClosingSlide(slide);
    default:
      return renderContentSlide(slide);
  }
}

function renderTitleSlide(s: SlideData): string {
  return `<section>
  <h1>${escapeHtml(s.title)}</h1>
  ${s.subtitle ? `<p>${escapeHtml(s.subtitle)}</p>` : ""}
</section>`;
}

function renderContentSlide(s: SlideData): string {
  return `<section>
  <h2>${escapeHtml(s.title)}</h2>
  <div>${s.content ?? ""}</div>
</section>`;
}

function renderStatSlide(s: SlideData): string {
  const val =
    typeof s.statValue === "number"
      ? formatNumber(s.statValue)
      : escapeHtml(String(s.statValue ?? ""));
  return `<section>
  <h2>${escapeHtml(s.title)}</h2>
  <div class="stat-value">${val}</div>
  ${s.statLabel ? `<div class="stat-label">${escapeHtml(s.statLabel)}</div>` : ""}
</section>`;
}

function renderChartSlide(s: SlideData, index: number): string {
  const canvasId = `slideChart${index}`;
  const cd = s.chartData;
  if (!cd) return renderContentSlide(s);
  const config = JSON.stringify({
    type: cd.chartType ?? "bar",
    data: {
      labels: cd.labels,
      datasets: [
        {
          label: s.title,
          data: cd.values,
          backgroundColor: "rgba(79,134,198,0.7)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { tooltip: { enabled: true } },
    },
  });
  return `<section>
  <h2>${escapeHtml(s.title)}</h2>
  <div style="height:400px;padding:20px;">
    <canvas id="${canvasId}" role="img" aria-label="${escapeHtml(s.title)}"></canvas>
  </div>
  <script>
  (function(){if(typeof Chart==='undefined')return;new Chart(document.getElementById('${canvasId}'),${config});})();
  </script>
</section>`;
}

function renderTwoColumnSlide(s: SlideData): string {
  return `<section>
  <h2>${escapeHtml(s.title)}</h2>
  <div style="display:flex;gap:40px;">
    <div style="flex:1;">${s.leftContent ?? ""}</div>
    <div style="flex:1;">${s.rightContent ?? ""}</div>
  </div>
</section>`;
}

function renderClosingSlide(s: SlideData): string {
  return `<section>
  <h2>${escapeHtml(s.title)}</h2>
  ${s.content ? `<p>${s.content}</p>` : ""}
</section>`;
}

const SLIDE_CSS = `
.reveal .stat-value { font-size: 4rem; font-weight: 700; color: #4f86c6; margin: 20px 0; }
.reveal .stat-label { font-size: 1rem; color: #777; }
.slide-nav { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; z-index: 9998; }
.slide-nav button { width: 32px; height: 32px; border-radius: 6px; background: transparent; border: 1px solid #ccc; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.slide-nav button:hover { background: #f0f0f0; }
.slide-counter { font-size: 13px; color: #888; min-width: 50px; text-align: center; }
`;

const NAV_HTML = `<nav class="slide-nav" aria-label="Slide navigation">
  <button onclick="Reveal.prev()" aria-label="Previous slide">&larr;</button>
  <span class="slide-counter" id="slideCounter"></span>
  <button onclick="Reveal.next()" aria-label="Next slide">&rarr;</button>
</nav>`;

export function buildPresentationHtml(
  slides: SlideData[],
  title?: string,
  language: "ko" | "en" = "ko",
): string {
  const slideHtml = slides.map((s, i) => renderSlide(s, i)).join("\n");
  const hasChart = slides.some((s) => s.type === "chart");

  return `<div class="reveal"><div class="slides">${slideHtml}</div></div>
${NAV_HTML}
<script>
Reveal.initialize({width:1280,height:720,center:true,controls:false,hash:true});
Reveal.on('slidechanged',function(e){
  var c=document.getElementById('slideCounter');
  if(c)c.textContent=(e.indexh+1)+' / '+Reveal.getTotalSlides();
});
var c=document.getElementById('slideCounter');
if(c)c.textContent='1 / '+Reveal.getTotalSlides();
</script>`;
}

export function getPresentationCdnLibs(
  slides: SlideData[],
): ("revealjs" | "chartjs")[] {
  const libs: ("revealjs" | "chartjs")[] = ["revealjs"];
  if (slides.some((s) => s.type === "chart")) libs.push("chartjs");
  return libs;
}

export function getPresentationExtraStyles(): string {
  return SLIDE_CSS;
}
