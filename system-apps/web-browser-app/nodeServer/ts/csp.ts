// Content Security Policy Parser

export interface ContentSecurityPolicy {
  'base-uri'?: string;
  'block-all-mixed-content'?: string;
  'child-src'?: string;
  'connect-src'?: string;
  'default-src'?: string;
  'font-src'?: string;
  'form-action'?: string;
  'frame-ancestors'?: string;
  'frame-src'?: string;
  'img-src'?: string;
  'manifest-src'?: string;
  'media-src'?: string;
  'navigate-to'?: string;
  'object-src'?: string;
  'plugin-types'?: string;
  'prefetch-src'?: string;
  'referrer'?: string;
  'report-to'?: string;
  'report-uri'?: string;
  'require-sri-for'?: string;
  'sandbox'?: string;
  'script-src'?: string;
  'script-src-attr'?: string;
  'script-src-elem'?: string;
  'style-src'?: string;
  'style-src-attr'?: string;
  'style-src-elem'?: string;
  'trusted-types'?: string;
  'upgrade-insecure-requests'?: string;
  'worker-src'?: string;
  [name: string]: string;
}

export const CONTENT_SECURITY_POLICY = 'content-security-policy';

export class CSP {

  static parse(scpString: string): ContentSecurityPolicy {
    const directives = scpString.toLowerCase().split(';').map(directive => directive.trim());
    const csp: ContentSecurityPolicy = {};
    directives.forEach(directive => {
      const parts = directive.split(/s+/);
      const partsLen = parts.length;
      if (partsLen == 0) {
        return;
      }
      const directiveName = parts[0];
      const values = parts.slice(1);
      csp[directiveName] = values.join(' ');
    });
    return csp;
  }

  static stringify(csp: ContentSecurityPolicy): string {
    return Object.keys(csp).map(key => `${key} ${csp[key]}`).join(';');
  }
}