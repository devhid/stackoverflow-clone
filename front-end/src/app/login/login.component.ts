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
  user = new User(null, null, null, null);
  
  constructor(
    private loginService: LoginService
  ) { }

  ngOnInit() {
  }

  onSubmit() {
    this.loginService.login(this.user.username, this.user.password)
    .subscribe(response => {
      console.log(response.headers.get('set-cookie'));
      console.log(response);
    });
  }

}
