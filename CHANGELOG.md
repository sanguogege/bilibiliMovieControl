# B 站连播助手 (Bilibili Movie Control)

## 1.3.6

### Patch Changes

- ## 功能优化
- 修复快捷键在评论回复会触发快捷键。

## 1.3.5

### Patch Changes

- ## 功能优化
- 优化内部 ui 的处理方式。
- 修改 op 页面的逻辑，正确的保存数据有控制反应。
- 优化路由功能。
- 修复 popup 页历史记录的跳转。

- ## 页面优化
- 使用 daisyui 的 meau 组件，美化侧边栏。
- 修改一些图标不一致问题
- 添加 content 提示，即当用户输入的 op 跳转大于视频下一 P 跳转则给与提示。

## 1.3.4

### Patch Changes

- ## 功能优化
- 更新 solidjs 2.0rc 版本，等不及了，用 modules 桥接新版本。
- icon 使用对应的 rc 版本 @lucide/solid
- 优化了 hook,使用统一配置。
- 添加了快捷键功能

## 页面优化

- 快捷键录入页面添加。
- popup 页面也使用路由分开页面，效果还是一致的

## 1.3.3

### Patch Changes

- ## 功能优化

  - 优化了 createSingle，使用 createStore，对大量变量进行统一管理。
  - 优化一些程序功能，如 url 处理。自动存档、手动存档功能
  - 添加对 icon 和变化处理，表现插件是否可用。
    - 非指定页面，icon 为灰色及插件不可用。
    - 切换标签，url 变化 icon 也会被处理。
  - 优化程序代码，集中代码,更加美观实用。
  - 移除无效代码等等。

  ## 页面优化

  - 更清晰的详情指导，详情按钮改为查看
  - 输入组件变小，更加美观，由于 createStore 的使用，无需确定按钮，输入即变化。
  - 移除确定按钮，只保留重置按钮，存档按钮移位置，更加直观。
  - 美化存档样式，添加更多标签以便跳转到设置页面，更加直观。

  ## 其他

  - 改的太多，忘记了。

## 1.3.2

### Patch Changes

- - 更新详情页说明。

    - 修改主页为功能讲解。
    - 相关页，修改项目使用的插件。

  - 延迟对页面注入功能，以防止对 B 站加载产生影响。

  - 删除一些不必要的组件和方式。

  - daisyUI 会自动根据浏览器的主题颜色切换，dark 和 light 两个主题。

## 1.3.1

### Patch Changes

- - 使用 daisyUI，美化功能页面，组件。

  - 新增 light 和 dark 主题，根据浏览器的主题模式来切换。

  - 新增功能说明，在详情页面给出具体的指导方案。

## 1.3.0

### Minor Changes

- - 移除设置页，设置帧分析的起始位置，改为用户设置起点，便于应对多重场景。

  - popup 页面用户设置起点，帧分析和切集点都可以设置不同的小时，分钟，秒。

  - 修改单个 op 设置改为弹窗。

  - 添加多个 op 跳跃点，以满足单个视频跳过多个点。

  - 优化样式，添加 icon。

  - 优化性能，修复 bugs。

## 1.2.1

### Patch Changes

- Refactor: internal build optimization

## 1.2.0

### Minor Changes

- - 添加精准时间设置，用户可设置精准的小时，分钟，秒来决定帧分析的进入点。

  - 增加 popup 页面的样式，提供更好的效果。

  - 修复一些小问题。

## 1.1.3

### Patch Changes

- add firefox sources code

## 1.1.2

### Patch Changes

- aa

## 1.1.1

### Patch Changes

- new function

## 1.1.0

### Minor Changes

- change

## 1.0.5

### Patch Changes

- add auto mode

## 1.0.4

### Patch Changes

- fix:function

## 1.0.4

### Patch Changes

- fix fuction

## 1.0.3

### Patch Changes

- - 添加设定 op/先导 的时间节点。
  - 添加历史记录，并提供跳转功能。
  - 其他优化。

## 1.0.2

### Patch Changes

- add some function
