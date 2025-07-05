import {
    App,
    Plugin,
    PluginSettingTab,
    Setting,
    Notice,
    MarkdownView,
    Menu,
    MenuItem
} from 'obsidian';
import { AuthService } from './src/api/auth';
import { WidgetService } from './src/api/widget';
import { AuthToken, User } from './src/api/types';
import { MyWidgetsView, VIEW_TYPE_MY_WIDGETS } from './src/views/MyWidgets';

interface WidgetStoreSettings {
    authToken?: AuthToken;
    user?: User;
    uid?: string;
    envName?: string;
    oauthState?: string;
    defaultInsertFormat: 'html' | 'iframe' | 'widgetstore';
    widgetWidth: string;
    widgetHeight: string;
    devMode?: boolean;
}

const DEFAULT_SETTINGS: WidgetStoreSettings = {
    defaultInsertFormat: 'widgetstore',
    widgetWidth: '100%',
    widgetHeight: '400px',
    devMode: false
};

export default class WidgetStorePlugin extends Plugin {
    settings: WidgetStoreSettings;
    authService: AuthService;
    widgetService: WidgetService;

    async onload() {
        await this.loadSettings();

        // 初始化服务
        this.authService = new AuthService(this);
        this.widgetService = new WidgetService(this.authService, this);

        // 注册视图
        this.registerView(
            VIEW_TYPE_MY_WIDGETS,
            (leaf) => new MyWidgetsView(leaf, this)
        );

        // 添加功能区图标
        this.addRibbonIcon('box', '我的组件', () => {
            this.activateView(VIEW_TYPE_MY_WIDGETS);
        });

        // 添加命令
        this.addCommand({
            id: 'open-my-widgets',
            name: '打开我的组件',
            callback: () => {
                this.activateView(VIEW_TYPE_MY_WIDGETS);
            }
        });

        this.addCommand({
            id: 'login-widget-store',
            name: '登录组件世界',
            callback: () => {
                this.authService.startLogin();
            }
        });

        // 注册 URL 协议处理器
        this.registerObsidianProtocolHandler('widgetstore-auth', async (params) => {
            console.log('收到认证回调，参数:', params);
            
            // 验证必要参数 - 放宽验证条件
            if (params.state && params.uid && (params.refreshToken || params.accessToken)) {
                const success = await this.authService.handleCallback(params);
                if (success) {
                    console.log('认证成功，刷新视图');
                    // 刷新视图
                    this.app.workspace.getLeavesOfType(VIEW_TYPE_MY_WIDGETS).forEach(leaf => {
                        (leaf.view as MyWidgetsView).refresh();
                    });
                } else {
                    console.error('认证处理失败');
                }
            } else {
                console.error('缺少必要参数:', {
                    hasState: !!params.state,
                    hasUid: !!params.uid,
                    hasRefreshToken: !!params.refreshToken,
                    hasAccessToken: !!params.accessToken
                });
                new Notice('认证失败：缺少必要参数');
            }
        });

        // 注册编辑器菜单
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu: Menu, editor: any, view: MarkdownView) => {
                if (this.authService.isAuthenticated()) {
                    menu.addItem((item: MenuItem) => {
                        item
                            .setTitle('插入组件')
                            .setIcon('box')
                            .onClick(() => {
                                this.activateView(VIEW_TYPE_MY_WIDGETS);
                            });
                    });
                }
            })
        );

        // 注册自定义代码块处理器
        this.registerMarkdownCodeBlockProcessor('widgetstore', async (source, el, ctx) => {
            try {
                const widgetId = source.trim();
                if (!widgetId) {
                    el.createEl('div', { text: '请提供组件 ID', cls: 'widgetstore-error' });
                    return;
                }

                // 创建容器
                const container = el.createEl('div', { cls: 'widgetstore-preview' });
                
                // 尝试获取用户组件信息以构建正确的预览 URL
                let previewId = widgetId;
                if (this.authService.isAuthenticated()) {
                    try {
                        const userWidgets = await this.widgetService.getUserWidgets();
                        const userWidget = userWidgets.find(uw => uw._id === widgetId);
                        if (userWidget) {
                            const actualWidgetId = userWidget.widgetId || userWidget.widgets?.[0]?._id || widgetId;
                            previewId = `${actualWidgetId}.${userWidget._id}`;
                        }
                    } catch (error) {
                        console.log('获取用户组件信息失败，使用默认 ID');
                    }
                }
                
                // 创建 iframe 直接加载组件
                const iframe = container.createEl('iframe');
                iframe.style.width = this.settings.widgetWidth;
                iframe.style.height = this.settings.widgetHeight;
                iframe.style.border = 'none';
                iframe.src = `https://cn.widgetstore.net/view/index.html?q=${previewId}`;
                
                // 添加加载失败处理
                iframe.onerror = () => {
                    container.empty();
                    container.createEl('div', { 
                        text: '组件加载失败', 
                        cls: 'widgetstore-error' 
                    });
                };
            } catch (error) {
                console.error('渲染组件失败:', error);
                el.createEl('div', { 
                    text: '组件加载失败', 
                    cls: 'widgetstore-error' 
                });
            }
        });

        // 添加设置页
        this.addSettingTab(new WidgetStoreSettingTab(this.app, this));
    }

    onunload() {
        // 清理视图
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_MY_WIDGETS);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateView(viewType: string) {
        const { workspace } = this.app;

        let leaf = workspace.getLeavesOfType(viewType)[0];
        if (!leaf) {
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({ type: viewType });
        }

        workspace.revealLeaf(leaf);
    }
}

class WidgetStoreSettingTab extends PluginSettingTab {
    plugin: WidgetStorePlugin;

    constructor(app: App, plugin: WidgetStorePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: '组件世界设置' });

        // 账户信息
        const accountSection = containerEl.createDiv({ cls: 'widgetstore-settings-section' });
        accountSection.createEl('h3', { text: '账户信息' });

        if (this.plugin.authService.isAuthenticated() && this.plugin.settings.user) {
            const userInfo = accountSection.createDiv({ cls: 'widgetstore-user-info' });
            const user = this.plugin.settings.user;
            userInfo.createEl('div', { 
                text: `用户ID: ${user.userId || user._id || '未设置'}`,
                cls: 'widgetstore-user-id'
            });
            if (user.email) {
                userInfo.createEl('div', { 
                    text: `邮箱: ${user.email}`,
                    cls: 'widgetstore-user-email'
                });
            }
            if (user.nickname) {
                userInfo.createEl('div', { 
                    text: `昵称: ${user.nickname}`
                });
            }
            if (user.isAdmin) {
                userInfo.createEl('div', { 
                    text: `管理员`,
                    cls: 'widgetstore-admin-badge'
                });
            }
            if (user.VIPTime && user.VIPTime > Date.now()) {
                const vipDate = new Date(user.VIPTime);
                userInfo.createEl('div', { 
                    text: `VIP到期: ${vipDate.toLocaleDateString()}`,
                    cls: 'widgetstore-vip-info'
                });
            }
            
            new Setting(accountSection)
                .addButton(button => button
                    .setButtonText('退出登录')
                    .setCta()
                    .onClick(async () => {
                        await this.plugin.authService.logout();
                        this.display();
                    }));
        } else {
            accountSection.createEl('p', { 
                text: '您还未登录',
                cls: 'widgetstore-auth-notice'
            });
            
            new Setting(accountSection)
                .addButton(button => button
                    .setButtonText('登录组件世界')
                    .setCta()
                    .onClick(() => {
                        this.plugin.authService.startLogin();
                    }));
        }

        // 组件设置
        const widgetSection = containerEl.createDiv({ cls: 'widgetstore-settings-section' });
        widgetSection.createEl('h3', { text: '组件设置' });

        new Setting(widgetSection)
            .setName('默认插入格式')
            .setDesc('选择插入组件时的默认格式')
            .addDropdown(dropdown => dropdown
                .addOption('widgetstore', '组件代码块（推荐）')
                .addOption('iframe', 'iframe 嵌入')
                .addOption('html', 'HTML 代码')
                .setValue(this.plugin.settings.defaultInsertFormat)
                .onChange(async (value: any) => {
                    this.plugin.settings.defaultInsertFormat = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(widgetSection)
            .setName('组件宽度')
            .setDesc('默认组件宽度（支持 px、% 等单位）')
            .addText(text => text
                .setPlaceholder('100%')
                .setValue(this.plugin.settings.widgetWidth)
                .onChange(async (value) => {
                    this.plugin.settings.widgetWidth = value || '100%';
                    await this.plugin.saveSettings();
                }));

        new Setting(widgetSection)
            .setName('组件高度')
            .setDesc('默认组件高度（支持 px、vh 等单位）')
            .addText(text => text
                .setPlaceholder('400px')
                .setValue(this.plugin.settings.widgetHeight)
                .onChange(async (value) => {
                    this.plugin.settings.widgetHeight = value || '400px';
                    await this.plugin.saveSettings();
                }));

        // 开发者设置
        const devSection = containerEl.createDiv({ cls: 'widgetstore-settings-section' });
        devSection.createEl('h3', { text: '开发者设置' });

        new Setting(devSection)
            .setName('开发模式')
            .setDesc('启用后将使用本地开发服务器 (http://localhost:2306)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.devMode || false)
                .onChange(async (value) => {
                    this.plugin.settings.devMode = value;
                    await this.plugin.saveSettings();
                    // 重新初始化服务以使用新的 URL
                    this.plugin.authService = new AuthService(this.plugin);
                    this.plugin.widgetService = new WidgetService(this.plugin.authService, this.plugin);
                }));
    }
}