import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { Observable, forkJoin } from 'rxjs';
import { QAService } from '../services/qa.service';
import { MediaService } from '../services/media.service';
import { FileUploader, FileSelectDirective } from 'ng2-file-upload/ng2-file-upload';

@Component({
  selector: 'app-askquestion',
  templateUrl: './askquestion.component.html',
  styleUrls: ['./askquestion.component.css']
})
export class AskQuestionComponent implements OnInit {

  newQuestionForm = new FormGroup({
    title: new FormControl(''),
    body: new FormControl(''),
    tags: new FormControl(''),
  });

  files: File[] = [];

  constructor(
    private qaService : QAService,
    private mediaService: MediaService,
    private router: Router,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
  }

  async askQuestionSubmit() {
    let tags = this.newQuestionForm.value.tags.split(" ");

    let arr = [];
    for(let file of this.files){
      console.log(file)
      arr.push(this.mediaService.upload(file));
    }

    forkJoin(arr)
      .subscribe(responses => {
        let mediaIds = [];
        for(let response of responses) {
          mediaIds.push(response.id);
        }
        this.qaService.addQuestion(this.newQuestionForm.value.title, this.newQuestionForm.value.body, tags, mediaIds)
          .subscribe(async response => {
            console.log(response);
          });
      });
  }

  onFileChange(event) {
    console.log(event);
    let numFiles = event.target.files.length;
    if(numFiles > 0) {
      this.files = [];
      for(let i = 0; i < numFiles; i++) {
        let file = event.target.files[i];
        this.files.push(file);
      }
    }
  }
}
