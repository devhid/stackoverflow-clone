import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';

import { QAService } from '../services/qa.service';

@Component({
  selector: 'app-askquestion',
  templateUrl: './askquestion.component.html',
  styleUrls: ['./askquestion.component.css']
})
export class AskQuestionComponent implements OnInit {

  newQuestionForm = new FormGroup({
    title: new FormControl(''),
    body: new FormControl(''),
    tags: new FormControl('')
  });

  constructor(
    private qaService : QAService,
    private router: Router
  ) { }

  ngOnInit() {
  }

  askQuestionSubmit() {
    let tags = this.newQuestionForm.value.tags.split(" ");
    console.log(tags);
    this.qaService.addQuestion(this.newQuestionForm.value.title, this.newQuestionForm.value.body, tags)
    .subscribe(response => {
      console.log(response);
      this.router.navigate(['/']); 
    });
  }
}
