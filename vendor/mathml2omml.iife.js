var Mml2OmmlLib = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/mathml2omml/dist/index.esm.js
  var index_esm_exports = {};
  __export(index_esm_exports, {
    mml2omml: () => mml2omml
  });
  var xmlDecodeTree = /* @__PURE__ */ new Uint16Array(
    // prettier-ignore
    /* @__PURE__ */ "\u0200aglq	\x1B\u026D\0\0p;\u4026os;\u4027t;\u403Et;\u403Cuot;\u4022".split("").map((c) => c.charCodeAt(0))
  );
  var _a;
  var decodeMap = /* @__PURE__ */ new Map([
    [0, 65533],
    // C1 Unicode control character reference replacements
    [128, 8364],
    [130, 8218],
    [131, 402],
    [132, 8222],
    [133, 8230],
    [134, 8224],
    [135, 8225],
    [136, 710],
    [137, 8240],
    [138, 352],
    [139, 8249],
    [140, 338],
    [142, 381],
    [145, 8216],
    [146, 8217],
    [147, 8220],
    [148, 8221],
    [149, 8226],
    [150, 8211],
    [151, 8212],
    [152, 732],
    [153, 8482],
    [154, 353],
    [155, 8250],
    [156, 339],
    [158, 382],
    [159, 376]
  ]);
  var fromCodePoint = (
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, n/no-unsupported-features/es-builtins
    (_a = String.fromCodePoint) !== null && _a !== void 0 ? _a : (codePoint) => {
      let output = "";
      if (codePoint > 65535) {
        codePoint -= 65536;
        output += String.fromCharCode(codePoint >>> 10 & 1023 | 55296);
        codePoint = 56320 | codePoint & 1023;
      }
      output += String.fromCharCode(codePoint);
      return output;
    }
  );
  function replaceCodePoint(codePoint) {
    let _a2;
    if (codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111) {
      return 65533;
    }
    return (_a2 = decodeMap.get(codePoint)) !== null && _a2 !== void 0 ? _a2 : codePoint;
  }
  var CharCodes;
  ((CharCodes2) => {
    CharCodes2[CharCodes2.NUM = 35] = "NUM";
    CharCodes2[CharCodes2.SEMI = 59] = "SEMI";
    CharCodes2[CharCodes2.EQUALS = 61] = "EQUALS";
    CharCodes2[CharCodes2.ZERO = 48] = "ZERO";
    CharCodes2[CharCodes2.NINE = 57] = "NINE";
    CharCodes2[CharCodes2.LOWER_A = 97] = "LOWER_A";
    CharCodes2[CharCodes2.LOWER_F = 102] = "LOWER_F";
    CharCodes2[CharCodes2.LOWER_X = 120] = "LOWER_X";
    CharCodes2[CharCodes2.LOWER_Z = 122] = "LOWER_Z";
    CharCodes2[CharCodes2.UPPER_A = 65] = "UPPER_A";
    CharCodes2[CharCodes2.UPPER_F = 70] = "UPPER_F";
    CharCodes2[CharCodes2.UPPER_Z = 90] = "UPPER_Z";
  })(CharCodes || (CharCodes = {}));
  var TO_LOWER_BIT = 32;
  var BinTrieFlags;
  ((BinTrieFlags2) => {
    BinTrieFlags2[BinTrieFlags2.VALUE_LENGTH = 49152] = "VALUE_LENGTH";
    BinTrieFlags2[BinTrieFlags2.BRANCH_LENGTH = 16256] = "BRANCH_LENGTH";
    BinTrieFlags2[BinTrieFlags2.JUMP_TABLE = 127] = "JUMP_TABLE";
  })(BinTrieFlags || (BinTrieFlags = {}));
  function isNumber(code) {
    return code >= CharCodes.ZERO && code <= CharCodes.NINE;
  }
  function isHexadecimalCharacter(code) {
    return code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_F || code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_F;
  }
  function isAsciiAlphaNumeric(code) {
    return code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_Z || code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_Z || isNumber(code);
  }
  function isEntityInAttributeInvalidEnd(code) {
    return code === CharCodes.EQUALS || isAsciiAlphaNumeric(code);
  }
  var EntityDecoderState;
  ((EntityDecoderState2) => {
    EntityDecoderState2[EntityDecoderState2.EntityStart = 0] = "EntityStart";
    EntityDecoderState2[EntityDecoderState2.NumericStart = 1] = "NumericStart";
    EntityDecoderState2[EntityDecoderState2.NumericDecimal = 2] = "NumericDecimal";
    EntityDecoderState2[EntityDecoderState2.NumericHex = 3] = "NumericHex";
    EntityDecoderState2[EntityDecoderState2.NamedEntity = 4] = "NamedEntity";
  })(EntityDecoderState || (EntityDecoderState = {}));
  var DecodingMode;
  ((DecodingMode2) => {
    DecodingMode2[DecodingMode2.Legacy = 0] = "Legacy";
    DecodingMode2[DecodingMode2.Strict = 1] = "Strict";
    DecodingMode2[DecodingMode2.Attribute = 2] = "Attribute";
  })(DecodingMode || (DecodingMode = {}));
  var EntityDecoder = class {
    constructor(decodeTree, emitCodePoint, errors) {
      this.decodeTree = decodeTree;
      this.emitCodePoint = emitCodePoint;
      this.errors = errors;
      this.state = EntityDecoderState.EntityStart;
      this.consumed = 1;
      this.result = 0;
      this.treeIndex = 0;
      this.excess = 1;
      this.decodeMode = DecodingMode.Strict;
    }
    /** Resets the instance to make it reusable. */
    startEntity(decodeMode) {
      this.decodeMode = decodeMode;
      this.state = EntityDecoderState.EntityStart;
      this.result = 0;
      this.treeIndex = 0;
      this.excess = 1;
      this.consumed = 1;
    }
    /**
     * Write an entity to the decoder. This can be called multiple times with partial entities.
     * If the entity is incomplete, the decoder will return -1.
     *
     * Mirrors the implementation of `getDecoder`, but with the ability to stop decoding if the
     * entity is incomplete, and resume when the next string is written.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    write(input, offset) {
      switch (this.state) {
        case EntityDecoderState.EntityStart: {
          if (input.charCodeAt(offset) === CharCodes.NUM) {
            this.state = EntityDecoderState.NumericStart;
            this.consumed += 1;
            return this.stateNumericStart(input, offset + 1);
          }
          this.state = EntityDecoderState.NamedEntity;
          return this.stateNamedEntity(input, offset);
        }
        case EntityDecoderState.NumericStart: {
          return this.stateNumericStart(input, offset);
        }
        case EntityDecoderState.NumericDecimal: {
          return this.stateNumericDecimal(input, offset);
        }
        case EntityDecoderState.NumericHex: {
          return this.stateNumericHex(input, offset);
        }
        case EntityDecoderState.NamedEntity: {
          return this.stateNamedEntity(input, offset);
        }
      }
    }
    /**
     * Switches between the numeric decimal and hexadecimal states.
     *
     * Equivalent to the `Numeric character reference state` in the HTML spec.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNumericStart(input, offset) {
      if (offset >= input.length) {
        return -1;
      }
      if ((input.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X) {
        this.state = EntityDecoderState.NumericHex;
        this.consumed += 1;
        return this.stateNumericHex(input, offset + 1);
      }
      this.state = EntityDecoderState.NumericDecimal;
      return this.stateNumericDecimal(input, offset);
    }
    addToNumericResult(input, start, end, base) {
      if (start !== end) {
        const digitCount = end - start;
        this.result = this.result * base ** digitCount + Number.parseInt(input.substr(start, digitCount), base);
        this.consumed += digitCount;
      }
    }
    /**
     * Parses a hexadecimal numeric entity.
     *
     * Equivalent to the `Hexademical character reference state` in the HTML spec.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNumericHex(input, offset) {
      const startIndex = offset;
      while (offset < input.length) {
        const char = input.charCodeAt(offset);
        if (isNumber(char) || isHexadecimalCharacter(char)) {
          offset += 1;
        } else {
          this.addToNumericResult(input, startIndex, offset, 16);
          return this.emitNumericEntity(char, 3);
        }
      }
      this.addToNumericResult(input, startIndex, offset, 16);
      return -1;
    }
    /**
     * Parses a decimal numeric entity.
     *
     * Equivalent to the `Decimal character reference state` in the HTML spec.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNumericDecimal(input, offset) {
      const startIndex = offset;
      while (offset < input.length) {
        const char = input.charCodeAt(offset);
        if (isNumber(char)) {
          offset += 1;
        } else {
          this.addToNumericResult(input, startIndex, offset, 10);
          return this.emitNumericEntity(char, 2);
        }
      }
      this.addToNumericResult(input, startIndex, offset, 10);
      return -1;
    }
    /**
     * Validate and emit a numeric entity.
     *
     * Implements the logic from the `Hexademical character reference start
     * state` and `Numeric character reference end state` in the HTML spec.
     *
     * @param lastCp The last code point of the entity. Used to see if the
     *               entity was terminated with a semicolon.
     * @param expectedLength The minimum number of characters that should be
     *                       consumed. Used to validate that at least one digit
     *                       was consumed.
     * @returns The number of characters that were consumed.
     */
    emitNumericEntity(lastCp, expectedLength) {
      let _a2;
      if (this.consumed <= expectedLength) {
        ;
        (_a2 = this.errors) === null || _a2 === void 0 ? void 0 : _a2.absenceOfDigitsInNumericCharacterReference(this.consumed);
        return 0;
      }
      if (lastCp === CharCodes.SEMI) {
        this.consumed += 1;
      } else if (this.decodeMode === DecodingMode.Strict) {
        return 0;
      }
      this.emitCodePoint(replaceCodePoint(this.result), this.consumed);
      if (this.errors) {
        if (lastCp !== CharCodes.SEMI) {
          this.errors.missingSemicolonAfterCharacterReference();
        }
        this.errors.validateNumericCharacterReference(this.result);
      }
      return this.consumed;
    }
    /**
     * Parses a named entity.
     *
     * Equivalent to the `Named character reference state` in the HTML spec.
     *
     * @param input The string containing the entity (or a continuation of the entity).
     * @param offset The current offset.
     * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
     */
    stateNamedEntity(input, offset) {
      const { decodeTree } = this;
      let current = decodeTree[this.treeIndex];
      let valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
      for (; offset < input.length; offset++, this.excess++) {
        const char = input.charCodeAt(offset);
        this.treeIndex = determineBranch(
          decodeTree,
          current,
          this.treeIndex + Math.max(1, valueLength),
          char
        );
        if (this.treeIndex < 0) {
          return this.result === 0 || // If we are parsing an attribute
          this.decodeMode === DecodingMode.Attribute && // We shouldn't have consumed any characters after the entity,
          (valueLength === 0 || // And there should be no invalid characters.
          isEntityInAttributeInvalidEnd(char)) ? 0 : this.emitNotTerminatedNamedEntity();
        }
        current = decodeTree[this.treeIndex];
        valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
        if (valueLength !== 0) {
          if (char === CharCodes.SEMI) {
            return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
          }
          if (this.decodeMode !== DecodingMode.Strict) {
            this.result = this.treeIndex;
            this.consumed += this.excess;
            this.excess = 0;
          }
        }
      }
      return -1;
    }
    /**
     * Emit a named entity that was not terminated with a semicolon.
     *
     * @returns The number of characters consumed.
     */
    emitNotTerminatedNamedEntity() {
      let _a2;
      const { result, decodeTree } = this;
      const valueLength = (decodeTree[result] & BinTrieFlags.VALUE_LENGTH) >> 14;
      this.emitNamedEntityData(result, valueLength, this.consumed);
      (_a2 = this.errors) === null || _a2 === void 0 ? void 0 : _a2.missingSemicolonAfterCharacterReference();
      return this.consumed;
    }
    /**
     * Emit a named entity.
     *
     * @param result The index of the entity in the decode tree.
     * @param valueLength The number of bytes in the entity.
     * @param consumed The number of characters consumed.
     *
     * @returns The number of characters consumed.
     */
    emitNamedEntityData(result, valueLength, consumed) {
      const { decodeTree } = this;
      this.emitCodePoint(
        valueLength === 1 ? decodeTree[result] & ~BinTrieFlags.VALUE_LENGTH : decodeTree[result + 1],
        consumed
      );
      if (valueLength === 3) {
        this.emitCodePoint(decodeTree[result + 2], consumed);
      }
      return consumed;
    }
    /**
     * Signal to the parser that the end of the input was reached.
     *
     * Remaining data will be emitted and relevant errors will be produced.
     *
     * @returns The number of characters consumed.
     */
    end() {
      let _a2;
      switch (this.state) {
        case EntityDecoderState.NamedEntity: {
          return this.result !== 0 && (this.decodeMode !== DecodingMode.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
        }
        // Otherwise, emit a numeric entity if we have one.
        case EntityDecoderState.NumericDecimal: {
          return this.emitNumericEntity(0, 2);
        }
        case EntityDecoderState.NumericHex: {
          return this.emitNumericEntity(0, 3);
        }
        case EntityDecoderState.NumericStart: {
          ;
          (_a2 = this.errors) === null || _a2 === void 0 ? void 0 : _a2.absenceOfDigitsInNumericCharacterReference(this.consumed);
          return 0;
        }
        case EntityDecoderState.EntityStart: {
          return 0;
        }
      }
    }
  };
  function getDecoder(decodeTree) {
    let returnValue = "";
    const decoder = new EntityDecoder(decodeTree, (data) => returnValue += fromCodePoint(data));
    return function decodeWithTrie(input, decodeMode) {
      let lastIndex = 0;
      let offset = 0;
      while ((offset = input.indexOf("&", offset)) >= 0) {
        returnValue += input.slice(lastIndex, offset);
        decoder.startEntity(decodeMode);
        const length = decoder.write(
          input,
          // Skip the "&"
          offset + 1
        );
        if (length < 0) {
          lastIndex = offset + decoder.end();
          break;
        }
        lastIndex = offset + length;
        offset = length === 0 ? lastIndex + 1 : lastIndex;
      }
      const result = returnValue + input.slice(lastIndex);
      returnValue = "";
      return result;
    };
  }
  function determineBranch(decodeTree, current, nodeIndex, char) {
    const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
    const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
    if (branchCount === 0) {
      return jumpOffset !== 0 && char === jumpOffset ? nodeIndex : -1;
    }
    if (jumpOffset) {
      const value = char - jumpOffset;
      return value < 0 || value >= branchCount ? -1 : decodeTree[nodeIndex + value] - 1;
    }
    let lo = nodeIndex;
    let hi = lo + branchCount - 1;
    while (lo <= hi) {
      const mid = lo + hi >>> 1;
      const midValue = decodeTree[mid];
      if (midValue < char) {
        lo = mid + 1;
      } else if (midValue > char) {
        hi = mid - 1;
      } else {
        return decodeTree[mid + branchCount];
      }
    }
    return -1;
  }
  var xmlDecoder = /* @__PURE__ */ getDecoder(xmlDecodeTree);
  function decodeXML(xmlString) {
    return xmlDecoder(xmlString, DecodingMode.Strict);
  }
  var attrRE = /\s([^'"/\s><]+?)[\s/>]|([^\s=]+)=\s?(".*?"|'.*?')/g;
  function stringify$1(tag) {
    const res = {
      type: "tag",
      name: "",
      voidElement: false,
      attribs: {},
      children: []
    };
    const tagMatch = tag.match(/<\/?([^\s]+?)[/\s>]/);
    if (tagMatch) {
      res.name = tagMatch[1];
      if (tag.charAt(tag.length - 2) === "/") {
        res.voidElement = true;
      }
      if (res.name.startsWith("!--")) {
        const endIndex = tag.indexOf("-->");
        return {
          type: "comment",
          comment: endIndex !== -1 ? tag.slice(4, endIndex) : ""
        };
      }
    }
    const reg = new RegExp(attrRE);
    let result = null;
    for (; ; ) {
      result = reg.exec(tag);
      if (result === null) {
        break;
      }
      if (!result[0].trim()) {
        continue;
      }
      if (result[1]) {
        const attr = result[1].trim();
        let arr = [attr, ""];
        if (attr.indexOf("=") > -1) {
          arr = attr.split("=");
        }
        res.attribs[arr[0]] = arr[1];
        reg.lastIndex--;
      } else if (result[2]) {
        res.attribs[result[2]] = result[3].trim().substring(1, result[3].length - 1);
      }
    }
    return res;
  }
  var tagRE = /<[a-zA-Z0-9\-!/](?:"[^"]*"|'[^']*'|[^'">])*>/g;
  var whitespaceRE = /^\s*$/;
  var textContainerNames = ["mtext", "mi", "mn", "mo", "ms"];
  var empty = /* @__PURE__ */ Object.create(null);
  function parse(html, options) {
    options || (options = {});
    options.components || (options.components = empty);
    const result = [];
    const arr = [];
    let current;
    let level = -1;
    html.replace(tagRE, (tag, index) => {
      const isOpen = tag.charAt(1) !== "/";
      const isComment = tag.startsWith("<!--");
      const start = index + tag.length;
      const nextChar = html.charAt(start);
      let parent;
      if (isComment) {
        const comment = stringify$1(tag);
        if (level < 0) {
          result.push(comment);
          return result;
        }
        parent = arr[level];
        parent.children.push(comment);
        return result;
      }
      if (isOpen) {
        level++;
        current = stringify$1(tag);
        if (current.type === "tag" && options.components[current.name]) {
          current.type = "component";
        }
        if (textContainerNames.includes(current.name) && !current.voidElement && nextChar && nextChar !== "<") {
          const data = html.slice(start, html.indexOf("<", start)).trim();
          current.children.push({
            type: "text",
            data: options.disableDecode ? data : decodeXML(data)
          });
        }
        if (level === 0) {
          result.push(current);
        }
        parent = arr[level - 1];
        if (parent) {
          parent.children.push(current);
        }
        arr[level] = current;
      }
      if (!isOpen || current.voidElement) {
        if (level > -1 && (current.voidElement || current.name === tag.slice(2, -1))) {
          level--;
          current = level === -1 ? result : arr[level];
        }
        if (level > -1 && textContainerNames.includes[arr[level].name] && nextChar !== "<" && nextChar) {
          parent = arr[level].children;
          const end = html.indexOf("<", start);
          let data = html.slice(start, end === -1 ? void 0 : end);
          if (whitespaceRE.test(data)) {
            data = " ";
          }
          if (end > -1 && level + parent.length >= 0 || data !== " ") {
            parent.push({
              type: "text",
              data: options.disableDecode ? data : decodeXML(data)
            });
          }
        }
      }
    });
    return result;
  }
  function attrString(attribs) {
    const buff = [];
    for (const key in attribs) {
      buff.push(`${key}="${attribs[key]}"`);
    }
    if (!buff.length) {
      return "";
    }
    return ` ${buff.join(" ")}`;
  }
  function stringify(buff, doc) {
    switch (doc.type) {
      case "text":
        return buff + doc.data;
      case "tag": {
        const voidElement = doc.voidElement || !doc.children.length && doc.attribs["xml:space"] !== "preserve";
        buff += `<${doc.name}${doc.attribs ? attrString(doc.attribs) : ""}${voidElement ? "/>" : ">"}`;
        if (voidElement) {
          return buff;
        }
        return `${buff + doc.children.reduce(stringify, "")}</${doc.name}>`;
      }
      case "comment":
        buff += `<!--${doc.comment}-->`;
        return buff;
    }
  }
  function stringifyDoc(doc) {
    return doc.reduce((token, rootEl) => token + stringify("", rootEl), "");
  }
  function getTextContent(node, trim = true) {
    let returnString = "";
    if (node.type === "text") {
      let text2 = node.data.replace(/[\u2062]|[\u200B]/g, "");
      if (trim) {
        text2 = text2.trim();
      }
      returnString += text2;
    } else if (node.children) {
      node.children.forEach((subNode) => {
        returnString += getTextContent(subNode, trim);
      });
    }
    return returnString;
  }
  var NARY_REGEXP = /^[\u220f-\u2211]|[\u2229-\u2233]|[\u22c0-\u22c3]$/;
  var GROW_REGEXP = /^\u220f|\u2211|[\u2229-\u222b]|\u222e|\u222f|\u2232|\u2233|[\u22c0-\u22c3]$/;
  function getNary(node) {
    const text2 = getTextContent(node);
    if (NARY_REGEXP.test(text2)) {
      return text2;
    }
    return false;
  }
  function getNaryTarget(naryChar, element, type, subHide = false, supHide = false) {
    const stretchy = element.attribs?.stretchy;
    const grow = stretchy === "true" ? "1" : stretchy === "false" ? "0" : GROW_REGEXP.test(naryChar) ? "1" : "0";
    return {
      type: "tag",
      name: "m:nary",
      attribs: {},
      children: [
        {
          type: "tag",
          name: "m:naryPr",
          attribs: {},
          children: [
            { type: "tag", name: "m:chr", attribs: { "m:val": naryChar }, children: [] },
            { type: "tag", name: "m:limLoc", attribs: { "m:val": type }, children: [] },
            { type: "tag", name: "m:grow", attribs: { "m:val": grow }, children: [] },
            {
              type: "tag",
              name: "m:subHide",
              attribs: { "m:val": subHide ? "on" : "off" },
              children: []
            },
            {
              type: "tag",
              name: "m:supHide",
              attribs: { "m:val": supHide ? "on" : "off" },
              children: []
            }
          ]
        }
      ]
    };
  }
  function addScriptlevel(target, ancestors) {
    const scriptlevel = ancestors.find((ancestor) => ancestor.attribs?.scriptlevel)?.attribs?.scriptlevel;
    if (["0", "1", "2"].includes(scriptlevel)) {
      target.children.unshift({
        type: "tag",
        name: "m:argPr",
        attribs: {},
        children: [
          {
            type: "tag",
            name: "m:scrLvl",
            attribs: { "m:val": scriptlevel },
            children: []
          }
        ]
      });
    }
  }
  function math(element, targetParent, previousSibling, nextSibling, ancestors) {
    targetParent.name = "m:oMath";
    targetParent.attribs = {
      "xmlns:m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
      "xmlns:w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    };
    targetParent.type = "tag";
    targetParent.children = [];
    return targetParent;
  }
  function semantics(element, targetParent, previousSibling, nextSibling, ancestors) {
    return targetParent;
  }
  function menclose(element, targetParent, previousSibling, nextSibling, ancestors) {
    const type = element.attribs?.notation?.split(" ")[0] || "longdiv";
    const targetElement = {
      type: "tag",
      name: "m:e",
      attribs: {},
      children: []
    };
    if (type === "longdiv") {
      targetParent.children.push({
        type: "tag",
        name: "m:rad",
        attribs: {},
        children: [
          {
            type: "tag",
            name: "m:radPr",
            attribs: {},
            children: [{ type: "tag", name: "m:degHide", attribs: { "m:val": "on" }, children: [] }]
          },
          { type: "tag", name: "m:deg", attribs: {}, children: [] },
          targetElement
        ]
      });
    } else {
      const hide = {
        t: { type: "tag", name: "m:hideTop", attribs: { "m:val": "on" }, children: [] },
        b: { type: "tag", name: "m:hideBot", attribs: { "m:val": "on" }, children: [] },
        l: { type: "tag", name: "m:hideLeft", attribs: { "m:val": "on" }, children: [] },
        r: { type: "tag", name: "m:hideRight", attribs: { "m:val": "on" }, children: [] }
      };
      const borderBoxPr = { type: "tag", name: "m:borderBoxPr", attribs: {}, children: [] };
      const containerElement = {
        type: "tag",
        name: "m:borderBox",
        attribs: {},
        children: []
      };
      switch (type) {
        case "actuarial":
        case "radical":
        case "box":
          containerElement.children = [targetElement];
          break;
        case "left":
        case "roundedbox":
          borderBoxPr.children = [hide.t, hide.b, hide.r];
          containerElement.children = [borderBoxPr, targetElement];
          break;
        case "right":
        case "circle":
          borderBoxPr.children = [hide.t, hide.b, hide.l];
          containerElement.children = [borderBoxPr, targetElement];
          break;
        case "top":
          borderBoxPr.children = [hide.b, hide.l, hide.r];
          containerElement.children = [borderBoxPr, targetElement];
          break;
        case "bottom":
          borderBoxPr.children = [hide.t, hide.l, hide.r];
          containerElement.children = [borderBoxPr, targetElement];
          break;
        case "updiagonalstrike":
          borderBoxPr.children = [
            hide.t,
            hide.b,
            hide.l,
            hide.r,
            { type: "tag", name: "m:strikeBLTR", attribs: { "m:val": "on" }, children: [] }
          ];
          containerElement.children = [borderBoxPr, targetElement];
          break;
        case "downdiagonalstrike":
          borderBoxPr.children = [
            hide.t,
            hide.b,
            hide.l,
            hide.r,
            { type: "tag", name: "m:strikeTLBR", attribs: { "m:val": "on" }, children: [] }
          ];
          containerElement.children = [borderBoxPr, targetElement];
          break;
        case "verticalstrike":
          borderBoxPr.children = [
            hide.t,
            hide.b,
            hide.l,
            hide.r,
            { type: "tag", name: "m:strikeV", attribs: { "m:val": "on" }, children: [] }
          ];
          containerElement.children = [borderBoxPr, targetElement];
          break;
        case "horizontalstrike":
          borderBoxPr.children = [
            hide.t,
            hide.b,
            hide.l,
            hide.r,
            { type: "tag", name: "m:strikeH", attribs: { "m:val": "on" }, children: [] }
          ];
          containerElement.children = [borderBoxPr, targetElement];
          break;
        default:
          borderBoxPr.children = [hide.t, hide.b, hide.l, hide.r];
          containerElement.children = [borderBoxPr, targetElement];
          break;
      }
      targetParent.children.push(containerElement);
    }
    return targetElement;
  }
  function mfrac(element, targetParent, previousSibling, nextSibling, ancestors) {
    if (element.children.length !== 2) {
      return targetParent;
    }
    const numerator = element.children[0];
    const denumerator = element.children[1];
    const numeratorTarget = {
      name: "m:num",
      type: "tag",
      attribs: {},
      children: []
    };
    const denumeratorTarget = {
      name: "m:den",
      type: "tag",
      attribs: {},
      children: []
    };
    ancestors = [...ancestors];
    ancestors.unshift(element);
    walker(numerator, numeratorTarget, false, false, ancestors);
    walker(denumerator, denumeratorTarget, false, false, ancestors);
    const fracType = element.attribs?.linethickness === "0" ? "noBar" : "bar";
    targetParent.children.push({
      type: "tag",
      name: "m:f",
      attribs: {},
      children: [
        {
          type: "tag",
          name: "m:fPr",
          attribs: {},
          children: [
            {
              type: "tag",
              name: "m:type",
              attribs: {
                "m:val": fracType
              },
              children: []
            }
          ]
        },
        numeratorTarget,
        denumeratorTarget
      ]
    });
  }
  function mglyph(element, targetParent, previousSibling, nextSibling, ancestors) {
    if (element.attribs?.alt) {
      targetParent.children.push({
        type: "text",
        data: element.attribs.alt
      });
    }
  }
  function mmultiscripts(element, targetParent, previousSibling, nextSibling, ancestors) {
    if (element.children.length === 0) {
      return;
    }
    const base = element.children[0];
    const postSubs = [];
    const postSupers = [];
    const preSubs = [];
    const preSupers = [];
    const children = element.children.slice(1);
    let dividerFound = false;
    children.forEach((child, index) => {
      if (child.name === "mprescripts") {
        dividerFound = true;
      } else if (child.name !== "none") {
        if (index % 2) {
          if (dividerFound) {
            preSubs.push(child);
          } else {
            postSupers.push(child);
          }
        } else {
          if (dividerFound) {
            preSupers.push(child);
          } else {
            postSubs.push(child);
          }
        }
      }
    });
    ancestors = [...ancestors];
    ancestors.unshift(element);
    const tempTarget = {
      children: []
    };
    walker(base, tempTarget, false, false, ancestors);
    let topTarget = tempTarget.children[0];
    if (postSubs.length || postSupers.length) {
      const subscriptTarget = {
        name: "m:sub",
        type: "tag",
        attribs: {},
        children: []
      };
      postSubs.forEach((subscript) => walker(subscript, subscriptTarget, false, false, ancestors));
      const superscriptTarget = {
        name: "m:sup",
        type: "tag",
        attribs: {},
        children: []
      };
      postSupers.forEach(
        (superscript) => walker(superscript, superscriptTarget, false, false, ancestors)
      );
      const topPostTarget = {
        type: "tag",
        attribs: {},
        children: [
          {
            type: "tag",
            name: "m:e",
            attribs: {},
            children: [topTarget]
          }
        ]
      };
      if (postSubs.length && postSupers.length) {
        topPostTarget.name = "m:sSubSup";
        topPostTarget.children.push(subscriptTarget);
        topPostTarget.children.push(superscriptTarget);
      } else if (postSubs.length) {
        topPostTarget.name = "m:sSub";
        topPostTarget.children.push(subscriptTarget);
      } else {
        topPostTarget.name = "m:sSup";
        topPostTarget.children.push(superscriptTarget);
      }
      topTarget = topPostTarget;
    }
    if (preSubs.length || preSupers.length) {
      const preSubscriptTarget = {
        name: "m:sub",
        type: "tag",
        attribs: {},
        children: []
      };
      preSubs.forEach((subscript) => walker(subscript, preSubscriptTarget, false, false, ancestors));
      const preSuperscriptTarget = {
        name: "m:sup",
        type: "tag",
        attribs: {},
        children: []
      };
      preSupers.forEach(
        (superscript) => walker(superscript, preSuperscriptTarget, false, false, ancestors)
      );
      const topPreTarget = {
        name: "m:sPre",
        type: "tag",
        attribs: {},
        children: [
          {
            name: "m:e",
            type: "tag",
            attribs: {},
            children: [topTarget]
          },
          preSubscriptTarget,
          preSuperscriptTarget
        ]
      };
      topTarget = topPreTarget;
    }
    targetParent.children.push(topTarget);
  }
  function mrow(element, targetParent, previousSibling, nextSibling, ancestors) {
    if (previousSibling.isNary) {
      const targetSibling = targetParent.children[targetParent.children.length - 1];
      return targetSibling.children[targetSibling.children.length - 1];
    }
    return targetParent;
  }
  function mspace(element, targetParent, previousSibling, nextSibling, ancestors) {
    targetParent.children.push({
      name: "m:r",
      type: "tag",
      attribs: {},
      children: [
        {
          name: "m:t",
          type: "tag",
          attribs: {
            "xml:space": "preserve"
          },
          children: [
            {
              type: "text",
              data: " "
            }
          ]
        }
      ]
    });
  }
  function msqrt(element, targetParent, previousSibling, nextSibling, ancestors) {
    const targetElement = {
      name: "m:e",
      type: "tag",
      attribs: {},
      children: []
    };
    targetParent.children.push({
      name: "m:rad",
      type: "tag",
      attribs: {},
      children: [
        {
          name: "m:radPr",
          type: "tag",
          attribs: {},
          children: [
            {
              name: "m:degHide",
              type: "tag",
              attribs: {
                "m:val": "on"
              },
              children: []
            }
          ]
        },
        {
          name: "m:deg",
          type: "tag",
          attribs: {},
          children: []
        },
        targetElement
      ]
    });
    return targetElement;
  }
  function mstyle(element, targetParent, previousSibling, nextSibling, ancestors) {
    return targetParent;
  }
  function msub(element, targetParent, previousSibling, nextSibling, ancestors) {
    if (element.children.length !== 2) {
      return targetParent;
    }
    ancestors = [...ancestors];
    ancestors.unshift(element);
    const base = element.children[0];
    const subscript = element.children[1];
    let topTarget;
    const naryChar = getNary(base);
    if (naryChar && element.attribs?.accent?.toLowerCase() !== "true" && element.attribs?.accentunder?.toLowerCase() !== "true") {
      topTarget = getNaryTarget(naryChar, element, "subSup", false, true);
      element.isNary = true;
    } else {
      const baseTarget = {
        name: "m:e",
        type: "tag",
        attribs: {},
        children: []
      };
      walker(base, baseTarget, false, false, ancestors);
      topTarget = {
        type: "tag",
        name: "m:sSub",
        attribs: {},
        children: [
          {
            type: "tag",
            name: "m:sSubPr",
            attribs: {},
            children: [
              {
                type: "tag",
                name: "m:ctrlPr",
                attribs: {},
                children: []
              }
            ]
          },
          baseTarget
        ]
      };
    }
    const subscriptTarget = {
      name: "m:sub",
      type: "tag",
      attribs: {},
      children: []
    };
    walker(subscript, subscriptTarget, false, false, ancestors);
    topTarget.children.push(subscriptTarget);
    if (element.isNary) {
      topTarget.children.push({ type: "tag", name: "m:sup", attribs: {}, children: [] });
      topTarget.children.push({ type: "tag", name: "m:e", attribs: {}, children: [] });
    }
    targetParent.children.push(topTarget);
  }
  function msubsup(element, targetParent, previousSibling, nextSibling, ancestors) {
    if (element.children.length !== 3) {
      return targetParent;
    }
    ancestors = [...ancestors];
    ancestors.unshift(element);
    const base = element.children[0];
    const subscript = element.children[1];
    const superscript = element.children[2];
    let topTarget;
    const naryChar = getNary(base);
    if (naryChar && element.attribs?.accent?.toLowerCase() !== "true" && element.attribs?.accentunder?.toLowerCase() !== "true") {
      topTarget = getNaryTarget(naryChar, element, "subSup");
      element.isNary = true;
    } else {
      const baseTarget = {
        name: "m:e",
        type: "tag",
        attribs: {},
        children: []
      };
      walker(base, baseTarget, false, false, ancestors);
      topTarget = {
        type: "tag",
        name: "m:sSubSup",
        attribs: {},
        children: [
          {
            type: "tag",
            name: "m:sSubSupPr",
            attribs: {},
            children: [
              {
                type: "tag",
                name: "m:ctrlPr",
                attribs: {},
                children: []
              }
            ]
          },
          baseTarget
        ]
      };
    }
    const subscriptTarget = {
      name: "m:sub",
      type: "tag",
      attribs: {},
      children: []
    };
    const superscriptTarget = {
      name: "m:sup",
      type: "tag",
      attribs: {},
      children: []
    };
    walker(subscript, subscriptTarget, false, false, ancestors);
    walker(superscript, superscriptTarget, false, false, ancestors);
    topTarget.children.push(subscriptTarget);
    topTarget.children.push(superscriptTarget);
    if (element.isNary) {
      topTarget.children.push({ type: "tag", name: "m:e", attribs: {}, children: [] });
    }
    targetParent.children.push(topTarget);
  }
  function msup(element, targetParent, previousSibling, nextSibling, ancestors) {
    if (element.children.length !== 2) {
      return targetParent;
    }
    ancestors = [...ancestors];
    ancestors.unshift(element);
    const base = element.children[0];
    const superscript = element.children[1];
    let topTarget;
    const naryChar = getNary(base);
    if (naryChar && element.attribs?.accent?.toLowerCase() !== "true" && element.attribs?.accentunder?.toLowerCase() !== "true") {
      topTarget = getNaryTarget(naryChar, element, "subSup", true);
      element.isNary = true;
      topTarget.children.push({ type: "tag", name: "m:sub" });
    } else {
      const baseTarget = {
        name: "m:e",
        type: "tag",
        attribs: {},
        children: []
      };
      walker(base, baseTarget, false, false, ancestors);
      topTarget = {
        type: "tag",
        name: "m:sSup",
        attribs: {},
        children: [
          {
            type: "tag",
            name: "m:sSupPr",
            attribs: {},
            children: [
              {
                type: "tag",
                name: "m:ctrlPr",
                attribs: {},
                children: []
              }
            ]
          },
          baseTarget
        ]
      };
    }
    const superscriptTarget = {
      name: "m:sup",
      type: "tag",
      attribs: {},
      children: []
    };
    walker(superscript, superscriptTarget, false, false, ancestors);
    topTarget.children.push(superscriptTarget);
    if (element.isNary) {
      topTarget.children.push({ type: "tag", name: "m:e", attribs: {}, children: [] });
    }
    targetParent.children.push(topTarget);
  }
  function mtable(element, targetParent, previousSibling, nextSibling, ancestors) {
    const cellsPerRowCount = Math.max(...element.children.map((row) => row.children.length));
    const targetElement = {
      name: "m:m",
      type: "tag",
      attribs: {},
      children: [
        {
          name: "m:mPr",
          type: "tag",
          attribs: {},
          children: [
            {
              name: "m:baseJc",
              type: "tag",
              attribs: {
                "m:val": "center"
              },
              children: []
            },
            {
              name: "m:plcHide",
              type: "tag",
              attribs: {
                "m:val": "on"
              },
              children: []
            },
            {
              name: "m:mcs",
              type: "tag",
              attribs: {},
              children: [
                {
                  name: "m:mc",
                  type: "tag",
                  attribs: {},
                  children: [
                    {
                      name: "m:mcPr",
                      type: "tag",
                      attribs: {},
                      children: [
                        {
                          name: "m:count",
                          type: "tag",
                          attribs: {
                            "m:val": cellsPerRowCount.toString()
                          },
                          children: []
                        },
                        {
                          name: "m:mcJc",
                          type: "tag",
                          attribs: {
                            "m:val": "center"
                          },
                          children: []
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    targetParent.children.push(targetElement);
    return targetElement;
  }
  function mtd(element, targetParent, previousSibling, nextSibling, ancestors) {
    const targetElement = {
      name: "m:e",
      type: "tag",
      attribs: {},
      children: []
    };
    targetParent.children.push(targetElement);
    return targetElement;
  }
  function mtr(element, targetParent, previousSibling, nextSibling, ancestors) {
    const targetElement = {
      name: "m:mr",
      type: "tag",
      attribs: {},
      children: []
    };
    targetParent.children.push(targetElement);
    return targetElement;
  }
  function munderover(element, targetParent, previousSibling, nextSibling, ancestors) {
    if (element.children.length !== 3) {
      return targetParent;
    }
    ancestors = [...ancestors];
    ancestors.unshift(element);
    const base = element.children[0];
    const underscript = element.children[1];
    const overscript = element.children[2];
    const naryChar = getNary(base);
    if (naryChar && element.attributes?.accent?.toLowerCase() !== "true" && element.attributes?.accentunder?.toLowerCase() !== "true") {
      const topTarget = getNaryTarget(naryChar, element, "undOvr");
      element.isNary = true;
      const subscriptTarget = {
        name: "m:sub",
        type: "tag",
        attribs: {},
        children: []
      };
      const superscriptTarget = {
        name: "m:sup",
        type: "tag",
        attribs: {},
        children: []
      };
      walker(underscript, subscriptTarget, false, false, ancestors);
      walker(overscript, superscriptTarget, false, false, ancestors);
      topTarget.children.push(subscriptTarget);
      topTarget.children.push(superscriptTarget);
      topTarget.children.push({ type: "tag", name: "m:e", attribs: {}, children: [] });
      targetParent.children.push(topTarget);
      return;
    }
    const baseTarget = {
      name: "m:e",
      type: "tag",
      attribs: {},
      children: []
    };
    walker(base, baseTarget, false, false, ancestors);
    const underscriptTarget = {
      name: "m:lim",
      type: "tag",
      attribs: {},
      children: []
    };
    const overscriptTarget = {
      name: "m:lim",
      type: "tag",
      attribs: {},
      children: []
    };
    walker(underscript, underscriptTarget, false, false, ancestors);
    walker(overscript, overscriptTarget, false, false, ancestors);
    targetParent.children.push({
      type: "tag",
      name: "m:limUpp",
      attribs: {},
      children: [
        {
          type: "tag",
          name: "m:e",
          attribs: {},
          children: [
            {
              type: "tag",
              name: "m:limLow",
              attribs: {},
              children: [baseTarget, underscriptTarget]
            }
          ]
        },
        overscriptTarget
      ]
    });
  }
  function getStyle(element, ancestors, previousStyle = {}) {
    const elAttributes = element.attribs || {};
    const color = elAttributes.mathcolor || ancestors.find(
      (element2) => element2.name === "mstyle" && element2.attribs && element2.attribs.color
    )?.attribs.color || "";
    const size = elAttributes.mathsize || ancestors.find(
      (element2) => element2.name === "mstyle" && element2.attribs && element2.attribs.mathsize
    )?.attribs.mathsize || "";
    const scriptlevel = elAttributes.scriptlevel || ancestors.find(
      (element2) => element2.name === "mstyle" && element2.attribs && element2.attribs.scriptlevel
    )?.attribs.scriptlevel || "";
    const background = elAttributes.mathbackground || ancestors.find(
      (element2) => element2.name === "mstyle" && element2.attribs && element2.attribs.mathbackground
    )?.attribs.mathbackground || "";
    let variant = elAttributes.mathvariant || ancestors.find(
      (element2) => element2.name === "mstyle" && element2.attribs && element2.attribs.mathvariant
    )?.attribs.mathvariant || "";
    if (variant === "b-i") {
      variant = "bold-italic";
    }
    const fontweight = elAttributes.fontweight || ancestors.find(
      (element2) => element2.name === "mstyle" && element2.attribs && element2.attribs.fontweight
    )?.attribs.fontweight || "";
    if (fontweight === "bold" && !["bold", "bold-italic"].includes(variant)) {
      if (variant.includes("italic")) {
        variant = "bold-italic";
      } else {
        variant = "bold";
      }
    } else if (fontweight === "normal" && ["bold", "bold-italic"].includes(variant)) {
      if (variant.includes("italic")) {
        variant = "italic";
      } else {
        variant = "";
      }
    }
    const fontstyle = elAttributes.fontstyle || ancestors.find(
      (element2) => element2.name === "mstyle" && element2.attribs && element2.attribs.fontstyle
    )?.attribs.fontstyle || "";
    if (fontstyle === "italic" && !["italic", "bold-italic"].includes(variant)) {
      if (variant.includes("bold")) {
        variant = "bold-italic";
      } else {
        variant = "italic";
      }
    } else if (fontstyle === "normal" && ["italic", "bold-italic"].includes(variant)) {
      if (variant.includes("bold")) {
        variant = "bold";
      } else {
        variant = "";
      }
    }
    if (!elAttributes.mathvariant) {
      const textContent = getTextContent(element);
      if (previousStyle.variant === "" && (element.name === "mi" && textContent.length > 1 || element.name === "mn" && !/^\d+\.\d+$/.test(textContent))) {
        variant = "";
      } else if (["mi", "mn", "mo"].includes(element.name) && ["italic", "bold-italic"].includes(previousStyle.variant)) {
        if (fontweight === "bold") {
          variant = "bold-italic";
        } else {
          variant = "italic";
        }
      }
    }
    return {
      color,
      variant,
      size,
      scriptlevel,
      background,
      fontstyle
    };
  }
  var STYLES = {
    bold: "b",
    italic: "i",
    "bold-italic": "bi"
  };
  function textContainer(element, targetParent, previousSibling, nextSibling, ancestors, textType) {
    if (previousSibling.isNary) {
      const previousSiblingTarget = targetParent.children[targetParent.children.length - 1];
      targetParent = previousSiblingTarget.children[previousSiblingTarget.children.length - 1];
    }
    const hasMglyphChild = element.children?.find((element2) => element2.name === "mglyph");
    const style = getStyle(element, ancestors, previousSibling?.style);
    element.style = style;
    element.hasMglyphChild = hasMglyphChild;
    const styleSame = Object.keys(style).every((key) => {
      const previousStyle = previousSibling?.style;
      return previousStyle && style[key] === previousStyle[key];
    }) && previousSibling?.hasMglyphChild === hasMglyphChild;
    const sameGroup = (
      // Only group mtexts or mi, mn, mo with oneanother.
      textType === previousSibling?.name || ["mi", "mn", "mo"].includes(textType) && ["mi", "mn", "mo"].includes(previousSibling?.name)
    );
    let targetElement;
    if (sameGroup && styleSame && !hasMglyphChild) {
      const rElement = targetParent.children[targetParent.children.length - 1];
      targetElement = rElement.children[rElement.children.length - 1];
    } else {
      const rElement = {
        name: "m:r",
        type: "tag",
        attribs: {},
        children: []
      };
      if (style.variant) {
        const wrPr = {
          name: "w:rPr",
          type: "tag",
          attribs: {},
          children: []
        };
        if (style.variant.includes("bold")) {
          wrPr.children.push({ name: "w:b", type: "tag", attribs: {}, children: [] });
        }
        if (style.variant.includes("italic")) {
          wrPr.children.push({ name: "w:i", type: "tag", attribs: {}, children: [] });
        }
        rElement.children.push(wrPr);
        const mrPr = {
          name: "m:rPr",
          type: "tag",
          attribs: {},
          children: [
            {
              name: "m:nor",
              type: "tag",
              attribs: {},
              children: []
            }
          ]
        };
        if (style.variant !== "italic") {
          mrPr.children.push({
            name: "m:sty",
            type: "tag",
            attribs: {
              "m:val": STYLES[style.variant]
            },
            children: []
          });
        }
        rElement.children.push(mrPr);
      } else if (hasMglyphChild || textType === "mtext") {
        rElement.children.push({
          name: "m:rPr",
          type: "tag",
          attribs: {},
          children: [
            {
              name: "m:nor",
              type: "tag",
              attribs: {},
              children: []
            }
          ]
        });
      } else if (style.fontstyle === "normal" || textType === "ms" && style.fontstyle === "") {
        rElement.children.push({
          name: "m:rPr",
          type: "tag",
          attribs: {},
          children: [
            {
              name: "m:sty",
              type: "tag",
              attribs: { "m:val": "p" },
              children: []
            }
          ]
        });
      }
      targetElement = {
        name: "m:t",
        type: "tag",
        attribs: {
          "xml:space": "preserve"
        },
        children: []
      };
      rElement.children.push(targetElement);
      targetParent.children.push(rElement);
    }
    return targetElement;
  }
  function mtext(element, targetParent, previousSibling, nextSibling, ancestors) {
    return textContainer(element, targetParent, previousSibling, nextSibling, ancestors, "mtext");
  }
  function mi(element, targetParent, previousSibling, nextSibling, ancestors) {
    return textContainer(element, targetParent, previousSibling, nextSibling, ancestors, "mi");
  }
  function mn(element, targetParent, previousSibling, nextSibling, ancestors) {
    return textContainer(element, targetParent, previousSibling, nextSibling, ancestors, "mn");
  }
  function mo(element, targetParent, previousSibling, nextSibling, ancestors) {
    return textContainer(element, targetParent, previousSibling, nextSibling, ancestors, "mo");
  }
  function ms(element, targetParent, previousSibling, nextSibling, ancestors) {
    return textContainer(element, targetParent, previousSibling, nextSibling, ancestors, "ms");
  }
  var UPPER_COMBINATION = {
    "\u2190": "\u20D6",
    // arrow left
    "\u27F5": "\u20D6",
    // arrow left, long
    "\u2192": "\u20D7",
    // arrow right
    "\u27F6": "\u20D7",
    // arrow right, long
    "\xB4": "\u0301",
    // accute
    "\u02DD": "\u030B",
    // accute, double
    "\u02D8": "\u0306",
    // breve
    "\u02C7": "\u030C",
    // caron
    "\xB8": "\u0312",
    // cedilla
    "^": "\u0302",
    // circumflex accent
    "\xA8": "\u0308",
    // diaresis
    "\u02D9": "\u0307",
    // dot above
    "`": "\u0300",
    // grave accent
    "-": "\u0305",
    // hyphen -> overline
    "\xAF": "\u0305",
    // macron
    "\u2212": "\u0305",
    // minus -> overline
    ".": "\u0307",
    // period -> dot above
    "~": "\u0303",
    // tilde
    "\u02DC": "\u0303"
    // small tilde
  };
  function underOrOver(element, targetParent, previousSibling, nextSibling, ancestors, direction) {
    if (element.children.length !== 2) {
      return targetParent;
    }
    ancestors = [...ancestors];
    ancestors.unshift(element);
    const base = element.children[0];
    const script = element.children[1];
    const naryChar = getNary(base);
    if (naryChar && element.attribs?.accent?.toLowerCase() !== "true" && element.attribs?.accentunder?.toLowerCase() !== "true") {
      const topTarget = getNaryTarget(
        naryChar,
        element,
        "undOvr",
        direction === "over",
        direction === "under"
      );
      element.isNary = true;
      const subscriptTarget = {
        name: "m:sub",
        type: "tag",
        attribs: {},
        children: []
      };
      const superscriptTarget = {
        name: "m:sup",
        type: "tag",
        attribs: {},
        children: []
      };
      walker(
        script,
        direction === "under" ? subscriptTarget : superscriptTarget,
        false,
        false,
        ancestors
      );
      topTarget.children.push(subscriptTarget);
      topTarget.children.push(superscriptTarget);
      topTarget.children.push({ type: "tag", name: "m:e", attribs: {}, children: [] });
      targetParent.children.push(topTarget);
      return;
    }
    const scriptText = getTextContent(script);
    const baseTarget = {
      name: "m:e",
      type: "tag",
      attribs: {},
      children: []
    };
    walker(base, baseTarget, false, false, ancestors);
    if (direction === "under" && script.name === "mo" && ["\u0332", "_"].includes(scriptText) || direction === "over" && script.name === "mo" && ["\u0305", "\xAF"].includes(scriptText)) {
      targetParent.children.push({
        type: "tag",
        name: "m:bar",
        attribs: {},
        children: [
          {
            type: "tag",
            name: "m:barPr",
            attribs: {},
            children: [
              {
                type: "tag",
                name: "m:pos",
                attribs: {
                  "m:val": direction === "under" ? "bot" : "top"
                },
                children: []
              }
            ]
          },
          {
            type: "tag",
            name: "m:e",
            attribs: {},
            children: [
              {
                type: "tag",
                name: direction === "under" ? "m:sSub" : "m:sSup",
                attribs: {},
                children: [
                  {
                    type: "tag",
                    name: direction === "under" ? "m:sSubPr" : "m:sSupPr",
                    attribs: {},
                    children: [{ type: "tag", name: "m:ctrlPr", attribs: {}, children: [] }]
                  },
                  baseTarget,
                  { type: "tag", name: "m:sub", attribs: {}, children: [] }
                ]
              }
            ]
          }
        ]
      });
      return;
    }
    if (direction === "under" && element.attribs?.accentunder?.toLowerCase() === "true" && script.name === "mo" && scriptText.length < 2 || direction === "over" && element.attribs?.accent?.toLowerCase() === "true" && script.name === "mo" && scriptText.length < 2) {
      targetParent.children.push({
        type: "tag",
        name: "m:acc",
        attribs: {},
        children: [
          {
            type: "tag",
            name: "m:accPr",
            attribs: {},
            children: [
              {
                type: "tag",
                name: "m:chr",
                attribs: {
                  "m:val": UPPER_COMBINATION[scriptText] || scriptText
                },
                children: []
              }
            ]
          },
          baseTarget
        ]
      });
      return;
    }
    if (element.attribs?.accent?.toLowerCase() !== "true" && element.attribs?.accentunder?.toLowerCase() !== "true" && script.name === "mo" && base.name === "mrow" && scriptText.length === 1) {
      targetParent.children.push({
        type: "tag",
        name: "m:groupChr",
        attribs: {},
        children: [
          {
            type: "tag",
            name: "m:groupChrPr",
            attribs: {},
            children: [
              {
                type: "tag",
                name: "m:chr",
                attribs: {
                  "m:val": scriptText,
                  "m:pos": direction === "under" ? "bot" : "top"
                },
                children: []
              }
            ]
          },
          baseTarget
        ]
      });
      return;
    }
    const scriptTarget = {
      name: "m:lim",
      type: "tag",
      attribs: {},
      children: []
    };
    walker(script, scriptTarget, false, false, ancestors);
    targetParent.children.push({
      type: "tag",
      name: direction === "under" ? "m:limLow" : "m:limUpp",
      attribs: {},
      children: [baseTarget, scriptTarget]
    });
  }
  function munder(element, targetParent, previousSibling, nextSibling, ancestors) {
    return underOrOver(element, targetParent, previousSibling, nextSibling, ancestors, "under");
  }
  function mover(element, targetParent, previousSibling, nextSibling, ancestors) {
    return underOrOver(element, targetParent, previousSibling, nextSibling, ancestors, "over");
  }
  function mroot(element, targetParent, previousSibling, nextSibling, ancestors) {
    if (element.children.length !== 2) {
      return targetParent;
    }
    ancestors = [...ancestors];
    ancestors.unshift(element);
    const base = element.children[0];
    const root = element.children[1];
    const baseTarget = {
      type: "tag",
      name: "m:e",
      attribs: {},
      children: []
    };
    walker(base, baseTarget, false, false, ancestors);
    const rootTarget = {
      type: "tag",
      name: "m:deg",
      attribs: {},
      children: []
    };
    walker(root, rootTarget, false, false, ancestors);
    const rootText = getTextContent(root);
    targetParent.children.push({
      type: "tag",
      name: "m:rad",
      attribs: {},
      children: [
        {
          type: "tag",
          name: "m:radPr",
          attribs: {},
          children: [
            {
              type: "tag",
              name: "m:degHide",
              attribs: { "m:val": rootText.length ? "off" : "on" },
              children: []
            }
          ]
        },
        rootTarget,
        baseTarget
      ]
    });
  }
  function text(element, targetParent, previousSibling, nextSibling, ancestors) {
    let text2 = element.data.replace(/[\u2062]|[\u200B]/g, "");
    if (ancestors.find((element2) => ["mi", "mn", "mo"].includes(element2.name))) {
      text2 = text2.replace(/\s/g, "");
    } else {
      const ms2 = ancestors.find((element2) => element2.name === "ms");
      if (ms2) {
        text2 = (ms2.attribs?.lquote || '"') + text2 + (ms2.attribs?.rquote || '"');
      }
    }
    if (text2.length) {
      if (targetParent.children.length && targetParent.children[targetParent.children.length - 1].type === "text") {
        targetParent.children[targetParent.children.length - 1].data += text2;
      } else {
        targetParent.children.push({
          type: "text",
          data: text2
        });
      }
    }
    return targetParent;
  }
  var mathmlHandlers = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    math,
    menclose,
    mfrac,
    mglyph,
    mi,
    mmultiscripts,
    mn,
    mo,
    mover,
    mroot,
    mrow,
    ms,
    mspace,
    msqrt,
    mstyle,
    msub,
    msubsup,
    msup,
    mtable,
    mtd,
    mtext,
    mtr,
    munder,
    munderover,
    semantics,
    text
  });
  function walker(element, targetParent, previousSibling = false, nextSibling = false, ancestors = []) {
    if (!previousSibling && ["m:deg", "m:den", "m:e", "m:fName", "m:lim", "m:num", "m:sub", "m:sup"].includes(
      targetParent.name
    )) {
      addScriptlevel(targetParent, ancestors);
    }
    let targetElement;
    const nameOrType = element.name || element.type;
    if (mathmlHandlers[nameOrType]) {
      targetElement = mathmlHandlers[nameOrType](
        element,
        targetParent,
        previousSibling,
        nextSibling,
        ancestors
      );
    } else {
      if (nameOrType && nameOrType !== "root") {
        console.warn(`Type not supported: ${nameOrType}`);
      }
      targetElement = targetParent;
    }
    if (!targetElement) {
      return;
    }
    if (element.children?.length) {
      ancestors = [...ancestors];
      ancestors.unshift(element);
      for (let i = 0; i < element.children.length; i++) {
        walker(
          element.children[i],
          targetElement,
          element.children[i - 1],
          element.children[i + 1],
          ancestors
        );
      }
    }
  }
  var MML2OMML = class {
    constructor(mmlString, options) {
      this.inString = mmlString;
      this.inXML = parse(mmlString, options);
      this.outXML = false;
      this.outString = false;
    }
    run() {
      const outXML = {};
      walker({ children: this.inXML, type: "root" }, outXML);
      this.outXML = outXML;
    }
    getResult() {
      this.outString = stringifyDoc([this.outXML]);
      return this.outString;
    }
  };
  var mml2omml = (mmlString, options) => {
    const converter = new MML2OMML(mmlString, options);
    converter.run();
    return converter.getResult();
  };
  return __toCommonJS(index_esm_exports);
})();
