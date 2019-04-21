import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';

import { User } from '../classes/user';
import { RegisterService } from '../services/register.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  user = new User(null, null, null, null);

  verificationForm = new FormGroup({
    email: new FormControl(''),
    key: new FormControl(''),
  });

  constructor(
    private registerService: RegisterService
  ) { }

  ngOnInit() {
  }

  onRegisterSubmit() {
    console.log(this.user.username);
    console.log(this.user.email);
    console.log(this.user.password);
    this.registerService.registerAccount(this.user.username, this.user.email, this.user.password)
    .subscribe(response => {
      console.log(response);
    });
  }

  onVerifySubmit() {
    console.log(this.verificationForm.value.email)
    console.log(this.verificationForm.value.key);
    this.registerService.verifyAccount(this.verificationForm.value.email, this.verificationForm.value.key)
    .subscribe(response => {
      console.log(response);
    });
  }
}
