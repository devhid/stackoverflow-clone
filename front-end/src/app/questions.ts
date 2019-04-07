import { Injectable } from '@angular/core';

import { Question } from './question';

export class Questions {
    constructor(
        public questions: Array<Question>
    ) { }
}

@Injectable({
    providedIn: 'root'
})

export class QuestionsAdapter {
    adapt(item: any): Questions{
        return new Questions(
            item.questions
        )
    }
}