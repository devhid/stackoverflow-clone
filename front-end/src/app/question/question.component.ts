import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';

import { map } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { RetrievalService } from '../services/retrieval.service';
import { QAService } from '../services/qa.service';
import { MediaService } from '../services/media.service';
import { Question } from '../classes/question';
import { Answer, Answers } from '../classes/answer';

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

  answerFiles: File[] = [];

  constructor(
    private retrievalService: RetrievalService,
    private qaService: QAService,
    private mediaService: MediaService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    let id = this.retrieveId();
    this.retrieveQuestion(id)
    .subscribe((question: Question) => {
      console.log(question);
      this.question = question;
      // Retrieve answers
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
    return this.retrievalService.getQuestion(id);
  }

  private retrieveAnswers(id: string) {
    return this.retrievalService.getQuestionAnswers(id);
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
    
    // Upload media
    if(this.answerFiles.length !== 0) {
      let arr = [];
      for(let file of this.answerFiles){
        console.log(file)
        arr.push(this.mediaService.upload(file));
      }

      forkJoin(arr)
        .subscribe(responses => {
          let mediaIds = [];
          for(let response of responses) {
            mediaIds.push(response.id);
          }
          this.qaService.addAnswer(questionId, this.newAnswerForm.value.body, mediaIds)
            .subscribe(response => {
              console.log(response);
              this.router.navigateByUrl('/', {skipLocationChange: true}).then(()=>
              this.router.navigate(['/question/' + questionId])); 
            });
        });
    } else {
      this.qaService.addAnswer(questionId, this.newAnswerForm.value.body, [])
        .subscribe(response => {
          console.log(response);
          this.router.navigateByUrl('/', {skipLocationChange: true}).then(()=>
          this.router.navigate(['/question/' + questionId])); 
        });
    }
  }

  deleteQuestion(): void {
    let id = this.retrieveId();
    this.qaService.deleteQuestion(id)
    .subscribe(response =>{
      console.log(response);
      let status = response.status;
      if(status == 'OK') {
        setTimeout(() => { this.router.navigate(['/']) }, 1000);
      }
    });
  }

  upvoteQuestion(): void {
    let id = this.retrieveId();
    this.qaService.upvoteQuestion(id, true)
    .subscribe(response => {
      let status = response.status;
      if(status == 'OK') {
        let questionId = this.retrieveId();
        this.router.navigateByUrl('/', {skipLocationChange: true}).then(()=>
        this.router.navigate(['/question/' + questionId])); 
      }
    });
  }

  downvoteQuestion(): void {
    let id = this.retrieveId();
    this.qaService.upvoteQuestion(id, false)
    .subscribe(response => {
      console.log(response);
      let status = response.status;
      if(status == 'OK') {
        let questionId = this.retrieveId();
        this.router.navigateByUrl('/', {skipLocationChange: true}).then(()=>
        this.router.navigate(['/question/' + questionId])); 
      }
    });
  }

  upvoteAnswer(id: string): void {
    this.qaService.upvoteAnswer(id, true)
    .subscribe(response => {
      let status = response.status;
      if(status === 'OK') {
        for(let i in this.answers){
          let answer = this.answers[i];
          if(answer.id === id){
            let questionId = this.retrieveId();
            this.router.navigateByUrl('/', {skipLocationChange: true}).then(()=>
            this.router.navigate(['/question/' + questionId])); 
          }
        }
      }
    });
  }

  downvoteAnswer(id: string): void {
    this.qaService.upvoteAnswer(id, false)
    .subscribe(response => {
      let status = response.status;
      if(status === 'OK') {
        for(let i in this.answers){
          let answer = this.answers[i];
          if(answer.id === id){
            let questionId = this.retrieveId();
            this.router.navigateByUrl('/', {skipLocationChange: true}).then(()=>
            this.router.navigate(['/question/' + questionId])); 
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

  onFileChange(event) {
    console.log(event);
    let numFiles = event.target.files.length;
    if(numFiles > 0) {
      this.answerFiles = [];
      for(let i = 0; i < numFiles; i++) {
        let file = event.target.files[i];
        this.answerFiles.push(file);
      }
    }
  }
}
