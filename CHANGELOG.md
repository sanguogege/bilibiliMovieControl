# B 站连播助手 (Bilibili Movie Control)

## 1.5.1

### Patch Changes

1. JumpPanel：删除片段后列表为空也不再关闭面板。
2. 上传：成功后删除对应的本地片段（utils/jumpPanel.ts 新增 buildSubmitPlan 保留片段 id）。
3. 上传结果分类（utils/upload.ts）：409 按成功处理；timeout/network 提示“结果未知，可再上传一次”；其他错误保留本地片段。
4. utils/errors.ts：更新 409 / 429 提示文案。
5. JumpPanel：私人 ID、上传 增加问号悬停提示，新增“上传”小标题，移除原提示段落。
6. Cloud.tsx：「使用云端片段」与「查看指定视频」两张卡片换位。
7. panelStyles.ts：片段列表最多 5 行、超出滚动；加右/下 padding、预留滚动条位置；删除按钮加底色；行高固定、不换行，修复悬停抖动。
8. JumpPanel：点击「＋ 新建片段」直接解锁编辑。
9. 测试：新增 buildSubmitPlan、classifySubmitResult 用例。
10. README：补充“上传后移除本地片段”说明。
11. release.yml：Release 说明改为截取 CHANGELOG 当前版本段落，缺失时用占位文案。

## 1.5.0

### Minor Changes

- 统一 ui 为 solid 1x 版本
- 修复，bug，新增功能
- 添加进度条样式
- 添加设置页面其他功能
- 页面修复等等

## 1.4.0

### Minor Changes

- afb0a23: - 统一为「片段」模型：`skip`（片段跳过）与 `next`（到点下一 P），自动迁移旧的 `opRanges` / `jumpConfig`
  - 播放页新增「查看 / 设置」浮动窗口：可拖拽；查看片段、编辑起止与类型、预览 / 定位 / 删除
  - 接入 BilibiliSponsorBlock：查询云端片段、上传手动片段，新增 `bsbsb.top` host 权限
  - 云端片段可开关是否参与播放：设置页「云端片段」提供 aura 开关，默认开启；intro / sponsor 作为跳过、outro 作为下一 P，手动片段优先
  - 云端片段按 cid 查询与展示，状态条新增「云端数据」入口（带 BV 打开设置页）；BiliSB 片段用 ⏭ / P 区分跳过与下一 P；状态条「下一 P」直接显示实际起点时间（手动优先；云端多条只取 start 最大的一条）；侧边栏「云端片段」会保留当前 / 最近一次 BV 与分 P
  - 云端数据页的 P 片段新增「社区」入口：详情页展示 votes / views / hidden / locked / reputation，并支持点赞 / 点踩 / 撤销投票
  - 移除内置帧分析、状态设置页与 `isAutoHandle`、自定义快捷键
  - 移除 Popup 的多片段编辑页，片段统一在播放页「设置」里编辑
  - API 区分正式 / 测试环境：默认正式环境，可用 `VITE_SB_API=test` 切到测试环境（测试环境只支持查询，不支持上传）
  - 内容脚本改为原生 DOM 并直接读取 `storage.local`，移除页面内的 SolidJS 依赖
  - 图标只保留一套，去掉 active / inactive 切换；Popup 改为片段概览

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
