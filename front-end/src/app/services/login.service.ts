import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, retry } from 'rxjs/operators';

const httpHeaders = {
  headers: new HttpHeaders({ 
    'Content-Type': 'application/json'
  }),
  withCredentials: true,
  observe: 'response' as 'response'
};

const url = "http://130.245.170.211"

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  constructor(
    private http: HttpClient
  ) { }

  login(username: string, password: string): Observable<any> {
    let body = { username: username, password: password };
    console.log(body);
    return this.http.post(url + "/login", body, httpHeaders)
      .pipe(
        catchError(this.handleError)
      )
  }

  logout(): Observable<any> {
    return this.http.post(url + "/logout", {}, httpHeaders)
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
