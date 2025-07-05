<!-- 这是组件世界前端需要添加的 OAuth 认证页面示例 -->
<!-- 路径: /auth/obsidian -->
<template>
  <div class="auth-obsidian-page">
    <div class="auth-container">
      <div class="auth-card">
        <div class="logo">
          <img src="/logo.svg" alt="组件世界" />
        </div>
        
        <h1>Obsidian 插件授权</h1>
        
        <div v-if="!isLoggedIn" class="login-prompt">
          <p>请先登录组件世界账号</p>
          <button @click="handleLogin" class="login-button">
            登录
          </button>
        </div>
        
        <div v-else class="auth-confirm">
          <div class="user-info">
            <img :src="user.avatar || '/default-avatar.png'" class="avatar" />
            <div class="user-details">
              <div class="nickname">{{ user.nickname || user.email }}</div>
              <div class="email">{{ user.email }}</div>
            </div>
          </div>
          
          <div class="permissions">
            <h3>Obsidian 插件将获得以下权限：</h3>
            <ul>
              <li>读取您的公开组件</li>
              <li>管理您的个人组件</li>
              <li>创建和编辑组件</li>
            </ul>
          </div>
          
          <div class="actions">
            <button @click="handleAuthorize" class="authorize-button">
              授权并返回 Obsidian
            </button>
            <button @click="handleCancel" class="cancel-button">
              取消
            </button>
          </div>
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { generateToken } from '@/api/auth' // 需要实现的 API

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isLoggedIn = ref(false)
const user = ref({})
const error = ref('')

// 从 URL 获取 state 参数
const state = route.query.state as string

onMounted(() => {
  // 检查用户登录状态
  if (userStore.isLoggedIn) {
    isLoggedIn.value = true
    user.value = userStore.user
  } else {
    // 保存当前 URL，登录后返回
    sessionStorage.setItem('obsidian-auth-return', window.location.href)
  }
  
  // 验证 state 参数
  if (!state) {
    error.value = '缺少必要的参数'
  }
})

const handleLogin = () => {
  // 跳转到登录页面
  router.push({
    path: '/login',
    query: {
      redirect: '/auth/obsidian',
      state
    }
  })
}

const handleAuthorize = async () => {
  try {
    // 调用后端 API 生成 token
    const response = await generateToken({
      platform: 'obsidian',
      userId: user.value._id
    })
    
    if (response.code === 0 && response.data.token) {
      // 构建回调 URL
      const callbackUrl = `obsidian://widgetstore-auth?token=${response.data.token}&state=${state}`
      
      // 跳转回 Obsidian
      window.location.href = callbackUrl
      
      // 显示提示信息
      setTimeout(() => {
        error.value = '如果没有自动跳转，请手动返回 Obsidian'
      }, 2000)
    } else {
      error.value = '授权失败，请重试'
    }
  } catch (err) {
    console.error('授权失败:', err)
    error.value = '授权失败，请重试'
  }
}

const handleCancel = () => {
  // 返回首页
  router.push('/')
}
</script>

<style scoped>
.auth-obsidian-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.auth-container {
  width: 100%;
  max-width: 480px;
  padding: 20px;
}

.auth-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.logo {
  text-align: center;
  margin-bottom: 24px;
}

.logo img {
  height: 48px;
}

h1 {
  text-align: center;
  font-size: 24px;
  margin-bottom: 32px;
}

.login-prompt {
  text-align: center;
}

.login-prompt p {
  margin-bottom: 24px;
  color: #666;
}

.login-button,
.authorize-button {
  width: 100%;
  padding: 12px 24px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.login-button:hover,
.authorize-button:hover {
  background: #357abd;
}

.user-info {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 24px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: 16px;
}

.user-details {
  flex: 1;
}

.nickname {
  font-weight: 500;
  margin-bottom: 4px;
}

.email {
  color: #666;
  font-size: 14px;
}

.permissions {
  margin-bottom: 32px;
}

.permissions h3 {
  font-size: 16px;
  margin-bottom: 12px;
}

.permissions ul {
  list-style: none;
  padding: 0;
}

.permissions li {
  padding: 8px 0;
  padding-left: 24px;
  position: relative;
}

.permissions li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #4a90e2;
}

.actions {
  display: flex;
  gap: 12px;
}

.authorize-button {
  flex: 1;
}

.cancel-button {
  flex: 1;
  padding: 12px 24px;
  background: #f0f0f0;
  color: #333;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.cancel-button:hover {
  background: #e0e0e0;
}

.error-message {
  margin-top: 24px;
  padding: 12px;
  background: #fee;
  color: #c00;
  border-radius: 6px;
  text-align: center;
}
</style>