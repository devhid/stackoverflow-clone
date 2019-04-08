import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, retry } from 'rxjs/operators';

const httpHeaders = {
  headers: new HttpHeaders({ 
    'Content-Type': 'application/json'
  })
};

const registerUrl = "http://130.245.171.197"
const verificationUrl = "http://207.148.20.88"

@Injectable({
  providedIn: 'root'
})
export class RegisterService {

  constructor(
    private http: HttpClient
  ) { }

  registerAccount(username: string, email: string, password: string): Observable<any> {
    let params = new HttpParams();
    params.append("username", username);
    params.append("email", email);
    params.append("password", password);
    console.log(params);
    return this.http.post(registerUrl + "/adduser", { username: username, email: email, password: password }, httpHeaders)
      .pipe(
        catchError(this.handleError)
      )
  }

  verifyAccount(email: string, key: string): Observable<any> {
    let body = { email: email, key: key }
    console.log(body);
    return this.http.post(verificationUrl + "/verify", body, httpHeaders)
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
