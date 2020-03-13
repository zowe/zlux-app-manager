import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class NavigationService {

  readonly startPage = 'https://zowe.org';
  urlSubject = new BehaviorSubject<string>(this.startPage);
  history: string[] = [];

  constructor() { }

  navigate(url: string): void {
    this.history.push(url);
    this.urlSubject.next(url);
  }
}
