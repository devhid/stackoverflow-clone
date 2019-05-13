import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';

import { UserService } from '../services/user.service';
import { User } from '../classes/user';
import { Question } from '../classes/question';
import { Answer } from '../classes/answer';
import { RetrievalService } from '../services/retrieval.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  userInformation: User;
  userQuestions: Question[] = [];
  userAnswers: Answer[] = [];

  constructor(
    private userService: UserService,
    private retrievalService: RetrievalService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    let username = this.retrieveUsername();
    console.log(username);
    this.retrieveProfile(username);
    this.retrieveQuestions(username);
    this.retrieveAnswers(username);
    console.log(this.userInformation);
    console.log(this.userQuestions);
    console.log(this.userAnswers);
  }

  private retrieveUsername(): string {
    return this.route.snapshot.paramMap.get('username');
  }

  // Retrieve user profile
  private retrieveProfile(username: string) {
    this.userService.retrieveUserInfo(username)
    .subscribe((profile: User) => {
      this.userInformation = profile;
      this.userInformation.username = username;
    });
  }

  // Retrieve user questions 
  private async retrieveQuestions(username: string) {
    let questionIds =  await this.retrieveQuestionIds(username);
    console.log(questionIds);
    for(var id in questionIds) {
      await this.retrieveQuestion(questionIds[id]);
    }
  }

  private retrieveQuestion(id: string): void {
    this.retrievalService.getQuestion(id)
    .subscribe((question: Question) => {
      this.userQuestions.push(question);
    });
  }

  private retrieveQuestionIds(username: string): Promise<any> {
    return new Promise(resolve => {
      this.userService.retrieveUserQuestions(username)
      .subscribe(questions => {
        //console.log(questions);
        resolve(questions);
      });
    });
  }

  // Retrieve user answers
  private async retrieveAnswers(username: string) {
    let answerIds =  await this.retrieveAnswerIds(username);
    console.log(answerIds);
    for(var id in answerIds) {
      this.userAnswers.push(new Answer(answerIds[id], null, null, null, null, null, null));
    }
  }

  private retrieveAnswer(id: string): void {
    this.retrievalService.getAnswer(id)
    .subscribe((answer: Answer) => {
      this.userAnswers.push(answer);
    });
  }

  private retrieveAnswerIds(username: string): Promise<any> {
    return new Promise(resolve => {
      this.userService.retrieveUserAnswers(username)
      .subscribe(answers => {
        resolve(answers);
      });
    });
  }

  

}
