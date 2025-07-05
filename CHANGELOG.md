# 变更日志 (Changelog)

## 🎉 Release v1.0.3

### 📅 2025-07-05

### 🔧 其他变更 (Other Changes)
- 更新README.md文件，修改徽章链接为新项目地址，添加组件演示图；在MyWidgets视图中注释掉视图切换和菜单项功能，简化组件管理逻辑。 ([d1bad28](https://github.com/kuai-dian/obsidian/commit/d1bad28))


---


## 🎉 Release v1.0.2

### 📅 2025-07-05

### 🔧 其他变更 (Other Changes)
- 更新README.md文件，新增GitHub Stars和许可证徽章，添加项目支持提示，增强文档可读性。 ([a07817d](https://github.com/kuai-dian/obsidian/commit/a07817d))


---


## 🎉 Release v1.0.1

### 📅 2025-07-05

### 🔧 其他变更 (Other Changes)
- 更新.gitignore文件以包含新的环境文件、日志、测试覆盖率、临时文件和分发文件的忽略规则；更新README.md文件，添加构建和发布徽章，更新手动安装说明，新增贡献和变更日志部分。 ([3b934ce](https://github.com/kuai-dian/obsidian/commit/3b934ce))
- 优化组件预览功能，添加用户组件信息获取逻辑，更新iframe加载方式并处理加载失败情况；新增模态框样式，支持复制组件代码功能。 ([6e8fe03](https://github.com/kuai-dian/obsidian/commit/6e8fe03))
- 更新WidgetService类，修改API请求方式为POST，重构请求参数构建逻辑，优化请求体格式以支持新的数据结构。 ([b1b14c6](https://github.com/kuai-dian/obsidian/commit/b1b14c6))
- 重构组件视图，移除旧的组件浏览器和管理器，新增“我的组件”视图。更新样式以支持视图切换和搜索框，添加获取组件列表和添加用户组件的新API。 ([e4e0439](https://github.com/kuai-dian/obsidian/commit/e4e0439))
- 请提供文件的di ([40c0697](https://github.com/kuai-dian/obsidian/commit/40c0697))


---


所有重要的变更都会记录在此文件中。

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

## [未发布]

### ✨ 新功能
- 初始版本发布
- 支持浏览和搜索组件商店
- 支持管理用户组件
- 支持插入组件到 Markdown 文档
- 支持组件预览功能
- 支持 OAuth 登录认证
- 支持多种插入格式（widgetstore 代码块、iframe、HTML）
- 支持复制组件代码功能
- 支持组件分类筛选（基础组件、图标组件、背景组件、图表组件）

### 🔧 技术特性
- 集成腾讯云 CloudBase 服务
- 支持自动刷新 Access Token
- 响应式界面设计
- 支持深色模式