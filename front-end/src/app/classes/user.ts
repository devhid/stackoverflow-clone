import { Injectable } from '@angular/core';

export class User {
    constructor(
        public username: string,
        public email: string,
        public password: string,
        public reputation: number
    ) { }
}

@Injectable({
    providedIn: 'root'
})

export class UserAdapter {
    adapt(item: any): User {
        return new User(
            item.username,
            item.email,
            item.password,
            item.reputation
        )
    }
}
