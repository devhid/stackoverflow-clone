import { Component, OnInit } from '@angular/core';

import { Observable } from 'rxjs';
import { RetrievalService } from '../services/retrieval.service';
import { TransferService } from '../services/transfer.service';
import { Question } from '../classes/question';
import { map } from 'rxjs/operators';

import { MediaService } from '../services/media.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  questions: Question[] = [];

  constructor(
    public retrievalService: RetrievalService,
    public transferService: TransferService,
    public mediaService: MediaService
  ) { }

  image = null;

  ngOnInit() {
    this.questions = [];
    let query = this.transferService.getData();
    console.log("query: " + query);
    this.searchQuestions(query);
    //this.image = this.retrieveMedia('4c62f59b-4db6-44e9-85d5-b8fb4f5230d6');
  }

  private retrieveMedia(id: string) {
    this.mediaService.retrieveMedia(id)
    .subscribe(response => {
      console.log(response);
    });
  }

  private searchQuestions(query: string): void {
    this.retrievalService.searchQuestions(query)
      .subscribe(response => {
        console.log(response);
        this.questions = response;
      })
  }
}
