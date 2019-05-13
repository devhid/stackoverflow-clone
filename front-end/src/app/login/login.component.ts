import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { HttpResponse, HttpErrorResponse } from '@angular/common/http';

import { User } from '../classes/user';
import { LoginService } from '../services/login.service';

const url = "8.9.11.218/search";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm = new FormGroup({
    username: new FormControl(''),
    password: new FormControl(''),
  });

  results = "";
  
  constructor(
    private loginService: LoginService
  ) { }

  ngOnInit() {
  }

  onSubmit() {
    let username = this.loginForm.value.username;
    let password = this.loginForm.value.password;
    console.log(username);
    console.log(password);
    this.loginService.login(username, password)
    .subscribe((response: HttpResponse<any>) => {
      //console.log(response.headers.get('set-cookie'));
      console.log(response.body);
      this.results = "Successfully logged in."
    },
    (err: HttpErrorResponse) => {
      console.log(err);
      this.results = err.error.error;
    });
  }

  logoutClick() {
    this.loginService.logout()
    .subscribe(response => {
      console.log(response);
      this.results = "Successfully logged out."
    },
    (err: HttpErrorResponse) => {
      console.log(err);
      this.results = err.error.error;
    });
  }
}
