# 贡献指南

感谢您对 Widget Store for Obsidian 的关注！

## 提交规范

为了自动生成版本号和变更日志，请遵循以下提交信息规范：

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型（Type）

- **feat**: 新功能（会触发 minor 版本升级）
- **fix**: 修复 bug（会触发 patch 版本升级）
- **docs**: 仅文档变更
- **style**: 代码格式变更（不影响代码运行）
- **refactor**: 重构（既不是新功能也不是修复 bug）
- **perf**: 性能优化
- **test**: 添加测试
- **chore**: 构建过程或辅助工具的变更

### 示例

```bash
# 新功能
feat: 添加批量导入组件功能

# Bug 修复
fix: 修复组件预览在深色模式下的显示问题

# 破坏性变更（会触发 major 版本升级）
feat!: 重构 API 调用方式

BREAKING CHANGE: 旧版本的配置文件需要手动迁移
```

### 范围（Scope）

可选，用于说明提交影响的范围：

- **auth**: 认证相关
- **widget**: 组件相关
- **ui**: 界面相关
- **api**: API 相关

### 自动发布流程

1. 提交代码到 main 分支
2. GitHub Actions 自动运行
3. 根据提交信息确定版本号
4. 自动构建项目
5. 生成变更日志
6. 创建 GitHub Release
7. 上传插件资源包

## 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改（遵循提交规范）
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request