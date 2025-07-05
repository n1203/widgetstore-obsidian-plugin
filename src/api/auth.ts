import { Notice, requestUrl } from 'obsidian';
import { AuthToken, User } from './types';
import WidgetStorePlugin from '../../main';

export class AuthService {
    private plugin: WidgetStorePlugin;
    private baseUrl: string;
    private apiUrl: string;

    constructor(plugin: WidgetStorePlugin) {
        this.plugin = plugin;
        const envName = plugin.settings.envName || 'widgetstore-2get4jkof622d914';
        
        // 检查是否为开发模式
        const isDev = plugin.settings.devMode || false;
        
        // 设置 URL
        this.baseUrl = isDev ? 'http://localhost:2306' : 'https://cn.widgetstore.net';
        // https://widgetstore-2get4jkof622d914-1304418908.ap-shanghai.app.tcloudbase.com/api/v2/widgets/user

        this.apiUrl = `https://${envName}-1304418908.ap-shanghai.app.tcloudbase.com/api/v2`;
    }

    /**
     * 生成随机 state 用于 OAuth 验证
     */
    generateState(): string {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * 开始 OAuth 登录流程
     */
    async startLogin(): Promise<void> {
        const state = this.generateState();
        
        // 保存 state 用于后续验证
        await this.plugin.saveData({
            ...this.plugin.settings,
            oauthState: state
        });

        // 构建登录 URL (使用 hash 路由)
        const loginUrl = `${this.baseUrl}/#/auth/obsidian?state=${state}`;
        
        // 打开浏览器
        window.open(loginUrl);
        
        new Notice('请在浏览器中完成登录');
    }

    /**
     * 处理 OAuth 回调
     */
    async handleCallback(params: {
        state: string;
        uid: string;
        accessToken?: string;
        refreshToken: string;
        accessTokenExpire?: string;
        envName?: string;
    }): Promise<boolean> {
        console.log('AuthService.handleCallback 开始处理，参数:', params);
        
        // 重新加载设置以确保获取最新的 state
        await this.plugin.loadSettings();
        
        const savedState = this.plugin.settings.oauthState;
        console.log('保存的 state:', savedState);
        console.log('接收的 state:', params.state);
        
        // 验证 state - 如果已经没有保存的 state，可能是已经处理过了
        if (!savedState) {
            console.log('没有保存的 state，可能已经处理过认证');
            // 检查是否已经认证
            if (this.isAuthenticated()) {
                console.log('用户已经认证，更新用户信息');
                // 即使已经认证，也要更新 token 和用户信息
                const authToken: AuthToken = {
                    accessToken: params.accessToken,
                    refreshToken: params.refreshToken,
                    accessTokenExpire: params.accessTokenExpire ? parseInt(params.accessTokenExpire) : undefined,
                    envName: params.envName || 'widgetstore-2get4jkof622d914'
                };

                await this.plugin.saveData({
                    ...this.plugin.settings,
                    authToken,
                    uid: params.uid,
                    envName: params.envName
                });

                // 获取并更新用户信息
                try {
                    const user = await this.getCurrentUser();
                    if (user) {
                        await this.plugin.saveData({
                            ...this.plugin.settings,
                            user
                        });
                        new Notice(`登录成功！欢迎 ${user.nickname || user.email || user.userId || '用户'}`);
                        return true;
                    }
                } catch (error) {
                    console.error('获取用户信息失败:', error);
                }
            }
            return false;
        }
        
        if (savedState !== params.state) {
            console.error('State 验证失败');
            new Notice('登录验证失败：无效的 state');
            return false;
        }

        // 清除已使用的 state
        delete this.plugin.settings.oauthState;
        await this.plugin.saveData(this.plugin.settings);

        // 保存 token 信息
        const authToken: AuthToken = {
            accessToken: params.accessToken,
            refreshToken: params.refreshToken,
            accessTokenExpire: params.accessTokenExpire ? parseInt(params.accessTokenExpire) : undefined,
            envName: params.envName || 'widgetstore-2get4jkof622d914'
        };

        console.log('准备保存的 authToken:', authToken);

        await this.plugin.saveData({
            ...this.plugin.settings,
            authToken,
            uid: params.uid,
            envName: params.envName
        });

        console.log('认证信息已保存');

        // 获取用户信息
        try {
            console.log('开始获取用户信息');
            const user = await this.getCurrentUser();
            console.log('获取到的用户信息:', user);
            
            if (user) {
                await this.plugin.saveData({
                    ...this.plugin.settings,
                    user
                });
                new Notice(`登录成功！欢迎 ${user.nickname || user.email || user.userId || '用户'}`);
                return true;
            } else {
                console.error('未获取到用户信息');
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
        }

        return false;
    }

    /**
     * 获取当前用户信息
     */
    async getCurrentUser(): Promise<User | null> {
        console.log('getCurrentUser: 检查认证状态');
        if (!this.isAuthenticated()) {
            console.log('getCurrentUser: 未认证');
            return null;
        }

        try {
            console.log('getCurrentUser: 获取请求头');
            const headers = await this.getHeaders();
            console.log('getCurrentUser: 请求头:', headers);
            
            const url = `${this.apiUrl}/user/info`; 
            console.log('getCurrentUser: 请求 URL:', url);
            
            const response = await requestUrl({
                url,
                method: 'POST',
                headers,
                body: JSON.stringify({
                    uid: this.plugin.settings.uid
                })
            });

            console.log('getCurrentUser: 响应状态:', response.status);
            const result: { success: boolean; data: User } = response.json;
            console.log('getCurrentUser: 响应数据:', result);
            
            if (result.success && result.data) {
                return result.data;
            } else {
                console.error('getCurrentUser: API 返回错误:', result);
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
            if (error.status === 401) {
                console.log('getCurrentUser: 401 错误，清除认证信息');
                // Token 失效，清除认证信息
                await this.logout();
            }
        }

        return null;
    }

    /**
     * 登出
     */
    async logout(): Promise<void> {
        delete this.plugin.settings.authToken;
        delete this.plugin.settings.user;
        await this.plugin.saveData(this.plugin.settings);
        new Notice('已退出登录');
    }

    /**
     * 获取有效的 access token
     */
    async getAccessToken(): Promise<string | null> {
        const authToken = this.plugin.settings.authToken;
        if (!authToken || !authToken.refreshToken) return null;

        // 检查 access token 是否存在且未过期
        if (authToken.accessToken && authToken.accessTokenExpire && Date.now() < authToken.accessTokenExpire) {
            return authToken.accessToken;
        }

        // 需要刷新 access token
        return await this.refreshAccessToken();
    }

    /**
     * 使用 refresh token 刷新 access token
     */
    async refreshAccessToken(): Promise<string | null> {
        const authToken = this.plugin.settings.authToken;
        if (!authToken || !authToken.refreshToken) return null;

        try {
            const envName = authToken.envName || 'widgetstore-2get4jkof622d914';
            const response = await requestUrl({
                url: `https://${envName}.ap-shanghai.app.tcloudbase.com/refresh`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: authToken.refreshToken
                })
            });

            const result = response.json;
            if (result.access_token) {
                // 更新 access token
                authToken.accessToken = result.access_token;
                authToken.accessTokenExpire = Date.now() + (result.expires_in * 1000);
                
                await this.plugin.saveData({
                    ...this.plugin.settings,
                    authToken
                });

                return result.access_token;
            }
        } catch (error) {
            console.error('刷新 access token 失败:', error);
            if (error.status === 401) {
                // refresh token 也失效了，需要重新登录
                await this.logout();
            }
        }

        return null;
    }

    /**
     * 获取 refresh token
     */
    getRefreshToken(): string | null {
        const authToken = this.plugin.settings.authToken;
        return authToken?.refreshToken || null;
    }

    /**
     * 检查是否已登录
     */
    isAuthenticated(): boolean {
        return !!this.getRefreshToken();
    }

    /**
     * 获取请求头
     */
    async getHeaders(): Promise<Record<string, string>> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        // 获取 access token
        const accessToken = await this.getAccessToken();
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        // 添加其他 CloudBase 相关头信息
        if (this.plugin.settings.uid) {
            headers['x-cloudbase-uid'] = this.plugin.settings.uid;
        }

        const envName = this.plugin.settings.envName || 'widgetstore-2get4jkof622d914';
        headers['x-cloudbase-env'] = envName;

        return headers;
    }
}