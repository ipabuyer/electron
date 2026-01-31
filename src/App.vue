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
          :App_DeveloperSite_String="App_DeveloperSite_String"
          :App_Notify_Function="App_Notify_Function"
          :setApp_CountryCode_String="App_SetCountryCode_Function"
          :setApp_StatusRefreshSeed_Number="App_IncrementStatusRefreshSeed_Function"
        />
      </main>
    </div>

    <transition name="fade">
      <div v-if="App_Snackbar_Object.open" class="snackbar" :class="`snackbar-${App_Snackbar_Object.severity}`">
        <span class="snackbar-dot" aria-hidden="true"></span>
        <span class="snackbar-text">{{ App_Snackbar_Object.message }}</span>
      </div>
    </transition>
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

const App_Snackbar_Object = reactive({
  open: false,
  severity: 'info',
  message: ''
});
let App_SnackbarTimer_Number = 0;

const App_Notify_Function = (severity, message) => {
  App_Snackbar_Object.open = true;
  App_Snackbar_Object.severity = severity;
  App_Snackbar_Object.message = message;
  if (App_SnackbarTimer_Number) {
    clearTimeout(App_SnackbarTimer_Number);
  }
  App_SnackbarTimer_Number = setTimeout(() => {
    App_Snackbar_Object.open = false;
  }, 3200);
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


const App_IncrementStatusRefreshSeed_Function = () => {
  App_StatusRefreshSeed_Number.value += 1;
};

onMounted(async () => {
  if (!window.electronAPI?.readPassphrase) return;
  const saved = await window.electronAPI.readPassphrase();
  if (saved) {
    App_Passphrase_String.value = saved;
  }
});
</script>
