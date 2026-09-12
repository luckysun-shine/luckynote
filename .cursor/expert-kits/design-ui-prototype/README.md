# UI Prototype Design Expert

**Version**: v1.0.0　**Date**: 20260824

面向产品经理、设计师与前端的 UI 原型套件。六个成员按保真度递进：先定需求与结构，再立设计令牌与组件规范，再做质量审查，最后产出高保真单文件 HTML 原型。

**边界**：有设计稿时以设计稿为准，不自行发挥；无设计稿时按通用规范实现并显式标注假设。不替品牌定视觉调性。

> **免责声明：** 本套件支持专业工作流，不替代专业判断。所有输出在用于决策前应由具备相应资质的人员复核。

## Members

| Member | Purpose |
|---|---|
| `/需求转原型` PRD to Prototype | 一句话想法 → PRD → 高保真原型 |
| `/设计稿还原` Design to Code | Figma / Sketch / 截图 像素级还原 |
| `/设计系统构建` Design System | 设计令牌、组件规范、断点策略 |
| `/UI设计审查` UI Design | 布局、排版、色彩、可访问性质量审查 |
| `/线框图绘制` Wireframe | 低保真线框与用户流程图（ASCII / SVG） |
| `/前端设计优化` Frontend Design Pro | 反模式清单，去除模板感 |

## 推荐用法（一条链）

```
需求转原型 → 设计稿还原 → 设计系统构建 → UI设计审查 → 线框图绘制 → 前端设计优化
（获取层）              （分析层）                    （输出层）
```

无现成设计稿时跳过「设计稿还原」，由后续步骤从零设计。用户只要一个组件时不要拉起完整流程。

## Shared conventions

**1. 保真度逐级推进**：结构未确认前不投入高保真产出，避免在错误的结构上反复返工。

**2. 设计稿优先**：有设计稿时逐项核对间距、字号、色值、圆角；无设计稿时先声明将按通用规范实现、可能与预期有出入，并列出关键取值假设。

**3. 复用优先**：已有代码时先读技术栈与现有组件，复用优先于新建。

**4. 可访问性不豁免**：语义化标签、可见焦点态、文本对比度达标、可键盘操作——这四项不因为是原型而放宽。

**5. 单文件交付**：原型默认输出单文件、可直接在浏览器打开。

## 内容说明

`afrexai-ui-design-system` 原始包不含 YAML frontmatter，本次已按套件规范新建；其正文为完整设计方法论（约 760 行），未改动。

`prd-to-prototype` 原 frontmatter 的 `name` 为带空格的 `PRD to Prototype`（不符合标识名规范），已改为 `prd-to-prototype`；原文附带的第三方 AIGC 数字签名块已移除。该成员采用「零提问」模式，会直接按行业惯例补全细节，用于内部真实项目时需复核其自动补全的假设。

`wireframe` 依赖 `scripts/script.sh`，需具备可执行 shell 的运行环境。

## Version notes

v1.0.0 是从 skillhub 格式（`manifest.json` ＋ `skillsets/*.md` ＋ 嵌套 zip）迁移为专家套件格式的首个版本。六个成员全部保留。各成员 frontmatter 统一为 `name` / `description` / `argument-hint` / `description_en` 四字段，正文未改动（`design-to-code` 的 CRLF 换行统一为 LF）；第三方平台元数据（`_meta.json`、`clawhub.json`）与 AIGC 签名块已移除。

## 来源

六个原始 skill 来自公开 skillhub，各自版权归原作者所有。本包仅做格式适配与 frontmatter 规范化，未改动正文内容。

> 连接器详情：见 [CONNECTORS.md](CONNECTORS.md)