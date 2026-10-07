'use strict';
// 生成最终 docx 并用真实 Word 打开验证（只读、关闭，不导出 PDF）
const M2W = require('../src/converter/m2w-core.js');
const M2WDocx = require('../src/docx-builder.js');
const markdownit = require('markdown-it');
const temml = require('temml');
const { mml2omml } = require('mathml2omml');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sample = fs.readFileSync(path.join(root, 'samples', 'ai-sample.md'), 'utf8');

const conv = M2W.createConverter({ markdownit, temml, mml2omml });
const res = conv.convert(sample);

M2WDocx.buildDocx(res.ooxml, JSZip, { type: 'nodebuffer', placeholders: res.placeholders })
  .then(buf => {
    const out = path.join(root, 'samples', '示例-牛顿第二定律.docx');
    fs.writeFileSync(out, buf);
    console.log('DOCX_WRITTEN ' + out + '  warnings=' + res.warnings.length);
  })
  .catch(e => { console.error('BUILD FAILED: ' + e.message); process.exit(1); });
