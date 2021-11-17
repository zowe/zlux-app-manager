import { L10nTranslationLoader, L10nTranslationService } from "angular-l10n";

export function l10nPreload(translation: L10nTranslationService, translationLoader: L10nTranslationLoader): () => Promise<void> {
    return () => new Promise((resolve) => {
        translationLoader.get('ru-RU', { name: 'app', asset: './assets/i18n/app', options: { version: '1.0.0' } })
            .subscribe({
                next: (data: any) => translation.addData(data, 'ru-RU'),
                complete: () => {
                  translation.setLocale({language: 'ru-RU'});
                  resolve()
                }
            });
    });
}
