import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PredictService } from 'src/app/services/predict.service';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css']
})
export class SetupComponent implements OnInit {
  step = 1;
  zoneType: 'rectangle' | 'cercle' = 'rectangle';
  zoneName = '';
  allNodes: any[] = [];
  selectedNodes: any[] = [];
  mainNodeId: string | null = null;
  currentNodeIndex = 0;


  constructor(private router: Router, private predictService: PredictService) {}

  ngOnInit(): void {
    this.predictService.getNodes().subscribe({
      next: (data: any) => {
        const nodes = Array.isArray(data?.nodes) ? data.nodes : data;
        this.allNodes = nodes.map((name: string | any) => ({
          id: name,
          name: name,
          selected: false,
          coverageRadius: 0.5,
          zoneCenterLat: 0,
          zoneCenterLon: 0,
          zoneRadius: 1
        }));
        console.log('Nœuds récupérés :', this.allNodes);
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des nœuds :', err);
      }
    });
  }

  onNodeSelectionChange(node: any, event: any) {
    node.selected = event.selected;
  }

  goToNodeSelection() {
    this.step = 2;
  }

  goToNodeConfiguration() {
  this.selectedNodes = this.allNodes.filter(n => n.selected);
  if (this.selectedNodes.length === 0) {
    alert('Veuillez sélectionner au moins un nœud.');
    return;
  }
  this.currentNodeIndex = 0;
  this.step = 3;
}
nextNodeConfiguration() {
  if (this.currentNodeIndex < this.selectedNodes.length - 1) {
    this.currentNodeIndex++;
  } else {
    this.goToMainNodeSelection(); // Si c'est le dernier, passer à l'étape suivante
  }
}


  goToMainNodeSelection() {
    this.step = 4;
  }

  setMainNode(nodeId: string) {
    this.mainNodeId = nodeId;
  }

  finishSetup() {
    if (!this.mainNodeId) {
      alert('Veuillez sélectionner un nœud principal.');
      return;
    }

    const config = {
      zone: {
        type: this.zoneType,
        name: this.zoneName
      },
      nodes: this.selectedNodes.map(node => ({
        id: node.id,
        name: node.name,
        coverageRadius: node.coverageRadius,
        zoneCenterLat: node.zoneCenterLat,
        zoneCenterLon: node.zoneCenterLon,
        zoneRadius: node.zoneRadius,
        role: node.id === this.mainNodeId ? 'device' : 'edge'
      }))
    };

    localStorage.setItem('simulation_config', JSON.stringify(config));
    localStorage.setItem('indice', '114'); 
    this.router.navigate(['/map']);
  }
}
