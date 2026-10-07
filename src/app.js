/*!
 * Markdown2Word 网页版交互逻辑
 * 粘贴/上传 Markdown → 实时预览 → 下载 .docx（全程本机完成）
 */
(function () {
  'use strict';

  var elInput, elPreview, elStatus, elCount, elBtnDownload, elFile, elBtnSample, elBtnClear;
  var conv, previewMd, previewTimer;

  var SAMPLE = [
    '# 牛顿第二定律的应用',
    '',
    '牛顿第二定律的数学表达为 $F = ma$，其中：',
    '',
    '- $F$ 是**合外力**（单位：N）',
    '- $m$ 是物体质量（单位：kg）',
    '- $a$ 是加速度（单位：m/s²）',
    '',
    '## 基本公式',
    '',
    '$$',
    's = v_0 t + \\frac{1}{2}at^2',
    '$$',
    '',
    '## 常用参数对照',
    '',
    '| 物理量 | 符号 | 国际单位 | 量纲 |',
    '|:------|:----:|:-------:|-----:|',
    '| 力 | $F$ | 牛顿 (N) | MLT⁻² |',
    '| 质量 | $m$ | 千克 (kg) | M |',
    '| 功 | $W = \\vec{F} \\cdot \\vec{d}$ | 焦耳 (J) | ML²T⁻² |',
    '',
    '> **注意**：使用该定律时需保证参考系为惯性参考系。',
    '',
    '## 方程组与矩阵',
    '',
    '$$',
    '\\begin{aligned}',
    'm_1 a_1 &= F_1 - kx \\\\',
    'm_2 a_2 &= kx - F_2',
    '\\end{aligned}',
    '$$',
    '',
    '$$',
    'K = \\begin{pmatrix} k & -k \\\\ -k & k \\end{pmatrix}, \\qquad \\det K = 0',
    '$$',
    '',
    '```python',
    'm = 2.0      # kg',
    'F = 10.0     # N',
    'a = F / m',
    'print(f"a = {a} m/s^2")   # 结果: 5.0',
    '```',
    '',
    '求解步骤：',
    '',
    '1. 对物体做受力分析，画出受力图',
    '2. 建立坐标系，将力分解到各坐标轴',
    '   - 斜面问题需先分解重力 $mg\\sin\\theta$',
    '3. 联立方程求解',
    '',
    '参考资料参见 [维基百科：牛顿运动定律](https://zh.wikipedia.org/wiki/牛顿运动定律)。'
  ].join('\n');

  function $(id) { return document.getElementById(id); }

  function status(kind, msg) {
    elStatus.className = 'status show ' + kind;
    elStatus.textContent = msg;
  }
  function hideStatus() { elStatus.className = 'status'; }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------------- 转换器 ---------------- */

  function getConverter() {
    if (!conv) {
      conv = window.M2W.createConverter({
        markdownit: window.markdownit,
        temml: window.temml,
        mml2omml: window.Mml2OmmlLib && window.Mml2OmmlLib.mml2omml
      });
    }
    return conv;
  }

  function buildPreviewMd() {
    var md = window.markdownit({ html: true, breaks: true, linkify: false, typographer: false });
    // 与核心管线相同的数学定界符规则
    var tmpConv = getConverter();
    // markdown-it 实例需要再挂一次数学规则：直接借用核心库
    window.M2W.attachMathRules(md);

    function mathHtml(tex, displayMode) {
      try {
        var out = window.temml.renderToString(tex, { displayMode: displayMode, throwOnError: false });
        if (out.indexOf('<math') !== -1 && out.indexOf('merror') === -1) return out;
      } catch (e) { /* fallthrough */ }
      return '<code>' + escHtml(tex) + '</code>';
    }
    md.renderer.rules.math_inline = function (tokens, idx) {
      return mathHtml(tokens[idx].content, tokens[idx].meta && tokens[idx].meta.display);
    };
    md.renderer.rules.math_block = function (tokens, idx) {
      return '<div class="mblock">' + mathHtml(tokens[idx].content, true) + '</div>';
    };
    return md;
  }

  function sanitizePreviewHtml(html) {
    return String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?(<\/iframe>|>)/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
  }

  function updatePreview() {
    var text = elInput.value;
    elCount.textContent = text.length ? (text.length + ' 字符') : '';
    if (!text.trim()) {
      elPreview.innerHTML = '<p style="color:#9aa1ad">左侧粘贴内容后这里会实时显示效果…</p>';
      return;
    }
    try {
      elPreview.innerHTML = sanitizePreviewHtml(previewMd.render(text));
    } catch (e) {
      elPreview.innerHTML = '<p style="color:#b91c1c">预览出错：' + escHtml(e.message) + '</p>';
    }
  }

  /* ---------------- 下载 docx ---------------- */

  function firstHeading(text) {
    var m = /^\s*#{1,6}\s+(.+?)\s*$/m.exec(text);
    return m ? m[1] : '';
  }

  // 网络图片尽力抓取（受 CORS 限制），抓不到降级为超链接
  async function resolveImages(placeholders) {
    for (var i = 0; i < placeholders.length; i++) {
      var ph = placeholders[i];
      if (ph.type !== 'image' || !/^https?:/i.test(ph.src)) continue;
      try {
        var resp = await fetch(ph.src, { mode: 'cors' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var blob = await resp.blob();
        if (blob.size > 8 * 1024 * 1024) throw new Error('too large');
        ph.dataUri = await new Promise(function (resolve, reject) {
          var fr = new FileReader();
          fr.onload = function () { resolve(fr.result); };
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
      } catch (e) { /* 保留为链接 */ }
    }
  }

  async function onDownload() {
    var text = elInput.value;
    if (!text.trim()) { status('warn', '请先粘贴 Markdown 内容。'); return; }

    elBtnDownload.disabled = true;
    status('ok', '正在生成 Word 文档…');
    try {
      var res = getConverter().convert(text);
      await resolveImages(res.placeholders);
      var blob = await window.M2WDocx.buildDocx(res.ooxml, window.JSZip, {
        type: 'blob',
        placeholders: res.placeholders
      });

      var name = (firstHeading(text) || 'markdown转word').replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 50);
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name + '.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);

      var msg = '✅ 已生成 ' + name + '.docx，正在下载。';
      if (res.warnings.length) {
        msg += '\n⚠️ ' + res.warnings.length + ' 个公式转换失败（已保留原文）：\n· ' +
          res.warnings.slice(0, 3).join('\n· ') + (res.warnings.length > 3 ? '\n…' : '');
        status('warn', msg);
      } else {
        status('ok', msg);
      }
    } catch (e) {
      status('err', '❌ 生成失败：' + (e && e.message ? e.message : e));
    } finally {
      elBtnDownload.disabled = false;
    }
  }

  /* ---------------- 其他交互 ---------------- */

  function onFile(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      elInput.value = String(fr.result);
      updatePreview();
    };
    fr.readAsText(f, 'utf-8');
    e.target.value = '';
  }

  /* ---------------- 启动 ---------------- */

  function init() {
    elInput = $('input');
    elPreview = $('preview');
    elStatus = $('status');
    elCount = $('count');
    elBtnDownload = $('btn-download');
    elFile = $('file');
    elBtnSample = $('btn-sample');
    elBtnClear = $('btn-clear');

    try { getConverter(); previewMd = buildPreviewMd(); }
    catch (e) { status('err', '转换库加载失败：' + e.message); return; }

    elBtnDownload.addEventListener('click', onDownload);
    elFile.addEventListener('change', onFile);
    elBtnSample.addEventListener('click', function () {
      elInput.value = SAMPLE;
      updatePreview();
      hideStatus();
    });
    elBtnClear.addEventListener('click', function () {
      elInput.value = '';
      updatePreview();
      hideStatus();
    });
    elInput.addEventListener('input', function () {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(updatePreview, 250);
    });

    elInput.value = SAMPLE;      // 首次打开预填示例，直观可见
    updatePreview();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
