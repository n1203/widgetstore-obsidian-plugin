import {
    ItemView,
    WorkspaceLeaf,
    Notice,
    Menu,
    MarkdownView
} from 'obsidian';
import WidgetStorePlugin from '../../main';
import { Widget, UserWidget, WidgetType } from '../api/types';

export const VIEW_TYPE_MY_WIDGETS = 'widget-store-my-widgets';

export class MyWidgetsView extends ItemView {
    plugin: WidgetStorePlugin;
    private widgets: Widget[] = [];
    private userWidgets: UserWidget[] = [];
    private currentType: WidgetType | 'all' = 'all';
    private currentView: 'store' | 'mine' = 'mine';
    private containerEl: HTMLElement;
    private searchTerm: string = '';

    constructor(leaf: WorkspaceLeaf, plugin: WidgetStorePlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_MY_WIDGETS;
    }

    getDisplayText() {
        return '我的组件';
    }

    getIcon() {
        return 'box';
    }

    async onOpen() {
        const container = this.containerEl;
        container.empty();
        container.addClass('widgetstore-browser');

        // 检查登录状态
        if (!this.plugin.authService.isAuthenticated()) {
            this.showLoginPrompt();
            return;
        }

        // 创建头部
        const header = container.createDiv({ cls: 'widgetstore-browser-header' });
        header.createEl('h3', { text: '我的组件' });

        // 创建视图切换
        const viewSwitcher = container.createDiv({ cls: 'widgetstore-view-switcher' });
        const mineBtn = viewSwitcher.createEl('button', {
            cls: `widgetstore-view-btn ${this.currentView === 'mine' ? 'active' : ''}`,
            text: '我的组件'
        });
        const storeBtn = viewSwitcher.createEl('button', {
            cls: `widgetstore-view-btn ${this.currentView === 'store' ? 'active' : ''}`,
            text: '组件商店'
        });

        mineBtn.addEventListener('click', () => {
            this.currentView = 'mine';
            mineBtn.addClass('active');
            storeBtn.removeClass('active');
            this.loadData();
        });

        storeBtn.addEventListener('click', () => {
            this.currentView = 'store';
            storeBtn.addClass('active');
            mineBtn.removeClass('active');
            this.loadData();
        });

        // 搜索框（仅在商店视图显示）
        if (this.currentView === 'store') {
            const searchContainer = container.createDiv({ cls: 'widgetstore-search' });
            const searchInput = searchContainer.createEl('input', {
                type: 'text',
                placeholder: '搜索组件...',
                cls: 'widgetstore-search-input'
            });
            searchInput.value = this.searchTerm;
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = (e.target as HTMLInputElement).value;
                this.debounceSearch();
            });
        }

        // 标签页
        const tabs = container.createDiv({ cls: 'widgetstore-tabs' });
        this.createTab(tabs, '全部', 'all');
        this.createTab(tabs, '基础组件', 'basic');
        this.createTab(tabs, '图标组件', 'icon');
        this.createTab(tabs, '背景组件', 'background');
        this.createTab(tabs, '图表组件', 'chart');

        // 组件列表容器
        this.containerEl = container.createDiv({ cls: 'widgetstore-widget-list' });

        // 初始加载
        await this.loadData();
    }

    private showLoginPrompt() {
        const container = this.containerEl;
        container.empty();
        
        const authNotice = container.createDiv({ cls: 'widgetstore-auth-notice' });
        authNotice.createEl('h3', { text: '需要登录' });
        authNotice.createEl('p', { text: '请先登录组件世界以查看和管理您的组件' });
        
        const loginBtn = authNotice.createEl('button', {
            cls: 'mod-cta widgetstore-login-button',
            text: '登录组件世界'
        });
        loginBtn.addEventListener('click', () => {
            this.plugin.authService.startLogin();
        });
    }

    private createTab(container: HTMLElement, text: string, type: WidgetType | 'all') {
        const tab = container.createDiv({
            cls: `widgetstore-tab ${this.currentType === type ? 'active' : ''}`,
            text
        });
        tab.addEventListener('click', async () => {
            this.currentType = type;
            container.querySelectorAll('.widgetstore-tab').forEach(t => t.removeClass('active'));
            tab.addClass('active');
            await this.loadData();
        });
    }

    private debounceTimer: number | null = null;
    private debounceSearch() {
        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = window.setTimeout(() => {
            this.loadData();
        }, 300);
    }

    async loadData() {
        this.showLoading();

        try {
            if (this.currentView === 'mine') {
                await this.loadUserWidgets();
            } else {
                await this.loadStoreWidgets();
            }
        } catch (error) {
            console.error('加载组件失败:', error);
            this.showError('加载组件失败');
        }
    }

    async loadUserWidgets() {
        const params = this.currentType === 'all' 
            ? {}
            : { type: this.currentType };
        
        this.userWidgets = await this.plugin.widgetService.getUserWidgets(params);
        this.renderUserWidgets();
    }

    async loadStoreWidgets() {
        const params: any = {
            limit: 50
        };
        
        if (this.currentType !== 'all') {
            params.type = this.currentType;
        }
        
        if (this.searchTerm) {
            params.search = this.searchTerm;
        }
        
        this.widgets = await this.plugin.widgetService.getWidgets(params);
        this.renderStoreWidgets();
    }

    private showLoading() {
        this.containerEl.empty();
        const loading = this.containerEl.createDiv({ cls: 'widgetstore-loading' });
        loading.createDiv({ cls: 'widgetstore-spinner' });
    }

    private showError(message: string) {
        this.containerEl.empty();
        this.containerEl.createDiv({
            cls: 'widgetstore-empty',
            text: message
        });
    }

    private renderUserWidgets() {
        this.containerEl.empty();

        if (this.userWidgets.length === 0) {
            this.containerEl.createDiv({
                cls: 'widgetstore-empty',
                text: '您还没有添加任何组件'
            });
            
            const addBtn = this.containerEl.createEl('button', {
                cls: 'mod-cta',
                text: '浏览组件商店'
            });
            addBtn.addEventListener('click', () => {
                this.currentView = 'store';
                this.onOpen();
            });
            return;
        }

        this.userWidgets.forEach(userWidget => {
            const widget = userWidget.widgets?.[0] || userWidget;
            const item = this.containerEl.createDiv({ cls: 'widgetstore-widget-item' });
            
            // 组件信息
            item.createDiv({
                cls: 'widgetstore-widget-title',
                text: widget.title || userWidget.title || '未命名组件'
            });
            
            if (widget.description) {
                item.createDiv({
                    cls: 'widgetstore-widget-description',
                    text: widget.description
                });
            }

            // 组件元信息
            const meta = item.createDiv({ cls: 'widgetstore-widget-meta' });
            
            // 使用次数
            if (widget.useCount !== undefined) {
                meta.createDiv({
                    cls: 'widgetstore-widget-count',
                    text: `使用 ${widget.useCount} 次`
                });
            }

            // 更新时间
            if (userWidget.updateTime) {
                const date = new Date(userWidget.updateTime);
                meta.createDiv({
                    cls: 'widgetstore-widget-date',
                    text: `更新于 ${date.toLocaleDateString()}`
                });
            }

            // 点击事件
            item.addEventListener('click', () => {
                this.showUserWidgetMenu(userWidget, item);
            });

            // 右键菜单
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showUserWidgetMenu(userWidget, item);
            });
        });
    }

    private renderStoreWidgets() {
        this.containerEl.empty();

        if (this.widgets.length === 0) {
            this.containerEl.createDiv({
                cls: 'widgetstore-empty',
                text: '没有找到符合条件的组件'
            });
            return;
        }

        this.widgets.forEach(widget => {
            const item = this.containerEl.createDiv({ cls: 'widgetstore-widget-item' });
            
            // 组件信息
            item.createDiv({
                cls: 'widgetstore-widget-title',
                text: widget.title
            });
            
            if (widget.description) {
                item.createDiv({
                    cls: 'widgetstore-widget-description',
                    text: widget.description
                });
            }

            // 组件元信息
            const meta = item.createDiv({ cls: 'widgetstore-widget-meta' });
            
            // 组件类型
            meta.createDiv({
                cls: 'widgetstore-widget-type',
                text: this.getTypeLabel(widget.type)
            });
            
            // 使用次数
            if (widget.useCount !== undefined) {
                meta.createDiv({
                    cls: 'widgetstore-widget-count',
                    text: `${widget.useCount} 次使用`
                });
            }

            // 检查是否已添加
            const isAdded = this.userWidgets.some(uw => 
                uw.widgetId === widget._id || uw.widgets?.some(w => w._id === widget._id)
            );

            if (isAdded) {
                item.addClass('widgetstore-widget-added');
                meta.createDiv({
                    cls: 'widgetstore-widget-status',
                    text: '已添加'
                });
            }

            // 点击事件
            item.addEventListener('click', () => {
                this.showStoreWidgetMenu(widget, item, isAdded);
            });

            // 右键菜单
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showStoreWidgetMenu(widget, item, isAdded);
            });
        });
    }

    private getTypeLabel(type: WidgetType): string {
        const labels: Record<WidgetType, string> = {
            basic: '基础组件',
            icon: '图标组件',
            background: '背景组件',
            chart: '图表组件'
        };
        return labels[type] || type;
    }

    private showUserWidgetMenu(userWidget: UserWidget, targetEl: HTMLElement) {
        const widget = userWidget.widgets?.[0] || userWidget;
        const menu = new Menu();

        menu.addItem(item => {
            item
                .setTitle('插入到当前文档')
                .setIcon('plus')
                .onClick(() => this.insertWidget(userWidget._id, widget.title || userWidget.title || '组件'));
        });

        menu.addItem(item => {
            item
                .setTitle('预览组件')
                .setIcon('eye')
                .onClick(() => this.previewWidget(userWidget._id, widget.title || userWidget.title || '组件'));
        });

        menu.addItem(item => {
            item
                .setTitle('在组件世界中编辑')
                .setIcon('pencil')
                .onClick(() => {
                    window.open(`https://cn.widgetstore.net/#/editor/${userWidget._id}`);
                });
        });

        menu.addSeparator();

        menu.addItem(item => {
            item
                .setTitle('复制组件 ID')
                .setIcon('copy')
                .onClick(() => {
                    navigator.clipboard.writeText(userWidget._id);
                    new Notice('组件 ID 已复制');
                });
        });

        menu.addItem(item => {
            item
                .setTitle('删除组件')
                .setIcon('trash')
                .onClick(() => this.confirmDelete(userWidget));
        });

        menu.showAtMouseEvent(event);
    }

    private showStoreWidgetMenu(widget: Widget, targetEl: HTMLElement, isAdded: boolean) {
        const menu = new Menu();

        if (!isAdded) {
            menu.addItem(item => {
                item
                    .setTitle('添加到我的组件')
                    .setIcon('plus')
                    .onClick(() => this.addWidget(widget));
            });
        }

        menu.addItem(item => {
            item
                .setTitle('预览组件')
                .setIcon('eye')
                .onClick(() => this.previewWidget(widget._id, widget.title));
        });

        menu.addItem(item => {
            item
                .setTitle('在组件世界中查看')
                .setIcon('external-link')
                .onClick(() => {
                    window.open(`https://cn.widgetstore.net/#/widget/${widget._id}`);
                });
        });

        menu.addSeparator();

        menu.addItem(item => {
            item
                .setTitle('复制组件 ID')
                .setIcon('copy')
                .onClick(() => {
                    navigator.clipboard.writeText(widget._id);
                    new Notice('组件 ID 已复制');
                });
        });

        menu.showAtMouseEvent(event);
    }

    private async addWidget(widget: Widget) {
        try {
            const success = await this.plugin.widgetService.addUserWidget(widget._id);
            if (success) {
                new Notice(`已添加组件: ${widget.title}`);
                // 重新加载用户组件以更新状态
                await this.loadUserWidgets();
                // 如果在商店视图，重新渲染以更新已添加状态
                if (this.currentView === 'store') {
                    this.renderStoreWidgets();
                }
            } else {
                new Notice('添加失败，请重试');
            }
        } catch (error) {
            console.error('添加组件失败:', error);
            new Notice('添加失败，请重试');
        }
    }

    private async previewWidget(widgetId: string, title: string) {
        // 创建预览模态框
        const modal = this.app.workspace.activeLeaf?.view.containerEl.createDiv({
            cls: 'modal-container'
        });
        
        if (!modal) return;

        const modalBg = modal.createDiv({ cls: 'modal-bg' });
        const modalContent = modal.createDiv({ cls: 'modal widgetstore-preview-modal' });
        
        modalContent.createEl('h2', { text: title });
        
        const preview = modalContent.createDiv({ cls: 'widgetstore-preview' });
        const html = await this.plugin.widgetService.getWidgetHtml(widgetId);
        
        if (html) {
            const iframe = preview.createEl('iframe');
            iframe.style.width = '100%';
            iframe.style.height = '400px';
            iframe.srcdoc = html;
        }

        const closeBtn = modalContent.createEl('button', {
            cls: 'mod-cta',
            text: '关闭'
        });
        
        const close = () => modal.remove();
        closeBtn.addEventListener('click', close);
        modalBg.addEventListener('click', close);
    }

    private async insertWidget(widgetId: string, title: string) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('请先打开一个 Markdown 文件');
            return;
        }

        const editor = activeView.editor;
        let insertText = '';

        switch (this.plugin.settings.defaultInsertFormat) {
            case 'widgetstore':
                insertText = `\`\`\`widgetstore\n${widgetId}\n\`\`\`\n`;
                break;
            case 'iframe':
                const url = `https://cn.widgetstore.net/widget/${widgetId}`;
                insertText = `<iframe src="${url}" width="${this.plugin.settings.widgetWidth}" height="${this.plugin.settings.widgetHeight}" frameborder="0"></iframe>\n`;
                break;
            case 'html':
                const html = await this.plugin.widgetService.getWidgetHtml(widgetId);
                insertText = `${html}\n`;
                break;
        }

        editor.replaceSelection(insertText);
        new Notice(`已插入组件: ${title}`);
    }

    private confirmDelete(userWidget: UserWidget) {
        const widget = userWidget.widgets?.[0] || userWidget;
        const modal = this.app.workspace.activeLeaf?.view.containerEl.createDiv({
            cls: 'modal-container'
        });
        
        if (!modal) return;

        const modalBg = modal.createDiv({ cls: 'modal-bg' });
        const modalContent = modal.createDiv({ cls: 'modal' });
        
        modalContent.createEl('h2', { text: '确认删除' });
        modalContent.createEl('p', { text: `确定要删除组件 "${widget.title || userWidget.title || '未命名组件'}" 吗？` });
        
        const buttonContainer = modalContent.createDiv({ cls: 'modal-button-container' });
        
        const cancelBtn = buttonContainer.createEl('button', {
            cls: 'mod-cancel',
            text: '取消'
        });
        
        const deleteBtn = buttonContainer.createEl('button', {
            cls: 'mod-warning',
            text: '删除'
        });
        
        const close = () => modal.remove();
        
        cancelBtn.addEventListener('click', close);
        modalBg.addEventListener('click', close);
        
        deleteBtn.addEventListener('click', async () => {
            close();
            await this.deleteWidget(userWidget);
        });
    }

    private async deleteWidget(userWidget: UserWidget) {
        const widget = userWidget.widgets?.[0] || userWidget;
        try {
            const success = await this.plugin.widgetService.deleteUserWidget(userWidget._id);
            if (success) {
                new Notice(`已删除组件: ${widget.title || userWidget.title || '组件'}`);
                await this.loadUserWidgets();
                if (this.currentView === 'store') {
                    this.renderStoreWidgets();
                }
            } else {
                new Notice('删除失败，请重试');
            }
        } catch (error) {
            console.error('删除组件失败:', error);
            new Notice('删除失败，请重试');
        }
    }

    async refresh() {
        // Always re-render the view to update login status
        await this.onOpen();
    }

    async onClose() {
        // 清理资源
        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
        }
    }
}