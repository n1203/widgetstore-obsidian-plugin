import { requestUrl } from 'obsidian';
import { Widget, UserWidget, ApiResponse, WidgetListParams, Category } from './types';
import { AuthService } from './auth';
import WidgetStorePlugin from '../../main';

export class WidgetService {
    private baseUrl: string;
    private authService: AuthService;
    private plugin: WidgetStorePlugin;

    constructor(authService: AuthService, plugin: WidgetStorePlugin) {
        this.authService = authService;
        this.plugin = plugin;
        const envName = plugin.settings.envName || 'widgetstore-2get4jkof622d914';
        // 使用 CloudBase 函数的 Server2 端点
        this.baseUrl = `https://${envName}-1304418908.ap-shanghai.app.tcloudbase.com/api/v2`;
    }

    /**
     * 获取公开组件列表
     */
    async getPublicWidgets(params: WidgetListParams = {}): Promise<Widget[]> {
        try {
            const queryParams = new URLSearchParams();
            if (params.type) queryParams.append('type', params.type);
            if (params.page) queryParams.append('page', params.page.toString());
            if (params.limit) queryParams.append('limit', params.limit.toString());
            if (params.search) queryParams.append('search', params.search);

            const headers = await this.authService.getHeaders();
            const response = await requestUrl({
                url: `${this.baseUrl}/widgets?${queryParams.toString()}`,
                method: 'GET',
                headers
            });

            const result: ApiResponse<Widget[]> = response.json;
            if (result.code === 0 && result.data) {
                return result.data;
            }
        } catch (error) {
            console.error('获取公开组件失败:', error);
        }

        return [];
    }

    /**
     * 获取用户组件列表
     */
    async getUserWidgets(params: WidgetListParams = {}): Promise<UserWidget[]> {
        if (!this.authService.isAuthenticated()) {
            return [];
        }

        try {
            const queryParams = new URLSearchParams();
            if (params.type) queryParams.append('type', params.type);
            if (params.page) queryParams.append('page', params.page.toString());
            if (params.limit) queryParams.append('limit', params.limit.toString());

            const headers = await this.authService.getHeaders();
            const response = await requestUrl({
                url: `${this.baseUrl}/widgets/user?${queryParams.toString()}`,
                method: 'GET',
                headers
            });

            const result: ApiResponse<UserWidget[]> = response.json;
            if (result.code === 0 && result.data) {
                return result.data;
            }
        } catch (error) {
            console.error('获取用户组件失败:', error);
        }

        return [];
    }

    /**
     * 获取组件详情
     */
    async getWidget(widgetId: string): Promise<Widget | null> {
        try {
            const headers = await this.authService.getHeaders();
            const response = await requestUrl({
                url: `${this.baseUrl}/widgets/${widgetId}`, 
                method: 'GET',
                headers
            });

            const result: ApiResponse<Widget> = response.json;
            if (result.code === 0 && result.data) {
                return result.data;
            }
        } catch (error) {
            console.error('获取组件详情失败:', error);
        }

        return null;
    }

    /**
     * 创建用户组件（复制公开组件到用户空间）
     */
    async createUserWidget(widgetId: string): Promise<UserWidget | null> {
        if (!this.authService.isAuthenticated()) {
            return null;
        }

        try {
            const headers = await this.authService.getHeaders();
            const data = {
                action: 'database.addDocument',
                dataVersion: '2020-01-10',
                env: 'widgetstore-2get4jkof622d914',
                collectionName: 'user-widget',
                data: {
                    widgetId,
                    data: {},
                    values: {},
                    createTime: Date.now(),
                    updateTime: Date.now()
                }
            };

            const response = await requestUrl({
                url: 'http://tcb-api.tencentcloudapi.com/web',
                method: 'POST',
                headers: {
                    ...headers,
                    'content-type': 'application/json;charset=UTF-8',
                    'X-SDK-Version': '@cloudbase/js-sdk/1.7.2'
                },
                body: JSON.stringify(data)
            });

            const result: ApiResponse<UserWidget> = response.json;
            if (result.code === 0 && result.data) {
                return result.data;
            }
        } catch (error) {
            console.error('创建用户组件失败:', error);
        }

        return null;
    }

    /**
     * 删除用户组件
     */
    async deleteUserWidget(userWidgetId: string): Promise<boolean> {
        if (!this.authService.isAuthenticated()) {
            return false;
        }

        try {
            const headers = await this.authService.getHeaders();
            const response = await requestUrl({
                url: `${this.baseUrl}/front/user/deleteWidget/${userWidgetId}`,
                method: 'DELETE',
                headers
            });

            const result: ApiResponse = response.json;
            return result.code === 0;
        } catch (error) {
            console.error('删除用户组件失败:', error);
        }

        return false;
    }

    /**
     * 获取组件分类
     */
    async getCategories(): Promise<Category[]> {
        try {
            const headers = await this.authService.getHeaders();
            const response = await requestUrl({
                url: `${this.baseUrl}/front/category/list`,
                method: 'GET',
                headers
            });

            const result: ApiResponse<Category[]> = response.json;
            if (result.code === 0 && result.data) {
                return result.data;
            }
        } catch (error) {
            console.error('获取分类失败:', error);
        }

        return [];
    }

    /**
     * 获取组件渲染 HTML
     */
    async getWidgetHtml(widgetId: string): Promise<string> {
        try {
            const headers = await this.authService.getHeaders();
            const response = await requestUrl({
                url: `${this.baseUrl}/view/widget/${widgetId}`,
                method: 'GET',
                headers
            });

            const result: ApiResponse<{ html: string }> = response.json;
            if (result.code === 0 && result.data) {
                return result.data.html;
            }
        } catch (error) {
            console.error('获取组件 HTML 失败:', error);
        }

        return '';
    }
}