import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { PredictService } from 'src/app/services/predict.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, OnDestroy, AfterViewInit {
  map: any;
  nodeHistories: { [id: string]: any[] } = {};
  nodeMarkers: { [id: string]: any } = {};
  nodeSteps: { [id: string]: number } = {};
  zoneCircles: L.Circle[] = [];
  coverageCircles: L.Circle[] = [];

  updateInterval: any;
  refreshInterval: any;

  selectedIndice = 1;
  currentInstanceData: any = null;
  mainNodeId: string | null = null;
  predictedPolyline: any;
  predictionMarkers: any[] = [];
  directionArrows: L.Polyline[] = [];

  constructor(private predictService: PredictService) {}

  ngOnInit(): void {
    const savedIndice = localStorage.getItem('indice');
    this.selectedIndice = savedIndice ? parseInt(savedIndice, 10) + 1 : 1;
    localStorage.setItem('indice', this.selectedIndice.toString());

    this.refreshInterval = setInterval(() => {
      this.selectedIndice++;
      localStorage.setItem('indice', this.selectedIndice.toString());
      this.loadSimulationData();
    }, 2 * 60 * 1000);
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.loadSimulationData();
  }

  ngOnDestroy(): void {
    clearInterval(this.updateInterval);
    clearInterval(this.refreshInterval);
  }

  initMap(): void {
    this.map = L.map('map').setView([36.75, 3.06], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
  }

  loadSimulationData(): void {
    const config = JSON.parse(localStorage.getItem('simulation_config') || '{}');
    const nodes = config?.nodes || [];
    this.mainNodeId = nodes.find((n: any) => n.role === 'device')?.id || null;
  
    if (!nodes.length || !this.mainNodeId) {
      console.warn('Pas de configuration valide.');
      return;
    }
  
    this.nodeHistories = {};
    this.nodeMarkers = {};
    this.nodeSteps = {};
    this.zoneCircles.forEach(c => this.map.removeLayer(c));
    this.coverageCircles.forEach(c => this.map.removeLayer(c));
    this.zoneCircles = [];
    this.coverageCircles = [];
  
    nodes.forEach((node: any, index: number) => {
      const {
        id,
        zoneRadius,
        coverageRadius, // On garde cette info
        zoneCenterLat,
        zoneCenterLon
      } = node;
  
      // Créer un cercle fixe pour la zone
      if (
        typeof zoneCenterLat === 'number' &&
        typeof zoneCenterLon === 'number' &&
        typeof zoneRadius === 'number'
      ) {
        const center: [number, number] = [zoneCenterLat, zoneCenterLon];
        const zone = L.circle(center, {
          radius: zoneRadius * 1000,
          color: 'black',
          fillColor: this.getColor(index),
          fillOpacity: 0.1
        }).addTo(this.map);
        this.zoneCircles.push(zone);
      }
  // Juste après avoir ajouté le cercle principal :
const center: [number, number] = [zoneCenterLat, zoneCenterLon];
const zone = L.circle(center, {
  radius: zoneRadius * 1000,
  color: 'orange',
  // fillColor: this.getColor(index),
  fillOpacity: 0.1
}).addTo(this.map);
this.zoneCircles.push(zone);

// ➕ Ajouter des zones fixes autour avec le même rayon
const offsets = [
  [0.009, 0],     // Nord
  [-0.009, 0],    // Sud
  [0, 0.009],     // Est
  [0, -0.009],    // Ouest
  [0.006, 0.006],   // Nord-Est
  [0.006, -0.006],  // Nord-Ouest
  [-0.006, 0.006],  // Sud-Est
  [-0.006, -0.006]  // Sud-Ouest
];

offsets.forEach(([latOffset, lonOffset]) => {
  const altCenter: [number, number] = [zoneCenterLat + latOffset, zoneCenterLon + lonOffset];
  const altZone = L.circle(altCenter, {
    radius: zoneRadius * 1000,
    color: 'gray',
    fillColor: this.getColor(index + 1),
    fillOpacity: 0.1,
    dashArray: '4'
  }).addTo(this.map);
  this.zoneCircles.push(altZone);
});

      // Initialiser une entrée vide dans coverageCircles (remplie dynamiquement)
      this.coverageCircles.push(null as any);
  
      // Récupérer l’historique
      this.predictService.getNodeHistory(id, this.selectedIndice).subscribe({
        next: (data: any[]) => {
          const filtered = data.filter(p =>
            p?.Latitude && p?.Longitude && p?.predicted_lat && p?.predicted_lon
          );
          this.nodeHistories[id] = filtered;
          this.nodeSteps[id] = 0;
  
          if (id === this.mainNodeId && filtered.length > 0) {
            this.drawPredictedPath(filtered);
            this.map.setView([filtered[0].Latitude, filtered[0].Longitude], 15);
          }
  
          if (Object.keys(this.nodeHistories).length === nodes.length) {
            this.startSimulation();
          }
        },
        error: err => console.error(`Erreur pour ${id}`, err)
      });
    });
  }
  
  

  drawPredictedPath(history: any[]): void {
    if (this.predictedPolyline) this.map.removeLayer(this.predictedPolyline);
    this.predictionMarkers.forEach(m => this.map.removeLayer(m));
    this.predictionMarkers = [];

    const points: [number, number][] = history.map(p => [
      p.Latitude + 0.2 * (p.predicted_lat - p.Latitude),
      p.Longitude + 0.2 * (p.predicted_lon - p.Longitude)
    ]);

    this.predictedPolyline = L.polyline(points, { color: 'red', weight: 3 }).addTo(this.map);

    points.forEach((coord, i) => {
      const marker = L.marker(coord, {
        icon: L.divIcon({
          className: 'number-icon',
          html: `<div style="background:red;color:white;border-radius:50%;width:24px;height:24px;text-align:center;line-height:24px;font-size:12px">${i + 1}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(this.map);
      this.predictionMarkers.push(marker);
    });
  }

  startSimulation(): void {
    clearInterval(this.updateInterval);
    this.updateRealMarkers();
    this.updateInterval = setInterval(() => this.updateRealMarkers(), 20000);
  }

updateRealMarkers(): void {
this.directionArrows.forEach(a => this.map.removeLayer(a));
this.directionArrows = [];

const config = JSON.parse(localStorage.getItem('simulation_config') || '{}');
const nodes = config.nodes || [];

const mainConfig = nodes.find((n: any) => n.id === this.mainNodeId);
const mainZoneRadius = (mainConfig?.zoneRadius || 0.1) * 1000;

const mainStep = this.nodeSteps[this.mainNodeId || ''] || 0;
const mainPoint = this.nodeHistories[this.mainNodeId || '']?.[mainStep];

let optimalCandidates: { id: string; distance: number }[] = [];

let index = 0;
for (const [nodeId, history] of Object.entries(this.nodeHistories)) {
const step = this.nodeSteps[nodeId] || 0;
const point = history[step];

if (!point) continue;

const lat = point.Latitude;
const lon = point.Longitude;

// Supprimer l'ancien marqueur
if (this.nodeMarkers[nodeId]) {
  this.map.removeLayer(this.nodeMarkers[nodeId]);
}

// Calcul des candidats optimaux
if (nodeId !== this.mainNodeId && point.Potential_Connection_Loss === 0 && mainPoint) {
  const distance = this.calculateDistanceError(lat, lon, mainPoint.Latitude, mainPoint.Longitude);
  optimalCandidates.push({ id: nodeId, distance });
}

this.nodeSteps[nodeId] = step + 1;
}

// Nouveau filtrage en fonction de l'état du nœud principal
const isMainOutsideZone = mainPoint?.exit_probability === 1;
const DISTANCE_SEUIL = 500; // en mètres

let filteredCandidates = optimalCandidates.filter(c => {
const node = this.nodeHistories[c.id]?.[mainStep];
if (!node) return false;
const distance = this.calculateDistanceError(node.Latitude, node.Longitude, mainPoint.Latitude, mainPoint.Longitude);
const isOutside = node.exit_probability === 1;
if (!isMainOutsideZone) {
// Node principal dans la zone => candidats dans la même zone et dans le rayon
return !isOutside && distance <= mainZoneRadius;
} else {
// Node principal hors zone => candidats hors zone et distance raisonnable
return isOutside && distance <= DISTANCE_SEUIL;
}
});

const sorted = filteredCandidates.sort((a, b) => a.distance - b.distance);
const optimalNode1 = sorted[0]?.id || null;
const optimalNode2 = sorted[1]?.id || null;

// Re-parcourir pour affichage
index = 0;
for (const [nodeId, history] of Object.entries(this.nodeHistories)) {
const step = this.nodeSteps[nodeId]! - 1;
const point = history[step];

const lat = point.Latitude;
const lon = point.Longitude;

const isOptimal = nodeId === optimalNode1 || nodeId === optimalNode2;
const color = nodeId === this.mainNodeId ? 'blue' : isOptimal ? 'green' : 'yellow';

const popupContent = `
  <b>Node ID:</b> ${nodeId}<br>
  <b>Latitude:</b> ${lat.toFixed(5)}<br>
  <b>Longitude:</b> ${lon.toFixed(5)}<br>
  <b>Obstacle:</b> ${point.Obstacle_Type || 'Aucun'}<br>
  <b>Exit Probability:</b> ${(point.exit_probability * 100).toFixed(1)}%<br>
  <b>Direction:</b> ${point.Direction }°<br>
  <b>Speed_km_h:</b> ${point.Speed_km_h }<br>
  <b>Potential Connection Loss:</b> ${point.Potential_Connection_Loss || 0}<br>
  ${isOptimal ? '<b style="color:green;">✅ Node Optimal</b><br>' : ''}
`;

const marker = L.circleMarker([lat, lon], {
  radius: 10,
  color: color,
  fillColor: color,
  fillOpacity: 1
})
  .addTo(this.map)
  .bindPopup(popupContent);

marker.on('click', () => marker.openPopup());
this.nodeMarkers[nodeId] = marker;

// Couverture dynamique
const nodeConfig = config.nodes.find((n: any) => n.id === nodeId);
const radius = (nodeConfig?.coverageRadius || 0.1) * 1000;

if (this.coverageCircles[index]) {
  this.coverageCircles[index].setLatLng([lat, lon]);
} else {
  const coverage = L.circle([lat, lon], {
    radius: radius,
    color: 'black',
    fillColor: this.getColor(index + 1),
    fillOpacity: 0.2
  }).addTo(this.map);
  this.coverageCircles[index] = coverage;
}

if (nodeId === this.mainNodeId) {
  const predLat = point.predicted_lat;
  const predLon = point.predicted_lon;

  marker.bindPopup(`
    <b>Déplacement principal - Point ${step + 1}</b><br>
    📍 Réel: (${lat.toFixed(5)}, ${lon.toFixed(5)})<br>
    🧭 Prédit: (${predLat.toFixed(5)}, ${predLon.toFixed(5)})
  `).openPopup();

  setTimeout(() => marker.closePopup(), 10000);

  const direction = point.Direction || 0;
  const arrowLat = lat + 0.0005 * Math.cos(direction * Math.PI / 180);
  const arrowLon = lon + 0.0005 * Math.sin(direction * Math.PI / 180);
  const arrow = L.polyline([[lat, lon], [arrowLat, arrowLon]], {
    color: 'orange',
    weight: 2,
    dashArray: '4'
  }).addTo(this.map);
  this.directionArrows.push(arrow);

  // MAJ des données affichées
  this.currentInstanceData = {
    ...point,
    optimal_node_1: optimalNode1,
    optimal_node_2: optimalNode2,
    optimal_node_distance: sorted[0]?.distance || null,
    in_zone: !isMainOutsideZone
  };
}

index++;
}
}



  
createTriangleMarker(lat: number, lon: number, direction: number): L.Polygon {
  const size = 0.0003; // ajuster la taille du triangle si besoin
  const angle = direction * Math.PI / 180;

  // Calculer les 3 points du triangle
  const p1: [number, number] = [
    lat + size * Math.cos(angle),
    lon + size * Math.sin(angle)
  ];
  const p2: [number, number] = [
    lat + size * Math.cos(angle + 2.5), // décalage ~143°
    lon + size * Math.sin(angle + 2.5)
  ];
  const p3: [number, number] = [
    lat + size * Math.cos(angle - 2.5), // décalage ~-143°
    lon + size * Math.sin(angle - 2.5)
  ];

  return L.polygon([p1, p2, p3], {
    color: 'yellow',
    fillColor: 'yellow',
    fillOpacity: 0.8,
    weight: 1
  });
}

  calculateDistanceError(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const toRad = (deg: number) => deg * Math.PI / 180;
    const φ1 = toRad(lat1), φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a = Math.sin(Δφ/2)**2 +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

getColor(index: number): string {
  const colors = [
    'red', 'green', 'blue', 'purple', 'orange', 'cyan', 'magenta', 'brown', 'teal', 'lime'
  ];
  return colors[index % colors.length];
}

}
