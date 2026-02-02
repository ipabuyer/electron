<template>
  <section class="page narrow">
    <h2 class="page-title">账户</h2>
    <div class="divider"></div>

    <div class="account-form-grid">
      <div v-if="AccountPage_IsLocked_Boolean" class="account-lock-overlay" aria-hidden="true">
        <div class="account-lock-badge">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M7 10V8a5 5 0 0 1 10 0v2h1.5A1.5 1.5 0 0 1 20 11.5v7A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-7A1.5 1.5 0 0 1 5.5 10H7zm2 0h6V8a3 3 0 0 0-6 0v2z"
            />
          </svg>
          <span>已锁定</span>
        </div>
      </div>
      <div class="form-grid">
      <label class="field">
        <span>邮箱</span>
        <input
          v-model="AccountPage_LoginForm_Object.email"
          class="ui-input"
          type="text"
          autocomplete="username"
          :disabled="AccountPage_IsLocked_Boolean"
        />
      </label>
      <label class="field">
        <span>密码</span>
        <div class="password-field">
          <input
            v-model="AccountPage_LoginForm_Object.password"
            class="ui-input"
            :type="AccountPage_ShowPassword_Boolean ? 'text' : 'password'"
            autocomplete="current-password"
            :disabled="AccountPage_IsLocked_Boolean"
          />
          <button
            class="eye-button"
            type="button"
            aria-label="按住显示密码"
            @mousedown="AccountPage_ShowPassword_Boolean = true"
            @mouseup="AccountPage_ShowPassword_Boolean = false"
            @mouseleave="AccountPage_ShowPassword_Boolean = false"
            @touchstart.prevent="AccountPage_ShowPassword_Boolean = true"
            @touchend="AccountPage_ShowPassword_Boolean = false"
            :disabled="AccountPage_IsLocked_Boolean"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"
              />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
          </button>
        </div>
      </label>
      <label class="field">
        <span>双重验证码（可选）</span>
        <input
          v-model="AccountPage_LoginForm_Object.authCode"
          class="ui-input"
          type="text"
          :disabled="AccountPage_IsLocked_Boolean"
        />
        <small class="hint">可先只输入邮箱+密码获取验证码，再输入验证码登录</small>
      </label>
      <label class="field">
        <span>加密密钥（keychain passphrase）</span>
        <div class="password-field">
          <input
            v-model="AccountPage_LoginForm_Object.passphrase"
            class="ui-input"
            :type="AccountPage_ShowPassphrase_Boolean ? 'text' : 'password'"
            @input="props.setApp_Passphrase_String(AccountPage_LoginForm_Object.passphrase)"
            :disabled="AccountPage_IsLocked_Boolean"
          />
          <button
            class="eye-button"
            type="button"
            aria-label="按住显示密钥"
            @mousedown="AccountPage_ShowPassphrase_Boolean = true"
            @mouseup="AccountPage_ShowPassphrase_Boolean = false"
            @mouseleave="AccountPage_ShowPassphrase_Boolean = false"
            @touchstart.prevent="AccountPage_ShowPassphrase_Boolean = true"
            @touchend="AccountPage_ShowPassphrase_Boolean = false"
            :disabled="AccountPage_IsLocked_Boolean"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"
              />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
          </button>
        </div>
        <small class="hint">修改密钥需先退出登录并重新登录</small>
      </label>
      </div>
    </div>

    <div class="button-row">
      <button class="ui-button primary" type="button" @click="AccountPage_CheckAuth_AsyncFunction">
        查询登录状态
      </button>
      <button
        class="ui-button outline"
        type="button"
        :disabled="AccountPage_ActionLoading_Boolean || AccountPage_IsLocked_Boolean"
        @click="AccountPage_SubmitLogin_AsyncFunction"
      >
        登录
      </button>
      <button class="ui-button danger" type="button" @click="AccountPage_Logout_AsyncFunction">退出登录</button>
    </div>

  </section>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';

const props = defineProps({
  App_AuthState_Object: {
    type: Object,
    required: true
  },
  App_Passphrase_String: {
    type: String,
    default: ''
  },
  App_Notify_Function: {
    type: Function,
    required: true
  },
  setApp_AuthState_Object: {
    type: Function,
    required: true
  },
  setApp_Passphrase_String: {
    type: Function,
    required: true
  }
});

const AccountPage_LoginForm_Object = reactive({
  email: '',
  password: '',
  authCode: '',
  passphrase: props.App_Passphrase_String || ''
});

const AccountPage_ActionLoading_Boolean = ref(false);
const AccountPage_ShowPassword_Boolean = ref(false);
const AccountPage_ShowPassphrase_Boolean = ref(false);
const AccountPage_IsLocked_Boolean = ref(false);

watch(
  () => props.App_Passphrase_String,
  (value) => {
    if (!AccountPage_LoginForm_Object.passphrase) {
      AccountPage_LoginForm_Object.passphrase = value || '';
    }
  }
);

const AccountPage_SubmitLogin_AsyncFunction = async () => {
  if (!AccountPage_LoginForm_Object.email || !AccountPage_LoginForm_Object.password || !AccountPage_LoginForm_Object.passphrase) {
    props.App_Notify_Function('warning', '请填写邮箱、密码与加密密钥');
    return;
  }
  AccountPage_ActionLoading_Boolean.value = true;
  try {
    const res = await window.electronAPI.login({
      email: AccountPage_LoginForm_Object.email,
      password: AccountPage_LoginForm_Object.password,
      authCode: AccountPage_LoginForm_Object.authCode,
      passphrase: AccountPage_LoginForm_Object.passphrase
    });
    if (res.ok) {
      props.setApp_AuthState_Object({
        email: AccountPage_LoginForm_Object.email,
        loggedIn: true,
        isTest: res.mock === true
      });
      props.setApp_Passphrase_String(AccountPage_LoginForm_Object.passphrase);
      props.App_Notify_Function('success', res.mock ? '测试账户登录成功' : '登录成功');
      AccountPage_IsLocked_Boolean.value = true;
    } else {
      const detail = res.stderr || res.error || '登录失败';
      props.App_Notify_Function('error', detail, { copyText: detail });
    }
  } catch (error) {
    const detail = error.message || '登录失败';
    props.App_Notify_Function('error', detail, { copyText: detail });
  } finally {
    AccountPage_ActionLoading_Boolean.value = false;
  }
};

const AccountPage_CheckAuth_AsyncFunction = async (options = {}) => {
  const { silent = false } = options;
  const passphrase = AccountPage_LoginForm_Object.passphrase || props.App_Passphrase_String;
  if (!passphrase) {
    if (!silent) {
      props.App_Notify_Function('warning', '请先输入加密密钥');
    }
    return;
  }
  try {
    const res = await window.electronAPI.authInfo({ passphrase });
    if (res.ok) {
      const message = res.mock ? '测试账户已登录' : res.stdout || res.message || '已登录';
      if (!silent) {
        props.App_Notify_Function('info', message, { copyText: res.stdout || message });
      }
      AccountPage_IsLocked_Boolean.value = true;
    } else {
      const message = res.stderr || res.error || '未登录';
      if (!silent) {
        props.App_Notify_Function('warning', message, { copyText: message });
      }
      AccountPage_IsLocked_Boolean.value = false;
    }
  } catch (error) {
    if (!silent) {
      const detail = error.message || '查询失败';
      props.App_Notify_Function('error', detail, { copyText: detail });
    }
  }
};

const AccountPage_Logout_AsyncFunction = async () => {
  try {
    const res = await window.electronAPI.authRevoke();
    if (res.ok) {
      props.setApp_AuthState_Object({ email: '', loggedIn: false, isTest: false });
      props.App_Notify_Function('info', '已退出登录');
      AccountPage_IsLocked_Boolean.value = false;
    } else {
      const detail = res.stderr || res.error || '退出失败';
      props.App_Notify_Function('error', detail, { copyText: detail });
    }
  } catch (error) {
    const detail = error.message || '退出失败';
    props.App_Notify_Function('error', detail, { copyText: detail });
  }
};

onMounted(() => {
  AccountPage_CheckAuth_AsyncFunction({ silent: true });
});
</script>
