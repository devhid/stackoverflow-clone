import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, retry } from 'rxjs/operators';
import { Question, Questions, QuestionAdapter } from '../classes/question';
import { Answer, Answers } from '../classes/answer';
//import { Questions, QuestionsAdapter } from './questions';

const httpHeaders = {
  headers: new HttpHeaders({ 
    'Content-Type': 'application/json'
  })
};

const url = 'http://kellogs.cse356.compas.cs.stonybrook.edu';  // URL to web api
const searchUrl = 'http://64.190.91.125' // URL to search microservice

@Injectable({
  providedIn: 'root'
})
export class RetrievalService {
  constructor(
    private http: HttpClient,
    private questionAdapter: QuestionAdapter
  ) { }

  getRecentQuestions(): Observable<any> {
    return this.http.post(searchUrl + "/search", [], httpHeaders)
      .pipe(
        map((data: Questions) => data.questions),
        catchError(this.handleError)
      )
  }

  getQuestion(id: string): Observable<Question> {
    return this.http.get(url + "/questions/" + id)
      .pipe(
        map(data => this.questionAdapter.adapt(data)),
        catchError(this.handleError)
      )
  }

  getAnswer(id: string): Observable<any> {   // TO BE IMPLEMENTED
    return this.http.get(url + "/answers/" + id)
      .pipe(
        catchError(this.handleError)
      )
  }

  getQuestionAnswers(id: string): Observable<any> {
    return this.http.get(url + "/questions/" + id + "/answers")
      .pipe(
        map((data: Answers) => data.answers),
        catchError(this.handleError)
      )
  }

  searchQuestions(query: string): Observable<any>{
    let body = {
      limit: 100,
      query: query
    }
    return this.http.post(searchUrl + "/search", body, httpHeaders)
    .pipe(
      map((data: Questions) => data.questions),
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
