import { App, Modal, Notice, Setting, TFile, normalizePath, requestUrl } from 'obsidian';

/**
 * Import from WidgetStore（AI 搭空间 / AI Space Builder 的 Obsidian 出口）
 *
 * 网站「导出到 Obsidian」给出 obsidian://widgetstore-import?t=<令牌>&api=<站点>/widget/api
 * → 这里 GET <api>/builder/obsidian/pull?t=<令牌> → { v: 1, folder, files: [{ path, content }] }
 * → 写进当前 vault 的新文件夹（同名文件夹已存在就加「 (2)」），打开首页。
 * 令牌 30 分钟有效，只能读这一个空间；不需要在插件里登录。
 * 只接受组件世界自己的站点（API_ALLOW），只写 .md，路径必须在 folder 里、不能有「..」。
 */

const API_ALLOW = [
    'https://widgetstore.net/widget/api',
    'https://www.widgetstore.net/widget/api',
    'https://cn.widgetstore.net/widget/api',
];
const MAX_FILES = 60;
const MAX_BYTES = 400 * 1024;

type Lang = 'zh' | 'zhTW' | 'en' | 'ja' | 'ko';
const STR: Record<Lang, Record<string, string>> = {
    zh: {
        command: '从组件世界导入空间',
        title: '从组件世界导入空间',
        desc: '粘贴网站「导出到 Obsidian」里的导入链接（30 分钟内有效）。',
        placeholder: 'obsidian://widgetstore-import?t=…',
        import: '导入',
        importing: '正在导入…',
        done: '已导入「{folder}」（{n} 个文件）',
        invalid: '导入链接无效',
        expired: '导入链接已过期或无效，请回到网站重新导出',
        notFound: '找不到这个空间，请回到网站重新导出',
        failed: '导入失败，请稍后再试',
        host: '只能从组件世界导入',
    },
    zhTW: {
        command: '從組件世界匯入空間',
        title: '從組件世界匯入空間',
        desc: '貼上網站「匯出到 Obsidian」裡的匯入連結（30 分鐘內有效）。',
        placeholder: 'obsidian://widgetstore-import?t=…',
        import: '匯入',
        importing: '正在匯入…',
        done: '已匯入「{folder}」（{n} 個檔案）',
        invalid: '匯入連結無效',
        expired: '匯入連結已過期或無效，請回到網站重新匯出',
        notFound: '找不到這個空間，請回到網站重新匯出',
        failed: '匯入失敗，請稍後再試',
        host: '只能從組件世界匯入',
    },
    en: {
        command: 'Import space from WidgetStore',
        title: 'Import space from WidgetStore',
        desc: 'Paste the import link from "Export to Obsidian" on the website (valid for 30 minutes).',
        placeholder: 'obsidian://widgetstore-import?t=…',
        import: 'Import',
        importing: 'Importing…',
        done: 'Imported "{folder}" ({n} files)',
        invalid: 'Invalid import link',
        expired: 'The import link has expired or is invalid. Export again on the website.',
        notFound: "Couldn't find this space. Export again on the website.",
        failed: 'Import failed. Please try again later.',
        host: 'You can only import from WidgetStore',
    },
    ja: {
        command: 'ウィジェット堂からスペースを読み込む',
        title: 'ウィジェット堂からスペースを読み込む',
        desc: 'ウェブサイトの「Obsidian に書き出す」で表示された読み込みリンクを貼り付けてください（30 分間有効）。',
        placeholder: 'obsidian://widgetstore-import?t=…',
        import: '読み込む',
        importing: '読み込んでいます…',
        done: '「{folder}」を読み込みました（{n} ファイル）',
        invalid: '読み込みリンクが正しくありません',
        expired: '読み込みリンクの期限が切れているか、正しくありません。ウェブサイトでもう一度書き出してください。',
        notFound: 'このスペースが見つかりません。ウェブサイトでもう一度書き出してください。',
        failed: '読み込みに失敗しました。しばらくしてからもう一度お試しください。',
        host: 'ウィジェット堂からのみ読み込めます',
    },
    ko: {
        command: '위젯스토어에서 공간 가져오기',
        title: '위젯스토어에서 공간 가져오기',
        desc: '웹사이트의 "Obsidian으로 내보내기"에서 받은 가져오기 링크를 붙여 넣어 주세요(30분 동안 유효해요).',
        placeholder: 'obsidian://widgetstore-import?t=…',
        import: '가져오기',
        importing: '가져오는 중…',
        done: '"{folder}"을(를) 가져왔어요({n}개 파일)',
        invalid: '가져오기 링크가 올바르지 않아요',
        expired: '가져오기 링크가 만료되었거나 올바르지 않아요. 웹사이트에서 다시 내보내 주세요.',
        notFound: '이 공간을 찾을 수 없어요. 웹사이트에서 다시 내보내 주세요.',
        failed: '가져오지 못했어요. 잠시 후 다시 시도해 주세요.',
        host: '위젯스토어에서만 가져올 수 있어요',
    },
};

function lang(): Lang {
    let l = '';
    try {
        l = (window.localStorage.getItem('language') || '').toLowerCase();
    } catch (e) {
        l = '';
    }
    if (l === 'zh-tw' || l === 'zh-hk') return 'zhTW';
    if (l.startsWith('zh')) return 'zh';
    if (l.startsWith('ja')) return 'ja';
    if (l.startsWith('ko')) return 'ko';
    return 'en';
}
export function tr(key: string, vars: Record<string, string | number> = {}): string {
    const s = STR[lang()][key] || STR.en[key] || key;
    return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

/** 从 obsidian:// 链接、下载链接或裸令牌里取出 { token, api } */
export function parseImportLink(input: string): { token: string; api: string } | null {
    const s = (input || '').trim();
    if (/^wsob1\.[A-Za-z0-9_\-.]+$/.test(s)) return { token: s, api: API_ALLOW[0] };
    const q = s.indexOf('?');
    if (q < 0) return null;
    const params = new URLSearchParams(s.slice(q + 1));
    const token = params.get('t') || '';
    if (!/^wsob1\.[A-Za-z0-9_\-.]+$/.test(token)) return null;
    let api = params.get('api') || '';
    if (!api) {
        // https://widgetstore.net/widget/api/builder/obsidian/vault.zip?t=…
        const m = s.match(/^(https:\/\/[^/?#]+\/widget\/api)\/builder\/obsidian\//);
        api = m ? m[1] : API_ALLOW[0];
    }
    return { token, api: api.replace(/\/+$/, '') };
}

interface PulledFile { path: string; content: string }

function safeFiles(folder: string, files: PulledFile[]): PulledFile[] | null {
    if (!folder || /[\\/]|^\.+$/.test(folder) || !Array.isArray(files) || !files.length || files.length > MAX_FILES) return null;
    let bytes = 0;
    for (const f of files) {
        if (!f || typeof f.path !== 'string' || typeof f.content !== 'string') return null;
        if (!f.path.startsWith(`${folder}/`) || !f.path.endsWith('.md')) return null;
        const rest = f.path.slice(folder.length + 1);
        if (!rest || rest.includes('/') || rest.includes('\\') || rest.startsWith('.')) return null;
        bytes += f.content.length;
    }
    return bytes <= MAX_BYTES ? files : null;
}

async function freeFolder(app: App, folder: string): Promise<string> {
    let name = normalizePath(folder);
    for (let i = 2; app.vault.getAbstractFileByPath(name); i++) name = normalizePath(`${folder} (${i})`);
    return name;
}

export async function importFromWidgetStore(app: App, token: string, api: string): Promise<boolean> {
    const base = (api || '').replace(/\/+$/, '');
    if (!API_ALLOW.includes(base)) {
        new Notice(tr('host'));
        return false;
    }
    if (!/^wsob1\.[A-Za-z0-9_\-.]+$/.test(token || '')) {
        new Notice(tr('invalid'));
        return false;
    }
    const notice = new Notice(tr('importing'), 0);
    try {
        const res = await requestUrl({ url: `${base}/builder/obsidian/pull?t=${encodeURIComponent(token)}`, method: 'GET', throw: false });
        if (res.status === 401) throw new Error('expired');
        if (res.status === 404) throw new Error('notFound');
        if (res.status !== 200) throw new Error('failed');
        const data = res.json as { v?: number; folder?: string; files?: PulledFile[] };
        const folder = String(data && data.folder || '');
        const files = safeFiles(folder, (data && data.files) || []);
        if (!files) throw new Error('failed');
        const target = await freeFolder(app, folder);
        await app.vault.createFolder(target);
        let first: TFile | null = null;
        for (const f of files) {
            const path = normalizePath(`${target}/${f.path.slice(folder.length + 1)}`);
            const file = await app.vault.create(path, f.content);
            // files[0] 是 README，files[1] 是首页
            if (!first || files.indexOf(f) === 1) first = file;
        }
        notice.hide();
        new Notice(tr('done', { folder: target, n: files.length }));
        if (first) await app.workspace.getLeaf(true).openFile(first);
        return true;
    } catch (e) {
        notice.hide();
        const k = e instanceof Error && ['expired', 'notFound'].includes(e.message) ? e.message : 'failed';
        console.error('WidgetStore import failed', k);
        new Notice(tr(k));
        return false;
    }
}

export class ImportModal extends Modal {
    private value = '';

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h3', { text: tr('title') });
        contentEl.createEl('p', { text: tr('desc') });
        new Setting(contentEl).addText((t) => {
            t.setPlaceholder(tr('placeholder')).onChange((v) => (this.value = v));
            t.inputEl.style.width = '100%';
        });
        new Setting(contentEl).addButton((b) =>
            b.setButtonText(tr('import')).setCta().onClick(async () => {
                const parsed = parseImportLink(this.value);
                if (!parsed) {
                    new Notice(tr('invalid'));
                    return;
                }
                b.setDisabled(true);
                const ok = await importFromWidgetStore(this.app, parsed.token, parsed.api);
                b.setDisabled(false);
                if (ok) this.close();
            }),
        );
    }

    onClose() {
        this.contentEl.empty();
    }
}
