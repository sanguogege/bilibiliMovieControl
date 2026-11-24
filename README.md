# BilibiliMovieControl（B 站连播助手）

> 面向 B 站**用户上传合集**的连播辅助插件：在播放页管理「片段跳过 / 下一 P」片段，自动连播，并可将片段上传到 BilibiliSponsorBlock。

![Version](https://img.shields.io/github/package-json/v/sanguogege/BilibiliMovieControl)
![Manifest](https://img.shields.io/badge/Manifest_V3_%2F_V2-✓-green)
![Tech](https://img.shields.io/badge/WXT%20%2B%20SolidJS-fb7299)

---

## 🙏 鸣谢

本项目的云端片段能力来自 [BilibiliSponsorBlock](https://github.com/hanydd/BilibiliSponsorBlock) 的公开 API 与社区提交的片段数据，特此致谢：

- 项目地址：<https://github.com/hanydd/BilibiliSponsorBlock>
- API 文档：<https://github.com/hanydd/BilibiliSponsorBlock/wiki/API>
- 服务地址：<https://bsbsb.top>

引用方式与许可证说明见文末「第三方引用与许可证」。

## ✨ 功能

### 播放

- **片段跳过**：播放进入片段区间时，自动跳到区间终点
- **下一 P**：播放到达片段起点时自动点击「下一 P」；状态条直接显示实际触发的起点时间（手动优先；云端多条只取 start 最大的一条）

### 片段管理

- **查看**：播放页「查看」展示手动片段与云端片段
- **设置**：编辑起止位置与类型，支持预览、定位、删除；已保存片段可点击载入，或「＋ 新建片段」以当前进度为起点
- **私人 ID**：首次自动生成并保存在本地，也可替换

### 云端（BilibiliSponsorBlock）

- **云端片段**：查询公开片段，带 `BiliSB` 标识；可在设置页开关是否参与跳转
- **云端数据页**：状态条「云端数据」入口会带上当前 BV，按 cid 分组查看该视频的全部公开片段；从侧边栏进入时会保留当前 / 最近一次的 BV 与分 P
- **社区投票**：云端数据页的 P 片段可进入社区页，查看 votes / views / hidden / locked / reputation，并点赞 / 点踩 / 撤销；隐藏与锁定最终由服务端和权限决定
- **上传**：把手动片段提交到 bsbsb.top；上传成功或服务端已存在相同片段后，自动移除对应的本地片段，避免与云端片段重复

### 存档与显示

- **存档**：自动记录最近播放，也支持手动存档（各 20 条）
- **显示开关**：状态条、操作按钮、云端链接、进度条标记 / 常驻色带都可单独隐藏（设置页 → 界面显示）

## 🎯 适用范围

仅对**带选集列表**（`.video-pod`）的合集视频生效；电影、番剧、普通单视频不处理。

## 🚀 使用

1. 打开合集视频，标题下方出现状态条与「查看 / 设置」按钮
2. **查看**：浏览手动片段和云端片段
3. **设置**（编辑 / 上传）：
   - 编辑片段：填写起止时间、选择类型（片段跳过 / 下一P）
   - 按钮：删除、预览、开头、结尾、编辑/保存
   - 已保存片段：点击载入编辑，或「＋ 新建片段」以当前进度为起点
   - 私人 ID：首次自动生成并保存在本地，也可替换
4. 播放时按片段自动跳过或切集

## 🖥️ 界面

- **播放页**：悬浮状态条 + 可拖拽的「查看 / 设置」窗口
- **Popup**：片段概览、最近播放、手动存档、进入设置页
- **Options**：功能讲解 / 云端片段 / 界面显示 / 自动存档 / 手动存档 / 关于

## 💾 存储

| 键名 | 说明 |
| --- | --- |
| `segments` | 片段列表（`skip` / `next`） |
| `useCloudSegments` | 是否让云端片段参与跳转 |
| `latestHistory` | 自动存档，最多 20 条 |
| `pinnedHistory` | 手动存档，最多 20 条 |
| `sbUserID` | 上传用的私人 ID |

## 🛠️ 技术

| 类别 | 选型 |
| --- | --- |
| 扩展框架 | [WXT](https://wxt.dev)（Chrome / Edge MV3，Firefox MV2） |
| UI | Popup / Options 使用 [SolidJS](https://www.solidjs.com) 1.x；内容脚本为原生 DOM |
| 样式 | TailwindCSS 4 + [DaisyUI](https://daisyui.com) |
| 接口 | [BilibiliSponsorBlock API](https://github.com/hanydd/BilibiliSponsorBlock/wiki/API) |
| 构建 | Vite + Bun |

## 📎 第三方引用与许可证

云端片段的查询与上传基于 [BilibiliSponsorBlock](https://github.com/hanydd/BilibiliSponsorBlock) 的公开 HTTP API：

- 项目地址：<https://github.com/hanydd/BilibiliSponsorBlock>
- API 文档：<https://github.com/hanydd/BilibiliSponsorBlock/wiki/API>
- 服务地址：<https://bsbsb.top>

需要注意：BilibiliSponsorBlock 整体采用 **GPL-3.0** 许可证（[许可证原文](https://www.gnu.org/licenses/gpl-3.0.html)）。

- 本项目没有复制或修改其源代码，只在运行时调用其 API；片段数据由该项目社区提交
- 如果你的分发版本包含该项目的数据或衍生代码，可能同样需要以 **GPL-3.0 兼容的开源许可证**发布
- 如果计划闭源或用于商业产品，请先确认 GPL-3.0 的“传染性”是否会构成限制

以上仅为项目引用与许可证信息说明，不构成法律意见。

## 💻 开发

```bash
bun install      # 安装依赖
bun dev          # 开发模式（Chrome）
bun build        # 构建生产包
bun compile      # 类型检查
bun test         # 运行单元测试
bun zip          # 生成发布包
```

## 📄 说明

- 本项目仅供学习与交流使用，请勿用于任何商业用途
- 仓库地址：<https://github.com/sanguogege/BilibiliMovieControl>
