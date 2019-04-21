import { TestBed } from '@angular/core/testing';

import { RetrievalService } from './retrieval.service';

describe('QuestionRetrievalService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: RetrievalService = TestBed.get(RetrievalService);
    expect(service).toBeTruthy();
  });
});
