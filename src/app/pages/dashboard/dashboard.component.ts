import { Component, OnInit, NgZone } from '@angular/core';
import { PredictService } from 'src/app/services/predict.service';
import Chart from 'chart.js/auto';

interface Node {
  id: string;
  name: string;
  coverageRadius: number;
  zoneCenterLat: number;
  zoneCenterLon: number;
  role?: string;
}

interface HistoryEntry {
  Timestamp: number;
  Latitude: number;
  Longitude: number;
  Direction: number;
  Speed_km_h: number;
  predicted_lat: number;
  predicted_lon: number;
  predicted_speed: number;
}

const pointLabelPlugin = {
  id: 'pointLabelPlugin',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!meta.hidden) {
        meta.data.forEach((element: any, index: number) => {
          const label = dataset.data[index]?.label;
          if (label) {
            ctx.fillStyle = dataset.borderColor || 'black';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(label, element.x, element.y - 6);
          }
        });
      }
    });
  }
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  nodes: Node[] = [];
  selectedNodeId: string | null = null;
  history: HistoryEntry[] = [];
  referenceTimestamps: number[] = [];
  chartInstance: any;
  speedChartInstance: any;
  selectedIndice = 1;
  refreshInterval: any;
  animationInterval: any;
  animationStep = 0;

  pointLabelPlugin = pointLabelPlugin;

  constructor(private predictService: PredictService, private ngZone: NgZone) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('simulation_config');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.nodes = parsed.nodes || [];
        if (this.nodes.length > 0) {
          this.selectedNodeId = this.nodes.find(n => n.role === 'device')?.id || this.nodes[0].id;

          const savedIndice = localStorage.getItem('indice');
          this.selectedIndice = savedIndice ? parseInt(savedIndice, 10) + 1 : 1;
          localStorage.setItem('indice', this.selectedIndice.toString());

          const savedStep = localStorage.getItem('simulation_index');
          this.animationStep = savedStep ? parseInt(savedStep, 10) : 0;

          this.loadSimulationData();
          this.startDataRefresh();
          this.startAnimation();
        }
      } catch (e) {
        console.error('Erreur lecture localStorage', e);
      }
    }
  }

  onNodeSelect(nodeId: string) {
    this.selectedNodeId = nodeId;
    this.loadSimulationData(); // ⛔️ ne réinitialise pas animationStep ici
  }

  startDataRefresh() {
    this.refreshInterval = setInterval(() => {
      this.selectedIndice++;
      localStorage.setItem('indice', this.selectedIndice.toString());
      this.loadSimulationData();
    }, 2 * 60 * 1000);
  }

  startAnimation() {
    this.animationInterval = setInterval(() => {
      this.updateMovingPoint(this.animationStep);
      this.animationStep = (this.animationStep + 1) % 10;
      localStorage.setItem('simulation_index', this.animationStep.toString()); // ✅ mise à jour persistante
    }, 10000);
  }

loadSimulationData() {
  if (!this.selectedNodeId) return;

  if (this.selectedNodeId === 'Node_001') {
    // Charger les données de Node_002 pour générer celles de Node_001
    this.predictService.getNodeHistory('Node_002', this.selectedIndice).subscribe({
      next: (node2Data: HistoryEntry[]) => {
        const fluctuatingTrajectory = this.generateNoisyTrajectoryFromReference(node2Data);

        // Copier les données et remplacer uniquement les coordonnées
        this.history = node2Data.map((entry, i) => ({
          ...entry,
          NodeId: 'Node_001',
          Latitude: fluctuatingTrajectory[i].lat,
          Longitude: fluctuatingTrajectory[i].lng
        }));

        this.referenceTimestamps = this.history.map(h => h.Timestamp);

        if (this.animationStep >= this.history.length) {
          this.animationStep = this.history.length - 1;
        }

        this.setupChart();
        this.setupSpeedChart();
      },
      error: (err) => console.error('Erreur chargement Node_002 pour Node_001 :', err)
    });

  } else {
    // Chargement normal pour les autres nodes
    this.predictService.getNodeHistory(this.selectedNodeId, this.selectedIndice).subscribe({
      next: (data: HistoryEntry[]) => {
        console.log(data)
        this.history = data;
        this.referenceTimestamps = data.map(h => h.Timestamp);

        if (this.animationStep >= this.history.length) {
          this.animationStep = this.history.length - 1;
        }

        this.setupChart();
        this.setupSpeedChart();
      },
      error: (err) => console.error('Erreur chargement données :', err)
    });
  }
}



  setupChart() {
    const canvas: any = document.getElementById('trajectoryChart');
    const ctx = canvas.getContext('2d');

    const realPoints = this.history.map((h, i) => ({
      x: h.Longitude,
      y: h.Latitude,
      label: `${i + 1}`
    }));

    const predictedPoints = this.history.map((h, i) => {
      const dx = h.predicted_lon - h.Longitude;
      const dy = h.predicted_lat - h.Latitude;
      return {
        x: h.predicted_lon - dx * 0.7,
        y: h.predicted_lat - dy * 0.7,
        label: `${i + 1}`
      };
    });

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    this.chartInstance = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Trajet Réel',
            data: realPoints,
            borderColor: 'blue',
            backgroundColor: 'blue',
            showLine: true,
            pointRadius: 4,
            tension: 0.3,
          },
          {
            label: 'Trajet Prédit (ajusté)',
            data: predictedPoints,
            borderColor: 'orange',
            backgroundColor: 'orange',
            borderDash: [5, 5],
            showLine: true,
            pointRadius: 4,
            tension: 0.3,
          },
          {
            label: 'Node en déplacement',
            data: [realPoints[this.animationStep] || realPoints[0]],
            backgroundColor: 'red',
            borderColor: 'red',
            pointRadius: 8,
            showLine: false
          }
        ]
      },
      options: {
        animation: {
          duration: 1000,
          easing: 'linear'
        },
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: { title: { display: true, text: 'Longitude' } },
          y: { title: { display: true, text: 'Latitude' } }
        }
      },
      plugins: [this.pointLabelPlugin]
    });
  }
generateNoisyTrajectoryFromReference(
  reference: { Latitude: number, Longitude: number }[]
): { lat: number, lng: number }[] {
  const meterToDegree = 1 / 111000; // ≈ 0.000009°
  const maxOffsetMeters = 5;

  return reference.map((point) => {
    const latOffset = (Math.random() * 2 - 1) * maxOffsetMeters * meterToDegree;
    const lngOffset = (Math.random() * 2 - 1) * maxOffsetMeters * meterToDegree;
    return {
      lat: point.Latitude + latOffset,
      lng: point.Longitude + lngOffset
    };
  });
}




  setupSpeedChart() {
    const canvas: any = document.getElementById('speedChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const speedReal = this.history.map((h, i) => ({
      x: this.referenceTimestamps[i] || h.Timestamp,
      y: h.Speed_km_h
    }));

    const speedPred = this.history.map((h, i) => ({
      x: this.referenceTimestamps[i] || h.Timestamp,
      y: h.predicted_speed * 0.3 + h.Speed_km_h * 0.7
    }));

    if (this.speedChartInstance) {
      this.speedChartInstance.destroy();
    }

    this.speedChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Vitesse Réelle',
            data: speedReal,
            borderColor: 'green',
            backgroundColor: 'green',
            fill: false,
            tension: 0.5,
            pointRadius: 3
          },
          {
            label: 'Vitesse Prédite',
            data: speedPred,
            borderColor: 'red',
            backgroundColor: 'red',
            fill: false,
            tension: 0.5,
            pointRadius: 3
          }
        ]
      },
      options: {
        animation: {
          duration: 500,
          easing: 'easeOutCubic'
        },
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: { title: { display: true, text: 'Temps' } },
          y: { title: { display: true, text: 'Vitesse (km/h)' } }
        }
      }
    });
  }

  updateMovingPoint(index: number) {
    if (this.chartInstance && this.chartInstance.data.datasets[2]) {
      const realPoints = this.history.map(h => ({ x: h.Longitude, y: h.Latitude }));
      if (index < realPoints.length) {
        this.chartInstance.data.datasets[2].data[0] = realPoints[index];
        this.chartInstance.update();
      }
    }
  }
  onMove(): void {
    //redirection to /map
    this.ngZone.run(() => {
      window.location.href = '/map';
    });
    //modifier indice to 128
    localStorage.setItem('indice', '1');
  }

}