import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { QAService } from '../services/qa.service';
import { MediaService } from '../services/media.service';
import { FileUploader, FileSelectDirective } from 'ng2-file-upload/ng2-file-upload';
import 'rxjs/add/observable/forkJoin';

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

  askQuestionSubmit() {
    let tags = this.newQuestionForm.value.tags.split(" ");

    let fileIds = [];
    //console.log(this.files);

    let observables: Observable<any>[] = [];

    for(let file of this.files){
      //console.log(file)
      observables.push(this.mediaService.upload(file));
    }

    Observable.forkJoin(observables)
    .subscribe(dataArray => {
        // All observables in `observables` array have resolved and `dataArray` is an array of result of each observable
    });
    
    /*this.qaService.addQuestion(this.newQuestionForm.value.title, this.newQuestionForm.value.body, tags)
    .subscribe(response => {
      console.log(response);
      
      //this.router.navigate(['/']); 
    });*/
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
