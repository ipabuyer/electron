<template>
  <section class="page narrow">
    <h2 class="page-title">设置</h2>

    <div class="form-grid">
      <div class="panel setting-card">
        <label class="field">
          <span>国家代码</span>
          <div class="field-row">
            <input
              class="ui-input"
              :value="App_CountryCode_String"
              @input="SettingPage_OnCountryInput_Function"
            />
            <button class="ui-button ghost" type="button" @click="SettingPage_ConfirmCountry_Function">
              确认
            </button>
          </div>
          <small class="hint">默认：cn</small>
        </label>
      </div>

      <div class="panel setting-card">
        <label class="field">
          <span>开发者官方网站</span>
          <div class="field-row">
            <span class="muted">{{ App_DeveloperSite_String || 'ipa.blazesnow.com' }}</span>
            <button class="ui-button ghost" type="button" @click="SettingPage_OpenDeveloperSite_Function">
              打开
            </button>
          </div>
        </label>
      </div>

      <div class="panel setting-card">
        <label class="field">
          <span>下载路径</span>
          <div class="field-row">
            <span class="muted">{{ App_DownloadPath_String || '未设置' }}</span>
          </div>
        </label>
      </div>
    </div>

    <div class="panel setting-card danger-panel">
      <div class="danger-title">清空本地数据库</div>
      <div class="danger-desc">清空后已购买/已拥有记录将被移除，请谨慎操作。</div>
      <button class="ui-button danger" type="button" @click="SettingPage_ClearOpen_Boolean = true">
        立即清空
      </button>
    </div>

    <div v-if="SettingPage_ClearOpen_Boolean" class="modal-mask" @click="SettingPage_ClearOpen_Boolean = false">
      <div class="modal" @click.stop>
        <h3>确认清空数据库</h3>
        <p>清空后已购买/已拥有记录将被移除，是否继续？</p>
        <div class="button-row end">
          <button class="ui-button text" type="button" @click="SettingPage_ClearOpen_Boolean = false">取消</button>
          <button class="ui-button danger" type="button" @click="SettingPage_ClearDatabase_AsyncFunction">确认清空</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  App_CountryCode_String: {
    type: String,
    default: 'cn'
  },
  App_DeveloperSite_String: {
    type: String,
    default: 'ipa.blazesnow.com'
  },
  App_DownloadPath_String: {
    type: String,
    default: ''
  },
  App_Notify_Function: {
    type: Function,
    required: true
  },
  setApp_CountryCode_String: {
    type: Function,
    required: true
  },
  setApp_StatusRefreshSeed_Number: {
    type: Function,
    required: true
  }
});

const SettingPage_ClearOpen_Boolean = ref(false);

const SettingPage_NormalizeCountryCode_Function = (value) =>
  value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toLowerCase();

const SettingPage_OnCountryInput_Function = (event) => {
  props.setApp_CountryCode_String(SettingPage_NormalizeCountryCode_Function(event.target.value));
};

const SettingPage_ConfirmCountry_Function = async () => {
  const value = props.App_CountryCode_String || '';
  if (!/^[a-z]{2}$/i.test(value)) {
    props.App_Notify_Function('warning', '请输入正确的国家代码（两位字母）');
    return;
  }
  const normalized = value.toLowerCase();
  props.setApp_CountryCode_String(normalized);
  if (window.electronAPI?.saveCountry) {
    await window.electronAPI.saveCountry(normalized);
  }
  props.App_Notify_Function('success', `国家代码已设置为 ${normalized}`);
};

const SettingPage_OpenDeveloperSite_Function = async () => {
  const site = props.App_DeveloperSite_String || 'ipa.blazesnow.com';
  const url = site.startsWith('http') ? site : `https://${site}`;
  if (!window.electronAPI?.openExternal) {
    props.App_Notify_Function('warning', '无法打开外部链接');
    return;
  }
  const res = await window.electronAPI.openExternal(url);
  if (!res?.ok) {
    props.App_Notify_Function('error', res?.error || '打开失败');
  }
};

const SettingPage_ClearDatabase_AsyncFunction = async () => {
  try {
    const res = await window.electronAPI.clearDatabase();
    if (res?.ok) {
      props.setApp_StatusRefreshSeed_Number();
      props.App_Notify_Function('success', '本地数据库已清空');
    } else {
      props.App_Notify_Function('error', res?.error || '清空失败');
    }
  } catch (error) {
    props.App_Notify_Function('error', error.message || '清空失败');
  } finally {
    SettingPage_ClearOpen_Boolean.value = false;
  }
};
</script>
