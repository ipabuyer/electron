<template>
  <div class="app-shell">
    <div class="app-topbar">
      <div class="topbar-left">
        <button class="ui-icon-button no-drag" type="button" @click="App_ToggleSidebar_Function">
          <svg v-if="App_SidebarCollapsed_Boolean" viewBox="0 0 24 24" class="icon" aria-hidden="true">
            <path
              d="M4 6h10a1 1 0 0 0 0-2H4a1 1 0 0 0 0 2zm0 7h10a1 1 0 0 0 0-2H4a1 1 0 0 0 0 2zm0 7h10a1 1 0 0 0 0-2H4a1 1 0 0 0 0 2z"
              fill="currentColor"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" class="icon" aria-hidden="true">
            <path
              d="M4 6h16a1 1 0 0 0 0-2H4a1 1 0 1 0 0 2zm0 7h16a1 1 0 0 0 0-2H4a1 1 0 1 0 0 2zm0 7h16a1 1 0 0 0 0-2H4a1 1 0 1 0 0 2z"
              fill="currentColor"
            />
          </svg>
        </button>
        <img :src="AppIcon" alt="IPAbuyer" class="topbar-logo no-drag" />
        <span class="topbar-title">IPAbuyer</span>
      </div>
      <div class="topbar-center">
        <div v-if="App_ShowSearch_Boolean" class="topbar-search">
          <input
            v-model="App_SearchTerm_String"
            class="ui-input topbar-input no-drag"
            type="text"
            placeholder="搜索应用"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            @keydown.enter="App_TriggerSearch_Function"
          />
          <button
            class="ui-icon-button no-drag"
            type="button"
            :disabled="App_Searching_Boolean"
            @click="App_TriggerSearch_Function"
          >
            <span v-if="App_Searching_Boolean" class="spinner" aria-hidden="true"></span>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true" class="icon">
              <path
                d="M15.5 14h-.79l-.28-.27a6 6 0 1 0-.71.71l.27.28v.79L20 20.5 21.5 19 15.5 14zm-5.5 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>
      <div class="topbar-right">
        <button class="window-button no-drag" type="button" title="最小化" @click="App_WindowMinimize_Function">
          <svg class="window-icon" viewBox="0 0 12 12" aria-hidden="true">
            <line x1="2" y1="9" x2="10" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
        <button class="window-button no-drag" type="button" title="最大化/还原" @click="App_WindowMaximize_Function">
          <svg class="window-icon" viewBox="0 0 12 12" aria-hidden="true">
            <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </button>
        <button class="window-button window-close no-drag" type="button" title="关闭" @click="App_WindowClose_Function">
          <svg class="window-icon" viewBox="0 0 12 12" aria-hidden="true">
            <line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <line x1="9" y1="3" x2="3" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <div class="app-body">
      <Sidebar
        :active-page="App_ActivePage_String"
        :collapsed="App_SidebarCollapsed_Boolean"
        @change-page="App_ActivePage_String = $event"
      />

      <main class="app-content">
        <HomePage
          v-if="App_ActivePage_String === 'home'"
          :App_CountryCode_String="App_CountryCode_String"
          :App_AuthState_Object="App_AuthState_Object"
          :App_Passphrase_String="App_Passphrase_String"
          :App_StatusRefreshSeed_Number="App_StatusRefreshSeed_Number"
          :App_SearchTerm_String="App_SearchTerm_String"
          :App_SearchTrigger_Number="App_SearchTrigger_Number"
          :App_Notify_Function="App_Notify_Function"
          @searching="App_Searching_Boolean = $event"
        />
        <AccountPage
          v-else-if="App_ActivePage_String === 'account'"
          :App_AuthState_Object="App_AuthState_Object"
          :App_Passphrase_String="App_Passphrase_String"
          :App_Notify_Function="App_Notify_Function"
          :setApp_AuthState_Object="App_SetAuthState_Function"
          :setApp_Passphrase_String="App_SetPassphrase_Function"
        />
        <SettingPage
          v-else
          :App_CountryCode_String="App_CountryCode_String"
          :App_DownloadPath_String="App_DownloadPath_String"
          :App_DeveloperSite_String="App_DeveloperSite_String"
          :App_Notify_Function="App_Notify_Function"
          :setApp_CountryCode_String="App_SetCountryCode_Function"
          :setApp_DownloadPath_String="App_SetDownloadPath_Function"
          :setApp_StatusRefreshSeed_Number="App_IncrementStatusRefreshSeed_Function"
        />
      </main>
    </div>

    <div class="snackbar-stack">
      <transition-group name="fade">
        <div
          v-for="item in App_SnackbarQueue_Array"
          :key="item.id"
          class="snackbar"
          :class="`snackbar-${item.severity}`"
        >
          <span class="snackbar-dot" aria-hidden="true"></span>
          <span class="snackbar-text">{{ item.message }}</span>
          <button
            v-if="item.copyText"
            class="snackbar-copy"
            type="button"
            @click="App_CopyText_Function(item.copyText)"
          >
            复制
          </button>
        </div>
      </transition-group>
    </div>

    <div v-if="App_DownloadLog_Open_Boolean" class="download-log-panel">
      <div class="download-log-header">
        <span>下载日志</span>
        <div class="download-log-actions">
          <button class="ui-button ghost" type="button" @click="App_CopyText_Function(App_DownloadLog_Text_String)">
            复制
          </button>
          <button class="ui-button ghost" type="button" @click="App_ClearDownloadLog_Function">清空</button>
          <button
            v-if="App_DownloadRunning_Boolean"
            class="ui-button danger"
            type="button"
            @click="App_CancelDownload_Function"
          >
            取消下载
          </button>
          <button class="ui-button text" type="button" @click="App_DownloadLog_Open_Boolean = false">关闭</button>
        </div>
      </div>
      <div class="download-log-body">
        <div v-for="(line, index) in App_DownloadLogs_Array" :key="`${index}-${line}`" class="download-log-line">
          {{ line }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import Sidebar from './components/Sidebar.vue';
import HomePage from './pages/HomePage.vue';
import AccountPage from './pages/AccountPage.vue';
import SettingPage from './pages/SettingPage.vue';
import AppIcon from '../assets/Square44x44Logo.scale-200.png';

const App_ActivePage_String = ref('home');
const App_CountryCode_String = ref('cn');
const App_DownloadPath_String = ref('');
const App_DeveloperSite_String = ref('ipa.blazesnow.com');
const App_Passphrase_String = ref('');
const App_AuthState_Object = reactive({
  email: '',
  loggedIn: false,
  isTest: false
});
const App_StatusRefreshSeed_Number = ref(0);
const App_SidebarCollapsed_Boolean = ref(false);
const App_SearchTerm_String = ref('');
const App_SearchTrigger_Number = ref(0);
const App_Searching_Boolean = ref(false);
const App_DownloadLog_Open_Boolean = ref(false);
const App_DownloadRunning_Boolean = ref(false);
const App_DownloadLogs_Array = ref([]);
const App_DownloadLog_Text_String = computed(() => App_DownloadLogs_Array.value.join('\n'));

const App_SnackbarQueue_Array = ref([]);
let App_SnackbarSeed_Number = 0;

const App_Notify_Function = (severity, message, options = {}) => {
  const id = `${Date.now()}-${App_SnackbarSeed_Number++}`;
  App_SnackbarQueue_Array.value.push({
    id,
    severity,
    message,
    copyText: options.copyText || ''
  });
  setTimeout(() => {
    App_SnackbarQueue_Array.value = App_SnackbarQueue_Array.value.filter((item) => item.id !== id);
  }, 3200);
};

const App_CopyText_Function = async (text) => {
  if (!text) return;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  } catch (_error) {
    // ignore copy errors
  }
};

const App_ClearDownloadLog_Function = () => {
  App_DownloadLogs_Array.value = [];
};

const App_CancelDownload_Function = async () => {
  if (!window.electronAPI?.cancelDownload) return;
  await window.electronAPI.cancelDownload();
  App_DownloadLogs_Array.value.push('已请求取消下载…');
};

const App_ShowSearch_Boolean = computed(() => App_ActivePage_String.value === 'home');

const App_ToggleSidebar_Function = () => {
  App_SidebarCollapsed_Boolean.value = !App_SidebarCollapsed_Boolean.value;
};

const App_TriggerSearch_Function = () => {
  if (!App_ShowSearch_Boolean.value || App_Searching_Boolean.value) return;
  App_SearchTrigger_Number.value += 1;
};

const App_WindowMinimize_Function = () => {
  window.electronAPI?.windowMinimize?.();
};

const App_WindowMaximize_Function = () => {
  window.electronAPI?.windowMaximize?.();
};

const App_WindowClose_Function = () => {
  window.electronAPI?.windowClose?.();
};

const App_SetAuthState_Function = (value) => {
  App_AuthState_Object.email = value.email;
  App_AuthState_Object.loggedIn = value.loggedIn;
  App_AuthState_Object.isTest = value.isTest;
};

const App_SetPassphrase_Function = (value) => {
  App_Passphrase_String.value = value;
};

const App_SetCountryCode_Function = (value) => {
  App_CountryCode_String.value = value;
};

const App_SetDownloadPath_Function = (value) => {
  App_DownloadPath_String.value = value;
};


const App_IncrementStatusRefreshSeed_Function = () => {
  App_StatusRefreshSeed_Number.value += 1;
};

onMounted(async () => {
  if (!window.electronAPI?.readPassphrase) return;
  const saved = await window.electronAPI.readPassphrase();
  if (saved) {
    App_Passphrase_String.value = saved;
  }
  if (window.electronAPI?.readCountry) {
    const country = await window.electronAPI.readCountry();
    if (country) App_CountryCode_String.value = country;
  }
  if (window.electronAPI?.readDownloadPath) {
    const path = await window.electronAPI.readDownloadPath();
    if (path) App_DownloadPath_String.value = path;
  }
  if (window.electronAPI?.onDownloadLog) {
    window.electronAPI.onDownloadLog((data) => {
      if (!data?.line) return;
      const prefix = data.bundleId ? `[${data.bundleId}] ` : '';
      App_DownloadLogs_Array.value.push(`${prefix}${data.line}`);
      App_DownloadLog_Open_Boolean.value = true;
    });
  }
  window.addEventListener('download-log-open', () => {
    App_DownloadLog_Open_Boolean.value = true;
  });
  window.addEventListener('download-start', () => {
    App_DownloadRunning_Boolean.value = true;
  });
  window.addEventListener('download-end', () => {
    App_DownloadRunning_Boolean.value = false;
  });
});
</script>
