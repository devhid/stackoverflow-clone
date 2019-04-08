import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';

import { User, UserAdapter } from './user'
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, retry } from 'rxjs/operators';

const httpHeaders = {
  headers: new HttpHeaders({ 
    'Content-Type': 'application/json'
  })
};

const url = "http://";

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(
    private adapter: UserAdapter,
    private http: HttpClient
  ) { }

  retrieveUserInfo(username: string): Observable<User> {
    return this.http.get<any>(url + "/" + username, httpHeaders)
      .pipe(
        map(data => this.adapter.adapt(data.user)),
        catchError(this.handleError)
      )
  }

  retrieveUserQuestions(username: string): Observable<any> {
    return this.http.get<any>(url + "/" + username + "/questions", httpHeaders)
      .pipe(
        map(data => data.questions),
        catchError(this.handleError)
      )
  }

  retrieveUserAnswers(username: string): Observable<any> {
    return this.http.get<any>(url + "/" + username + "/answers", httpHeaders)
      .pipe(
        map(data => data.answers),
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
