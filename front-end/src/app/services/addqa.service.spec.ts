import { TestBed } from '@angular/core/testing';

import { AddqaService } from './addqa.service';

describe('AddqaService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AddqaService = TestBed.get(AddqaService);
    expect(service).toBeTruthy();
  });
});
