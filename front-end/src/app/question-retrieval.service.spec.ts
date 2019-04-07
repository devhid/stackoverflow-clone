import { TestBed } from '@angular/core/testing';

import { QuestionRetrievalService } from './question-retrieval.service';

describe('QuestionRetrievalService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: QuestionRetrievalService = TestBed.get(QuestionRetrievalService);
    expect(service).toBeTruthy();
  });
});
