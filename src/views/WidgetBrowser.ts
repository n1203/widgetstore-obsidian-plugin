import {
    ItemView,
    WorkspaceLeaf,
    Notice,
    Menu,
    MarkdownView
} from 'obsidian';
import WidgetStorePlugin from '../../main';
import { Widget, WidgetType } from '../api/types';

export const VIEW_TYPE_WIDGET_BROWSER = 'widget-store-browser';

export class WidgetBrowserView extends ItemView {
    plugin: WidgetStorePlugin;
    private widgets: Widget[] = [];
    private currentType: WidgetType | 'all' = 'all';
    private searchQuery = '';
    private containerEl: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin: WidgetStorePlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_WIDGET_BROWSER;
    }

    getDisplayText() {
        return '组件浏览器';
    }

    getIcon() {
        return 'box';
    }

    async onOpen() {
        const container = this.containerEl;
        container.empty();
        container.addClass('widgetstore-browser');

        // 创建头部
        const header = container.createDiv({ cls: 'widgetstore-browser-header' });
        
        // 搜索框
        const searchInput = header.createEl('input', {
            cls: 'widgetstore-search',
            type: 'text',
            placeholder: '搜索组件...'
        });
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = (e.target as HTMLInputElement).value;
            this.performSearch();
        });

        // 标签页
        const tabs = container.createDiv({ cls: 'widgetstore-tabs' });
        this.createTab(tabs, '全部', 'all');
        this.createTab(tabs, '基础组件', 'basic');
        this.createTab(tabs, '图标组件', 'icon');
        this.createTab(tabs, '背景组件', 'background');

        // 组件列表容器
        this.containerEl = container.createDiv({ cls: 'widgetstore-widget-list' });

        // 初始加载
        await this.loadWidgets();
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
            await this.loadWidgets();
        });
    }

    async loadWidgets() {
        this.showLoading();

        try {
            const params = this.currentType === 'all' 
                ? { search: this.searchQuery }
                : { type: this.currentType, search: this.searchQuery };
            
            this.widgets = await this.plugin.widgetService.getPublicWidgets(params);
            this.renderWidgets();
        } catch (error) {
            console.error('加载组件失败:', error);
            this.showError('加载组件失败');
        }
    }

    private performSearch() {
        // 防抖处理
        clearTimeout(this.searchTimeout);
        this.searchTimeout = window.setTimeout(() => {
            this.loadWidgets();
        }, 300);
    }

    private searchTimeout: number;

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

    private renderWidgets() {
        this.containerEl.empty();

        if (!this.plugin.authService.isAuthenticated()) {
            const authNotice = this.containerEl.createDiv({ cls: 'widgetstore-auth-notice' });
            authNotice.createEl('p', { text: '请先登录以使用完整功能' });
            const loginBtn = authNotice.createEl('button', {
                cls: 'mod-cta',
                text: '登录组件世界'
            });
            loginBtn.addEventListener('click', () => {
                this.plugin.authService.startLogin();
            });
        }

        if (this.widgets.length === 0) {
            this.containerEl.createDiv({
                cls: 'widgetstore-empty',
                text: '暂无组件'
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

            // 组件类型标签
            item.createDiv({
                cls: 'widgetstore-widget-type',
                text: this.getTypeLabel(widget.type)
            });

            // 点击事件
            item.addEventListener('click', () => {
                this.showWidgetMenu(widget, item);
            });

            // 右键菜单
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showWidgetMenu(widget, item);
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

    private showWidgetMenu(widget: Widget, targetEl: HTMLElement) {
        const menu = new Menu();

        menu.addItem(item => {
            item
                .setTitle('预览组件')
                .setIcon('eye')
                .onClick(() => this.previewWidget(widget));
        });

        if (this.plugin.authService.isAuthenticated()) {
            menu.addItem(item => {
                item
                    .setTitle('插入到当前文档')
                    .setIcon('plus')
                    .onClick(() => this.insertWidget(widget));
            });

            menu.addItem(item => {
                item
                    .setTitle('添加到我的组件')
                    .setIcon('star')
                    .onClick(() => this.addToMyWidgets(widget));
            });
        }

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

    private async previewWidget(widget: Widget) {
        // 创建预览模态框
        const modal = this.app.workspace.activeLeaf?.view.containerEl.createDiv({
            cls: 'modal-container'
        });
        
        if (!modal) return;

        const modalBg = modal.createDiv({ cls: 'modal-bg' });
        const modalContent = modal.createDiv({ cls: 'modal widgetstore-preview-modal' });
        
        modalContent.createEl('h2', { text: widget.title });
        
        const preview = modalContent.createDiv({ cls: 'widgetstore-preview' });
        const html = await this.plugin.widgetService.getWidgetHtml(widget._id);
        
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

    private async insertWidget(widget: Widget) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('请先打开一个 Markdown 文件');
            return;
        }

        const editor = activeView.editor;
        let insertText = '';

        switch (this.plugin.settings.defaultInsertFormat) {
            case 'widgetstore':
                insertText = `\`\`\`widgetstore\n${widget._id}\n\`\`\`\n`;
                break;
            case 'iframe':
                const url = `https://cn.widgetstore.net/widget/${widget._id}`;
                insertText = `<iframe src="${url}" width="${this.plugin.settings.widgetWidth}" height="${this.plugin.settings.widgetHeight}" frameborder="0"></iframe>\n`;
                break;
            case 'html':
                const html = await this.plugin.widgetService.getWidgetHtml(widget._id);
                insertText = `${html}\n`;
                break;
        }

        editor.replaceSelection(insertText);
        new Notice(`已插入组件: ${widget.title}`);
    }

    private async addToMyWidgets(widget: Widget) {
        try {
            const userWidget = await this.plugin.widgetService.createUserWidget(widget._id);
            if (userWidget) {
                new Notice(`已添加到我的组件: ${widget.title}`);
            } else {
                new Notice('添加失败，请重试');
            }
        } catch (error) {
            console.error('添加组件失败:', error);
            new Notice('添加失败，请重试');
        }
    }

    async refresh() {
        // Re-render the entire view to ensure UI is updated
        await this.onOpen();
    }

    async onClose() {
        // 清理资源
    }
}