# Widget Store for Obsidian

将[组件世界](https://cn.widgetstore.net)的丰富组件资源直接集成到 Obsidian 中。

## 功能特性

- 🔐 **OAuth 安全登录** - 通过组件世界官网进行安全认证
- 🔍 **组件浏览** - 浏览和搜索各类公开组件（基础、图标、背景、图表）
- ⭐ **个人组件管理** - 管理您收藏和创建的组件
- 📝 **快速插入** - 多种方式将组件插入到笔记中
- 🎨 **实时预览** - 在 Obsidian 中直接预览组件效果
- 🔧 **灵活配置** - 自定义组件尺寸和插入格式

## 安装

### 手动安装

1. 下载最新的 Release
2. 解压到 Obsidian 插件目录：`<vault>/.obsidian/plugins/widgetstore-obsidian/`
3. 重启 Obsidian
4. 在设置中启用插件

### 从社区插件安装

（待提交到 Obsidian 社区插件市场）

## 使用方法

### 登录

1. 点击左侧边栏的组件世界图标或使用命令面板
2. 点击"登录组件世界"按钮
3. 在打开的浏览器中完成登录
4. 授权成功后会自动返回 Obsidian

### 浏览组件

1. 点击左侧边栏的组件世界图标打开组件浏览器
2. 使用顶部标签切换组件类型
3. 使用搜索框查找特定组件
4. 点击组件查看操作菜单

### 插入组件

有三种方式插入组件：

#### 方式一：组件代码块（推荐）

```markdown
```widgetstore
组件ID
```
```

这种方式会在预览模式下自动渲染组件。

#### 方式二：右键菜单

在编辑器中右键，选择"插入组件"。

#### 方式三：从组件浏览器插入

在组件浏览器中，点击组件并选择"插入到当前文档"。

### 管理个人组件

1. 使用命令"打开我的组件"
2. 查看已收藏的组件
3. 可以编辑、删除或插入组件

## 设置

在插件设置页面，您可以：

- 查看账户信息
- 设置默认插入格式
- 自定义组件默认尺寸
- 退出登录

## 开发

### 初始设置

```bash
# 安装依赖
yarn install

# 配置开发环境（首次运行）
node setup-dev.mjs
# 或手动创建 .env 文件，参考 .env.example
```

### 开发模式

```bash
# 普通开发模式（需要手动复制文件）
yarn dev

# 自动同步到 Obsidian（推荐）
yarn dev:obsidian
```

### 生产构建

```bash
yarn build
```

### 项目结构

```
widgetstore-obsidian/
├── main.ts              # 插件主入口
├── src/
│   ├── api/            # API 接口
│   │   ├── auth.ts     # 认证相关
│   │   ├── widget.ts   # 组件相关
│   │   └── types.ts    # 类型定义
│   └── views/          # 视图组件
│       ├── WidgetBrowser.ts  # 组件浏览器
│       └── WidgetManager.ts  # 个人组件管理
├── styles.css          # 样式文件
└── manifest.json       # 插件配置
```

## 反馈与支持

- 问题反馈：[GitHub Issues](https://github.com/yourusername/widgetstore-obsidian/issues)
- 组件世界官网：[https://cn.widgetstore.net](https://cn.widgetstore.net)

## 许可证

MIT License