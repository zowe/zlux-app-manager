import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { L10nTranslationLoader, L10nProvider } from 'angular-l10n';
import { catchError, Observable, of } from 'rxjs';

export type KeyValue = { [key: string]: any };

@Injectable()
export class L10nTranslationLoaderService implements L10nTranslationLoader {

  constructor(private http: HttpClient) {
    console.log(`translation loader created`);
  }

  public get(composedLanguage: string, provider: L10nProvider): Observable<KeyValue> {
    const [language, _locale] = composedLanguage.split('-');
    const composedLanguageUrl = `${provider.asset}.${composedLanguage}.json`;
    const languageUrl = `${provider.asset}.${language}.json`;
    const fallbackUrl = `${provider.asset}.en.json`;

    return this.load(composedLanguageUrl).pipe(
      catchError(_err => this.load(languageUrl)),
      catchError(_err => this.load(fallbackUrl)),
      catchError(_err => of({}))
    );
  }

  private load(url: string): Observable<{ [key: string]: any }> {
    return this.http.get(url);
  }
}

