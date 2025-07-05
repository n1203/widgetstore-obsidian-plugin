import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Obsidian 插件数据路径
const vaultPath = '/Users/hujunping/obsidian/.obsidian/plugins/widgetstore';
const dataPath = resolve(vaultPath, 'data.json');

// 确保插件目录存在
if (!existsSync(vaultPath)) {
    console.error('❌ 插件目录不存在，请先安装插件');
    process.exit(1);
}

// 读取或创建数据文件
let data = {};
if (existsSync(dataPath)) {
    try {
        data = JSON.parse(readFileSync(dataPath, 'utf-8'));
    } catch (e) {
        console.error('❌ 读取数据文件失败:', e);
    }
}

// 设置开发模式
data.devMode = true;

// 写回文件
try {
    writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log('✅ 已启用开发模式');
    console.log('🔄 请重新加载 Obsidian 插件以生效');
} catch (e) {
    console.error('❌ 写入数据文件失败:', e);
}