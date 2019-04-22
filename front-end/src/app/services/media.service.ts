import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';


const httpFileHeaders = {
  headers: new HttpHeaders({ 
    'Content-Type': 'multipart/form-data'
  }),
  withCredentials: true
};

const url = "http://8.9.11.218"

@Injectable({
  providedIn: 'root'
})
export class MediaService {

  constructor(
    private http: HttpClient
  ) { }

  public upload(file: File): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('content', file);
    return this.http.post(url + "/addmedia", formData, httpFileHeaders)
    .pipe(
      catchError(this.handleError)
    )
  }

  public retrieveMedia(id: string): Observable<any> {
    return this.http.get(url + "/media/" + id)
    .pipe(
      catchError(this.handleError)
    )
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    // return an observable with a user-facing error message
    return throwError(
      'Something bad happened; please try again later.');
  };
}