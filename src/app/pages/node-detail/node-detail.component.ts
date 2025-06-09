import { Component, OnInit } from '@angular/core';
import { Chart, ChartOptions, registerables } from 'chart.js';
import { ChartConfiguration } from 'chart.js';
import { PredictService } from 'src/app/services/predict.service';

Chart.register(...registerables);

// Flèche personnalisée
// Chart.register({
//   id: 'arrowPlugin',
//   afterDatasetsDraw(chart) {
//     const ctx = chart.ctx;
//     chart.data.datasets.forEach((dataset, i) => {
//       if (!chart.isDatasetVisible(i)) return; 
//       dataset.data.forEach((point: any, index: number) => {
//         if (point.direction !== undefined) {
//          const x = chart.scales.x.getPixelForValue(point['x']);
//         const y = chart.scales.y.getPixelForValue(point['y']);

//           const angle = (point.direction - 90) * (Math.PI / 180); // direction en radians

//           ctx.save();
//           ctx.translate(x, y);
//           ctx.rotate(angle);
//           ctx.beginPath();
//           ctx.moveTo(0, -6);
//           ctx.lineTo(-3, 3);
//           ctx.lineTo(3, 3);
//           ctx.closePath();
//           ctx.fillStyle = 'black';
//           ctx.fill();
//           ctx.restore();
//         }
//       });
//     });
//   }
// });

@Component({
  selector: 'app-node-detail',
  templateUrl: './node-detail.component.html'
})
export class NodeDetailComponent implements OnInit {
  historyData: any[] = [];

  constructor(private predictService: PredictService) {}

  ngOnInit(): void {
    this.predictService.getNodeHistory('Node_002', 123).subscribe(data => {
      this.historyData = data;
    });
  }

  getTrajectoryChartData(): ChartConfiguration<'scatter'>['data'] {
    return {
      datasets: [
        {
          label: 'Trajet Réel',
          data: this.historyData.map(d => ({
            x: d.Longitude,
            y: d.Latitude,
            direction: d.Direction
          })),
          pointRadius: 4,
          pointBackgroundColor: 'blue',
          showLine: false
        },
        {
          label: 'Trajet Prédit',
          data: this.historyData.map(d => ({
            x: d.predicted_lon,
            y: d.predicted_lat,
            direction: d.Direction
          })),
          pointRadius: 4,
          pointBackgroundColor: 'orange',
          showLine: false
        }
      ]
    };
  }

  trajectoryChartOptions: ChartOptions<'scatter'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      },
      tooltip: {
        enabled: true
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Longitude' }
      },
      y: {
        title: { display: true, text: 'Latitude' }
      }
    }
  };
}
