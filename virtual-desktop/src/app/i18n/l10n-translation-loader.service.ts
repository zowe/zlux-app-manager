import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { L10nTranslationLoader, L10nProvider } from 'angular-l10n';
import { catchError, map, Observable, of } from 'rxjs';

export type KeyValue = { [key: string]: any };

@Injectable()
export class L10nTranslationLoaderService implements L10nTranslationLoader {

  constructor(private http: HttpClient) {
    console.log(`translation loader created`);
  }

  public get(composedLanguage: string, provider: L10nProvider): Observable<KeyValue> {
    if (provider.asset) {
      return of(provider.asset[composedLanguage]);
    }
    const plugin: ZLUX.Plugin = provider.options.plugin;
    return this.loadAssetsForPlugin(composedLanguage, plugin).pipe(map(result => result[composedLanguage]));
  }

  public loadAssetsForPlugin(composedLanguage: string, plugin: ZLUX.Plugin): Observable<{[language: string]: KeyValue}> {
    console.log(`loadAssetsForPlugin composedLanguage ${composedLanguage}`);
    const asset = `assets/i18n/messages`;
    const prefix = ZoweZLUX.uriBroker.pluginResourceUri(plugin, asset);
    const [language, _locale] = composedLanguage.split('-');
    const composedLanguageUrl = `${prefix}.${composedLanguage}.json`;
    const languageUrl = `${prefix}.${language}.json`;
    const fallbackUrl = `${prefix}.en.json`;

    return this.load(composedLanguageUrl).pipe(
      catchError(_err => this.load(languageUrl)),
      catchError(_err => this.load(fallbackUrl)),
      catchError(_err => of({})),
      map(assets => ( {[composedLanguage]: assets} ))
    );

  }
  private load(url: string): Observable<{ [key: string]: any }> {
    return this.http.get(url);
  }
}

