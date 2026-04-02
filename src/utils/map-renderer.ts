export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  popup?: string;
  size?: number;
}

export interface MapRoute {
  points: Array<{ lat: number; lng: number }>;
  color?: string;
  label?: string;
}

export interface MapOptions {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  routes?: MapRoute[];
}

export function buildMapScript(opts: MapOptions): string {
  const center = opts.center ?? { lat: 37.5665, lng: 126.978 };
  const zoom = opts.zoom ?? 5;
  const markersJson = JSON.stringify(opts.markers ?? []);
  const routesJson = JSON.stringify(opts.routes ?? []);

  return `<div id="map" style="width:100%;height:500px;border-radius:8px;"></div>
<script>
(function(){
  if(typeof L==='undefined'){document.getElementById('map').textContent='Leaflet CDN 로드 실패';return;}
  var map=L.map('map').setView([${center.lat},${center.lng}],${zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'&copy; OpenStreetMap contributors',maxZoom:19
  }).addTo(map);
  var markers=${markersJson};
  markers.forEach(function(m){
    var marker=L.circleMarker([m.lat,m.lng],{radius:m.size||6,fillColor:'#4f86c6',color:'#fff',weight:2,fillOpacity:0.8}).addTo(map);
    if(m.popup||m.label)marker.bindPopup('<b>'+m.label+'</b>'+(m.popup?'<br>'+m.popup:''));
    if(m.label)marker.bindTooltip(m.label);
  });
  var routes=${routesJson};
  routes.forEach(function(r){
    var latlngs=r.points.map(function(p){return[p.lat,p.lng];});
    L.polyline(latlngs,{color:r.color||'#e74c3c',weight:3,opacity:0.7,dashArray:'8,4'}).addTo(map);
  });
})();
</script>`;
}
