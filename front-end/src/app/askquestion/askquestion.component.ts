import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';

import { AddqaService } from '../services/addqa.service';

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
    private addqaService : AddqaService
  ) { }

  ngOnInit() {
  }

  askQuestionSubmit() {
    let tags = this.newQuestionForm.value.tags.split(" ");
    console.log(tags);
    this.addqaService.addQuestion(this.newQuestionForm.value.title, this.newQuestionForm.value.body, tags)
    .subscribe(response => {
      console.log(response);
    });
  }
}
