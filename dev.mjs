import { spawn } from 'child_process';
import { copyFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 尝试从 .env 文件读取配置
function loadEnv() {
    const envPath = resolve(__dirname, '.env');
    if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf-8');
        const match = envContent.match(/OBSIDIAN_PLUGIN_PATH="(.+)"/);
        if (match) {
            return match[1];
        }
    }
    return null;
}

// 配置你的 Obsidian vault 路径
const OBSIDIAN_PLUGIN_PATH = process.env.OBSIDIAN_PLUGIN_PATH || loadEnv() || '';

if (!OBSIDIAN_PLUGIN_PATH) {
    console.error('❌ 未找到 Obsidian 插件路径配置');
    console.error('\n请先运行: node setup-dev.mjs');
    process.exit(1);
}

// 确保目标目录存在
if (!existsSync(OBSIDIAN_PLUGIN_PATH)) {
    console.log(`📁 创建插件目录: ${OBSIDIAN_PLUGIN_PATH}`);
    mkdirSync(OBSIDIAN_PLUGIN_PATH, { recursive: true });
}

// 复制文件到 Obsidian
function copyToObsidian() {
    try {
        const files = ['main.js', 'manifest.json', 'styles.css'];
        
        files.forEach(file => {
            const src = resolve(__dirname, file);
            const dest = resolve(OBSIDIAN_PLUGIN_PATH, file);
            
            if (existsSync(src)) {
                copyFileSync(src, dest);
                console.log(`✅ 复制 ${file} 到 Obsidian`);
            }
        });
        
        console.log('🎉 插件文件已复制到 Obsidian，请重新加载插件');
    } catch (error) {
        console.error('❌ 复制文件失败:', error);
    }
}

console.log('🚀 开发模式已启动');
console.log(`📂 Obsidian 插件路径: ${OBSIDIAN_PLUGIN_PATH}`);

// 检查是否已有构建文件
if (existsSync(resolve(__dirname, 'main.js'))) {
    copyToObsidian();
}

// 启动 esbuild
const esbuild = spawn('node', ['esbuild.config.mjs'], {
    stdio: 'pipe',
    shell: true
});

// 监听 esbuild 输出
esbuild.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    
    // 检测构建完成
    if (output.includes('build finished') || output.includes('watching for changes')) {
        setTimeout(copyToObsidian, 500);
    }
});

esbuild.stderr.on('data', (data) => {
    process.stderr.write(data);
});

// 处理进程退出
process.on('SIGINT', () => {
    esbuild.kill();
    process.exit();
});

console.log('👀 监听文件变化中...\n');