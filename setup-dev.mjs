import { existsSync, readdirSync, statSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 常见的 Obsidian vault 位置
const commonPaths = [
    join(homedir(), 'Documents'),
    join(homedir(), 'Desktop'),
    join(homedir(), 'Obsidian'),
    join(homedir(), 'iCloud Drive', 'Documents'),
    join(homedir(), 'Library', 'Mobile Documents', 'iCloud~md~obsidian', 'Documents'),
    '/Users/Shared'
];

// 查找 Obsidian vaults
function findObsidianVaults() {
    const vaults = [];
    
    commonPaths.forEach(basePath => {
        if (existsSync(basePath)) {
            try {
                const dirs = readdirSync(basePath);
                dirs.forEach(dir => {
                    const fullPath = join(basePath, dir);
                    const obsidianPath = join(fullPath, '.obsidian');
                    
                    if (existsSync(obsidianPath) && statSync(obsidianPath).isDirectory()) {
                        vaults.push({
                            name: dir,
                            path: fullPath
                        });
                    }
                });
            } catch (error) {
                // 忽略权限错误
            }
        }
    });
    
    return vaults;
}

// 主函数
async function main() {
    console.log('🔍 正在搜索 Obsidian vaults...\n');
    
    const vaults = findObsidianVaults();
    
    if (vaults.length === 0) {
        console.log('❌ 未找到 Obsidian vault');
        console.log('请手动输入 vault 路径：');
        
        const manualPath = await new Promise(resolve => {
            rl.question('Vault 路径: ', resolve);
        });
        
        if (existsSync(join(manualPath, '.obsidian'))) {
            saveConfig(join(manualPath, '.obsidian', 'plugins', 'widgetstore'));
        } else {
            console.error('❌ 无效的 vault 路径');
            process.exit(1);
        }
    } else {
        console.log('找到以下 Obsidian vaults:\n');
        
        vaults.forEach((vault, index) => {
            console.log(`${index + 1}. ${vault.name}`);
            console.log(`   路径: ${vault.path}`);
            console.log();
        });
        
        const choice = await new Promise(resolve => {
            rl.question('请选择一个 vault (输入数字): ', resolve);
        });
        
        const selectedIndex = parseInt(choice) - 1;
        
        if (selectedIndex >= 0 && selectedIndex < vaults.length) {
            const selectedVault = vaults[selectedIndex];
            const pluginPath = join(selectedVault.path, '.obsidian', 'plugins', 'widgetstore');
            
            saveConfig(pluginPath);
        } else {
            console.error('❌ 无效的选择');
            process.exit(1);
        }
    }
    
    rl.close();
}

// 保存配置
function saveConfig(pluginPath) {
    const envContent = `# Obsidian 插件开发配置
OBSIDIAN_PLUGIN_PATH="${pluginPath}"
`;
    
    writeFileSync('.env', envContent);
    console.log(`\n✅ 配置已保存到 .env 文件`);
    console.log(`📂 插件路径: ${pluginPath}`);
    console.log(`\n现在你可以运行以下命令开始开发：`);
    console.log(`  yarn dev:obsidian`);
}

main().catch(console.error);