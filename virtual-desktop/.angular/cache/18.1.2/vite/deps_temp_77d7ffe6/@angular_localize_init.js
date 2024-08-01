import "./chunk-CX3I3NQG.js";

// node_modules/@angular/localize/fesm2022/localize.mjs
var BLOCK_MARKER$1 = ":";
var _SerializerVisitor = class {
  visitText(text, context) {
    return text.value;
  }
  visitContainer(container, context) {
    return `[${container.children.map((child) => child.visit(this)).join(", ")}]`;
  }
  visitIcu(icu, context) {
    const strCases = Object.keys(icu.cases).map((k) => `${k} {${icu.cases[k].visit(this)}}`);
    return `{${icu.expression}, ${icu.type}, ${strCases.join(", ")}}`;
  }
  visitTagPlaceholder(ph, context) {
    return ph.isVoid ? `<ph tag name="${ph.startName}"/>` : `<ph tag name="${ph.startName}">${ph.children.map((child) => child.visit(this)).join(", ")}</ph name="${ph.closeName}">`;
  }
  visitPlaceholder(ph, context) {
    return ph.value ? `<ph name="${ph.name}">${ph.value}</ph>` : `<ph name="${ph.name}"/>`;
  }
  visitIcuPlaceholder(ph, context) {
    return `<ph icu name="${ph.name}">${ph.value.visit(this)}</ph>`;
  }
  visitBlockPlaceholder(ph, context) {
    return `<ph block name="${ph.startName}">${ph.children.map((child) => child.visit(this)).join(", ")}</ph name="${ph.closeName}">`;
  }
};
var serializerVisitor = new _SerializerVisitor();
var Endian;
(function(Endian2) {
  Endian2[Endian2["Little"] = 0] = "Little";
  Endian2[Endian2["Big"] = 1] = "Big";
})(Endian || (Endian = {}));
function findEndOfBlock(cooked, raw) {
  for (let cookedIndex = 1, rawIndex = 1; cookedIndex < cooked.length; cookedIndex++, rawIndex++) {
    if (raw[rawIndex] === "\\") {
      rawIndex++;
    } else if (cooked[cookedIndex] === BLOCK_MARKER$1) {
      return cookedIndex;
    }
  }
  throw new Error(`Unterminated $localize metadata block in "${raw}".`);
}
var $localize$1 = function(messageParts, ...expressions) {
  if ($localize$1.translate) {
    const translation = $localize$1.translate(messageParts, expressions);
    messageParts = translation[0];
    expressions = translation[1];
  }
  let message = stripBlock(messageParts[0], messageParts.raw[0]);
  for (let i = 1; i < messageParts.length; i++) {
    message += expressions[i - 1] + stripBlock(messageParts[i], messageParts.raw[i]);
  }
  return message;
};
var BLOCK_MARKER = ":";
function stripBlock(messagePart, rawMessagePart) {
  return rawMessagePart.charAt(0) === BLOCK_MARKER ? messagePart.substring(findEndOfBlock(messagePart, rawMessagePart) + 1) : messagePart;
}

// node_modules/@angular/localize/fesm2022/init.mjs
globalThis.$localize = $localize$1;
export {
  $localize$1 as $localize
};
/*! Bundled license information:

@angular/localize/fesm2022/localize.mjs:
  (**
   * @license Angular v18.0.7
   * (c) 2010-2024 Google LLC. https://angular.io/
   * License: MIT
   *)

@angular/localize/fesm2022/init.mjs:
  (**
   * @license Angular v18.0.7
   * (c) 2010-2024 Google LLC. https://angular.io/
   * License: MIT
   *)
*/
//# sourceMappingURL=@angular_localize_init.js.map
