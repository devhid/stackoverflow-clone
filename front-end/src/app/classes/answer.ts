import { Injectable } from '@angular/core';

export class Answer {
    constructor(
        public id: string,
        public username: string,
        public body: string,
        public score: number,
        public is_accepted: boolean,
        public timestamp: number,
        public media: Array<number>, //M3
    ) { }
}

export class Answers {
    constructor(
        public answers: Array<Answer>
    ) { }
}

@Injectable({
    providedIn: 'root'
})

export class AnswerAdapter {
    adapt(item: any): Answer {
        return new Answer(
            item.id,
            item.username,
            item.body,
            item.score,
            item.is_accepted,
            item.question.timestamp,
            item.question.media,
        )
    }
}