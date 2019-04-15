import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormControl } from '@angular/forms';

import { RetrievalService } from '../services/retrieval.service';
import { AddqaService } from '../services/addqa.service';
import { Question } from '../classes/question';
import { Answer, Answers } from '../classes/answer';
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

  newAnswerForm = new FormGroup({
    body: new FormControl(''),
  });

  constructor(
    private retrievalService: RetrievalService,
    private addqaService: AddqaService,
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
    this.retrievalService.getQuestion(id)
    .subscribe((question: Question) => {
      console.log(question);
      this.question = question;
    });
  }

  private retrieveAnswers(id: string): void {
    this.retrievalService.getQuestionAnswers(id)
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

  addAnswerSubmit(): void {
    let body = this.newAnswerForm.value.body;
    let id = this.retrieveId();
    console.log(body);
    this.addqaService.addAnswer(id, this.newAnswerForm.value.body)
    .subscribe(response => {
      console.log(response);
    });
  }

  deleteQuestion(): void {
    let id = this.retrieveId();
    this.addqaService.deleteQuestion(id)
    .subscribe(response =>{
      console.log(response);
    })
  }
}
