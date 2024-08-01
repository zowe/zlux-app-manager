import {
  NG_VALIDATORS
} from "./chunk-M7DPFLQE.js";
import "./chunk-JQLFQPSZ.js";
import {
  APP_INITIALIZER,
  BehaviorSubject,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  Inject,
  Injectable,
  InjectionToken,
  Input,
  NgModule,
  Pipe,
  Renderer2,
  Subject,
  concat,
  forwardRef,
  inject,
  makeEnvironmentProviders,
  merge,
  of,
  setClassMetadata,
  shareReplay,
  takeUntil,
  throwError,
  ɵɵInheritDefinitionFeature,
  ɵɵNgOnChangesFeature,
  ɵɵProvidersFeature,
  ɵɵdefineDirective,
  ɵɵdefineInjectable,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵdefinePipe,
  ɵɵdirectiveInject,
  ɵɵgetInheritedFactory,
  ɵɵinject
} from "./chunk-CKHXSNZ6.js";
import "./chunk-YBMCURYQ.js";
import {
  __async,
  __objRest,
  __spreadValues
} from "./chunk-CX3I3NQG.js";

// node_modules/angular-l10n/fesm2022/angular-l10n.mjs
var L10N_CONFIG = new InjectionToken("L10N_CONFIG");
var L10N_LOCALE = new InjectionToken("L10N_LOCALE");
function l10nError(type, value) {
  return new Error(`angular-l10n (${type.name}): ${value}`);
}
function validateLanguage(language) {
  const regExp = new RegExp(/^([a-z]{2,3})(\-[A-Z][a-z]{3})?(\-[A-Z]{2})?(-u.+)?$/);
  return regExp.test(language);
}
function formatLanguage(language, format) {
  if (language == null || language === "") return "";
  if (!validateLanguage(language)) throw l10nError(formatLanguage, "Invalid language");
  const [, LANGUAGE = "", SCRIPT = "", REGION = ""] = language.match(/^([a-z]{2,3})(\-[A-Z][a-z]{3})?(\-[A-Z]{2})?/) || [];
  switch (format) {
    case "language":
      return LANGUAGE;
    case "language-script":
      return LANGUAGE + SCRIPT;
    case "language-region":
      return LANGUAGE + REGION;
    case "language-script-region":
      return LANGUAGE + SCRIPT + REGION;
  }
}
function parseLanguage(language) {
  const groups = language.match(/^([a-z]{2,3})(\-([A-Z][a-z]{3}))?(\-([A-Z]{2}))?(-u.+)?$/);
  if (groups == null) throw l10nError(parseLanguage, "Invalid language");
  return {
    language: groups[1],
    script: groups[3],
    region: groups[5],
    extension: groups[6]
  };
}
function getBrowserLanguage(format) {
  let browserLanguage = null;
  if (typeof navigator !== "undefined" && navigator.language) {
    switch (format) {
      case "language-region":
      case "language-script-region":
        browserLanguage = navigator.language;
        break;
      default:
        browserLanguage = navigator.language.split("-")[0];
    }
  }
  return browserLanguage;
}
function getSchema(schema, language, format) {
  const element = schema.find((item) => formatLanguage(item.locale.language, format) === language);
  return element;
}
function getValue(key, data, keySeparator) {
  if (data) {
    if (keySeparator) {
      return key.split(keySeparator).reduce((acc, cur) => (acc && acc[cur]) != null ? acc[cur] : null, data);
    }
    return data[key] != null ? data[key] : null;
  }
  return null;
}
function handleParams(value, params) {
  const replacedValue = value.replace(/{{\s?([^{}\s]*)\s?}}/g, (substring, parsedKey) => {
    const replacer = params[parsedKey];
    return replacer !== void 0 ? replacer : substring;
  });
  return replacedValue;
}
function mergeDeep(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, {
            [key]: source[key]
          });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, {
          [key]: source[key]
        });
      }
    });
  }
  return output;
}
function toNumber(value) {
  const parsedValue = typeof value === "string" && !isNaN(+value - parseFloat(value)) ? +value : value;
  return parsedValue;
}
function toDate(value) {
  if (isDate(value)) {
    return value;
  }
  if (typeof value === "number" && !isNaN(value)) {
    return new Date(value);
  }
  if (typeof value === "string") {
    value = value.trim();
    if (!isNaN(value - parseFloat(value))) {
      return new Date(parseFloat(value));
    }
    if (/^(\d{4}-\d{1,2}-\d{1,2})$/.test(value)) {
      const [y, m, d] = value.split("-").map((val) => +val);
      return new Date(y, m - 1, d);
    }
    const match = value.match(/^(\d{4})-?(\d\d)-?(\d\d)(?:T(\d\d)(?::?(\d\d)(?::?(\d\d)(?:\.(\d+))?)?)?(Z|([+-])(\d\d):?(\d\d))?)?$/);
    if (match) {
      return isoStringToDate(match);
    }
  }
  const date = new Date(value);
  if (!isDate(date)) {
    throw l10nError(toDate, "Invalid date");
  }
  return date;
}
var PARSE_DATE_STYLE = {
  full: {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  },
  long: {
    year: "numeric",
    month: "long",
    day: "numeric"
  },
  medium: {
    year: "numeric",
    month: "short",
    day: "numeric"
  },
  short: {
    year: "2-digit",
    month: "numeric",
    day: "numeric"
  }
};
var PARSE_TIME_STYLE = {
  full: {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "long"
  },
  long: {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short"
  },
  medium: {
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  },
  short: {
    hour: "numeric",
    minute: "numeric"
  }
};
function parseDigits(digits) {
  const groups = digits.match(/^(\d+)?\.((\d+)(\-(\d+))?)?$/);
  if (groups == null) throw l10nError(parseDigits, "Invalid digits");
  return {
    minimumIntegerDigits: groups[1] ? parseInt(groups[1]) : void 0,
    minimumFractionDigits: groups[3] ? parseInt(groups[3]) : void 0,
    maximumFractionDigits: groups[5] ? parseInt(groups[5]) : void 0
  };
}
function isObject(item) {
  return typeof item === "object" && !Array.isArray(item);
}
function isDate(value) {
  return value instanceof Date && !isNaN(value.valueOf());
}
function isoStringToDate(match) {
  const date = /* @__PURE__ */ new Date(0);
  let tzHour = 0;
  let tzMin = 0;
  const dateSetter = match[8] ? date.setUTCFullYear : date.setFullYear;
  const timeSetter = match[8] ? date.setUTCHours : date.setHours;
  if (match[9]) {
    tzHour = Number(match[9] + match[10]);
    tzMin = Number(match[9] + match[11]);
  }
  dateSetter.call(date, Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const h = Number(match[4] || 0) - tzHour;
  const m = Number(match[5] || 0) - tzMin;
  const s = Number(match[6] || 0);
  const ms = Math.round(parseFloat("0." + (match[7] || 0)) * 1e3);
  timeSetter.call(date, h, m, s, ms);
  return date;
}
var _L10nCache = class _L10nCache {
  constructor() {
    this.cache = {};
  }
  read(key, request) {
    if (this.cache[key]) return this.cache[key];
    const response = request.pipe(shareReplay(1));
    this.cache[key] = response;
    return response;
  }
};
_L10nCache.ɵfac = function L10nCache_Factory(t) {
  return new (t || _L10nCache)();
};
_L10nCache.ɵprov = ɵɵdefineInjectable({
  token: _L10nCache,
  factory: _L10nCache.ɵfac
});
var L10nCache = _L10nCache;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nCache, [{
    type: Injectable
  }], null, null);
})();
var _L10nStorage = class _L10nStorage {
};
_L10nStorage.ɵfac = function L10nStorage_Factory(t) {
  return new (t || _L10nStorage)();
};
_L10nStorage.ɵprov = ɵɵdefineInjectable({
  token: _L10nStorage,
  factory: _L10nStorage.ɵfac
});
var L10nStorage = _L10nStorage;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nStorage, [{
    type: Injectable
  }], null, null);
})();
var _L10nDefaultStorage = class _L10nDefaultStorage {
  read() {
    return __async(this, null, function* () {
      return Promise.resolve(null);
    });
  }
  write(locale) {
    return __async(this, null, function* () {
    });
  }
};
_L10nDefaultStorage.ɵfac = function L10nDefaultStorage_Factory(t) {
  return new (t || _L10nDefaultStorage)();
};
_L10nDefaultStorage.ɵprov = ɵɵdefineInjectable({
  token: _L10nDefaultStorage,
  factory: _L10nDefaultStorage.ɵfac
});
var L10nDefaultStorage = _L10nDefaultStorage;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDefaultStorage, [{
    type: Injectable
  }], null, null);
})();
var _L10nLocaleResolver = class _L10nLocaleResolver {
};
_L10nLocaleResolver.ɵfac = function L10nLocaleResolver_Factory(t) {
  return new (t || _L10nLocaleResolver)();
};
_L10nLocaleResolver.ɵprov = ɵɵdefineInjectable({
  token: _L10nLocaleResolver,
  factory: _L10nLocaleResolver.ɵfac
});
var L10nLocaleResolver = _L10nLocaleResolver;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nLocaleResolver, [{
    type: Injectable
  }], null, null);
})();
var _L10nDefaultLocaleResolver = class _L10nDefaultLocaleResolver {
  constructor(config) {
    this.config = config;
  }
  get() {
    return __async(this, null, function* () {
      const browserLanguage = getBrowserLanguage(this.config.format);
      if (browserLanguage) {
        const schema = getSchema(this.config.schema, browserLanguage, this.config.format);
        if (schema) {
          return Promise.resolve(schema.locale);
        }
      }
      return Promise.resolve(null);
    });
  }
};
_L10nDefaultLocaleResolver.ɵfac = function L10nDefaultLocaleResolver_Factory(t) {
  return new (t || _L10nDefaultLocaleResolver)(ɵɵinject(L10N_CONFIG));
};
_L10nDefaultLocaleResolver.ɵprov = ɵɵdefineInjectable({
  token: _L10nDefaultLocaleResolver,
  factory: _L10nDefaultLocaleResolver.ɵfac
});
var L10nDefaultLocaleResolver = _L10nDefaultLocaleResolver;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDefaultLocaleResolver, [{
    type: Injectable
  }], function() {
    return [{
      type: void 0,
      decorators: [{
        type: Inject,
        args: [L10N_CONFIG]
      }]
    }];
  }, null);
})();
var _L10nTranslationLoader = class _L10nTranslationLoader {
};
_L10nTranslationLoader.ɵfac = function L10nTranslationLoader_Factory(t) {
  return new (t || _L10nTranslationLoader)();
};
_L10nTranslationLoader.ɵprov = ɵɵdefineInjectable({
  token: _L10nTranslationLoader,
  factory: _L10nTranslationLoader.ɵfac
});
var L10nTranslationLoader = _L10nTranslationLoader;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nTranslationLoader, [{
    type: Injectable
  }], null, null);
})();
var _L10nDefaultTranslationLoader = class _L10nDefaultTranslationLoader {
  get(language, provider) {
    return provider.asset[language] ? of(provider.asset[language]) : throwError(() => l10nError(_L10nDefaultTranslationLoader, "Asset not found"));
  }
};
_L10nDefaultTranslationLoader.ɵfac = function L10nDefaultTranslationLoader_Factory(t) {
  return new (t || _L10nDefaultTranslationLoader)();
};
_L10nDefaultTranslationLoader.ɵprov = ɵɵdefineInjectable({
  token: _L10nDefaultTranslationLoader,
  factory: _L10nDefaultTranslationLoader.ɵfac
});
var L10nDefaultTranslationLoader = _L10nDefaultTranslationLoader;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDefaultTranslationLoader, [{
    type: Injectable
  }], null, null);
})();
var _L10nTranslationFallback = class _L10nTranslationFallback {
};
_L10nTranslationFallback.ɵfac = function L10nTranslationFallback_Factory(t) {
  return new (t || _L10nTranslationFallback)();
};
_L10nTranslationFallback.ɵprov = ɵɵdefineInjectable({
  token: _L10nTranslationFallback,
  factory: _L10nTranslationFallback.ɵfac
});
var L10nTranslationFallback = _L10nTranslationFallback;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nTranslationFallback, [{
    type: Injectable
  }], null, null);
})();
var _L10nDefaultTranslationFallback = class _L10nDefaultTranslationFallback {
  constructor(config, cache, translationLoader) {
    this.config = config;
    this.cache = cache;
    this.translationLoader = translationLoader;
  }
  /**
   * Translation data will be merged in the following order:
   * 'language'
   * 'language[-script]'
   * 'language[-script][-region]'
   */
  get(language, provider) {
    const loaders = [];
    const keywords = language.match(/-?[a-zA-z]+/g) || [];
    let fallbackLanguage = "";
    for (const keyword of keywords) {
      fallbackLanguage += keyword;
      if (this.config.cache) {
        loaders.push(this.cache.read(`${provider.name}-${fallbackLanguage}`, this.translationLoader.get(fallbackLanguage, provider)));
      } else {
        loaders.push(this.translationLoader.get(fallbackLanguage, provider));
      }
    }
    return loaders;
  }
};
_L10nDefaultTranslationFallback.ɵfac = function L10nDefaultTranslationFallback_Factory(t) {
  return new (t || _L10nDefaultTranslationFallback)(ɵɵinject(L10N_CONFIG), ɵɵinject(L10nCache), ɵɵinject(L10nTranslationLoader));
};
_L10nDefaultTranslationFallback.ɵprov = ɵɵdefineInjectable({
  token: _L10nDefaultTranslationFallback,
  factory: _L10nDefaultTranslationFallback.ɵfac
});
var L10nDefaultTranslationFallback = _L10nDefaultTranslationFallback;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDefaultTranslationFallback, [{
    type: Injectable
  }], function() {
    return [{
      type: void 0,
      decorators: [{
        type: Inject,
        args: [L10N_CONFIG]
      }]
    }, {
      type: L10nCache
    }, {
      type: L10nTranslationLoader
    }];
  }, null);
})();
var _L10nTranslationHandler = class _L10nTranslationHandler {
};
_L10nTranslationHandler.ɵfac = function L10nTranslationHandler_Factory(t) {
  return new (t || _L10nTranslationHandler)();
};
_L10nTranslationHandler.ɵprov = ɵɵdefineInjectable({
  token: _L10nTranslationHandler,
  factory: _L10nTranslationHandler.ɵfac
});
var L10nTranslationHandler = _L10nTranslationHandler;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nTranslationHandler, [{
    type: Injectable
  }], null, null);
})();
var _L10nDefaultTranslationHandler = class _L10nDefaultTranslationHandler {
  parseValue(key, params, value) {
    if (params) return handleParams(value, params);
    return value;
  }
};
_L10nDefaultTranslationHandler.ɵfac = function L10nDefaultTranslationHandler_Factory(t) {
  return new (t || _L10nDefaultTranslationHandler)();
};
_L10nDefaultTranslationHandler.ɵprov = ɵɵdefineInjectable({
  token: _L10nDefaultTranslationHandler,
  factory: _L10nDefaultTranslationHandler.ɵfac
});
var L10nDefaultTranslationHandler = _L10nDefaultTranslationHandler;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDefaultTranslationHandler, [{
    type: Injectable
  }], null, null);
})();
var _L10nMissingTranslationHandler = class _L10nMissingTranslationHandler {
};
_L10nMissingTranslationHandler.ɵfac = function L10nMissingTranslationHandler_Factory(t) {
  return new (t || _L10nMissingTranslationHandler)();
};
_L10nMissingTranslationHandler.ɵprov = ɵɵdefineInjectable({
  token: _L10nMissingTranslationHandler,
  factory: _L10nMissingTranslationHandler.ɵfac
});
var L10nMissingTranslationHandler = _L10nMissingTranslationHandler;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nMissingTranslationHandler, [{
    type: Injectable
  }], null, null);
})();
var _L10nDefaultMissingTranslationHandler = class _L10nDefaultMissingTranslationHandler {
  handle(key, value, params) {
    return key;
  }
};
_L10nDefaultMissingTranslationHandler.ɵfac = function L10nDefaultMissingTranslationHandler_Factory(t) {
  return new (t || _L10nDefaultMissingTranslationHandler)();
};
_L10nDefaultMissingTranslationHandler.ɵprov = ɵɵdefineInjectable({
  token: _L10nDefaultMissingTranslationHandler,
  factory: _L10nDefaultMissingTranslationHandler.ɵfac
});
var L10nDefaultMissingTranslationHandler = _L10nDefaultMissingTranslationHandler;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDefaultMissingTranslationHandler, [{
    type: Injectable
  }], null, null);
})();
var _L10nTranslationService = class _L10nTranslationService {
  constructor(config, locale, cache, storage, resolveLocale, translationFallback, translationLoader, translationHandler, missingTranslationHandler) {
    this.config = config;
    this.locale = locale;
    this.cache = cache;
    this.storage = storage;
    this.resolveLocale = resolveLocale;
    this.translationFallback = translationFallback;
    this.translationLoader = translationLoader;
    this.translationHandler = translationHandler;
    this.missingTranslationHandler = missingTranslationHandler;
    this.data = {};
    this.translation = new BehaviorSubject(this.locale);
    this.error = new BehaviorSubject(null);
  }
  /**
   * Gets the current locale.
   */
  getLocale() {
    return this.locale;
  }
  /**
   * Changes the current locale and load the translation data.
   * @param locale The new locale
   */
  setLocale(locale) {
    return __async(this, null, function* () {
      yield this.loadTranslations(this.config.providers, locale);
    });
  }
  /**
   * Fired every time the translation data has been loaded. Returns the locale.
   */
  onChange() {
    return this.translation.asObservable();
  }
  /**
   * Fired when the translation data could not been loaded. Returns the error.
   */
  onError() {
    return this.error.asObservable();
  }
  /**
   * Translates a key or an array of keys.
   * @param keys The key or an array of keys to be translated
   * @param params Optional parameters contained in the key
   * @param language The current language
   * @return The translated value or an object: {key: value}
   */
  translate(keys, params, language = this.locale.language) {
    language = formatLanguage(language, this.config.format);
    if (Array.isArray(keys)) {
      const data = {};
      for (const key of keys) {
        data[key] = this.translate(key, params, language);
      }
      return data;
    }
    const value = getValue(keys, this.data[language], this.config.keySeparator);
    return value ? this.translationHandler.parseValue(keys, params, value) : this.missingTranslationHandler.handle(keys, value, params);
  }
  /**
   * Checks if a translation exists.
   * @param key The key to be tested
   * @param language The current language
   */
  has(key, language = this.locale.language) {
    language = formatLanguage(language, this.config.format);
    return getValue(key, this.data[language], this.config.keySeparator) !== null;
  }
  /**
   * Gets the language direction.
   */
  getLanguageDirection(language = this.locale.language) {
    const schema = getSchema(this.config.schema, language, this.config.format);
    return schema ? schema.dir : void 0;
  }
  /**
   * Gets available languages.
   */
  getAvailableLanguages() {
    const languages = this.config.schema.map((item) => formatLanguage(item.locale.language, this.config.format));
    return languages;
  }
  /**
   * Initializes the service
   * @param providers An array of L10nProvider
   */
  init() {
    return __async(this, arguments, function* (providers = this.config.providers) {
      let locale = null;
      if (locale == null) {
        locale = yield this.storage.read();
      }
      if (locale == null) {
        locale = yield this.resolveLocale.get();
      }
      if (locale == null) {
        locale = this.config.defaultLocale;
      }
      yield this.loadTranslations(providers, locale);
    });
  }
  /**
   * Can be called at every translation change.
   * @param providers An array of L10nProvider
   * @param locale The current locale
   */
  loadTranslations() {
    return __async(this, arguments, function* (providers = this.config.providers, locale = this.locale) {
      const language = formatLanguage(locale.language, this.config.format);
      return new Promise((resolve) => {
        concat(...this.getTranslation(providers, language)).subscribe({
          next: (data) => this.addData(data, language),
          error: (error) => {
            this.handleError(error);
            resolve();
          },
          complete: () => {
            this.releaseTranslation(locale);
            resolve();
          }
        });
      });
    });
  }
  /**
   * Can be called to add translation data.
   * @param data The translation data {key: value}
   * @param language The language to add data
   */
  addData(data, language) {
    this.data[language] = this.data[language] !== void 0 ? mergeDeep(this.data[language], data) : data;
  }
  /**
   * Adds providers to configuration
   * @param providers The providers of the translations data
   */
  addProviders(providers) {
    providers.forEach((provider) => {
      if (!this.config.providers.find((p) => p.name === provider.name)) {
        this.config.providers.push(provider);
      }
    });
  }
  getTranslation(providers, language) {
    const lazyLoaders = [];
    let loaders = [];
    for (const provider of providers) {
      if (this.config.fallback) {
        loaders = loaders.concat(this.translationFallback.get(language, provider));
      } else {
        if (this.config.cache) {
          lazyLoaders.push(this.cache.read(`${provider.name}-${language}`, this.translationLoader.get(language, provider)));
        } else {
          lazyLoaders.push(this.translationLoader.get(language, provider));
        }
      }
    }
    loaders.push(merge(...lazyLoaders));
    return loaders;
  }
  handleError(error) {
    this.error.next(error);
  }
  releaseTranslation(locale) {
    Object.assign(this.locale, locale);
    this.translation.next(this.locale);
    this.storage.write(this.locale);
  }
};
_L10nTranslationService.ɵfac = function L10nTranslationService_Factory(t) {
  return new (t || _L10nTranslationService)(ɵɵinject(L10N_CONFIG), ɵɵinject(L10N_LOCALE), ɵɵinject(L10nCache), ɵɵinject(L10nStorage), ɵɵinject(L10nLocaleResolver), ɵɵinject(L10nTranslationFallback), ɵɵinject(L10nTranslationLoader), ɵɵinject(L10nTranslationHandler), ɵɵinject(L10nMissingTranslationHandler));
};
_L10nTranslationService.ɵprov = ɵɵdefineInjectable({
  token: _L10nTranslationService,
  factory: _L10nTranslationService.ɵfac
});
var L10nTranslationService = _L10nTranslationService;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nTranslationService, [{
    type: Injectable
  }], function() {
    return [{
      type: void 0,
      decorators: [{
        type: Inject,
        args: [L10N_CONFIG]
      }]
    }, {
      type: void 0,
      decorators: [{
        type: Inject,
        args: [L10N_LOCALE]
      }]
    }, {
      type: L10nCache
    }, {
      type: L10nStorage
    }, {
      type: L10nLocaleResolver
    }, {
      type: L10nTranslationFallback
    }, {
      type: L10nTranslationLoader
    }, {
      type: L10nTranslationHandler
    }, {
      type: L10nMissingTranslationHandler
    }];
  }, null);
})();
var _L10nAsyncPipe = class _L10nAsyncPipe {
  constructor() {
    this.translation = inject(L10nTranslationService);
    this.cdr = inject(ChangeDetectorRef);
    this.onChanges = this.translation.onChange().subscribe({
      next: () => this.cdr.markForCheck()
    });
  }
  ngOnDestroy() {
    if (this.onChanges) this.onChanges.unsubscribe();
  }
};
_L10nAsyncPipe.ɵfac = function L10nAsyncPipe_Factory(t) {
  return new (t || _L10nAsyncPipe)();
};
_L10nAsyncPipe.ɵprov = ɵɵdefineInjectable({
  token: _L10nAsyncPipe,
  factory: _L10nAsyncPipe.ɵfac
});
var L10nAsyncPipe = _L10nAsyncPipe;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nAsyncPipe, [{
    type: Injectable
  }], function() {
    return [];
  }, null);
})();
function getTargetNode(rootNode) {
  return walk(rootNode);
}
var MAX_DEPTH = 10;
function walk(rootNode) {
  const queue = [];
  let iNode;
  let depth = 0;
  let nodeToDepthIncrease = 1;
  queue.push(rootNode);
  while (queue.length > 0 && depth <= MAX_DEPTH) {
    iNode = queue.splice(0, 1)[0];
    if (isTargetNode(iNode)) return iNode;
    if (depth < MAX_DEPTH && iNode.childNodes) {
      for (const child of Array.from(iNode.childNodes)) {
        if (isValidNode(child)) {
          queue.push(child);
        }
      }
    }
    if (--nodeToDepthIncrease === 0) {
      depth++;
      nodeToDepthIncrease = queue.length;
    }
  }
  return rootNode;
}
function isTargetNode(node) {
  return typeof node !== "undefined" && node.nodeType === 3 && node.nodeValue != null && node.nodeValue.trim() !== "";
}
function isValidNode(node) {
  if (typeof node !== "undefined" && node.nodeType === 1 && node.attributes) {
    for (const attr of Array.from(node.attributes)) {
      if (attr && /^l10n|translate/.test(attr.name)) return false;
    }
  }
  return true;
}
var _L10nDirective = class _L10nDirective {
  constructor() {
    this.el = inject(ElementRef);
    this.renderer = inject(Renderer2);
    this.translation = inject(L10nTranslationService);
    this.attributes = [];
    this.destroy = new Subject();
  }
  set innerHTML(content) {
    this.content = content.toString();
  }
  ngAfterViewInit() {
    if (this.el && this.el.nativeElement) {
      this.element = this.el.nativeElement;
      this.renderNode = getTargetNode(this.el.nativeElement);
      this.text = this.getText();
      this.attributes = this.getAttributes();
      this.addTextListener();
      if (this.language) {
        this.replaceText();
        this.replaceAttributes();
      } else {
        this.addTranslationListener();
      }
    }
  }
  ngOnChanges() {
    if (this.text) {
      if (this.nodeValue == null || this.nodeValue === "") {
        if (this.value) {
          this.text = this.value;
        } else if (this.content) {
          this.text = this.content;
        }
      }
      this.replaceText();
    }
    if (this.attributes && this.attributes.length > 0) {
      this.replaceAttributes();
    }
  }
  ngOnDestroy() {
    this.destroy.next(true);
    this.removeTextListener();
  }
  getText() {
    let text = "";
    if (this.element && this.element.childNodes.length > 0) {
      text = this.getNodeValue();
    } else if (this.value) {
      text = this.value;
    } else if (this.content) {
      text = this.content;
    }
    return text;
  }
  getNodeValue() {
    this.nodeValue = this.renderNode != null && this.renderNode.nodeValue != null ? this.renderNode.nodeValue : "";
    return this.nodeValue ? this.nodeValue.trim() : "";
  }
  getAttributes() {
    const attributes = [];
    if (this.element && this.element.attributes) {
      for (const attr of Array.from(this.element.attributes)) {
        if (attr && attr.name) {
          const [, name = ""] = attr.name.match(/^l10n-(.+)$/) || [];
          if (name) {
            const targetAttr = Array.from(this.element.attributes).find((a) => a.name === name);
            if (targetAttr) attributes.push({
              name: targetAttr.name,
              value: targetAttr.value
            });
          }
        }
      }
    }
    return attributes;
  }
  addTextListener() {
    if (typeof MutationObserver !== "undefined") {
      this.textObserver = new MutationObserver(() => {
        if (this.element) {
          this.renderNode = getTargetNode(this.element);
          this.text = this.getText();
          this.replaceText();
        }
      });
      if (this.renderNode) {
        this.textObserver.observe(this.renderNode, {
          subtree: true,
          characterData: true
        });
      }
    }
  }
  removeTextListener() {
    if (this.textObserver) {
      this.textObserver.disconnect();
    }
  }
  addTranslationListener() {
    this.translation.onChange().pipe(takeUntil(this.destroy)).subscribe({
      next: () => {
        this.replaceText();
        this.replaceAttributes();
      }
    });
  }
  replaceText() {
    if (this.text) {
      this.setText(this.getValue(this.text));
    }
  }
  replaceAttributes() {
    if (this.attributes.length > 0) {
      this.setAttributes(this.getAttributesValues());
    }
  }
  setText(value) {
    if (value) {
      if (this.nodeValue && this.text) {
        this.removeTextListener();
        this.renderer.setValue(this.renderNode, this.nodeValue.replace(this.text, value));
        this.addTextListener();
      } else if (this.value) {
        this.renderer.setAttribute(this.element, "value", value);
      } else if (this.content) {
        this.renderer.setProperty(this.element, "innerHTML", value);
      }
    }
  }
  setAttributes(data) {
    for (const attr of this.attributes) {
      this.renderer.setAttribute(this.element, attr.name, data[attr.value]);
    }
  }
  getAttributesValues() {
    const values = this.attributes.map((attr) => attr.value);
    const data = {};
    for (const value of values) {
      data[value] = this.getValue(value);
    }
    return data;
  }
};
_L10nDirective.ɵfac = function L10nDirective_Factory(t) {
  return new (t || _L10nDirective)();
};
_L10nDirective.ɵdir = ɵɵdefineDirective({
  type: _L10nDirective,
  inputs: {
    value: "value",
    innerHTML: "innerHTML",
    language: "language"
  },
  features: [ɵɵNgOnChangesFeature]
});
var L10nDirective = _L10nDirective;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDirective, [{
    type: Directive
  }], null, {
    value: [{
      type: Input
    }],
    innerHTML: [{
      type: Input
    }],
    language: [{
      type: Input
    }]
  });
})();
var resolveL10n = (route, state) => __async(void 0, null, function* () {
  const translation = inject(L10nTranslationService);
  const providers = route.data["l10nProviders"];
  translation.addProviders(providers);
  yield translation.loadTranslations(providers);
});
var _L10nLoader = class _L10nLoader {
};
_L10nLoader.ɵfac = function L10nLoader_Factory(t) {
  return new (t || _L10nLoader)();
};
_L10nLoader.ɵprov = ɵɵdefineInjectable({
  token: _L10nLoader,
  factory: _L10nLoader.ɵfac
});
var L10nLoader = _L10nLoader;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nLoader, [{
    type: Injectable
  }], null, null);
})();
var _L10nDefaultLoader = class _L10nDefaultLoader {
  constructor(translation) {
    this.translation = translation;
  }
  init() {
    return __async(this, null, function* () {
      yield this.translation.init();
    });
  }
};
_L10nDefaultLoader.ɵfac = function L10nDefaultLoader_Factory(t) {
  return new (t || _L10nDefaultLoader)(ɵɵinject(L10nTranslationService));
};
_L10nDefaultLoader.ɵprov = ɵɵdefineInjectable({
  token: _L10nDefaultLoader,
  factory: _L10nDefaultLoader.ɵfac
});
var L10nDefaultLoader = _L10nDefaultLoader;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDefaultLoader, [{
    type: Injectable
  }], function() {
    return [{
      type: L10nTranslationService
    }];
  }, null);
})();
var _L10nIntlService = class _L10nIntlService {
  constructor(config, locale, translation) {
    this.config = config;
    this.locale = locale;
    this.translation = translation;
  }
  /**
   * Formats a date.
   * @param value A date, a number (milliseconds since UTC epoch) or an ISO 8601 string
   * @param options A L10n or Intl DateTimeFormatOptions object
   * @param language The current language
   * @param timeZone The current time zone
   */
  formatDate(value, options, language = this.locale.dateLanguage || this.locale.language, timeZone = this.locale.timeZone) {
    value = toDate(value);
    let dateTimeFormatOptions = {};
    if (options) {
      if (options) {
        const _a = options, {
          dateStyle,
          timeStyle
        } = _a, rest = __objRest(_a, [
          "dateStyle",
          "timeStyle"
        ]);
        if (dateStyle) {
          dateTimeFormatOptions = __spreadValues(__spreadValues({}, dateTimeFormatOptions), PARSE_DATE_STYLE[dateStyle]);
        }
        if (timeStyle) {
          dateTimeFormatOptions = __spreadValues(__spreadValues({}, dateTimeFormatOptions), PARSE_TIME_STYLE[timeStyle]);
        }
        dateTimeFormatOptions = __spreadValues(__spreadValues({}, dateTimeFormatOptions), rest);
      }
    }
    if (timeZone) {
      dateTimeFormatOptions.timeZone = timeZone;
    }
    return new Intl.DateTimeFormat(language, dateTimeFormatOptions).format(value);
  }
  /**
   * Formats a number.
   * @param value A number or a string
   * @param options A L10n or Intl NumberFormatOptions object
   * @param language The current language
   * @param currency The current currency
   * @param convert An optional function to convert the value, with value and locale in the signature.
   * For example:
   * ```
   * const convert = (value: number, locale: L10nLocale) => { return ... };
   * ```
   * @param convertParams Optional parameters for the convert function
   */
  formatNumber(value, options, language = this.locale.numberLanguage || this.locale.language, currency = this.locale.currency, convert, convertParams) {
    if (options && options["style"] === "unit" && !options["unit"]) return value;
    value = toNumber(value);
    if (typeof convert === "function") {
      value = convert(value, this.locale, Object.values(convertParams || {}));
    }
    let numberFormatOptions = {};
    if (options) {
      const _a = options, {
        digits
      } = _a, rest = __objRest(_a, [
        "digits"
      ]);
      if (digits) {
        numberFormatOptions = __spreadValues(__spreadValues({}, numberFormatOptions), parseDigits(digits));
      }
      numberFormatOptions = __spreadValues(__spreadValues({}, numberFormatOptions), rest);
    }
    if (currency) numberFormatOptions.currency = currency;
    return new Intl.NumberFormat(language, numberFormatOptions).format(value);
  }
  /**
   * Formats a relative time.
   * @param value A negative (or positive) number
   * @param unit An Intl RelativeTimeFormatUnit value
   * @param options An Intl RelativeTimeFormatOptions object
   * @param language The current language
   */
  formatRelativeTime(value, unit, options, language = this.locale.dateLanguage || this.locale.language) {
    value = toNumber(value);
    return new Intl.RelativeTimeFormat(language, options).format(value, unit);
  }
  /**
   * Gets the plural by a number.
   * The 'value' is passed as a parameter to the translation function.
   * @param value The number to get the plural
   * @param prefix Optional prefix for the key
   * @param options An Intl PluralRulesOptions object
   * @param language The current language
   */
  plural(value, prefix = "", options, language = this.locale.language) {
    value = toNumber(value);
    const rule = new Intl.PluralRules(language, options).select(value);
    const key = prefix ? `${prefix}${this.config.keySeparator}${rule}` : rule;
    return this.translation.translate(key, {
      value
    });
  }
  /**
   * Returns translation of language, region, script or currency display names
   * @param code ISO code of language, region, script or currency
   * @param options An Intl DisplayNamesOptions object
   * @param language The current language
   */
  displayNames(code, options, language = this.locale.language) {
    return new Intl.DisplayNames(language, options).of(code) || code;
  }
  getCurrencySymbol(locale = this.locale) {
    const decimal = this.formatNumber(0, {
      digits: "1.0-0"
    }, locale.numberLanguage || locale.language);
    const currency = this.formatNumber(0, {
      digits: "1.0-0",
      style: "currency",
      currencyDisplay: "symbol"
    }, locale.numberLanguage || locale.language, locale.currency);
    let symbol = currency.replace(decimal, "");
    symbol = symbol.trim();
    return symbol;
  }
  /**
   * Compares two keys by the value of translation.
   * @param key1 First key to compare
   * @param key1 Second key to compare
   * @param options An Intl CollatorOptions object
   * @param language The current language
   * @return A negative value if the value of translation of key1 comes before the value of translation of key2;
   *         a positive value if key1 comes after key2;
   *         0 if they are considered equal or Intl.Collator is not supported
   */
  compare(key1, key2, options, language = this.locale.language) {
    const value1 = this.translation.translate(key1);
    const value2 = this.translation.translate(key2);
    return new Intl.Collator(language, options).compare(value1, value2);
  }
  /**
   * Returns the representation of a list.
   * @param list An array of keys
   * @param options An Intl ListFormatOptions object
   * @param language The current language
   */
  list(list, options, language = this.locale.language) {
    const values = list.map((key) => this.translation.translate(key));
    if (language == null || language === "") return values.join(", ");
    return new Intl.ListFormat(language, options).format(values);
  }
};
_L10nIntlService.ɵfac = function L10nIntlService_Factory(t) {
  return new (t || _L10nIntlService)(ɵɵinject(L10N_CONFIG), ɵɵinject(L10N_LOCALE), ɵɵinject(L10nTranslationService));
};
_L10nIntlService.ɵprov = ɵɵdefineInjectable({
  token: _L10nIntlService,
  factory: _L10nIntlService.ɵfac
});
var L10nIntlService = _L10nIntlService;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nIntlService, [{
    type: Injectable
  }], function() {
    return [{
      type: void 0,
      decorators: [{
        type: Inject,
        args: [L10N_CONFIG]
      }]
    }, {
      type: void 0,
      decorators: [{
        type: Inject,
        args: [L10N_LOCALE]
      }]
    }, {
      type: L10nTranslationService
    }];
  }, null);
})();
var _L10nValidation = class _L10nValidation {
};
_L10nValidation.ɵfac = function L10nValidation_Factory(t) {
  return new (t || _L10nValidation)();
};
_L10nValidation.ɵprov = ɵɵdefineInjectable({
  token: _L10nValidation,
  factory: _L10nValidation.ɵfac
});
var L10nValidation = _L10nValidation;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nValidation, [{
    type: Injectable
  }], null, null);
})();
var _L10nDefaultValidation = class _L10nDefaultValidation {
  constructor(locale) {
    this.locale = locale;
  }
  parseNumber(value, options, language = this.locale.numberLanguage || this.locale.language) {
    return null;
  }
  parseDate(value, options, language = this.locale.dateLanguage || this.locale.language) {
    return null;
  }
};
_L10nDefaultValidation.ɵfac = function L10nDefaultValidation_Factory(t) {
  return new (t || _L10nDefaultValidation)(ɵɵinject(L10N_LOCALE));
};
_L10nDefaultValidation.ɵprov = ɵɵdefineInjectable({
  token: _L10nDefaultValidation,
  factory: _L10nDefaultValidation.ɵfac
});
var L10nDefaultValidation = _L10nDefaultValidation;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDefaultValidation, [{
    type: Injectable
  }], function() {
    return [{
      type: void 0,
      decorators: [{
        type: Inject,
        args: [L10N_LOCALE]
      }]
    }];
  }, null);
})();
function initL10n(translation) {
  return () => translation.init();
}
function provideL10nTranslation(config, token = {}) {
  return makeEnvironmentProviders([L10nTranslationService, L10nCache, {
    provide: L10N_CONFIG,
    useValue: config
  }, {
    provide: L10N_LOCALE,
    useValue: {
      language: "",
      units: {}
    }
  }, {
    provide: L10nStorage,
    useClass: token.storage || L10nDefaultStorage
  }, {
    provide: L10nLocaleResolver,
    useClass: token.localeResolver || L10nDefaultLocaleResolver
  }, {
    provide: L10nTranslationFallback,
    useClass: token.translationFallback || L10nDefaultTranslationFallback
  }, {
    provide: L10nTranslationLoader,
    useClass: token.translationLoader || L10nDefaultTranslationLoader
  }, {
    provide: L10nTranslationHandler,
    useClass: token.translationHandler || L10nDefaultTranslationHandler
  }, {
    provide: L10nMissingTranslationHandler,
    useClass: token.missingTranslationHandler || L10nDefaultMissingTranslationHandler
  }, {
    provide: L10nLoader,
    useClass: token.loader || L10nDefaultLoader
  }, {
    provide: APP_INITIALIZER,
    useFactory: initL10n,
    deps: [L10nLoader],
    multi: true
  }]);
}
function provideL10nIntl() {
  return makeEnvironmentProviders([L10nIntlService]);
}
function provideL10nValidation(token = {}) {
  return makeEnvironmentProviders([{
    provide: L10nValidation,
    useClass: token.validation || L10nDefaultValidation
  }]);
}
var _L10nTranslatePipe = class _L10nTranslatePipe {
  constructor(translation) {
    this.translation = translation;
  }
  transform(key, language, params) {
    if (key == null || key === "") return null;
    return this.translation.translate(key, params, language);
  }
};
_L10nTranslatePipe.ɵfac = function L10nTranslatePipe_Factory(t) {
  return new (t || _L10nTranslatePipe)(ɵɵdirectiveInject(L10nTranslationService, 16));
};
_L10nTranslatePipe.ɵpipe = ɵɵdefinePipe({
  name: "translate",
  type: _L10nTranslatePipe,
  pure: true,
  standalone: true
});
var L10nTranslatePipe = _L10nTranslatePipe;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nTranslatePipe, [{
    type: Pipe,
    args: [{
      name: "translate",
      pure: true,
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nTranslationService
    }];
  }, null);
})();
var _L10nTranslateAsyncPipe = class _L10nTranslateAsyncPipe extends L10nAsyncPipe {
  transform(key, params, language) {
    if (key == null || key === "") return null;
    return this.translation.translate(key, params, language);
  }
};
_L10nTranslateAsyncPipe.ɵfac = /* @__PURE__ */ (() => {
  let ɵL10nTranslateAsyncPipe_BaseFactory;
  return function L10nTranslateAsyncPipe_Factory(t) {
    return (ɵL10nTranslateAsyncPipe_BaseFactory || (ɵL10nTranslateAsyncPipe_BaseFactory = ɵɵgetInheritedFactory(_L10nTranslateAsyncPipe)))(t || _L10nTranslateAsyncPipe);
  };
})();
_L10nTranslateAsyncPipe.ɵpipe = ɵɵdefinePipe({
  name: "translateAsync",
  type: _L10nTranslateAsyncPipe,
  pure: false,
  standalone: true
});
var L10nTranslateAsyncPipe = _L10nTranslateAsyncPipe;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nTranslateAsyncPipe, [{
    type: Pipe,
    args: [{
      name: "translateAsync",
      pure: false,
      standalone: true
    }]
  }], null, null);
})();
var _L10nTranslateDirective = class _L10nTranslateDirective extends L10nDirective {
  set l10nTranslate(params) {
    if (params) this.params = params;
  }
  set translate(params) {
    if (params) this.params = params;
  }
  getValue(text) {
    return this.translation.translate(text, this.params, this.language);
  }
};
_L10nTranslateDirective.ɵfac = /* @__PURE__ */ (() => {
  let ɵL10nTranslateDirective_BaseFactory;
  return function L10nTranslateDirective_Factory(t) {
    return (ɵL10nTranslateDirective_BaseFactory || (ɵL10nTranslateDirective_BaseFactory = ɵɵgetInheritedFactory(_L10nTranslateDirective)))(t || _L10nTranslateDirective);
  };
})();
_L10nTranslateDirective.ɵdir = ɵɵdefineDirective({
  type: _L10nTranslateDirective,
  selectors: [["", "l10nTranslate", ""], ["", "translate", ""]],
  inputs: {
    l10nTranslate: "l10nTranslate",
    translate: "translate",
    params: "params"
  },
  standalone: true,
  features: [ɵɵInheritDefinitionFeature]
});
var L10nTranslateDirective = _L10nTranslateDirective;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nTranslateDirective, [{
    type: Directive,
    args: [{
      selector: "[l10nTranslate],[translate]",
      standalone: true
    }]
  }], null, {
    l10nTranslate: [{
      type: Input
    }],
    translate: [{
      type: Input
    }],
    params: [{
      type: Input
    }]
  });
})();
var _L10nTranslationModule = class _L10nTranslationModule {
  static forRoot(config, token = {}) {
    return {
      ngModule: _L10nTranslationModule,
      providers: [L10nTranslationService, L10nCache, {
        provide: L10N_CONFIG,
        useValue: config
      }, {
        provide: L10N_LOCALE,
        useValue: {
          language: "",
          units: {}
        }
      }, {
        provide: L10nStorage,
        useClass: token.storage || L10nDefaultStorage
      }, {
        provide: L10nLocaleResolver,
        useClass: token.localeResolver || L10nDefaultLocaleResolver
      }, {
        provide: L10nTranslationFallback,
        useClass: token.translationFallback || L10nDefaultTranslationFallback
      }, {
        provide: L10nTranslationLoader,
        useClass: token.translationLoader || L10nDefaultTranslationLoader
      }, {
        provide: L10nTranslationHandler,
        useClass: token.translationHandler || L10nDefaultTranslationHandler
      }, {
        provide: L10nMissingTranslationHandler,
        useClass: token.missingTranslationHandler || L10nDefaultMissingTranslationHandler
      }, {
        provide: L10nLoader,
        useClass: token.loader || L10nDefaultLoader
      }, {
        provide: APP_INITIALIZER,
        useFactory: initL10n,
        deps: [L10nLoader],
        multi: true
      }]
    };
  }
};
_L10nTranslationModule.ɵfac = function L10nTranslationModule_Factory(t) {
  return new (t || _L10nTranslationModule)();
};
_L10nTranslationModule.ɵmod = ɵɵdefineNgModule({
  type: _L10nTranslationModule,
  imports: [L10nTranslatePipe, L10nTranslateAsyncPipe, L10nTranslateDirective],
  exports: [L10nTranslatePipe, L10nTranslateAsyncPipe, L10nTranslateDirective]
});
_L10nTranslationModule.ɵinj = ɵɵdefineInjector({});
var L10nTranslationModule = _L10nTranslationModule;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nTranslationModule, [{
    type: NgModule,
    args: [{
      imports: [L10nTranslatePipe, L10nTranslateAsyncPipe, L10nTranslateDirective],
      exports: [L10nTranslatePipe, L10nTranslateAsyncPipe, L10nTranslateDirective]
    }]
  }], null, null);
})();
var _L10nDatePipe = class _L10nDatePipe {
  constructor(intl) {
    this.intl = intl;
  }
  transform(value, language, options, timezone) {
    if (value == null || value === "") return null;
    return this.intl.formatDate(value, options, language, timezone);
  }
};
_L10nDatePipe.ɵfac = function L10nDatePipe_Factory(t) {
  return new (t || _L10nDatePipe)(ɵɵdirectiveInject(L10nIntlService, 16));
};
_L10nDatePipe.ɵpipe = ɵɵdefinePipe({
  name: "l10nDate",
  type: _L10nDatePipe,
  pure: true,
  standalone: true
});
var L10nDatePipe = _L10nDatePipe;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDatePipe, [{
    type: Pipe,
    args: [{
      name: "l10nDate",
      pure: true,
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, null);
})();
var _L10nDateAsyncPipe = class _L10nDateAsyncPipe extends L10nAsyncPipe {
  constructor(intl) {
    super();
    this.intl = intl;
  }
  transform(value, options, timezone, language) {
    if (value == null || value === "") return null;
    return this.intl.formatDate(value, options, language, timezone);
  }
};
_L10nDateAsyncPipe.ɵfac = function L10nDateAsyncPipe_Factory(t) {
  return new (t || _L10nDateAsyncPipe)(ɵɵdirectiveInject(L10nIntlService, 16));
};
_L10nDateAsyncPipe.ɵpipe = ɵɵdefinePipe({
  name: "l10nDateAsync",
  type: _L10nDateAsyncPipe,
  pure: false,
  standalone: true
});
var L10nDateAsyncPipe = _L10nDateAsyncPipe;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDateAsyncPipe, [{
    type: Pipe,
    args: [{
      name: "l10nDateAsync",
      pure: false,
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, null);
})();
var _L10nNumberPipe = class _L10nNumberPipe {
  constructor(intl) {
    this.intl = intl;
  }
  transform(value, language, options, currency, convert, convertParams) {
    if (value == null || value === "") return null;
    return this.intl.formatNumber(value, options, language, currency, convert, convertParams);
  }
};
_L10nNumberPipe.ɵfac = function L10nNumberPipe_Factory(t) {
  return new (t || _L10nNumberPipe)(ɵɵdirectiveInject(L10nIntlService, 16));
};
_L10nNumberPipe.ɵpipe = ɵɵdefinePipe({
  name: "l10nNumber",
  type: _L10nNumberPipe,
  pure: true,
  standalone: true
});
var L10nNumberPipe = _L10nNumberPipe;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nNumberPipe, [{
    type: Pipe,
    args: [{
      name: "l10nNumber",
      pure: true,
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, null);
})();
var _L10nNumberAsyncPipe = class _L10nNumberAsyncPipe extends L10nAsyncPipe {
  constructor(intl) {
    super();
    this.intl = intl;
  }
  transform(value, options, convert, convertParams, language, currency) {
    if (value == null || value === "") return null;
    return this.intl.formatNumber(value, options, language, currency, convert, convertParams);
  }
};
_L10nNumberAsyncPipe.ɵfac = function L10nNumberAsyncPipe_Factory(t) {
  return new (t || _L10nNumberAsyncPipe)(ɵɵdirectiveInject(L10nIntlService, 16));
};
_L10nNumberAsyncPipe.ɵpipe = ɵɵdefinePipe({
  name: "l10nNumberAsync",
  type: _L10nNumberAsyncPipe,
  pure: false,
  standalone: true
});
var L10nNumberAsyncPipe = _L10nNumberAsyncPipe;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nNumberAsyncPipe, [{
    type: Pipe,
    args: [{
      name: "l10nNumberAsync",
      pure: false,
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, null);
})();
var _L10nTimeAgoPipe = class _L10nTimeAgoPipe {
  constructor(intl) {
    this.intl = intl;
  }
  transform(value, language, unit, options) {
    if (value == null || value === "") return null;
    return this.intl.formatRelativeTime(value, unit, options, language);
  }
};
_L10nTimeAgoPipe.ɵfac = function L10nTimeAgoPipe_Factory(t) {
  return new (t || _L10nTimeAgoPipe)(ɵɵdirectiveInject(L10nIntlService, 16));
};
_L10nTimeAgoPipe.ɵpipe = ɵɵdefinePipe({
  name: "l10nTimeAgo",
  type: _L10nTimeAgoPipe,
  pure: true,
  standalone: true
});
var L10nTimeAgoPipe = _L10nTimeAgoPipe;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nTimeAgoPipe, [{
    type: Pipe,
    args: [{
      name: "l10nTimeAgo",
      pure: true,
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, null);
})();
var _L10nTimeAgoAsyncPipe = class _L10nTimeAgoAsyncPipe extends L10nAsyncPipe {
  constructor(intl) {
    super();
    this.intl = intl;
  }
  transform(value, unit, options, language) {
    if (value == null || value === "") return null;
    return this.intl.formatRelativeTime(value, unit, options, language);
  }
};
_L10nTimeAgoAsyncPipe.ɵfac = function L10nTimeAgoAsyncPipe_Factory(t) {
  return new (t || _L10nTimeAgoAsyncPipe)(ɵɵdirectiveInject(L10nIntlService, 16));
};
_L10nTimeAgoAsyncPipe.ɵpipe = ɵɵdefinePipe({
  name: "l10nTimeAgoAsync",
  type: _L10nTimeAgoAsyncPipe,
  pure: false,
  standalone: true
});
var L10nTimeAgoAsyncPipe = _L10nTimeAgoAsyncPipe;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nTimeAgoAsyncPipe, [{
    type: Pipe,
    args: [{
      name: "l10nTimeAgoAsync",
      pure: false,
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, null);
})();
var _L10nPluralPipe = class _L10nPluralPipe {
  constructor(intl) {
    this.intl = intl;
  }
  transform(value, language, prefix, options) {
    if (value == null || value === "") return null;
    return this.intl.plural(value, prefix, options, language);
  }
};
_L10nPluralPipe.ɵfac = function L10nPluralPipe_Factory(t) {
  return new (t || _L10nPluralPipe)(ɵɵdirectiveInject(L10nIntlService, 16));
};
_L10nPluralPipe.ɵpipe = ɵɵdefinePipe({
  name: "l10nPlural",
  type: _L10nPluralPipe,
  pure: true,
  standalone: true
});
var L10nPluralPipe = _L10nPluralPipe;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nPluralPipe, [{
    type: Pipe,
    args: [{
      name: "l10nPlural",
      pure: true,
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, null);
})();
var _L10nPluralAsyncPipe = class _L10nPluralAsyncPipe extends L10nAsyncPipe {
  constructor(intl) {
    super();
    this.intl = intl;
  }
  transform(value, prefix, options, language) {
    if (value == null || value === "") return null;
    return this.intl.plural(value, prefix, options, language);
  }
};
_L10nPluralAsyncPipe.ɵfac = function L10nPluralAsyncPipe_Factory(t) {
  return new (t || _L10nPluralAsyncPipe)(ɵɵdirectiveInject(L10nIntlService, 16));
};
_L10nPluralAsyncPipe.ɵpipe = ɵɵdefinePipe({
  name: "l10nPluralAsync",
  type: _L10nPluralAsyncPipe,
  pure: false,
  standalone: true
});
var L10nPluralAsyncPipe = _L10nPluralAsyncPipe;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nPluralAsyncPipe, [{
    type: Pipe,
    args: [{
      name: "l10nPluralAsync",
      pure: false,
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, null);
})();
var _L10nDisplayNamesPipe = class _L10nDisplayNamesPipe {
  constructor(intl) {
    this.intl = intl;
  }
  transform(value, language, options) {
    if (value == null || value === "") return null;
    return this.intl.displayNames(value, options, language);
  }
};
_L10nDisplayNamesPipe.ɵfac = function L10nDisplayNamesPipe_Factory(t) {
  return new (t || _L10nDisplayNamesPipe)(ɵɵdirectiveInject(L10nIntlService, 16));
};
_L10nDisplayNamesPipe.ɵpipe = ɵɵdefinePipe({
  name: "l10nDisplayNames",
  type: _L10nDisplayNamesPipe,
  pure: true,
  standalone: true
});
var L10nDisplayNamesPipe = _L10nDisplayNamesPipe;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDisplayNamesPipe, [{
    type: Pipe,
    args: [{
      name: "l10nDisplayNames",
      pure: true,
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, null);
})();
var _L10nDisplayNamesAsyncPipe = class _L10nDisplayNamesAsyncPipe extends L10nAsyncPipe {
  constructor(intl) {
    super();
    this.intl = intl;
  }
  transform(value, options, language) {
    if (value == null || value === "") return null;
    return this.intl.displayNames(value, options, language);
  }
};
_L10nDisplayNamesAsyncPipe.ɵfac = function L10nDisplayNamesAsyncPipe_Factory(t) {
  return new (t || _L10nDisplayNamesAsyncPipe)(ɵɵdirectiveInject(L10nIntlService, 16));
};
_L10nDisplayNamesAsyncPipe.ɵpipe = ɵɵdefinePipe({
  name: "l10nDisplayNamesAsync",
  type: _L10nDisplayNamesAsyncPipe,
  pure: false,
  standalone: true
});
var L10nDisplayNamesAsyncPipe = _L10nDisplayNamesAsyncPipe;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDisplayNamesAsyncPipe, [{
    type: Pipe,
    args: [{
      name: "l10nDisplayNamesAsync",
      pure: false,
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, null);
})();
var _L10nDateDirective = class _L10nDateDirective extends L10nDirective {
  set l10nDate(options) {
    if (options) this.options = options;
  }
  constructor(intl) {
    super();
    this.intl = intl;
  }
  getValue(text) {
    return this.intl.formatDate(text, this.options, this.language, this.timezone);
  }
};
_L10nDateDirective.ɵfac = function L10nDateDirective_Factory(t) {
  return new (t || _L10nDateDirective)(ɵɵdirectiveInject(L10nIntlService));
};
_L10nDateDirective.ɵdir = ɵɵdefineDirective({
  type: _L10nDateDirective,
  selectors: [["", "l10nDate", ""]],
  inputs: {
    l10nDate: "l10nDate",
    options: "options",
    timezone: "timezone"
  },
  standalone: true,
  features: [ɵɵInheritDefinitionFeature]
});
var L10nDateDirective = _L10nDateDirective;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDateDirective, [{
    type: Directive,
    args: [{
      selector: "[l10nDate]",
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, {
    l10nDate: [{
      type: Input
    }],
    options: [{
      type: Input
    }],
    timezone: [{
      type: Input
    }]
  });
})();
var _L10nNumberDirective = class _L10nNumberDirective extends L10nDirective {
  set l10nNumber(options) {
    if (options) this.options = options;
  }
  constructor(intl) {
    super();
    this.intl = intl;
  }
  getValue(text) {
    return this.intl.formatNumber(text, this.options, this.language, this.currency, this.convert, this.convertParams);
  }
};
_L10nNumberDirective.ɵfac = function L10nNumberDirective_Factory(t) {
  return new (t || _L10nNumberDirective)(ɵɵdirectiveInject(L10nIntlService));
};
_L10nNumberDirective.ɵdir = ɵɵdefineDirective({
  type: _L10nNumberDirective,
  selectors: [["", "l10nNumber", ""]],
  inputs: {
    l10nNumber: "l10nNumber",
    options: "options",
    currency: "currency",
    convert: "convert",
    convertParams: "convertParams"
  },
  standalone: true,
  features: [ɵɵInheritDefinitionFeature]
});
var L10nNumberDirective = _L10nNumberDirective;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nNumberDirective, [{
    type: Directive,
    args: [{
      selector: "[l10nNumber]",
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, {
    l10nNumber: [{
      type: Input
    }],
    options: [{
      type: Input
    }],
    currency: [{
      type: Input
    }],
    convert: [{
      type: Input
    }],
    convertParams: [{
      type: Input
    }]
  });
})();
var _L10nTimeAgoDirective = class _L10nTimeAgoDirective extends L10nDirective {
  set l10nTimeAgo(options) {
    if (options) this.options = options;
  }
  constructor(intl) {
    super();
    this.intl = intl;
  }
  getValue(text) {
    return this.intl.formatRelativeTime(text, this.unit, this.options, this.language);
  }
};
_L10nTimeAgoDirective.ɵfac = function L10nTimeAgoDirective_Factory(t) {
  return new (t || _L10nTimeAgoDirective)(ɵɵdirectiveInject(L10nIntlService));
};
_L10nTimeAgoDirective.ɵdir = ɵɵdefineDirective({
  type: _L10nTimeAgoDirective,
  selectors: [["", "l10nTimeAgo", ""]],
  inputs: {
    l10nTimeAgo: "l10nTimeAgo",
    unit: "unit",
    options: "options"
  },
  standalone: true,
  features: [ɵɵInheritDefinitionFeature]
});
var L10nTimeAgoDirective = _L10nTimeAgoDirective;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nTimeAgoDirective, [{
    type: Directive,
    args: [{
      selector: "[l10nTimeAgo]",
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, {
    l10nTimeAgo: [{
      type: Input
    }],
    unit: [{
      type: Input
    }],
    options: [{
      type: Input
    }]
  });
})();
var _L10nPluralDirective = class _L10nPluralDirective extends L10nDirective {
  set l10nPlural(options) {
    if (options) this.options = options;
  }
  constructor(intl) {
    super();
    this.intl = intl;
  }
  getValue(text) {
    return this.intl.plural(text, this.prefix, this.options, this.language);
  }
};
_L10nPluralDirective.ɵfac = function L10nPluralDirective_Factory(t) {
  return new (t || _L10nPluralDirective)(ɵɵdirectiveInject(L10nIntlService));
};
_L10nPluralDirective.ɵdir = ɵɵdefineDirective({
  type: _L10nPluralDirective,
  selectors: [["", "l10nPlural", ""]],
  inputs: {
    l10nPlural: "l10nPlural",
    prefix: "prefix",
    options: "options"
  },
  standalone: true,
  features: [ɵɵInheritDefinitionFeature]
});
var L10nPluralDirective = _L10nPluralDirective;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nPluralDirective, [{
    type: Directive,
    args: [{
      selector: "[l10nPlural]",
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, {
    l10nPlural: [{
      type: Input
    }],
    prefix: [{
      type: Input
    }],
    options: [{
      type: Input
    }]
  });
})();
var _L10nDisplayNamesDirective = class _L10nDisplayNamesDirective extends L10nDirective {
  set l10nDisplayNames(options) {
    if (options) this.options = options;
  }
  constructor(intl) {
    super();
    this.intl = intl;
  }
  getValue(text) {
    return this.intl.displayNames(text, this.options, this.language);
  }
};
_L10nDisplayNamesDirective.ɵfac = function L10nDisplayNamesDirective_Factory(t) {
  return new (t || _L10nDisplayNamesDirective)(ɵɵdirectiveInject(L10nIntlService));
};
_L10nDisplayNamesDirective.ɵdir = ɵɵdefineDirective({
  type: _L10nDisplayNamesDirective,
  selectors: [["", "l10nDisplayNames", ""]],
  inputs: {
    l10nDisplayNames: "l10nDisplayNames",
    options: "options"
  },
  standalone: true,
  features: [ɵɵInheritDefinitionFeature]
});
var L10nDisplayNamesDirective = _L10nDisplayNamesDirective;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nDisplayNamesDirective, [{
    type: Directive,
    args: [{
      selector: "[l10nDisplayNames]",
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nIntlService
    }];
  }, {
    l10nDisplayNames: [{
      type: Input
    }],
    options: [{
      type: Input
    }]
  });
})();
var _L10nIntlModule = class _L10nIntlModule {
};
_L10nIntlModule.ɵfac = function L10nIntlModule_Factory(t) {
  return new (t || _L10nIntlModule)();
};
_L10nIntlModule.ɵmod = ɵɵdefineNgModule({
  type: _L10nIntlModule,
  imports: [L10nDatePipe, L10nNumberPipe, L10nTimeAgoPipe, L10nPluralPipe, L10nDisplayNamesPipe, L10nDateAsyncPipe, L10nNumberAsyncPipe, L10nTimeAgoAsyncPipe, L10nPluralAsyncPipe, L10nDisplayNamesAsyncPipe, L10nDateDirective, L10nNumberDirective, L10nTimeAgoDirective, L10nPluralDirective, L10nDisplayNamesDirective],
  exports: [L10nDatePipe, L10nNumberPipe, L10nTimeAgoPipe, L10nPluralPipe, L10nDisplayNamesPipe, L10nDateAsyncPipe, L10nNumberAsyncPipe, L10nTimeAgoAsyncPipe, L10nPluralAsyncPipe, L10nDisplayNamesAsyncPipe, L10nDateDirective, L10nNumberDirective, L10nTimeAgoDirective, L10nPluralDirective, L10nDisplayNamesDirective]
});
_L10nIntlModule.ɵinj = ɵɵdefineInjector({
  providers: [L10nIntlService]
});
var L10nIntlModule = _L10nIntlModule;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nIntlModule, [{
    type: NgModule,
    args: [{
      imports: [L10nDatePipe, L10nNumberPipe, L10nTimeAgoPipe, L10nPluralPipe, L10nDisplayNamesPipe, L10nDateAsyncPipe, L10nNumberAsyncPipe, L10nTimeAgoAsyncPipe, L10nPluralAsyncPipe, L10nDisplayNamesAsyncPipe, L10nDateDirective, L10nNumberDirective, L10nTimeAgoDirective, L10nPluralDirective, L10nDisplayNamesDirective],
      exports: [L10nDatePipe, L10nNumberPipe, L10nTimeAgoPipe, L10nPluralPipe, L10nDisplayNamesPipe, L10nDateAsyncPipe, L10nNumberAsyncPipe, L10nTimeAgoAsyncPipe, L10nPluralAsyncPipe, L10nDisplayNamesAsyncPipe, L10nDateDirective, L10nNumberDirective, L10nTimeAgoDirective, L10nPluralDirective, L10nDisplayNamesDirective],
      providers: [L10nIntlService]
    }]
  }], null, null);
})();
function l10nValidateNumber(validation, options, minValue = Number.MIN_VALUE, maxValue = Number.MAX_VALUE, language) {
  const validator = (c) => {
    if (c.value === "" || c.value == null) return null;
    const value = validation.parseNumber(c.value, options, language);
    if (value != null) {
      if (value < minValue) {
        return {
          minValue: true
        };
      } else if (value > maxValue) {
        return {
          maxValue: true
        };
      }
      return null;
    } else {
      return {
        format: true
      };
    }
  };
  return validator;
}
var _L10nValidateNumberDirective = class _L10nValidateNumberDirective {
  set l10nValidateNumber(options) {
    if (options) this.options = options;
  }
  constructor(validation) {
    this.validation = validation;
  }
  ngOnInit() {
    this.validator = l10nValidateNumber(this.validation, this.options, this.minValue, this.maxValue, this.language);
  }
  ngOnChanges() {
    this.validator = l10nValidateNumber(this.validation, this.options, this.minValue, this.maxValue, this.language);
  }
  validate(c) {
    return this.validator ? this.validator(c) : null;
  }
};
_L10nValidateNumberDirective.ɵfac = function L10nValidateNumberDirective_Factory(t) {
  return new (t || _L10nValidateNumberDirective)(ɵɵdirectiveInject(L10nValidation));
};
_L10nValidateNumberDirective.ɵdir = ɵɵdefineDirective({
  type: _L10nValidateNumberDirective,
  selectors: [["", "l10nValidateNumber", "", "ngModel", ""], ["", "l10nValidateNumber", "", "formControl", ""], ["", "l10nValidateNumber", "", "formControlName", ""]],
  inputs: {
    l10nValidateNumber: "l10nValidateNumber",
    options: "options",
    minValue: "minValue",
    maxValue: "maxValue",
    language: "language"
  },
  standalone: true,
  features: [ɵɵProvidersFeature([{
    provide: NG_VALIDATORS,
    useExisting: forwardRef(() => _L10nValidateNumberDirective),
    multi: true
  }]), ɵɵNgOnChangesFeature]
});
var L10nValidateNumberDirective = _L10nValidateNumberDirective;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nValidateNumberDirective, [{
    type: Directive,
    args: [{
      selector: "[l10nValidateNumber][ngModel],[l10nValidateNumber][formControl],[l10nValidateNumber][formControlName]",
      providers: [{
        provide: NG_VALIDATORS,
        useExisting: forwardRef(() => L10nValidateNumberDirective),
        multi: true
      }],
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nValidation
    }];
  }, {
    l10nValidateNumber: [{
      type: Input
    }],
    options: [{
      type: Input
    }],
    minValue: [{
      type: Input
    }],
    maxValue: [{
      type: Input
    }],
    language: [{
      type: Input
    }]
  });
})();
function l10nValidateDate(validation, options, minDate, maxDate, language) {
  const validator = (c) => {
    if (c.value === "" || c.value == null) return null;
    const date = validation.parseDate(c.value, options, language);
    if (date != null) {
      if (minDate && date < minDate) {
        return {
          mindate: true
        };
      } else if (maxDate && date > maxDate) {
        return {
          maxDate: true
        };
      }
      return null;
    } else {
      return {
        format: true
      };
    }
  };
  return validator;
}
var _L10nValidateDateDirective = class _L10nValidateDateDirective {
  set l10nValidateDate(options) {
    if (options) this.options = options;
  }
  constructor(validation) {
    this.validation = validation;
  }
  ngOnInit() {
    this.validator = l10nValidateDate(this.validation, this.options, this.minDate, this.maxDate, this.language);
  }
  ngOnChanges() {
    this.validator = l10nValidateDate(this.validation, this.options, this.minDate, this.maxDate, this.language);
  }
  validate(c) {
    return this.validator ? this.validator(c) : null;
  }
};
_L10nValidateDateDirective.ɵfac = function L10nValidateDateDirective_Factory(t) {
  return new (t || _L10nValidateDateDirective)(ɵɵdirectiveInject(L10nValidation));
};
_L10nValidateDateDirective.ɵdir = ɵɵdefineDirective({
  type: _L10nValidateDateDirective,
  selectors: [["", "l10nValidateDate", "", "ngModel", ""], ["", "l10nValidateDate", "", "formControl", ""], ["", "l10nValidateDate", "", "formControlName", ""]],
  inputs: {
    l10nValidateDate: "l10nValidateDate",
    options: "options",
    minDate: "minDate",
    maxDate: "maxDate",
    language: "language"
  },
  standalone: true,
  features: [ɵɵProvidersFeature([{
    provide: NG_VALIDATORS,
    useExisting: forwardRef(() => _L10nValidateDateDirective),
    multi: true
  }]), ɵɵNgOnChangesFeature]
});
var L10nValidateDateDirective = _L10nValidateDateDirective;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nValidateDateDirective, [{
    type: Directive,
    args: [{
      selector: "[l10nValidateDate][ngModel],[l10nValidateDate][formControl],[l10nValidateDate][formControlName]",
      providers: [{
        provide: NG_VALIDATORS,
        useExisting: forwardRef(() => L10nValidateDateDirective),
        multi: true
      }],
      standalone: true
    }]
  }], function() {
    return [{
      type: L10nValidation
    }];
  }, {
    l10nValidateDate: [{
      type: Input
    }],
    options: [{
      type: Input
    }],
    minDate: [{
      type: Input
    }],
    maxDate: [{
      type: Input
    }],
    language: [{
      type: Input
    }]
  });
})();
var _L10nValidationModule = class _L10nValidationModule {
  static forRoot(token = {}) {
    return {
      ngModule: _L10nValidationModule,
      providers: [{
        provide: L10nValidation,
        useClass: token.validation || L10nDefaultValidation
      }]
    };
  }
};
_L10nValidationModule.ɵfac = function L10nValidationModule_Factory(t) {
  return new (t || _L10nValidationModule)();
};
_L10nValidationModule.ɵmod = ɵɵdefineNgModule({
  type: _L10nValidationModule,
  imports: [L10nValidateNumberDirective, L10nValidateDateDirective],
  exports: [L10nValidateNumberDirective, L10nValidateDateDirective]
});
_L10nValidationModule.ɵinj = ɵɵdefineInjector({});
var L10nValidationModule = _L10nValidationModule;
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(L10nValidationModule, [{
    type: NgModule,
    args: [{
      imports: [L10nValidateNumberDirective, L10nValidateDateDirective],
      exports: [L10nValidateNumberDirective, L10nValidateDateDirective]
    }]
  }], null, null);
})();
export {
  L10N_CONFIG,
  L10N_LOCALE,
  L10nAsyncPipe,
  L10nCache,
  L10nDateAsyncPipe,
  L10nDateDirective,
  L10nDatePipe,
  L10nDirective,
  L10nDisplayNamesAsyncPipe,
  L10nDisplayNamesDirective,
  L10nDisplayNamesPipe,
  L10nIntlModule,
  L10nIntlService,
  L10nLoader,
  L10nLocaleResolver,
  L10nMissingTranslationHandler,
  L10nNumberAsyncPipe,
  L10nNumberDirective,
  L10nNumberPipe,
  L10nPluralAsyncPipe,
  L10nPluralDirective,
  L10nPluralPipe,
  L10nStorage,
  L10nTimeAgoAsyncPipe,
  L10nTimeAgoDirective,
  L10nTimeAgoPipe,
  L10nTranslateAsyncPipe,
  L10nTranslateDirective,
  L10nTranslatePipe,
  L10nTranslationFallback,
  L10nTranslationHandler,
  L10nTranslationLoader,
  L10nTranslationModule,
  L10nTranslationService,
  L10nValidateDateDirective,
  L10nValidateNumberDirective,
  L10nValidation,
  L10nValidationModule,
  PARSE_DATE_STYLE,
  PARSE_TIME_STYLE,
  formatLanguage,
  getBrowserLanguage,
  getSchema,
  getValue,
  handleParams,
  l10nValidateDate,
  l10nValidateNumber,
  mergeDeep,
  parseDigits,
  parseLanguage,
  provideL10nIntl,
  provideL10nTranslation,
  provideL10nValidation,
  resolveL10n,
  toDate,
  toNumber,
  validateLanguage
};
//# sourceMappingURL=angular-l10n.js.map
