import { Injectable } from '@angular/core';

export class Question {
    constructor(
        public id: string,
        public username: string,
        public user_reputation: number,
        public title: string,
        public body: string,
        public score: number,
        public view_count: number,
        public answer_count: number,
        public timestamp: number,
        public media: Array<number>, //M3
        public tags: Array<number>, //M3
        public accepted_answer_id: string
    ) { }
}

export class Questions {
    constructor(
        public questions: Array<Question>
    ) { }
}

@Injectable({
    providedIn: 'root'
})

export class QuestionAdapter {
    adapt(item: any): Question {
        return new Question(
            item.question.id,
            item.question.user.username,
            item.question.user.reputation,
            item.question.title,
            item.question.body,
            item.question.score,
            item.question.view_count,
            item.question.answer_count,
            item.question.timestamp,
            item.question.media,
            item.question.tags,
            item.question.accepted_answer_id,
        )
    }
}

export class QuestionsAdapter {
    adapt(item: any): Questions{
        return new Questions(
            item.questions
        )
    }
}