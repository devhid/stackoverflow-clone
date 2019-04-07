import { Component, OnInit } from '@angular/core';

import { User } from '../user';

const url = "8.9.11.218/search";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  user = new User('a', 'b', 'c');
  
  constructor() { }

  ngOnInit() {
  }

  onSubmit() {
    console.log(this.user.username);
    console.log(this.user.email);
    console.log(this.user.password);
  }

}
