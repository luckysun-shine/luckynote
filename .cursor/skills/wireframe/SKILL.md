---
name: wireframe
description: >
  绘制低保真线框图与用户流程图：页面级线框、组件草图、跳转关系与流程图，
  支持 ASCII 与 SVG 两种格式，可导出 HTML 用于团队评审。
  用在结构未定的阶段——先把信息架构和功能区块排清楚，再进入视觉层。
  适用于「先画个线框看看结构」、「把页面跳转关系理一下」、「出一版低保真给评审」等场景。
  只要诉求里出现线框图／低保真／页面结构／用户流程／跳转关系，就用这个技能。
  注：依赖 scripts/script.sh，需具备可执行 shell 的运行环境。
argument-hint: "说明要画的页面与区块，如：画一个商品详情页线框，含头图、参数、评价、购买栏"
description_en: >
  Produce low-fidelity wireframes and user flow diagrams: page-level wireframes, component sketches,
  navigation relationships, and flowcharts, in ASCII or SVG, exportable to HTML for team review. Used
  while structure is still unsettled, to settle information architecture and functional blocks before
  visual design begins. Requires a shell-capable environment.
---

# Wireframe

Generate wireframes, component sketches, and user flow diagrams for UI design.

## Commands

### page

Generate a full-page wireframe in ASCII or SVG format.

```bash
bash scripts/script.sh page --sections "header,hero,features,cta,footer" --format svg --output wireframe.svg
```

### component

Generate a wireframe for a single UI component (form, card, nav, table, etc).

```bash
bash scripts/script.sh component --type card --fields "image,title,text,button" --output card.svg
```

### flow

Generate a user flow diagram showing page transitions and decision points.

```bash
bash scripts/script.sh flow --steps "login,dashboard,settings,logout" --decisions "auth:yes/no" --output flow.svg
```

### annotate

Add numbered annotations and notes to an existing SVG wireframe.

```bash
bash scripts/script.sh annotate --input wireframe.svg --notes "1:Logo area,2:Search bar,3:Main content" --output annotated.svg
```

### export

Export a wireframe to standalone HTML with inline styles.

```bash
bash scripts/script.sh export --input wireframe.svg --format html --output wireframe.html
```

### template

Generate a wireframe from a built-in page template (landing, dashboard, blog, ecommerce, etc).

```bash
bash scripts/script.sh template --name landing --format ascii
```

When exporting an SVG template, `--width` and `--height` may be supplied to control the canvas size.

## Output

- `page`: ASCII wireframe to stdout or SVG file to disk
- `component`: SVG file with component wireframe
- `flow`: SVG flowchart with boxes and arrows
- `annotate`: SVG file with annotation markers and legend
- `export`: Standalone HTML file with embedded wireframe
- `template`: Wireframe output in chosen format


## Requirements
- bash 4+

## Feedback

https://bytesagain.com/feedback/

---

Powered by BytesAgain | bytesagain.com
