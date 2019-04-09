import { Question } from './question';

describe('Question', () => {
  it('should create an instance', () => {
    expect(new Question(null, null, null, null, null, null, null, null, null, null, null, null)).toBeTruthy();
  });
});
