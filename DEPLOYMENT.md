# 部署指南

## 组件世界前端配置

### 1. OAuth 认证页面已添加

已在 widget-front 项目中添加了 `/auth/obsidian` 路由，实现了 OAuth 认证流程。

**文件位置：**
- 路由配置：`packages/base/src/router/router.ts`
- 认证页面：`packages/base/src/pages/auth/obsidian.tsx`
- 样式文件：`packages/base/src/pages/auth/style.css`
- API 接口：`packages/base/src/api/login.ts` (getObsidianAuthInfo)

### 2. 认证流程

1. 用户在 Obsidian 中点击登录
2. 插件生成随机 state 并打开浏览器：`https://cn.widgetstore.net/auth/obsidian?state={state}`
3. 用户在组件世界完成登录（如未登录）
4. 用户授权 Obsidian 插件访问权限
5. 页面获取用户的 refresh token 并通过 URL scheme 回调：`obsidian://widgetstore-auth?token={token}&state={state}&uid={uid}`
6. Obsidian 插件验证 state 并保存认证信息

### 3. 无需服务端修改

当前方案直接使用 CloudBase 的 refresh token 进行认证，无需修改服务端代码。API 请求时通过自定义请求头传递认证信息：
- `x-refresh-token`: CloudBase refresh token
- `x-cloudbase-uid`: 用户 UID

## Obsidian 插件安装

### 1. 构建插件

```bash
cd widgetstore-obsidian
yarn install
yarn run build
```

### 2. 安装到 Obsidian

1. 打开 Obsidian 设置
2. 进入「第三方插件」
3. 关闭「安全模式」
4. 点击「浏览」并选择插件文件夹
5. 或手动复制以下文件到 `<vault>/.obsidian/plugins/widgetstore/`：
   - `main.js`
   - `manifest.json`
   - `styles.css`

### 3. 启用插件

1. 在 Obsidian 设置的「第三方插件」中找到「Widget Store」
2. 启用插件
3. 左侧边栏会出现组件世界图标

## 使用指南

### 登录

1. 点击左侧边栏的组件世界图标
2. 点击「登录组件世界」按钮
3. 在浏览器中完成登录和授权
4. 自动返回 Obsidian

### 浏览组件

1. 打开组件浏览器（左侧边栏图标）
2. 使用标签页筛选组件类型
3. 搜索特定组件
4. 点击组件查看操作选项

### 插入组件

**方式一：组件代码块**
```markdown
```widgetstore
组件ID
```
```

**方式二：右键菜单**
在编辑器中右键选择「插入组件」

**方式三：从浏览器插入**
在组件浏览器中点击组件，选择「插入到当前文档」

### 管理个人组件

1. 使用命令「打开我的组件」或点击星标图标
2. 查看、编辑、删除个人组件
3. 支持在组件世界网站中编辑

## 配置选项

在 Obsidian 设置 → Widget Store 中可以配置：

- **默认插入格式**：组件代码块、iframe、HTML
- **组件宽度**：默认宽度设置
- **组件高度**：默认高度设置
- **账户管理**：查看登录状态和退出登录

## 注意事项

1. 首次使用需要登录组件世界账号
2. 组件渲染需要网络连接
3. 部分复杂组件可能需要较长加载时间
4. 建议使用组件代码块格式，支持实时预览

## 故障排除

### 登录问题
- 确保浏览器已登录组件世界
- 检查是否启用了浏览器的弹窗拦截
- 尝试手动复制授权链接

### 组件显示问题
- 检查网络连接
- 尝试刷新组件（重新打开文档）
- 确认组件 ID 是否正确

### 其他问题
- 查看 Obsidian 开发者控制台的错误信息
- 重启 Obsidian
- 重新安装插件