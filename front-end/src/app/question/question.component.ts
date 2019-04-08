import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { QuestionRetrievalService } from '../question-retrieval.service';
import { Question } from '../question';
import { Answer, Answers } from '../answer';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})
export class QuestionComponent implements OnInit {

  question: Question;
  answers: Answer[];
  acceptedAnswer: Answer;

  constructor(
    private questionRetrievalService: QuestionRetrievalService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    let id = this.retrieveId();
    this.retrieveQuestion(id);
    this.retrieveAnswers(id);
    if(this.question.accepted_answer_id !== null) {
      this.retrieveAcceptedAnswer(this.question.accepted_answer_id);
    }
  }

  private retrieveId(): string{
    return this.route.snapshot.paramMap.get('id');
  }

  private retrieveQuestion(id: string): void {
    this.questionRetrievalService.getQuestion(id)
    .subscribe((question: Question) => {
      console.log(question);
      this.question = question;
    });
  }

  private retrieveAnswers(id: string): void {
    this.questionRetrievalService.getQuestionAnswers(id)
      .subscribe(answers => {
        console.log(answers);
        this.answers = answers;
      });
  }

  private retrieveAcceptedAnswer(id: string): void {
    this.answers.forEach(function(answer) {
      if(answer.id === id){
        this.acceptedAnswer = answer;
        console.log(this.acceptedAnswer);
        return;
      }
    });
  }
}
