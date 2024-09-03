import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { L10nTranslationLoader, L10nProvider } from 'angular-l10n';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type KeyValue = { [key: string]: any };

@Injectable()
export class L10nTranslationLoaderService implements L10nTranslationLoader {

  constructor(private http: HttpClient) {
  }

  public get(composedLanguage: string, provider: L10nProvider): Observable<KeyValue> {
    const plugin: ZLUX.Plugin | undefined = provider.options?.plugin;
    if (!plugin) {
      return of({});
    }
    const asset = `assets/i18n/messages`;
    const prefix = ZoweZLUX.uriBroker.pluginResourceUri(plugin, asset);
    const [language, _locale] = composedLanguage.split('-');
    const composedLanguageUrl = `${prefix}.${composedLanguage}.json`;
    const languageUrl = `${prefix}.${language}.json`;
    const fallbackUrl = `${prefix}.en.json`;

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

