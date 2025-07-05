import { requestUrl } from 'obsidian';
import WidgetStorePlugin from '../../main';

/**
 * CloudBase API 客户端
 * 模拟 CloudBase SDK 的核心功能
 */
export class CloudBaseClient {
    private plugin: WidgetStorePlugin;
    private baseUrl = 'https://tcb-api.tencentcloudapi.com';
    private env = 'widgetstore-7ga2kcare348e8c5';

    constructor(plugin: WidgetStorePlugin) {
        this.plugin = plugin;
    }

    /**
     * 使用 refresh token 刷新访问 token
     */
    async refreshAccessToken(): Promise<string | null> {
        const refreshToken = this.plugin.settings.authToken?.token;
        if (!refreshToken) return null;

        try {
            // 调用 CloudBase 刷新 token 接口
            const response = await requestUrl({
                url: `https://${this.env}.tcb.qcloud.la/refresh`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                })
            });

            const result = response.json;
            if (result.access_token) {
                // 保存新的 access token
                this.plugin.settings.accessToken = result.access_token;
                this.plugin.settings.accessTokenExpires = Date.now() + (result.expires_in * 1000);
                await this.plugin.saveSettings();
                return result.access_token;
            }
        } catch (error) {
            console.error('刷新 token 失败:', error);
        }

        return null;
    }

    /**
     * 获取有效的访问 token
     */
    async getAccessToken(): Promise<string | null> {
        // 检查 access token 是否存在且未过期
        if (this.plugin.settings.accessToken && 
            this.plugin.settings.accessTokenExpires && 
            this.plugin.settings.accessTokenExpires > Date.now()) {
            return this.plugin.settings.accessToken;
        }

        // 刷新 token
        return await this.refreshAccessToken();
    }

    /**
     * 调用云函数
     */
    async callFunction(name: string, data: any): Promise<any> {
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            throw new Error('未登录或登录已过期');
        }

        try {
            const response = await requestUrl({
                url: `https://${this.env}.tcb.qcloud.la/${name}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-cloudbase-access-token': accessToken,
                    'x-cloudbase-credentials': JSON.stringify({
                        refreshToken: this.plugin.settings.authToken?.token,
                        uid: this.plugin.settings.uid
                    })
                },
                body: JSON.stringify(data)
            });

            return response.json;
        } catch (error) {
            console.error(`调用云函数 ${name} 失败:`, error);
            throw error;
        }
    }

    /**
     * 查询数据库
     */
    async databaseQuery(collection: string, where: any = {}, options: any = {}): Promise<any> {
        return await this.callFunction('database-query', {
            collection,
            where,
            ...options
        });
    }

    /**
     * 添加数据
     */
    async databaseAdd(collection: string, data: any): Promise<any> {
        return await this.callFunction('database-add', {
            collection,
            data
        });
    }

    /**
     * 更新数据
     */
    async databaseUpdate(collection: string, docId: string, data: any): Promise<any> {
        return await this.callFunction('database-update', {
            collection,
            docId,
            data
        });
    }

    /**
     * 删除数据
     */
    async databaseDelete(collection: string, docId: string): Promise<any> {
        return await this.callFunction('database-delete', {
            collection,
            docId
        });
    }
}