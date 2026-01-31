<template>
  <section class="page narrow">
    <h2 class="page-title">账户</h2>
    <p class="muted">当前状态：{{ App_AuthState_Object.loggedIn ? `已登录（${App_AuthState_Object.email}）` : '未登录' }}</p>
    <div class="divider"></div>

    <div class="form-grid">
      <label class="field">
        <span>邮箱</span>
        <input
          v-model="AccountPage_LoginForm_Object.email"
          class="ui-input"
          type="text"
          autocomplete="username"
        />
      </label>
      <label class="field">
        <span>密码</span>
        <input
          v-model="AccountPage_LoginForm_Object.password"
          class="ui-input"
          type="password"
          autocomplete="current-password"
        />
      </label>
      <label class="field">
        <span>双重验证码（可选）</span>
        <input v-model="AccountPage_LoginForm_Object.authCode" class="ui-input" type="text" />
        <small class="hint">可先只输入邮箱+密码获取验证码，再输入验证码登录</small>
      </label>
      <label class="field">
        <span>加密密钥（keychain passphrase）</span>
        <input
          v-model="AccountPage_LoginForm_Object.passphrase"
          class="ui-input"
          type="password"
          @input="props.setApp_Passphrase_String(AccountPage_LoginForm_Object.passphrase)"
        />
        <small class="hint">修改密钥需先退出登录并重新登录</small>
      </label>
    </div>

    <div class="button-row">
      <button
        class="ui-button primary"
        type="button"
        :disabled="AccountPage_ActionLoading_Boolean"
        @click="AccountPage_SubmitLogin_AsyncFunction"
      >
        登录
      </button>
      <button class="ui-button ghost" type="button" @click="AccountPage_CheckAuth_AsyncFunction">查询登录状态</button>
      <button class="ui-button text" type="button" @click="AccountPage_Logout_AsyncFunction">退出登录</button>
    </div>

    <p v-if="AccountPage_AuthInfo_String" class="muted">状态信息：{{ AccountPage_AuthInfo_String }}</p>

    <div class="notice">
      <strong>测试账户：</strong>
      test / test（购买或下载会直接成功，仅用于界面测试）。新创建的苹果账号必须先在设备 App Store 完成一次购买后才能用于本软件。
      如收不到验证码，请打开 https://account.apple.com/ 获取双重验证码后填入本软件。
    </div>
    <p class="caption">注意：只有 ipatool 处于登录状态时才存在加密密钥。</p>
  </section>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';

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
const AccountPage_AuthInfo_String = ref('');

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
    } else {
      props.App_Notify_Function('error', res.stderr || res.error || '登录失败');
    }
  } catch (error) {
    props.App_Notify_Function('error', error.message || '登录失败');
  } finally {
    AccountPage_ActionLoading_Boolean.value = false;
  }
};

const AccountPage_CheckAuth_AsyncFunction = async () => {
  const passphrase = AccountPage_LoginForm_Object.passphrase || props.App_Passphrase_String;
  if (!passphrase) {
    props.App_Notify_Function('warning', '请先输入加密密钥');
    return;
  }
  try {
    const res = await window.electronAPI.authInfo({ passphrase });
    if (res.ok) {
      const message = res.mock ? '测试账户已登录' : res.stdout || res.message || '已登录';
      AccountPage_AuthInfo_String.value = message;
      props.App_Notify_Function('info', message);
    } else {
      const message = res.stderr || res.error || '未登录';
      AccountPage_AuthInfo_String.value = message;
      props.App_Notify_Function('warning', message);
    }
  } catch (error) {
    props.App_Notify_Function('error', error.message || '查询失败');
  }
};

const AccountPage_Logout_AsyncFunction = async () => {
  try {
    const res = await window.electronAPI.authRevoke();
    if (res.ok) {
      props.setApp_AuthState_Object({ email: '', loggedIn: false, isTest: false });
      props.App_Notify_Function('info', '已退出登录');
    } else {
      props.App_Notify_Function('error', res.stderr || res.error || '退出失败');
    }
  } catch (error) {
    props.App_Notify_Function('error', error.message || '退出失败');
  }
};
</script>
