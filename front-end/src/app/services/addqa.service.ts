import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, retry } from 'rxjs/operators';
import { Question, Questions, QuestionAdapter } from '../classes/question';
import { Answer, Answers } from '../classes/answer';

const httpHeaders = {
  headers: new HttpHeaders({ 
    'Content-Type': 'application/json'
  }),
  withCredentials: true
};

const url = "http://8.9.11.218";

@Injectable({
  providedIn: 'root'
})
export class AddqaService {
  constructor(
    private http: HttpClient,
  ) { }

  addQuestion(title: string, body: string, tags: Array<string>): Observable<any> {
    let postBody = { title: title, body: body, tags: tags, media: null }
    console.log(postBody);
    return this.http.post(url + "/questions/add", postBody, httpHeaders)
      .pipe(
        catchError(this.handleError)
      )
  }

  addAnswer(questionId: string, body: string): Observable<any> {
    let postBody = { body: body };
    return this.http.post(url + "/questions/" + questionId + "/answers/add", postBody, httpHeaders)
      .pipe(
        catchError(this.handleError)
      )
  }

  deleteQuestion

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
