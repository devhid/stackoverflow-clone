import { Component, OnInit } from '@angular/core';

import { User } from '../user';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  user = new User('', '', '');

  constructor() { }

  ngOnInit() {
  }

  onSubmit() {
    console.log(this.user.username);
    console.log(this.user.email);
    console.log(this.user.password);
  }
}
