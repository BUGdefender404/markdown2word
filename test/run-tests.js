'use strict';
/**
 * Node 无头测试：markdown → OOXML 各元素正确性 + XML 合法性校验
 * 运行：npm test
 */
const M2W = require('../src/converter/m2w-core.js');
const M2WDocx = require('../src/docx-builder.js');
const markdownit = require('markdown-it');
const temml = require('temml');
const { mml2omml } = require('mathml2omml');
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');
const fs = require('fs');
const path = require('path');

const conv = M2W.createConverter({ markdownit, temml, mml2omml });

let pass = 0, fail = 0;
const failures = [];
const fragments = [];   // 供 Word COM 实测的片段

function check(name, md, fn, opts) {
  let res;
  try {
    res = conv.convert(md, opts);
  } catch (e) {
    fail++; failures.push(`${name}: 转换抛出异常 ${e.message}`);
    console.log(`  ✗ ${name}`);
    return;
  }
  // 1) XML 合法性
  try {
    const doc = new DOMParser({ onError: (e) => { throw new Error(e) } })
      .parseFromString(res.ooxml, 'text/xml');
    if (!doc || !doc.documentElement || doc.getElementsByTagName('parsererror').length) {
      throw new Error('parsererror');
    }
  } catch (e) {
    fail++; failures.push(`${name}: 输出不是合法 XML —— ${e.message}`);
    console.log(`  ✗ ${name}`);
    fragments.push({ name, ...res });
    return;
  }
  // 2) 断言
  try {
    fn(res, md);
    pass++;
    console.log(`  ✓ ${name}`);
    fragments.push({ name, ...res });
  } catch (e) {
    fail++;
    failures.push(`${name}: ${e.message}`);
    console.log(`  ✗ ${name} —— ${e.message}`);
    fragments.push({ name, ...res });
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'assert failed'); }
function assertCount(s, sub, n, what) {
  let c = 0, i = 0;
  while ((i = s.indexOf(sub, i)) !== -1) { c++; i += sub.length; }
  assert(c === n, `${what || sub} 期望 ${n} 处，实际 ${c} 处`);
}

console.log('\n== 标题 ==');
check('heading 映射 Heading1/2 + outlineLvl',
  '# 一级标题\n\n## 二级标题',
  r => {
    assert(r.ooxml.includes('<w:pStyle w:val="Heading1"/>'), 'Heading1 缺失');
    assert(r.ooxml.includes('<w:pStyle w:val="Heading2"/>'), 'Heading2 缺失');
    assert(r.ooxml.includes('<w:outlineLvl w:val="0"/>'), 'outlineLvl 0 缺失');
    assert(r.ooxml.includes('一级标题'), '标题文字缺失');
  });

console.log('\n== 行内格式 ==');
check('粗体/斜体/删除线/行内代码',
  '**粗体** *斜体* ~~删除~~ `code`',
  r => {
    assertCount(r.ooxml, '<w:b/>', 1, 'w:b');
    assertCount(r.ooxml, '<w:i/>', 1, 'w:i');
    assertCount(r.ooxml, '<w:strike/>', 1, 'w:strike');
    assert(r.ooxml.includes('Consolas'), '行内代码 Consolas 缺失');
    assert(r.ooxml.includes('F2F2F2'), '行内代码底纹缺失');
  });
check('单个换行 → w:br（breaks 模式）',
  '第一行\n第二行',
  r => assertCount(r.ooxml, '<w:br/>', 1, 'w:br'));
check('HTML 标签白名单：<br> <sub> <u>',
  'a<br>b<sub>c</sub><u>d</u><em>e</em>',
  r => {
    assertCount(r.ooxml, '<w:br/>', 1, 'br');
    assertCount(r.ooxml, 'subscript', 1, 'sub');
    assertCount(r.ooxml, '<w:u w:val="single"/>', 1, 'u');
    assertCount(r.ooxml, '<w:i/>', 1, 'em');
  });

console.log('\n== 行内公式 ==');
check('$...$ → m:oMath',
  '质能方程 $E=mc^2$ 很有名',
  r => {
    assertCount(r.ooxml, '<m:oMath', 1, 'm:oMath');
    assert(r.ooxml.includes('<m:t'), 'm:t 缺失');
    assert(!r.ooxml.includes('$'), '美元符号残留');
  });
check('\\(...\\) → m:oMath',
  '这是 \\(x^2 + y^2 = z^2\\) 圆方程',
  r => {
    assertCount(r.ooxml, '<m:oMath', 1, 'm:oMath');
    assert(!r.ooxml.includes('\\('), '\\( 残留');
  });
check('分数/求和/希腊字母',
  '$\\frac{a}{b} + \\sum_{i=1}^{n} x_i = \\alpha + \\beta$',
  r => {
    assertCount(r.ooxml, '<m:oMath', 1, 'm:oMath');
    assert(r.ooxml.includes('<m:f>'), '分数 m:f 缺失');
  });
check('货币金额 $5 and $10 不误判',
  '价格是 $5 and $10 美元',
  r => assertCount(r.ooxml, '<m:oMath', 0, 'm:oMath（应无误判）'));
check('转义 \\$ 不转换',
  '成本 \\$100',
  r => assertCount(r.ooxml, '<m:oMath', 0, 'm:oMath'));

console.log('\n== 块级公式 ==');
check('多行 $$...$$（顶层 \\\\ 拆成多个公式段落）',
  '$$\nE = mc^2 \\\\\nF = ma\n$$',
  r => {
    assertCount(r.ooxml, '<m:oMathPara>', 2, 'm:oMathPara（应拆成两段）');
    assert(r.ooxml.includes('m:oMathParaPr'), 'oMathParaPr 缺失');
    assert(r.ooxml.includes('m:jc m:val="center"'), '居中缺失');
  });
check('align 环境内不被拆分',
  '$$\n\\begin{aligned}\na &= b \\\\ c &= d\n\\end{aligned}\n$$',
  r => {
    assertCount(r.ooxml, '<m:oMathPara>', 1, 'm:oMathPara');
    assert(!r.ooxml.includes('<w:t xml:space="preserve">begin'), '不应有文本回退');
  });
check('单行 $$...$$（回归：\\int 与首字符不被吞）',
  '$$\\int_0^1 x^2 dx = \\frac{1}{3}$$',
  r => {
    assertCount(r.ooxml, '<m:oMathPara>', 1, 'm:oMathPara');
    assert(r.ooxml.includes('∫'), '积分号 ∫ 丢失');
  });
check('单行 $$A = pmatrix$$（回归：首字符保留）',
  '$$A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$$',
  r => {
    assert(r.ooxml.includes('A'), '首字符 A 丢失');
    assert(r.ooxml.includes('<m:m>'), '矩阵缺失');
  });
check('align 对齐环境',
  '$$\n\\begin{aligned}\na &= b + c \\\\\nd &= e\n\\end{aligned}\n$$',
  r => assertCount(r.ooxml, '<m:oMathPara>', 1, 'm:oMathPara'));
check('矩阵环境 pmatrix',
  '$$A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$$',
  r => {
    assertCount(r.ooxml, '<m:oMathPara>', 1, 'm:oMathPara');
    assert(r.ooxml.includes('<m:m>'), '矩阵 m:m 缺失');
  });
check('公式中的中文 \\text{}',
  '$$\\text{质量} = m$$',
  r => {
    assertCount(r.ooxml, '<m:oMathPara>', 1, 'm:oMathPara');
    assert(r.ooxml.includes('质量'), '中文丢失');
  });
check('\\[...\\] 块级',
  '\\[\nx + y = 1\n\\]',
  r => assertCount(r.ooxml, '<m:oMathPara>', 1, 'm:oMathPara'));
check('无效公式 → 回退原文 + 警告',
  '$$\\begin{align}{xx\\end{align}$$',
  r => {
    assert(r.warnings.length >= 1, '应有警告');
    assert(r.ooxml.includes('align'), '应保留原文');
  });

console.log('\n== 表格 ==');
check('GFM 表格：表头/对齐/单元格公式/<br>',
  '| 参数 | 含义 | 值 |\n|:---|:---:|---:|\n| $\\alpha$ | 阿尔法<br>系数 | 0.05 |\n| $\\beta$ | **贝塔** | 0.1 |',
  r => {
    assertCount(r.ooxml, '<w:tbl>', 1, 'w:tbl');
    assertCount(r.ooxml, '<w:tr>', 3, 'w:tr 行数');
    assertCount(r.ooxml, '<w:tblHeader/>', 1, 'tblHeader');
    assert(r.ooxml.includes('<w:jc w:val="center"/>'), '居中列缺失');
    assert(r.ooxml.includes('<w:jc w:val="right"/>'), '右对齐列缺失');
    assertCount(r.ooxml, '<m:oMath', 2, '单元格内公式');
    assertCount(r.ooxml, '<w:br/>', 1, '单元格 <br>');
    assert(r.ooxml.includes('<w:b/>'), '表头加粗缺失');
  });
check('相邻表格不合并',
  '| a | b |\n|---|---|\n| 1 | 2 |\n\n| c | d |\n|---|---|\n| 3 | 4 |',
  r => assertCount(r.ooxml, '<w:tbl>', 2, '两张表'));

console.log('\n== 列表 ==');
check('无序列表（含紧凑列表）',
  '- 第一项\n- 第二项\n- 第三项',
  r => {
    assertCount(r.ooxml, '\u25CF', 3, '● 项目符号');
    assertCount(r.ooxml, '<w:ind w:left="780" w:hanging="360"/>', 3, '缩进');
    assertCount(r.ooxml, '</w:p>', 3, '独立段落');
  });
check('有序列表编号 + 起点',
  '3. 三\n4. 四',
  r => {
    assert(r.ooxml.includes('>3. <') || r.ooxml.includes('3. '), '编号 3. 缺失');
    assert(r.ooxml.includes('4. '), '编号 4. 缺失');
  });
check('嵌套列表：有序+无序',
  '1. 第一\n   - 子项甲\n   - 子项乙\n2. 第二',
  r => {
    assert(r.ooxml.includes('1. '), '1. 缺失');
    assert(r.ooxml.includes('2. '), '2. 缺失');
    assertCount(r.ooxml, '\u25CB', 2, '○ 二级符号');
  });
check('列表项中的行内公式',
  '- 速度 $v = at$\- 位移 $s = \\frac{1}{2}at^2$',
  r => assertCount(r.ooxml, '<m:oMath', 2, '公式数'));

console.log('\n== 其他块 ==');
check('代码块：Consolas + 底纹 + 换行',
  '```python\nprint("hello")\nx = 1\n```',
  r => {
    assertCount(r.ooxml, 'Consolas', 9, 'Consolas 出现次数');   // 3 个 rPr × 3 处字体声明
    assert(r.ooxml.includes('print(&quot;hello&quot;)'), '代码文本缺失');   // 引号被 XML 转义属正常
    assertCount(r.ooxml, '<w:br/>', 1, '代码内换行');
  });
check('代码块内的 $ 不当公式',
  '```\ncost = $5 + $6\n```',
  r => assertCount(r.ooxml, '<m:oMath', 0, '不应有公式'));
check('引用块：左边框 + 缩进',
  '> 引用内容第一行\n> 第二行',
  r => {
    assert(r.ooxml.includes('<w:left w:val="single" w:sz="18"'), '引用左边框缺失');
    assert(r.ooxml.includes('<w:ind w:left="480"/>'), '引用缩进缺失');
  });
check('分隔线 hr',
  '上文\n\n---\n\n下文',
  r => assert(r.ooxml.includes('<w:bottom w:val="single" w:sz="6"'), 'hr 缺失'));

console.log('\n== 链接与图片 ==');
check('链接 → 占位符',
  '参考 [OpenAI 官网](https://openai.com) 了解更多',
  r => {
    const ph = r.placeholders[0];
    assert(ph && ph.type === 'link', 'link 占位符缺失');
    assert(ph.url === 'https://openai.com', 'url 错误: ' + ph.url);
    assert(ph.text === 'OpenAI 官网', 'text 错误: ' + ph.text);
    assert(r.ooxml.includes('\uE000MD2W:L0\uE001'), '占位符 token 缺失');
  });
check('图片 data URI → 占位符',
  '![示意图](data:image/png;base64,iVBORw0KGgo=)',
  r => {
    const ph = r.placeholders[0];
    assert(ph && ph.type === 'image', 'image 占位符缺失');
    assert(ph.src.startsWith('data:image/png'), 'src 错误');
  });
check('网络图片 → 占位符',
  '![fig](https://example.com/a.png)',
  r => {
    const ph = r.placeholders[0];
    assert(ph && ph.type === 'image' && ph.src === 'https://example.com/a.png', '图片占位符错误');
  });

console.log('\n== 综合样例 ==');
const samplePath = path.join(__dirname, '..', 'samples', 'ai-sample.md');
if (fs.existsSync(samplePath)) {
  check('真实 AI 回复样例（XML 合法 + 公式/表格齐备）',
    fs.readFileSync(samplePath, 'utf8'),
    r => {
      assertCount(r.ooxml, '<w:tbl>', 1, '表格数');
      assertCount(r.ooxml, '<m:oMathPara>', 4, '块级公式数');
      assert(r.ooxml.includes('Heading2'), 'H2 缺失');
      assert(r.placeholders.some(p => p.type === 'link'), '链接占位符缺失');
    });
}

// ---- 网页版 docx 打包器测试 ----
async function checkDocx() {
  const name = 'docx 打包：文档结构/样式/公式/图片/超链接';
  try {
    const mdWithImage = [
      '# 测试文档',
      '',
      '带公式 $E=mc^2$ 和表格：',
      '',
      '| A | B |',
      '|---|---|',
      '| 1 | 2 |',
      '',
      '![示意图](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)',
      '',
      '参考 [示例链接](https://example.com/page?a=1&b=2)。'
    ].join('\n');
    const res = conv.convert(mdWithImage);
    const buf = await M2WDocx.buildDocx(res.ooxml, JSZip, { type: 'nodebuffer', placeholders: res.placeholders });

    const zip = await JSZip.loadAsync(buf);
    const files = Object.keys(zip.files);
    const mustHave = ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml',
      'word/_rels/document.xml.rels', 'docProps/core.xml', 'word/media/image1.png'];
    for (const f of mustHave) {
      assert(files.includes(f), `缺少部件 ${f}（实际: ${files.join(', ')}）`);
    }

    const docXml = await zip.file('word/document.xml').async('string');
    new DOMParser({ onError: (e) => { throw new Error(e); } }).parseFromString(docXml, 'text/xml');
    assert(docXml.includes('<w:document'), 'document 根元素缺失');
    assert(docXml.includes('<w:sectPr>'), 'sectPr 缺失');
    assert(docXml.includes('<m:oMath'), '公式缺失');
    assert(docXml.includes('<w:tbl>'), '表格缺失');
    assert(docXml.includes('<w:drawing>'), '图片 drawing 缺失');
    assert(!docXml.includes('\uE000MD2W:'), '占位符未替换干净');
    assert(docXml.includes('<w:hyperlink r:id='), '超链接缺失');
    // 回归：超链接/图片必须是独立 run，不能嵌在 1pt 白色占位 run 内（迷你蓝字 bug）
    assert(!/<w:t[^>]*>\s*<w:hyperlink/.test(docXml), 'hyperlink 不应嵌在 w:t 内');
    assert(!/<w:t[^>]*>\s*<w:drawing/.test(docXml), 'drawing 不应嵌在 w:t 内');
    assert(!/w:sz w:val="2"/.test(docXml), '占位 run 的 1pt 字号残留');

    const relsXml = await zip.file('word/_rels/document.xml.rels').async('string');
    assert(relsXml.includes('TargetMode="External"'), '外链关系缺失');
    assert(relsXml.includes('Target="media/image1.png"'), '图片关系缺失');

    console.log(`  ✓ ${name}`);
    pass++;
  } catch (e) {
    console.log(`  ✗ docx 打包 —— ${e.message}`);
    fail++;
    failures.push('docx 打包: ' + e.message);
  }
}

(async function main() {
  console.log('\n== 网页版 docx 打包 ==');
  await checkDocx();

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  if (failures.length) {
    console.log('\n失败详情:');
    failures.forEach(f => console.log('  - ' + f));
  }
  process.exit(fail ? 1 : 0);
})();
