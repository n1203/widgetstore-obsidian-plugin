export type WidgetType = "basic" | "icon" | "background" | "chart";

export interface Widget {
    _id: string;
    title: string;
    description?: string;
    type: WidgetType;
    content?: string;
    config?: any;
    useCount?: number;
    createTime?: number;
    updateTime?: number;
    userId?: string;
    isPublic?: boolean;
}

export interface UserWidget extends Widget {
    widgetId: string;
}

export interface User {
    _id: string;
    userId: string;
    email?: string;
    nickname?: string;
    avatar?: string;
    memberType?: string;
    createTime: number;
    updateTime: number;
    VIPTime: number;
    isAdmin: boolean;
    language: string;
    referer: string;
    config: {
        recentColors: string[];
        starBasicWidgets: string[];
    };
    limit: {
        basic: number;
        swg: number;
        notionCharts: number;
        swgBackground: number;
    };
    useCount: {
        basic: number;
        swg: number;
        swgBackground: number;
        notionChart: number;
    };
    notionConfig?: {
        access_token: string;
        bot_id: string;
        owner: any;
        token_type: string;
        workspace_icon: string;
        [key: string]: any;
    };
}

export interface AuthToken {
    accessToken?: string;
    refreshToken: string;
    accessTokenExpire?: number;
    envName?: string;
}

export interface ApiResponse<T = any> {
    code: number;
    data: T;
    message?: string;
}

export interface WidgetListParams {
    type?: WidgetType;
    page?: number;
    limit?: number;
    search?: string;
}

export interface Category {
    _id: string;
    name: string;
    type: WidgetType;
    icon?: string;
    order?: number;
}