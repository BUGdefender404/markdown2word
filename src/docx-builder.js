/*!
 * Markdown2Word 网页版：把 M2W 转换出的 OOXML 片段打包成完整 .docx 文件
 * （浏览器 / Node 通用；依赖注入 JSZip）
 *
 * 用法：
 *   const blob = await M2WDocx.buildDocx(res.ooxml, JSZip, { type: 'blob', placeholders: res.placeholders });
 *
 * 相比 Word 加载项的 insertOoxml，打包成文件时可以真正内嵌图片（media/）
 * 和外部超链接（TargetMode="External"），占位符会被替换成完整内容。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.M2WDocx = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var EMU_PER_PT = 12700;
  var MAX_WIDTH_PT = 414;   // A4 内容区宽度（21cm - 2×3.17cm 边距）

  var CONTENT_TYPES_XML =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Default Extension="png" ContentType="image/png"/>' +
    '<Default Extension="jpeg" ContentType="image/jpeg"/>' +
    '<Default Extension="jpg" ContentType="image/jpeg"/>' +
    '<Default Extension="gif" ContentType="image/gif"/>' +
    '<Default Extension="webp" ContentType="image/webp"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '</Types>';

  var ROOT_RELS_XML =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '</Relationships>';

  var DOC_RELS_XML_HEAD =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';

  var CORE_XML =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    '<dc:title>Markdown2Word</dc:title><dc:creator>Markdown2Word</dc:creator>' +
    '</cp:coreProperties>';

  // 标准 Word 内置样式（跟随文档主题；中文 Word 实测可正确解析为 标题 1-3 等）
  var STYLES_XML =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="等线" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="0"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri Light" w:eastAsia="等线 Light" w:hAnsi="Calibri Light"/><w:color w:val="2F5496" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="32"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="40" w:after="0"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri Light" w:eastAsia="等线 Light" w:hAnsi="Calibri Light"/><w:color w:val="2F5496" w:themeColor="accent1" w:themeShade="BF"/><w:sz w:val="26"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="40" w:after="0"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri Light" w:eastAsia="等线 Light" w:hAnsi="Calibri Light"/><w:color w:val="1F3763" w:themeColor="accent1" w:themeShade="63"/><w:sz w:val="24"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:pPr><w:keepNext/><w:spacing w:before="40" w:after="0"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri Light" w:eastAsia="等线 Light" w:hAnsi="Calibri Light"/><w:color w:val="2F5496" w:themeColor="accent1" w:themeShade="BF"/><w:i/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading5"><w:name w:val="heading 5"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:pPr><w:keepNext/><w:spacing w:before="40" w:after="0"/><w:outlineLvl w:val="4"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri Light" w:eastAsia="等线 Light" w:hAnsi="Calibri Light"/><w:color w:val="2F5496" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading6"><w:name w:val="heading 6"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:pPr><w:keepNext/><w:spacing w:before="40" w:after="0"/><w:outlineLvl w:val="5"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri Light" w:eastAsia="等线 Light" w:hAnsi="Calibri Light"/><w:color w:val="1F3763" w:themeColor="accent1" w:themeShade="63"/></w:rPr></w:style>' +
    '</w:styles>';

  function extractBody(bodyFragment) {
    var m = /<w:body[^>]*>([\s\S]*)<\/w:body>/.exec(String(bodyFragment));
    return m ? m[1] : String(bodyFragment);
  }

  // 把"包含占位 token 的整个 run"替换为目标 XML。
  // 只替换 token 文本是不行的：那会把 <w:hyperlink>/<w:drawing> 嵌进原来
  // 1 磅白色小字的 run 里，Word 会按 1pt 渲染（迷你蓝字 bug）。
  // 占位 run 的格式由 m2w-core.js 的 phRun 生成：
  //   <w:r><w:rPr>…</w:rPr><w:t xml:space="preserve">TOKEN</w:t></w:r>
  function replaceTokenRun(inner, token, replacement) {
    var escToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var re = new RegExp(
      '<w:r>(?:(?!</w:r>)[\\s\\S])*?<w:t[^>]*>\\s*' + escToken + '\\s*</w:t>\\s*</w:r>'
    );
    if (re.test(inner)) return inner.replace(re, replacement);
    return inner.split(token).join(replacement);   // 兜底：至少替换 token 本身
  }

  function buildDocumentXml(inner) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">' +
      '<w:body>' + inner +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="851" w:footer="992" w:gutter="0"/>' +
      '<w:cols w:space="425"/></w:sectPr>' +
      '</w:body></w:document>';
  }

  // 读取 PNG / JPEG / GIF 的像素尺寸，用于按原始比例排版图片
  function u32be(b, i) { return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0; }
  function u16be(b, i) { return (b[i] << 8) | b[i + 1]; }
  function u16le(b, i) { return b[i] | (b[i + 1] << 8); }

  function readImageSize(bytes, mime) {
    try {
      if (mime === 'image/png' && bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
        return { w: u32be(bytes, 16), h: u32be(bytes, 20) };
      }
      if (mime === 'image/gif' && bytes.length > 10) {
        return { w: u16le(bytes, 6), h: u16le(bytes, 8) };
      }
      if (mime === 'image/jpeg') {
        var i = 2;
        while (i + 9 < bytes.length) {
          if (bytes[i] !== 0xFF) { i++; continue; }
          var marker = bytes[i + 1];
          if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
            return { w: u16be(bytes, i + 7), h: u16be(bytes, i + 5) };
          }
          i += 2 + u16be(bytes, i + 2);
        }
      }
    } catch (e) { /* 尺寸读不出就给默认值 */ }
    return null;
  }

  function base64ToBytes(b64) {
    if (typeof Buffer !== 'undefined' && Buffer.from) return Buffer.from(b64, 'base64');
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  function dataUriToParts(dataUri) {
    var m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUri);
    if (!m) return null;
    return { mime: m[1] || 'application/octet-stream', base64: m[3], bytes: base64ToBytes(m[3]) };
  }

  function extOf(mime) {
    if (mime === 'image/png') return 'png';
    if (mime === 'image/jpeg') return 'jpeg';
    if (mime === 'image/gif') return 'gif';
    if (mime === 'image/webp') return 'webp';
    return 'png';
  }

  function imageRunXml(relId, docPrId, wPt, hPt) {
    var cx = Math.round(wPt * EMU_PER_PT);
    var cy = Math.round(hPt * EMU_PER_PT);
    return '<w:r><w:rPr><w:noProof/></w:rPr><w:drawing>' +
      '<wp:inline distT="0" distB="0" distL="0" distR="0">' +
      '<wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
      '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
      '<wp:docPr id="' + docPrId + '" name="图片' + docPrId + '"/>' +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
      '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:nvPicPr><pic:cNvPr id="' + docPrId + '" name="image' + docPrId + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + relId + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
      '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }

  function hyperlinkRunXml(relId, text) {
    var esc = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<w:hyperlink r:id="' + relId + '"><w:r><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr>' +
      '<w:t xml:space="preserve">' + esc + '</w:t></w:r></w:hyperlink>';
  }

  /**
   * @param {string} bodyFragment  M2W.convert().ooxml
   * @param {object} JSZipLib      JSZip 构造函数
   * @param {object} opts          { type:'blob'|'nodebuffer', placeholders:[], title:'' }
   * @returns Promise<Blob|Buffer>
   */
  function buildDocx(bodyFragment, JSZipLib, opts) {
    opts = opts || {};
    var placeholders = opts.placeholders || [];
    var inner = extractBody(bodyFragment);

    var rels = [];          // {id, xml}
    var media = [];         // {name, base64}
    var docPrSeq = 100;
    var imgSeq = 0;

    function tokenOf(ph, idx) {
      return '\uE000MD2W:' + (ph.type === 'link' ? 'L' : 'I') + idx + '\uE001';
    }

    placeholders.forEach(function (ph, idx) {
      var token = tokenOf(ph, idx);
      if (inner.indexOf(token) === -1) return;

      if (ph.type === 'link' && ph.url && !/^data:/i.test(ph.url)) {
        var relId = 'rIdLink' + idx;
        rels.push('<Relationship Id="' + relId + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' +
          ph.url.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" TargetMode="External"/>');
        inner = replaceTokenRun(inner, token, hyperlinkRunXml(relId, ph.text || ph.url));
        return;
      }

      if (ph.type === 'image') {
        var imgSrc = ph.dataUri || (/^data:/i.test(ph.src || '') ? ph.src : null);
        var parts = imgSrc ? dataUriToParts(imgSrc) : null;
        if (parts && parts.bytes && parts.bytes.length) {
          imgSeq++;
          var ext = extOf(parts.mime);
          var mediaName = 'image' + imgSeq + '.' + ext;
          media.push({ name: mediaName, base64: parts.base64 });
          var relId2 = 'rIdImg' + imgSeq;
          rels.push('<Relationship Id="' + relId2 + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + mediaName + '"/>');
          var size = readImageSize(parts.bytes, parts.mime);
          var wPt = size ? size.w / 96 * 72 : 400;    // 按 96dpi 折算成 pt
          var hPt = size ? size.h / 96 * 72 : 300;
          if (wPt > MAX_WIDTH_PT) { hPt = hPt * MAX_WIDTH_PT / wPt; wPt = MAX_WIDTH_PT; }
          docPrSeq++;
          inner = replaceTokenRun(inner, token, imageRunXml(relId2, docPrSeq, wPt, hPt));
          return;
        }
        // 图片抓不到：降级为超链接（网络图）或删除（无效 data URI）
        if (/^https?:/i.test(ph.src || '')) {
          var relId3 = 'rIdLink' + idx;
          rels.push('<Relationship Id="' + relId3 + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' +
            ph.src.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" TargetMode="External"/>');
          inner = replaceTokenRun(inner, token, hyperlinkRunXml(relId3, ph.alt || ph.src));
        } else {
          inner = replaceTokenRun(inner, token, '');
        }
      }
    });

    var docRelsXml = DOC_RELS_XML_HEAD + rels.join('') + '</Relationships>';

    var zip = new JSZipLib();
    zip.file('[Content_Types].xml', CONTENT_TYPES_XML);
    zip.folder('_rels').file('.rels', ROOT_RELS_XML);
    var docProps = zip.folder('docProps');
    docProps.file('core.xml', CORE_XML);
    var word = zip.folder('word');
    word.file('document.xml', buildDocumentXml(inner));
    word.file('styles.xml', STYLES_XML);
    word.folder('_rels').file('document.xml.rels', docRelsXml);
    if (media.length) {
      var m = word.folder('media');
      media.forEach(function (f) { m.file(f.name, f.base64, { base64: true }); });
    }

    var type = opts.type || (typeof Blob !== 'undefined' ? 'blob' : 'nodebuffer');
    return zip.generateAsync({
      type: type,
      compression: 'DEFLATE',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  }

  return { buildDocx: buildDocx, stylesXml: STYLES_XML, extractBody: extractBody };
});
