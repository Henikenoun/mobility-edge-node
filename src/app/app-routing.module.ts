import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SetupComponent } from './pages/setup/setup.component';
import { MapComponent } from './pages/map/map.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { NodeDetailComponent } from './pages/node-detail/node-detail.component';

const routes: Routes = [
  { path: '', component: SetupComponent },
  { path: 'map', component: MapComponent },
  { path: 'dash', component: DashboardComponent },
  { path: 'nodes/:id', component: NodeDetailComponent }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
