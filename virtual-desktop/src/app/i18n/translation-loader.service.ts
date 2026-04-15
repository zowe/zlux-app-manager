/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import {
  Injectable,
  LOCALE_ID,
  StaticProvider,
  TRANSLATIONS,
  TRANSLATIONS_FORMAT,
} from '@angular/core';
import { loadTranslations } from '@angular/localize';
import { from, lastValueFrom, Observable, throwError } from 'rxjs';
import { LanguageLocaleService } from './language-locale.service';
import { BaseLogger } from 'virtual-desktop-logger';
import { catchError } from 'rxjs/operators';

@Injectable()
export class TranslationLoaderService {
  private readonly logger: ZLUX.ComponentLogger = BaseLogger;

  constructor(
    private languageLocaleService: LanguageLocaleService
  ) {
  }

  getTranslationProviders(plugin: ZLUX.Plugin): Promise<StaticProvider[]> {
    // Get the language id from the global
    // According to Mozilla.org this will work well enough for the
    // browsers we support (Chrome, Firefox, Edge, Safari)
    // https://developer.mozilla.org/en-US/docs/Web/API/NavigatorLanguage/language
    // NOTES:
    // 1. The desktop can override the browser language and locale preferences (see https://github.com/zowe/zlux-app-manager/issues/10),
    //    so we don't just use the navigator language, but go through a "globalization" interface here.
    // 2. Per the design of the above implementation (https://github.com/zowe/zlux-app-manager/pull/21), "true locale" can be separate
    //    from language.
    //    That pull request takes into account the subtleties about "locale" as discussed here:
    //    https://www.w3.org/International/questions/qa-accept-lang-locales
    //
    // SUMMARY: The one part ('en') or two part ('en-US') language is treated *here* as *just language*, Maybe a specific sub language
    //          e.g., en-GB has different spellings, so the "language" aspect of the second part can be important in choosing a template,
    //          separate from implications for currency and decimal separator.
    // MERGE QUESTION: should be put this in polyfills? abstract it somewhere? etc.?
    const language: string = this.languageLocaleService.getLanguage();
    // return no providers if fail to get translation file for language
    const noProviders: StaticProvider[] = [];
    // No language or U.S. English: no translation providers
    if (this.languageLocaleService.isConfiguredForDefaultLanguage()) {
      return Promise.resolve(noProviders);
    }
    const baseLanguage = this.languageLocaleService.getBaseLanguage();
    // ex.: messages.es-ES.xlf
    const translationFileURL = this.getTranslationFileURL(plugin, language);
    // ex.: messages.es.xlf
    const fallbackTranslationFileURL = baseLanguage !== language ? this.getTranslationFileURL(plugin, baseLanguage) : null;
    let currentTranslationFileURL = translationFileURL;
    return lastValueFrom(this.fetchTranslations(currentTranslationFileURL).pipe(
      catchError(err => {
        if (fallbackTranslationFileURL != null) {
          this.logger.warn("ZWED5170W", translationFileURL, fallbackTranslationFileURL); //this.logger.warn(`Failed to load language file ${translationFileURL}, using ${fallbackTranslationFileURL}.`);
          currentTranslationFileURL = fallbackTranslationFileURL;
          return this.fetchTranslations(currentTranslationFileURL);
        }
        return throwError(err);
      })))
      .then((translations: string) => {
        // Parse XLF and register with $localize for AOT-compiled plugin templates
        this.registerXlfWithLocalize(translations);
        return [
          { provide: TRANSLATIONS, useValue: translations },
          { provide: TRANSLATIONS_FORMAT, useValue: 'xlf' },
          { provide: LOCALE_ID, useValue: language }
        ];
      })
      .catch(() => {
        this.logger.warn("ZWED5171W", currentTranslationFileURL); //this.logger.warn(`Failed to load language file ${currentTranslationFileURL}, using no translation files.`);
          return noProviders;
      });
  }

  /**
   * Parse XLF content and register translations with $localize for AOT-compiled templates.
   * loadTranslations() from @angular/localize is additive in Angular 18+ —
   * it merges into existing $localize.TRANSLATIONS without clearing,
   * so each plugin's translations accumulate safely.
   */
  private registerXlfWithLocalize(xlf: string): void {
    try {
      const parsed = this.parseXlf(xlf);
      const count = Object.keys(parsed).length;
      if (count > 0) {
        loadTranslations(parsed);
        this.logger.debug(`Registered ${count} $localize translation(s) from XLF`);
      }
    } catch (e) {
      this.logger.warn(`Failed to parse XLF for $localize registration`, e);
    }
  }

  /**
   * Parse XLIFF 1.2 content into a Record<string, string> map
   * suitable for @angular/localize's loadTranslations().
   * Keys are trans-unit IDs (matching @@customId from i18n attributes),
   * values are translation strings with {$PLACEHOLDER} interpolation syntax.
   */
  private parseXlf(xlf: string): Record<string, string> {
    const translations: Record<string, string> = {};
    const parser = new DOMParser();
    const doc = parser.parseFromString(xlf, 'text/xml');
    const transUnits = doc.getElementsByTagName('trans-unit');
    for (let i = 0; i < transUnits.length; i++) {
      const unit = transUnits[i];
      const id = unit.getAttribute('id');
      const target = unit.getElementsByTagName('target')[0];
      if (id && target) {
        translations[id] = this.serializeTargetContent(target);
      }
    }
    return translations;
  }

  /**
   * Serialize the content of a <target> element, converting XLIFF
   * placeholder elements (<x id="..."/>) into $localize-compatible
   * {$PLACEHOLDER_NAME} format.
   */
  private serializeTargetContent(targetEl: Element): string {
    let result = '';
    for (let i = 0; i < targetEl.childNodes.length; i++) {
      const node = targetEl.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.tagName === 'x' || el.tagName === 'X') {
          const phId = el.getAttribute('id');
          if (phId) {
            result += `{$${phId}}`;
          }
        }
      }
    }
    return result;
  }

  private fetchTranslations(fileURL: string): Observable<string> {
    return from(window.fetch(fileURL).then(res => {
      if (res.ok) {
        return res.text();
      }
      throw new Error(`${res.status} ${res.statusText}`);
    }));
  }

  private getTranslationFileURL(plugin: ZLUX.Plugin, language: string): string {
    return ZoweZLUX.uriBroker.pluginResourceUri(plugin, `assets/i18n/messages.${language}.xlf`);
  }

}


/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/