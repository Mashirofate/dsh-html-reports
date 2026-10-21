# dsh-html-reports

在 DeepSeek Harness 里渲染富 HTML 报告：present_html_report 工具、会话内报告卡片、按会话过滤的报告列表，以及 HTML / PNG / PDF 导出。

模型只调用一个工具 `present_html_report`，参数是一整份 HTML 文档。会话里不再是一段 Markdown，
而是在沙箱 iframe 中渲染的文档：栅格布局、表格、内联 SVG/CSS 图表、你自己的排版。

## 要求

- DeepSeek Harness `>=0.2.1-rc.2 <0.3.0`（由 `engines.dsh` 声明）。
- Web profile：卡片与报告列表属于 Client UI；无界面的 profile 里工具仍可用，只是没有画面。

## 安装

### 从 GitHub 装

```sh
dsh plugin --profile web add "git+https://github.com/Mashirofate/dsh-html-reports.git#<commit>"
```

commit 用 [market/index.json](market/index.json) 里固定的那个（写分支名也能装，但不可复现）。
npm 上发布之后也可以直接 `dsh plugin --profile web add dsh-html-reports`。

### 从插件市场装

开启实验性插件市场 bundle，然后在「设置 → 插件 → 发现」里添加这个索引：

```
https://raw.githubusercontent.com/Mashirofate/dsh-html-reports/main/market/index.json
```

安装后重启 profile，或刷新 Web 页面。

## 你会得到什么

| 部件 | 位置 |
|---|---|
| `present_html_report` 工具 | 模型可见工具，参数 `{title, html, height?}` |
| 报告卡片 | 会话中工具调用的位置 |
| 全屏浮层 | 卡片上的展开按钮；Esc 关闭 |
| 报告列表 | 右侧栏页签，按当前会话过滤 |
| 头部按钮 | 会话头部，打开报告列表 |
| 导出菜单 | HTML（原始下载）、PNG（2 倍栅格）、PDF（A4 宽切片） |

工具还注入一小段系统提示，让报告/分析类任务优先用 HTML 而不是长 Markdown。

## 限制

- HTML 上限 200,000 字符；标题 200；卡片高度 240-1200 px。
- iframe 使用 `sandbox="allow-scripts"` 与不透明源：脚本可以跑（内联图表），但文档读不到宿主
  页面、Cookie 或你的文件。
- 不要引用外部资源：样式、脚本、图片全部内联。宿主 CSP 与不透明源都会拦截远程加载。
- 报告 HTML 存放在会话日志里（它是工具调用参数），随会话回放；右侧列表本身是页面内存态，
  刷新后随卡片挂载重新填充。
- PNG/PDF 是栅格导出：PDF 里的文字不可选中。

## 许可证

MIT。
