export interface TreemapItem {
  label: string;
  value: number;
  color?: string;
}

export interface HeatmapCell {
  row: string;
  col: string;
  value: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

const PALETTE = [
  "#4f86c6", "#27ae60", "#f39c12", "#e74c3c",
  "#9b59b6", "#3498db", "#2ecc71", "#e67e22",
];

export function buildTreemapHtml(
  items: TreemapItem[],
  containerId = "treemap",
): string {
  const data = JSON.stringify(
    items.map((item, i) => ({
      name: item.label,
      value: item.value,
      color: item.color ?? PALETTE[i % PALETTE.length],
    })),
  );

  return `<div id="${containerId}" style="width:100%;height:400px;position:relative;"></div>
<script>
(function(){
  if(typeof d3==='undefined'){document.getElementById('${containerId}').textContent='D3.js CDN 로드 실패';return;}
  var data=${data};
  var container=document.getElementById('${containerId}');
  var w=container.offsetWidth, h=container.offsetHeight;
  var root=d3.hierarchy({children:data}).sum(function(d){return d.value;});
  d3.treemap().size([w,h]).padding(2)(root);
  var svg=d3.select('#${containerId}').append('svg').attr('width',w).attr('height',h);
  var cell=svg.selectAll('g').data(root.leaves()).join('g').attr('transform',function(d){return 'translate('+d.x0+','+d.y0+')';});
  cell.append('rect').attr('width',function(d){return d.x1-d.x0;}).attr('height',function(d){return d.y1-d.y0;}).attr('fill',function(d){return d.data.color;}).attr('rx',4);
  cell.append('text').attr('x',6).attr('y',18).attr('fill','#fff').attr('font-size','12px').text(function(d){return d.data.name;});
  cell.append('text').attr('x',6).attr('y',34).attr('fill','rgba(255,255,255,0.8)').attr('font-size','11px').text(function(d){return d.data.value.toLocaleString();});
})();
</script>`;
}

export function buildHeatmapHtml(
  cells: HeatmapCell[],
  containerId = "heatmap",
): string {
  const rows = [...new Set(cells.map((c) => c.row))];
  const cols = [...new Set(cells.map((c) => c.col))];
  const data = JSON.stringify({ cells, rows, cols });

  return `<div id="${containerId}" style="width:100%;overflow-x:auto;"></div>
<script>
(function(){
  if(typeof d3==='undefined'){document.getElementById('${containerId}').textContent='D3.js CDN 로드 실패';return;}
  var d=${data};
  var cellSize=50, margin={top:60,left:80};
  var w=margin.left+d.cols.length*cellSize, h=margin.top+d.rows.length*cellSize;
  var maxVal=d3.max(d.cells,function(c){return c.value;})||1;
  var color=d3.scaleSequential(d3.interpolateBlues).domain([0,maxVal]);
  var svg=d3.select('#${containerId}').append('svg').attr('width',w).attr('height',h);
  svg.selectAll('.cell').data(d.cells).join('rect')
    .attr('x',function(c){return margin.left+d.cols.indexOf(c.col)*cellSize;})
    .attr('y',function(c){return margin.top+d.rows.indexOf(c.row)*cellSize;})
    .attr('width',cellSize-2).attr('height',cellSize-2).attr('rx',3)
    .attr('fill',function(c){return color(c.value);});
  svg.selectAll('.colLabel').data(d.cols).join('text')
    .attr('x',function(_,i){return margin.left+i*cellSize+cellSize/2;}).attr('y',margin.top-8)
    .attr('text-anchor','middle').attr('font-size','11px').attr('fill','#555').text(function(t){return t;});
  svg.selectAll('.rowLabel').data(d.rows).join('text')
    .attr('x',margin.left-8).attr('y',function(_,i){return margin.top+i*cellSize+cellSize/2+4;})
    .attr('text-anchor','end').attr('font-size','11px').attr('fill','#555').text(function(t){return t;});
})();
</script>`;
}

export function buildSankeyHtml(
  links: SankeyLink[],
  containerId = "sankey",
): string {
  const nodes = [...new Set(links.flatMap((l) => [l.source, l.target]))];
  const data = JSON.stringify({
    nodes: nodes.map((n) => ({ name: n })),
    links: links.map((l) => ({
      source: nodes.indexOf(l.source),
      target: nodes.indexOf(l.target),
      value: l.value,
    })),
  });

  return `<div id="${containerId}" style="width:100%;height:400px;"></div>
<script>
(function(){
  if(typeof d3==='undefined'){document.getElementById('${containerId}').textContent='D3.js CDN 로드 실패';return;}
  var container=document.getElementById('${containerId}');
  var w=container.offsetWidth,h=400;
  var d=${data};
  var nodeW=20,nodePad=12;
  var svg=d3.select('#${containerId}').append('svg').attr('width',w).attr('height',h);
  var cols=[[],[]];
  d.nodes.forEach(function(n,i){
    var isSource=d.links.some(function(l){return l.source===i;});
    var isTarget=d.links.some(function(l){return l.target===i;});
    if(isSource&&!isTarget)cols[0].push(i);else cols[1].push(i);
  });
  var palette=${JSON.stringify(PALETTE)};
  function layoutCol(col,x){
    var total=col.reduce(function(s,i){
      return s+d.links.filter(function(l){return l.source===i||l.target===i;}).reduce(function(a,l){return a+l.value;},0);
    },0)||1;
    var y=20;
    col.forEach(function(ni,ci){
      var val=d.links.filter(function(l){return l.source===ni||l.target===ni;}).reduce(function(a,l){return a+l.value;},0);
      var nh=Math.max(20,(val/total)*(h-40));
      d.nodes[ni].x=x;d.nodes[ni].y=y;d.nodes[ni].h=nh;d.nodes[ni].color=palette[ci%palette.length];
      y+=nh+nodePad;
    });
  }
  layoutCol(cols[0],20);layoutCol(cols[1],w-nodeW-20);
  svg.selectAll('.link').data(d.links).join('path')
    .attr('d',function(l){var s=d.nodes[l.source],t=d.nodes[l.target];return 'M'+(s.x+nodeW)+','+((s.y||0)+(s.h||0)/2)+' C'+w/2+','+((s.y||0)+(s.h||0)/2)+' '+w/2+','+((t.y||0)+(t.h||0)/2)+' '+t.x+','+((t.y||0)+(t.h||0)/2);})
    .attr('fill','none').attr('stroke','rgba(79,134,198,0.3)').attr('stroke-width',function(l){return Math.max(2,l.value/5);});
  svg.selectAll('.node').data(d.nodes).join('rect')
    .attr('x',function(n){return n.x||0;}).attr('y',function(n){return n.y||0;})
    .attr('width',nodeW).attr('height',function(n){return n.h||20;})
    .attr('fill',function(n){return n.color||'#4f86c6';}).attr('rx',3);
  svg.selectAll('.label').data(d.nodes).join('text')
    .attr('x',function(n){return (n.x||0)<w/2?(n.x||0)+nodeW+6:(n.x||0)-6;})
    .attr('y',function(n){return (n.y||0)+(n.h||20)/2+4;})
    .attr('text-anchor',function(n){return (n.x||0)<w/2?'start':'end';})
    .attr('font-size','12px').attr('fill','#333')
    .text(function(n){return n.name;});
})();
</script>`;
}
