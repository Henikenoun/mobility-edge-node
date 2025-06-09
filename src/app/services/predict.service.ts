import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PredictService {
  private apiUrl = 'https://5bb8-34-85-230-133.ngrok-free.app'; // Remplace par ton URL

  private headers = new HttpHeaders({
    'ngrok-skip-browser-warning': 'true'
  });

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur côté client: ${error.error.message}`;
      console.error('Erreur côté client:', error.error.message);
    } else {
      // Erreur côté serveur
      errorMessage = `Erreur du serveur : ${error.status}, corps de la réponse : ${error.error}`;
      console.error(
        `Erreur du serveur : ${error.status}, corps de la réponse :`, error.error);
    }

    if (error.error && error.error.text) {
        console.error("Full server response text:", error.error.text)
    }
    // Retourne un Observable avec un message d'erreur convivial.
    return throwError(() => new Error(errorMessage)); // Use throwError(() => ...)
  }

  getNodes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/nodes`, { headers: this.headers });
  }
  getNodeHistory(node: string, indice: number): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/historique/${node}?indice=${indice}`, { headers: this.headers })
      .pipe(
        map(response => response),
        catchError(this.handleError)
      );
  }
  
}
