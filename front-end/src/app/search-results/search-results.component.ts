import { Component, OnInit } from '@angular/core';

import { Observable } from 'rxjs';
import { RetrievalService } from '../services/retrieval.service';
import { TransferService } from '../services/transfer.service';
import { Question } from '../classes/question';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.css']
})
export class SearchResultsComponent implements OnInit {
  questions: Question[] = [];

  constructor(
    public retrievalService: RetrievalService,
    public transferService: TransferService
  ) { }

  ngOnInit() {
    let query = this.transferService.getData();
    console.log(query);
    this.searchQuestions(query);
  }

  private searchQuestions(query: string): void {
    this.retrievalService.searchQuestions(query)
      .subscribe(response => {
        console.log(response);
        this.questions = response;
        
      })
  }
}