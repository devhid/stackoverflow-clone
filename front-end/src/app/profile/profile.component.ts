import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { UserService } from '../user.service';
import { User } from '../user';
import { Question } from '../question';
import { Answer } from '../answer';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  userInformation: User;
  userQuestions: Question[];
  userAnswers: Answer[];

  constructor(
    private userService: UserService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    let username = this.retrieveUsername();
    this.retrieveProfile(username);
    console.log(this.userInformation);
    //this.retrieveQuestions(username);
    //this.retrieveAnswers(username);
  }

  private retrieveUsername(): string {
    return this.route.snapshot.paramMap.get('username');
  }

  private retrieveProfile(username: string): void {
    this.userService.retrieveUserInfo(username)
      .subscribe((profile: User) => {
        this.userInformation = profile;
      });
  }

  private retrieveQuestions(username: string): void {
    this.userService.retrieveUserQuestions(username)
      .subscribe(questions => {
        this.userQuestions = questions;
      });
  }

  private retrieveAnswers(username: string): void {
    this.userService.retrieveUserAnswers(username)
      .subscribe(answers => {
        this.userAnswers = answers;
      });
  }

}
