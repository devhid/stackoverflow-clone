import { Component, OnInit } from '@angular/core';

import { User } from '../user';
import { LoginService } from '../login.service';

const url = "8.9.11.218/search";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  user = new User('a', 'b', 'c');
  
  constructor(
    private loginService: LoginService
  ) { }

  ngOnInit() {
  }

  onSubmit() {
    console.log(this.user.username);
    console.log(this.user.email);
    console.log(this.user.password);
    this.loginService.login(this.user.email, this.user.password)
    .subscribe(response => {
      console.log(response);
    });
  }

}
