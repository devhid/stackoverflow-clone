import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';

import { RetrievalService } from '../services/retrieval.service';
import { QAService } from '../services/qa.service';
import { Question } from '../classes/question';
import { Answer, Answers } from '../classes/answer';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})
export class QuestionComponent implements OnInit {

  question: Question = new Question("", "", 0, "", "", 0, 0, 0, 0, [], [], "");
  answers: Answer[] = [];
  acceptedAnswer: Answer; //= new Answer("", "", "", 0, false, 0, []);

  newAnswerForm = new FormGroup({
    body: new FormControl(''),
  });

  constructor(
    private retrievalService: RetrievalService,
    private qaService: QAService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    let id = this.retrieveId();
    this.retrieveQuestion(id)
    .subscribe((question: Question) => {
      console.log(question);
      this.question = question;
      this.retrieveAnswers(id)
      .subscribe(answers => {
        this.answers = answers.sort(function(a,b){ return a.timestamp - b.timestamp });
        console.log(answers);
        if(this.question.accepted_answer_id) {
          //console.log(this.question)
          this.retrieveAcceptedAnswer(this.question.accepted_answer_id);
          console.log(this.acceptedAnswer);
        }
      });
    });
  }

  private retrieveId(): string{
    return this.route.snapshot.paramMap.get('id');
  }

  private retrieveQuestion(id: string) {
    return this.retrievalService.getQuestion(id)
    /*.subscribe((question: Question) => {
      console.log(question);
      this.question = question;
    });*/
  }

  private retrieveAnswers(id: string) {
    return this.retrievalService.getQuestionAnswers(id)
    /*.subscribe(answers => {
      console.log(answers);
      this.answers = answers;
    });*/
  }

  private retrieveAcceptedAnswer(id: string) {
    this.answers.forEach((answer: Answer) => {
      console.log(answer);
      if(answer.id === id){
        this.acceptedAnswer = answer;
        console.log(this.acceptedAnswer);
        return;
      }
    });
  }

  addAnswerSubmit(): void {
    let body = this.newAnswerForm.value.body;
    let questionId = this.retrieveId();
    console.log(body);
    this.qaService.addAnswer(questionId, this.newAnswerForm.value.body)
    .subscribe(response => {
      console.log(response);
      this.router.navigateByUrl('/', {skipLocationChange: true}).then(()=>
      this.router.navigate(['/question/' + questionId])); 
    });
  }

  deleteQuestion(): void {
    let id = this.retrieveId();
    this.qaService.deleteQuestion(id)
    .subscribe(response =>{
      console.log(response);
    });
  }

  upvoteQuestion(): void {
    let id = this.retrieveId();
    this.qaService.upvoteQuestion(id, true)
    .subscribe(response => {
      console.log(response);
      let status = response.body.status;
      if(status == 'OK') {
        this.question.score++;
      }
    });
  }

  downvoteQuestion(): void {
    let id = this.retrieveId();
    this.qaService.upvoteQuestion(id, false)
    .subscribe(response => {
      console.log(response);
      let status = response.body.status;
      if(status == 'OK') {
        this.question.score--;
      }
    });
  }

  upvoteAnswer(id: string): void {
    this.qaService.upvoteAnswer(id, true)
    .subscribe(response => {
      console.log(response);
      let status = response.body.status;
      if(status === 'OK') {
        for(let i in this.answers){
          let answer = this.answers[i];
          if(answer.id === id){
            answer.score++;
          }
        }
      }
    });
  }

  downvoteAnswer(id: string): void {
    this.qaService.upvoteAnswer(id, false)
    .subscribe(response => {
      console.log(response);
      let status = response.body.status;
      if(status === 'OK') {
        for(let i in this.answers){
          let answer = this.answers[i];
          if(answer.id === id){
            answer.score--;
          }
        }
      }
    });
  }

  acceptAnswer(id: string): void {
    this.qaService.acceptAnswer(id)
    .subscribe(response => {
      console.log(response);
      let status = response.status;
      if(status === 'OK') {
        let questionId = this.retrieveId();
        this.router.navigateByUrl('/', {skipLocationChange: true}).then(()=>
        this.router.navigate(['/question/' + questionId])); 
      }
    });
  }
}
