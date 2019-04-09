import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';

import { RetrievalService } from '../services/retrieval.service';
import { TransferService } from '../services/transfer.service';
import { Question } from '../classes/question';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  searchedQuestions: Question[] = [];
  searchForm = new FormGroup({
    query: new FormControl('')
  });

  constructor(
    public retrievalService: RetrievalService,
    public transferService: TransferService,
    public router: Router
  ) { }

  ngOnInit() {
  }

  searchSubmit(): void {
    /*let query = this.searchForm.value.query;
    this.retrievalService.searchQuestions(query)
      .subscribe(response => {
        this.searchQuestions = response;
      })*/
    let query = this.searchForm.value.query;
    this.transferService.setData(query);
    this.router.navigateByUrl('/search', {skipLocationChange: true}).then(()=>
    this.router.navigate(['/'])); 
  }
}
