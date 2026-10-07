/*!
 * Markdown2Word 核心转换管线（浏览器 / Node 通用，无构建依赖）
 *
 * 用法（依赖注入，浏览器与 Node 均可）：
 *   const conv = M2W.createConverter({ markdownit, temml, mml2omml });
 *   const { ooxml, placeholders, warnings } = conv.convert(mdText);
 *
 * 输出为可交给 Range.insertOoxml / InsertXML 的 WordprocessingML 片段；
 * 超链接与图片以占位符形式输出，插入后由调用方用 Word API 补全
 * （insertOoxml 无法携带关系部件，这是官方限制）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.M2W = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var M2W = { version: '0.1.0' };

  /* ------------------------------------------------------------------ *
   *  XML 工具
   * ------------------------------------------------------------------ */

  var INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

  function esc(s) {
    return String(s)
      .replace(INVALID_XML_CHARS, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ------------------------------------------------------------------ *
   *  markdown-it 数学定界符规则
   *  支持 $...$、$$...$$、\(...\)、\[...\]（块级支持多行）
   * ------------------------------------------------------------------ */

  function addMathRules(md) {

    // 块级：$$ ... $$（可多行）
    function blockDollar(state, startLine, endLine, silent) {
      var pos = state.bMarks[startLine] + state.tShift[startLine];
      var max = state.eMarks[startLine];
      if (pos + 2 > max) return false;
      if (state.src.slice(pos, pos + 2) !== '$$') return false;
      if (silent) return true;

      var lines = [];
      var first = state.src.slice(pos + 2, max);
      var t = first.trim();
      var next = startLine;
      var found = false;

      if (t.length > 2 && t.slice(-2) === '$$') {          // 单行 $$...$$
        lines.push(t.slice(0, -2));                        // first 已跳过开头的 $$，只需去掉结尾
        found = true;
      } else {
        if (t.length) lines.push(first);
        for (next = startLine + 1; next < endLine; next++) {
          var p = state.bMarks[next] + state.tShift[next];
          var mx = state.eMarks[next];
          var line = state.src.slice(p, mx);
          var lt = line.trim();
          if (lt.length >= 2 && lt.slice(-2) === '$$') {
            var idx = line.lastIndexOf('$$');
            var before = line.slice(0, idx);
            if (before.trim()) lines.push(before);
            found = true;
            break;
          }
          lines.push(line);
        }
      }
      if (!found) return false;

      var content = lines.join('\n').trim();
      if (!content) return false;

      var token = state.push('math_block', 'math', 0);
      token.markup = '$$';
      token.block = true;
      token.content = content;
      token.meta = { display: true };
      token.map = [startLine, next + 1];
      state.line = next + 1;
      return true;
    }

    // 块级：\[ ... \]（可多行）
    function blockBracket(state, startLine, endLine, silent) {
      var pos = state.bMarks[startLine] + state.tShift[startLine];
      var max = state.eMarks[startLine];
      if (pos + 2 > max) return false;
      if (state.src.slice(pos, pos + 2) !== '\\[') return false;
      if (silent) return true;

      var lines = [];
      var first = state.src.slice(pos + 2, max);
      var t = first.trim();
      var next = startLine;
      var found = false;

      if (t.length > 2 && t.slice(-2) === '\\]') {
        lines.push(t.slice(0, -2));
        found = true;
      } else {
        if (t.length) lines.push(first);
        for (next = startLine + 1; next < endLine; next++) {
          var p = state.bMarks[next] + state.tShift[next];
          var mx = state.eMarks[next];
          var line = state.src.slice(p, mx);
          var lt = line.trim();
          if (lt.length >= 2 && lt.slice(-2) === '\\]') {
            var idx = line.lastIndexOf('\\]');
            var before = line.slice(0, idx);
            if (before.trim()) lines.push(before);
            found = true;
            break;
          }
          lines.push(line);
        }
      }
      if (!found) return false;

      var content = lines.join('\n').trim();
      if (!content) return false;

      var token = state.push('math_block', 'math', 0);
      token.markup = '\\[';
      token.block = true;
      token.content = content;
      token.meta = { display: true };
      token.map = [startLine, next + 1];
      state.line = next + 1;
      return true;
    }

    // 行内：$...$、$$...$$、\(...\)、\[...\]
    function inlineMath(state, silent) {
      var src = state.src;
      var pos = state.pos;
      var ch = src.charCodeAt(pos);
      var isDollar = ch === 0x24;                                       // $
      var isParen = ch === 0x5c && src.charCodeAt(pos + 1) === 0x28;    // \(
      var isBrk = ch === 0x5c && src.charCodeAt(pos + 1) === 0x5b;      // \[
      if (!isDollar && !isParen && !isBrk) return false;

      var start, closeLen, display, closeStr;
      if (isDollar && src.charCodeAt(pos + 1) === 0x24) {   // $$...$$
        start = pos + 2; closeLen = 2; display = true; closeStr = '$$';
      } else if (isDollar) {                                // $...$
        start = pos + 1; closeLen = 1; display = false; closeStr = '$';
      } else if (isParen) {                                 // \(...\)
        start = pos + 2; closeLen = 2; display = false; closeStr = '\\)';
      } else {                                              // \[...\]
        start = pos + 2; closeLen = 2; display = true; closeStr = '\\]';
      }
      if (start >= src.length) return false;
      // 定界符后紧跟空白 → 不是公式（$ 5 x$ 这种）
      if (closeLen === 1 && /\s/.test(src.charAt(start))) return false;

      var i = start, end = -1;
      while (i < src.length) {
        var c = src.charAt(i);
        // 注意：先查闭合定界符，再处理转义——否则 \) 的反斜杠会被当作转义前缀跳过
        if (src.startsWith(closeStr, i)) {
          if (closeLen === 1 && src.charAt(i - 1) === ' ') return false; // "$5 and $10"
          end = i;
          break;
        }
        if (c === '\\') { i += 2; continue; }
        if (c === '\n') return false;                       // 行内公式不跨行
        i++;
      }
      if (end < 0) return false;

      var content = src.slice(start, end);
      if (!content.trim()) return false;

      if (!silent) {
        var token = state.push('math_inline', 'math', 0);
        token.markup = closeStr;
        token.content = content;
        token.meta = { display: display };
      }
      state.pos = end + closeLen;
      return true;
    }

    // 必须插在 'text' 规则之前：markdown-it 的 text 规则会把 $ 当普通字符吞掉
    md.inline.ruler.before('text', 'm2w_math_inline', inlineMath);
    md.block.ruler.before('paragraph', 'm2w_math_block_dollar', blockDollar);
    md.block.ruler.before('paragraph', 'm2w_math_block_bracket', blockBracket);
  }

  /* ------------------------------------------------------------------ *
   *  LaTeX → OMML
   * ------------------------------------------------------------------ */

  function createMathConverter(temml, mml2omml) {
    return function latexToOmml(latex, displayMode) {
      try {
        var mml = temml.renderToString(latex, {
          displayMode: !!displayMode,
          annotate: false,
          throwOnError: false
        });
        if (!mml || mml.indexOf('<math') === -1) return null;
        if (mml.indexOf('merror') !== -1) return null;      // temml 解析失败标记
        var omml = mml2omml(mml);
        if (!omml || omml.indexOf('<m:oMath') === -1) return null;
        return omml;
      } catch (e) {
        return null;
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  OOXML 渲染器
   * ------------------------------------------------------------------ */

  var NAMESPACES =
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

  // 行内字符格式状态
  function FmtState() {
    this.bold = 0; this.italic = 0; this.strike = 0; this.underline = 0;
    this.sub = 0; this.sup = 0; this.code = 0; this.mark = 0;
  }

  function buildRpr(st) {
    var s = '';
    if (st.code) s += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:noProof/>';
    if (st.bold) s += '<w:b/><w:bCs/>';
    if (st.italic) s += '<w:i/><w:iCs/>';
    if (st.strike) s += '<w:strike/>';
    if (st.mark) s += '<w:highlight w:val="yellow"/>';
    if (st.underline) s += '<w:u w:val="single"/>';
    if (st.code) s += '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>';
    if (st.sub) s += '<w:vertAlign w:val="subscript"/>';
    if (st.sup) s += '<w:vertAlign w:val="superscript"/>';
    return s ? '<w:rPr>' + s + '</w:rPr>' : '';
  }

  function textRun(content, st) {
    return '<w:r>' + buildRpr(st) + '<w:t xml:space="preserve">' + esc(content) + '</w:t></w:r>';
  }

  var HTML_FMT_MAP = {
    b: 'bold', strong: 'bold',
    i: 'italic', em: 'italic',
    s: 'strike', del: 'strike', strike: 'strike',
    u: 'underline',
    sub: 'sub', sup: 'sup',
    mark: 'mark'
  };

  function createConverter(libs) {
    if (!libs || !libs.markdownit || !libs.temml || !libs.mml2omml) {
      throw new Error('createConverter 需要 { markdownit, temml, mml2omml } 三个依赖');
    }
    var latexToOmml = createMathConverter(libs.temml, libs.mml2omml);

    function convert(mdText) {
      var warnings = [];
      var placeholders = [];

      var md = libs.markdownit({
        html: true,          // AI 输出里的 <br>/<sub> 等少量标签（渲染时白名单处理，其余剥标签留文本）
        breaks: true,        // 单个换行视为换行（符合 AI 回复习惯）
        linkify: false,
        typographer: false
      });
      addMathRules(md);

      var tokens = md.parse(String(mdText == null ? '' : mdText), {});

      // 占位符：OOXML 片段无法直接携带关系部件（超链接/图片），
      // 先以唯一 token 占位，下载打包时由 docx-builder 替换为
      // 真正的 w:hyperlink 和内嵌图片（word/media/ + 关系）。
      function phRun(ph) {
        placeholders.push(ph);
        var idx = placeholders.length - 1;
        var token = '\uE000MD2W:' + (ph.type === 'link' ? 'L' : 'I') + idx + '\uE001';
        return '<w:r><w:rPr><w:noProof/><w:color w:val="FFFFFF"/><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr>' +
          '<w:t xml:space="preserve">' + token + '</w:t></w:r>';
      }

      // ---- 行内渲染 ----
      function renderInline(children, st) {
        var xml = '';
        for (var k = 0; k < children.length; k++) {
          var t = children[k];
          switch (t.type) {
            case 'text':
              xml += textRun(t.content, st);
              break;
            case 'code_inline':
              st.code++;
              xml += textRun(t.content, st);
              st.code--;
              break;
            case 'softbreak':
            case 'hardbreak':
              xml += '<w:r>' + buildRpr(st) + '<w:br/></w:r>';
              break;
            case 'math_inline': {
              var omml = latexToOmml(t.content, t.meta && t.meta.display);
              if (omml) xml += omml;
              else {
                warnings.push('公式无法转换，已保留原文：' + t.content.slice(0, 60));
                xml += textRun(t.content, st);
              }
              break;
            }
            case 'link_open': {
              var depth = 1, j = k + 1, plain = '';
              for (; j < children.length; j++) {
                var ct = children[j];
                if (ct.type === 'link_open') depth++;
                else if (ct.type === 'link_close') { depth--; if (!depth) break; }
                else if (ct.type === 'text') plain += ct.content;
                else if (ct.type === 'code_inline') plain += ct.content;
                else if (ct.type === 'math_inline') plain += ct.content;
              }
              var href = t.attrGet('href') || '';
              if (href && !/^data:/i.test(href)) {
                xml += phRun({ type: 'link', url: href, text: plain || href });
              } else {
                xml += textRun(plain || href, st);
              }
              k = j;
              break;
            }
            case 'image': {
              var src = t.attrGet('src') || '';
              var alt = t.content || t.attrGet('alt') || '';
              if (src) xml += phRun({ type: 'image', src: src, alt: alt });
              break;
            }
            case 'html_inline':
              xml += handleHtmlTag(t.content, st);
              break;
            case 'strong_open': case 'b_open': st.bold++; break;
            case 'strong_close': case 'b_close': if (st.bold) st.bold--; break;
            case 'em_open': case 'i_open': st.italic++; break;
            case 'em_close': case 'i_close': if (st.italic) st.italic--; break;
            case 's_open': case 'del_open': st.strike++; break;
            case 's_close': case 'del_close': if (st.strike) st.strike--; break;
            default:
              if (t.children) xml += renderInline(t.children, st);
              break;
          }
        }
        return xml;
      }

      function handleHtmlTag(raw, st) {
        var m = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(raw);
        if (!m) return esc(raw);
        var closing = m[1] === '/';
        var tag = m[2].toLowerCase();

        if (tag === 'br' && !closing) return '<w:r><w:br/></w:r>';
        var key = HTML_FMT_MAP[tag];
        if (key) {
          if (closing) { if (st[key]) st[key]--; }
          else st[key]++;
        }
        return '';   // 其他标签一律剥掉，内部文本由后续 token 正常输出
      }

      // ---- 块级渲染状态 ----
      var out = [];
      var st = {
        listDepth: 0,
        listStack: [],          // {ordered:bool, n:number}
        quoteDepth: 0,
        pendingMarker: null,
        pOpen: false
      };
      var tbl = null;           // 非空时表示正在收集表格
      var headingLevel = null;

      function closeParagraph() {
        st.pOpen = false;
        return '</w:p>';
      }

      // 紧凑列表等场景段落可能未闭合，任何块级 token 出现前先兜底闭合
      function ensureClosed() {
        if (st.pOpen) { st.pOpen = false; out.push('</w:p>'); }
      }

      function openParagraph() {
        st.pOpen = true;
        var pPr = '';
        var ind = 0, inList = st.listDepth > 0;
        if (st.quoteDepth) {
          pPr += '<w:pBdr><w:left w:val="single" w:sz="18" w:space="4" w:color="BFBFBF"/></w:pBdr>';
          ind += 480 * st.quoteDepth;
        }
        if (inList) ind += 420 + 360 * (st.listDepth - 1);
        if (ind) {
          if (inList && st.pendingMarker) {
            pPr += '<w:ind w:left="' + (ind + 360) + '" w:hanging="360"/>';
          } else if (inList) {
            pPr += '<w:ind w:left="' + (ind + 360) + '" w:firstLine="360"/>';
          } else {
            pPr += '<w:ind w:left="' + ind + '"/>';
          }
        }
        var markerXml = '';
        if (st.pendingMarker) {
          markerXml = st.pendingMarker;
          st.pendingMarker = null;
        }
        return '<w:p>' + (pPr ? '<w:pPr>' + pPr + '</w:pPr>' : '') + markerXml;
      }

      function listMarkerXml() {
        var top = st.listStack[st.listStack.length - 1];
        var depth = st.listStack.length;   // 1 = 顶层列表
        var text;
        if (top.ordered) {
          var n = top.n++;
          if (depth === 1) text = n + '. ';
          else if (depth === 2) text = n + ') ';
          else text = String.fromCharCode(96 + ((n - 1) % 26) + 1) + '. ';   // a. b. c.
        } else {
          text = depth === 1 ? '\u25CF ' : depth === 2 ? '\u25CB ' : '\u25A0 ';
        }
        return '<w:r><w:t xml:space="preserve">' + esc(text) + '</w:t></w:r>';
      }

      // 把块级公式按"顶层 \\"拆成多段（AI 常在无 align 环境的 $$ 块里用 \\ 分行）
      // 仅在花括号深度为 0 且不在 \begin...\end 环境内时拆分
      function splitTopLevelRows(latex) {
        var rows = [];
        var depth = 0, envDepth = 0, cur = '';
        for (var i = 0; i < latex.length; i++) {
          var c = latex.charAt(i);
          if (c === '\\') {
            if (latex.startsWith('\\begin', i) || latex.startsWith('\\end', i)) envDepth += latex.startsWith('\\begin', i) ? 1 : -1;
            if (latex.startsWith('\\\\', i) && depth === 0 && envDepth === 0) {
              rows.push(cur); cur = ''; i++; continue;
            }
            cur += c + (latex.charAt(i + 1) || '');
            i++; continue;
          }
          if (c === '{') depth++;
          else if (c === '}') depth--;
          cur += c;
        }
        rows.push(cur);
        return rows.map(function (s) { return s.trim(); }).filter(function (s) { return s; });
      }

      function mathBlockP(latex) {
        var rows = splitTopLevelRows(latex);
        var paras = [];
        for (var i = 0; i < rows.length; i++) {
          var omml = latexToOmml(rows[i], true);
          if (omml) {
            paras.push('<w:p><m:oMathPara><m:oMathParaPr><m:jc m:val="center"/></m:oMathParaPr>' +
              omml + '</m:oMathPara></w:p>');
          } else {
            warnings.push('公式无法转换，已保留原文：' + rows[i].slice(0, 60));
            paras.push('<w:p>' + textRun(rows[i], new FmtState()) + '</w:p>');
          }
        }
        return paras.join('');
      }

      function codeP(content) {
        var lines = content.replace(/\n$/, '').split('\n');
        if (!lines.length || (lines.length === 1 && lines[0] === '')) lines = [''];
        var rpr = '<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:noProof/></w:rPr>';
        var runs = '';
        for (var i = 0; i < lines.length; i++) {
          if (i) runs += '<w:r>' + rpr + '<w:br/></w:r>';
          runs += '<w:r>' + rpr + '<w:t xml:space="preserve">' + esc(lines[i]) + '</w:t></w:r>';
        }
        return '<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:pPr>' + runs + '</w:p>';
      }

      // ---- 表格收集 ----
      function tblStart() { tbl = { header: false, rows: [], row: null, cell: null }; }
      function tblRowStart() { tbl.row = { header: tbl.header, cells: [] }; }
      function tblRowEnd() { tbl.rows.push(tbl.row); tbl.row = null; }
      function tblCellStart(tok) {
        tbl.cell = {
          header: tbl.header,
          align: alignOf(tok),
          runs: ''
        };
      }
      function tblCellEnd() { tbl.row.cells.push(tbl.cell); tbl.cell = null; }

      function alignOf(token) {
        var style = (token.attrs && token.attrGet('style')) || '';
        var m = /text-align\s*:\s*(center|right|left|justify)/.exec(style);
        if (m) return m[1] === 'justify' ? 'both' : m[1];
        return null;
      }

      function tblBuild() {
        var t = tbl; tbl = null;
        var xml = '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>';
        var sides = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'];
        xml += '<w:tblBorders>';
        for (var i = 0; i < sides.length; i++) {
          xml += '<w:' + sides[i] + ' w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
        }
        xml += '</w:tblBorders><w:tblLayout w:type="autofit"/></w:tblPr>';
        var nCols = 0, r, c;
        for (r = 0; r < t.rows.length; r++) nCols = Math.max(nCols, t.rows[r].cells.length);
        xml += '<w:tblGrid>';
        for (c = 0; c < nCols; c++) xml += '<w:gridCol w:w="100"/>';
        xml += '</w:tblGrid>';
        for (r = 0; r < t.rows.length; r++) {
          var row = t.rows[r];
          xml += '<w:tr>' + (row.header ? '<w:trPr><w:tblHeader/></w:trPr>' : '');
          for (c = 0; c < row.cells.length; c++) {
            var cell = row.cells[c];
            xml += '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>' +
              (cell.header ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>' : '') +
              '</w:tcPr>';
            var jc = cell.align && cell.align !== 'left' ? '<w:pPr><w:jc w:val="' + cell.align + '"/></w:pPr>' : '';
            xml += '<w:p>' + jc + cell.runs + '</w:p></w:tc>';
          }
          if (!row.cells.length) xml += '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p/></w:tc>';
          xml += '</w:tr>';
        }
        return xml + '</w:tbl>';
      }

      // ---- 主循环 ----
      for (var i = 0; i < tokens.length; i++) {
        var tok = tokens[i];
        switch (tok.type) {
          case 'heading_open':
            ensureClosed();
            headingLevel = parseInt(tok.tag.charAt(1), 10) || 1;
            out.push('<w:p><w:pPr><w:pStyle w:val="Heading' + headingLevel + '"/>' +
              '<w:outlineLvl w:val="' + (headingLevel - 1) + '"/></w:pPr>');
            st.pOpen = true;
            break;
          case 'heading_close':
            out.push(closeParagraph());
            headingLevel = null;
            break;

          case 'paragraph_open':
            ensureClosed();
            out.push(openParagraph());
            break;
          case 'paragraph_close':
            out.push(closeParagraph());
            break;

          case 'inline': {
            if (tbl && tbl.cell) {
              // 表格单元格：表头加粗
              var cst = new FmtState();
              if (tbl.cell.header) cst.bold = 1;
              tbl.cell.runs += renderInline(tok.children, cst);
            } else {
              if (!st.pOpen) out.push(openParagraph());   // 紧凑列表项
              out.push(renderInline(tok.children, new FmtState()));
            }
            break;
          }

          case 'math_block':
            ensureClosed();
            out.push(mathBlockP(tok.content));
            break;

          case 'fence':
          case 'code_block':
            ensureClosed();
            out.push(codeP(tok.content));
            break;

          case 'blockquote_open':
            ensureClosed();
            st.quoteDepth++;
            break;
          case 'blockquote_close':
            ensureClosed();
            if (st.quoteDepth) st.quoteDepth--;
            break;

          case 'bullet_list_open':
            ensureClosed();
            st.listDepth++;
            st.listStack.push({ ordered: false, n: 0 });
            break;
          case 'ordered_list_open': {
            ensureClosed();
            st.listDepth++;
            var startN = 1;
            if (tok.attrs) {
              for (var a = 0; a < tok.attrs.length; a++) {
                if (tok.attrs[a][0] === 'start') startN = parseInt(tok.attrs[a][1], 10) || 1;
              }
            }
            st.listStack.push({ ordered: true, n: startN });
            break;
          }
          case 'bullet_list_close':
          case 'ordered_list_close':
            ensureClosed();
            st.listDepth--;
            st.listStack.pop();
            break;
          case 'list_item_open':
            ensureClosed();
            st.pendingMarker = listMarkerXml();
            break;
          case 'list_item_close':
            if (st.pendingMarker) {           // 列表项没有自己的文本（只有嵌套列表）
              out.push(openParagraph() + closeParagraph());
            } else {
              ensureClosed();
            }
            break;

          case 'table_open':
            ensureClosed();
            tblStart();
            break;
          case 'table_close': {
            var built = tblBuild();
            // 相邻表格会被 Word 合并，中间插一个空段落隔开
            if (out.length && /<\/w:tbl>\s*$/.test(out[out.length - 1])) out.push('<w:p></w:p>');
            out.push(built);
            break;
          }
          case 'thead_open': tbl.header = true; break;
          case 'thead_close': tbl.header = false; break;
          case 'tbody_open': case 'tbody_close': break;
          case 'tr_open': tblRowStart(); break;
          case 'tr_close': tblRowEnd(); break;
          case 'th_open': tblCellStart(tok); break;
          case 'td_open': tblCellStart(tok); break;
          case 'th_close': case 'td_close': tblCellEnd(); break;

          case 'hr':
            ensureClosed();
            out.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>');
            break;

          case 'html_block': {
            ensureClosed();
            var txt = tok.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            if (txt) out.push('<w:p>' + textRun(txt, new FmtState()) + '</w:p>');
            break;
          }

          default:
            ensureClosed();
            break;
        }
      }
      ensureClosed();

      var body = '<w:body ' + NAMESPACES + '>' + out.join('') + '</w:body>';
      return { ooxml: body, placeholders: placeholders, warnings: warnings };
    }

    return { convert: convert };
  }

  M2W.createConverter = createConverter;
  // 供预览等场景给任意 markdown-it 实例挂上同一套 $…$ / $$…$$ / \(…\) / \[…\] 规则
  M2W.attachMathRules = addMathRules;
  return M2W;
});
