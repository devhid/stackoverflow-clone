import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, retry } from 'rxjs/operators';
import { Question, Questions, QuestionAdapter, QuestionsAdapter } from './question';
//import { Questions, QuestionsAdapter } from './questions';

const httpHeaders = {
  headers: new HttpHeaders({ 
    'Content-Type': 'application/json'
  })
};

@Injectable({
  providedIn: 'root'
})
export class QuestionRetrievalService {
  private url = 'http://8.9.11.218';  // URL to web api
  private searchUrl = 'http://64.190.91.125' // URL to search microservice

  constructor(
    private http: HttpClient,
    private adapter: QuestionAdapter,
    //private questionsAdapter: QuestionsAdapter
  ) { }

  getRecentQuestions(): Observable<any>{
    return this.http.post(this.searchUrl + "/search", [], httpHeaders)
      .pipe(
        map((data: Questions) => data.questions),
        catchError(this.handleError)
      )
  }

  getQuestion(id: string): Observable<Question>{
    return this.http.get(this.url + "/questions/" + id)
      .pipe(
        map(data => this.adapter.adapt(data)),
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
