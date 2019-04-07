import { Component, OnInit } from '@angular/core';

import { Observable } from 'rxjs';
import { QuestionRetrievalService } from '../question-retrieval.service';
import { Question } from '../question';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  recentQuestions: Question[] = [];

  constructor(
    public questionRetrievalService: QuestionRetrievalService
  ) { }

  ngOnInit() {
    this.retrieveRecentQuestions();
  }

  private retrieveRecentQuestions(): void {
    this.questionRetrievalService.getRecentQuestions()
      .subscribe(response => {
        this.recentQuestions = response;
        console.log(this.recentQuestions);
      })
  }

  retrieveQuestion(id: string): void {
    this.questionRetrievalService.getQuestion(id)
    .subscribe((question: Question) => {
      console.log(question);
    });
  }

}
