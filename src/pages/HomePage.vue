<template>
  <section class="page">
    <div class="panel">
      <div class="panel-row">
        <div class="button-group">
          <button
            class="ui-button primary"
            type="button"
            :disabled="HomePage_ActionLoading_Boolean"
            @click="HomePage_HandlePurchase_AsyncFunction()"
          >
            购买
          </button>
          <button
            class="ui-button ghost"
            type="button"
            :disabled="HomePage_ActionLoading_Boolean"
            @click="HomePage_HandleDownload_AsyncFunction()"
          >
            下载
          </button>
        </div>

        <div class="filter-tabs">
          <button
            v-for="filter in HomePage_Filters_Array"
            :key="filter.key"
            type="button"
            class="tab-button"
            :class="{ active: HomePage_Filter_String === filter.key }"
            @click="HomePage_Filter_String = filter.key"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="panel table-panel">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-app">
                <label class="checkbox-row">
                  <input
                    type="checkbox"
                    :checked="HomePage_SelectedAll_Boolean"
                    :indeterminate.prop="HomePage_PartialSelect_Boolean"
                    @change="HomePage_ToggleSelectAll_Function"
                  />
                  <span>App名称</span>
                </label>
              </th>
              <th class="col-id">AppID</th>
              <th class="col-seller">开发者</th>
              <th class="col-version">版本号</th>
              <th class="col-price">价格</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="app in HomePage_FilteredApps_Array"
              :key="app.bundleId"
              :class="{ selected: HomePage_SelectedIds_Array.includes(app.bundleId) }"
              @click="HomePage_ToggleSelect_Function(app.bundleId)"
              @contextmenu.prevent="HomePage_HandleContextMenu_Function($event, app)"
            >
              <td>
                <div class="app-cell">
                  <input
                    type="checkbox"
                    :checked="HomePage_SelectedIds_Array.includes(app.bundleId)"
                    @click.stop="HomePage_ToggleSelect_Function(app.bundleId)"
                  />
                  <img v-if="app.artwork" :src="app.artwork" :alt="app.name" class="app-icon" />
                  <div class="app-name">
                    <span>{{ app.name }}</span>
                  </div>
                </div>
              </td>
              <td>{{ app.bundleId }}</td>
              <td>{{ app.seller || '-' }}</td>
              <td>{{ app.version || '-' }}</td>
              <td>{{ app.price ?? '-' }}</td>
            </tr>
            <tr v-if="HomePage_FilteredApps_Array.length === 0">
              <td colspan="5" class="empty">暂无数据，请先搜索或调整筛选条件</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="HomePage_ContextMenu_Object"
      class="context-menu"
      :style="{
        left: `${HomePage_ContextMenu_Object.mouseX}px`,
        top: `${HomePage_ContextMenu_Object.mouseY}px`
      }"
      @click="HomePage_CloseContextMenu_Function"
    >
      <button type="button" @click.stop="HomePage_HandlePurchase_AsyncFunction([HomePage_ContextMenu_Object.app.bundleId])">
        购买此App
      </button>
      <button type="button" @click.stop="HomePage_HandleDownload_AsyncFunction([HomePage_ContextMenu_Object.app.bundleId])">
        下载此App
      </button>
      <button type="button" @click.stop="HomePage_HandleMarkStatus_AsyncFunction('purchased', [HomePage_ContextMenu_Object.app.bundleId])">
        标记为已购买
      </button>
      <button type="button" @click.stop="HomePage_HandleMarkStatus_AsyncFunction('owned', [HomePage_ContextMenu_Object.app.bundleId])">
        标记为已拥有
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  App_CountryCode_String: {
    type: String,
    default: 'cn'
  },
  App_AuthState_Object: {
    type: Object,
    required: true
  },
  App_Passphrase_String: {
    type: String,
    default: ''
  },
  App_StatusRefreshSeed_Number: {
    type: Number,
    default: 0
  },
  App_SearchTerm_String: {
    type: String,
    default: ''
  },
  App_SearchTrigger_Number: {
    type: Number,
    default: 0
  },
  App_Notify_Function: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['searching']);

const HomePage_Filters_Array = [
  { key: 'all', label: '全部' },
  { key: 'unbought', label: '未购买' },
  { key: 'purchased', label: '已购买' },
  { key: 'owned', label: '已拥有' }
];

const HomePage_StatusLabel_Function = (status) => {
  if (status === 'purchased') return '已购买';
  if (status === 'owned') return '已拥有';
  return '未购买';
};

const HomePage_Apps_Array = ref([]);
const HomePage_StatusMap_Object = ref({});
const HomePage_SelectedIds_Array = ref([]);
const HomePage_Filter_String = ref('all');
const HomePage_IsSearching_Boolean = ref(false);
const HomePage_ActionLoading_Boolean = ref(false);
const HomePage_ContextMenu_Object = ref(null);
const HomePage_LastContextOpen_Number = ref(0);

const HomePage_LoadStatuses_AsyncFunction = async () => {
  if (!window.electronAPI?.listAppStatuses) return;
  const rows = await window.electronAPI.listAppStatuses();
  const map = {};
  (rows || []).forEach((row) => {
    map[row.bundleId] = row;
  });
  HomePage_StatusMap_Object.value = map;
};

const HomePage_RunSearch_AsyncFunction = async () => {
  if (!props.App_SearchTerm_String.trim()) {
    props.App_Notify_Function('warning', '请输入搜索关键词');
    return;
  }
  HomePage_IsSearching_Boolean.value = true;
  emit('searching', true);
  try {
    const country = (props.App_CountryCode_String || 'cn').toLowerCase();
    const resp = await window.electronAPI.searchItunes({
      term: props.App_SearchTerm_String.trim(),
      entity: 'software',
      limit: 50,
      country
    });
    if (!resp.ok) {
      throw new Error(resp.error || 'search failed');
    }
    const list = (resp.data?.results || []).map((item) => ({
      bundleId: item.bundleId || item.bundleID || item.bundleIdentifier || `unknown-${item.trackId}`,
      name: item.trackName,
      seller: item.sellerName,
      price: item.formattedPrice || item.price,
      version: item.version,
      artwork: item.artworkUrl100 || item.artworkUrl60
    }));
    HomePage_Apps_Array.value = list;
    HomePage_SelectedIds_Array.value = [];
    props.App_Notify_Function('success', `搜索完成，找到 ${list.length} 个应用`);
  } catch (error) {
    props.App_Notify_Function('error', '搜索失败，请检查网络');
  } finally {
    HomePage_IsSearching_Boolean.value = false;
    emit('searching', false);
  }
};

const HomePage_AppRows_Array = computed(() =>
  HomePage_Apps_Array.value.map((app) => ({
    ...app,
    status: HomePage_StatusMap_Object.value[app.bundleId]?.status || 'unbought'
  }))
);

const HomePage_FilteredApps_Array = computed(() => {
  if (HomePage_Filter_String.value === 'all') return HomePage_AppRows_Array.value;
  if (HomePage_Filter_String.value === 'unbought') {
    return HomePage_AppRows_Array.value.filter((app) => app.status === 'unbought');
  }
  return HomePage_AppRows_Array.value.filter((app) => app.status === HomePage_Filter_String.value);
});

const HomePage_ToggleSelect_Function = (bundleId) => {
  if (HomePage_SelectedIds_Array.value.includes(bundleId)) {
    HomePage_SelectedIds_Array.value = HomePage_SelectedIds_Array.value.filter((id) => id !== bundleId);
  } else {
    HomePage_SelectedIds_Array.value = [...HomePage_SelectedIds_Array.value, bundleId];
  }
};

const HomePage_ToggleSelectAll_Function = () => {
  if (HomePage_FilteredApps_Array.value.length === 0) return;
  const allIds = HomePage_FilteredApps_Array.value.map((app) => app.bundleId);
  const allSelected = allIds.every((id) => HomePage_SelectedIds_Array.value.includes(id));
  HomePage_SelectedIds_Array.value = allSelected ? [] : allIds;
};

const HomePage_HandleMarkStatus_AsyncFunction = async (status, targetIds) => {
  if (!window.electronAPI?.setAppStatuses) return;
  const ids = targetIds && targetIds.length ? targetIds : HomePage_SelectedIds_Array.value;
  if (!ids.length) {
    props.App_Notify_Function('warning', '请选择需要处理的应用');
    return;
  }
  HomePage_ActionLoading_Boolean.value = true;
  try {
    const rows = ids.map((bundleId) => ({
      bundleId,
      appName: HomePage_Apps_Array.value.find((app) => app.bundleId === bundleId)?.name || '',
      email: props.App_AuthState_Object.email || '',
      status
    }));
    await window.electronAPI.setAppStatuses(rows);
    await HomePage_LoadStatuses_AsyncFunction();
    props.App_Notify_Function('success', `已标记 ${ids.length} 个为${HomePage_StatusLabel_Function(status)}`);
  } catch (error) {
    props.App_Notify_Function('error', error.message || '标记失败');
  } finally {
    HomePage_ActionLoading_Boolean.value = false;
    HomePage_CloseContextMenu_Function();
  }
};

const HomePage_HandlePurchase_AsyncFunction = async (bundleIds) => {
  const ids = bundleIds && bundleIds.length ? bundleIds : HomePage_SelectedIds_Array.value;
  if (!ids.length) {
    props.App_Notify_Function('warning', '请选择要购买的应用');
    return;
  }
  HomePage_ActionLoading_Boolean.value = true;
  try {
    const appNameMap = Object.fromEntries(HomePage_Apps_Array.value.map((app) => [app.bundleId, app.name]));
    const res = await window.electronAPI.purchase({
      bundleIds: ids,
      passphrase: props.App_Passphrase_String,
      appNameMap,
      email: props.App_AuthState_Object.email
    });
    if (res.ok) {
      await HomePage_LoadStatuses_AsyncFunction();
      props.App_Notify_Function('success', '购买完成');
    } else {
      props.App_Notify_Function('error', res.error || res.message || '购买失败');
    }
  } catch (error) {
    props.App_Notify_Function('error', error.message || '购买失败');
  } finally {
    HomePage_ActionLoading_Boolean.value = false;
    HomePage_CloseContextMenu_Function();
  }
};

const HomePage_HandleDownload_AsyncFunction = async (bundleIds) => {
  const ids = bundleIds && bundleIds.length ? bundleIds : HomePage_SelectedIds_Array.value;
  if (!ids.length) {
    props.App_Notify_Function('warning', '请选择要下载的应用');
    return;
  }
  HomePage_ActionLoading_Boolean.value = true;
  try {
    const res = await window.electronAPI.download({
      bundleIds: ids,
      passphrase: props.App_Passphrase_String
    });
    if (res.ok) {
      props.App_Notify_Function('success', `下载完成，输出目录：${res.outputDir || ''}`);
    } else {
      props.App_Notify_Function('error', res.error || res.message || '下载失败');
    }
  } catch (error) {
    props.App_Notify_Function('error', error.message || '下载失败');
  } finally {
    HomePage_ActionLoading_Boolean.value = false;
    HomePage_CloseContextMenu_Function();
  }
};

const HomePage_HandleContextMenu_Function = (event, app) => {
  event.stopPropagation();
  HomePage_ContextMenu_Object.value = {
    mouseX: event.clientX + 2,
    mouseY: event.clientY - 6,
    app
  };
  HomePage_LastContextOpen_Number.value = Date.now();
};

const HomePage_CloseContextMenu_Function = () => {
  HomePage_ContextMenu_Object.value = null;
};

const HomePage_SelectedAll_Boolean = computed(() =>
  HomePage_FilteredApps_Array.value.length > 0 &&
  HomePage_FilteredApps_Array.value.every((app) => HomePage_SelectedIds_Array.value.includes(app.bundleId))
);

const HomePage_PartialSelect_Boolean = computed(() =>
  HomePage_FilteredApps_Array.value.some((app) => HomePage_SelectedIds_Array.value.includes(app.bundleId)) &&
  !HomePage_SelectedAll_Boolean.value
);

onMounted(() => {
  HomePage_LoadStatuses_AsyncFunction();
});

const HomePage_CloseOnGlobal_Function = (event) => {
  if (!HomePage_ContextMenu_Object.value) return;
  if (event?.type === 'contextmenu') {
    if (Date.now() - HomePage_LastContextOpen_Number.value < 200) {
      return;
    }
  }
  HomePage_CloseContextMenu_Function();
};

const HomePage_CloseOnEscape_Function = (event) => {
  if (event.key === 'Escape') HomePage_CloseOnGlobal_Function(event);
};

onMounted(() => {
  window.addEventListener('click', HomePage_CloseOnGlobal_Function);
  window.addEventListener('contextmenu', HomePage_CloseOnGlobal_Function);
  window.addEventListener('scroll', HomePage_CloseOnGlobal_Function, true);
  window.addEventListener('resize', HomePage_CloseOnGlobal_Function);
  window.addEventListener('blur', HomePage_CloseOnGlobal_Function);
  window.addEventListener('keydown', HomePage_CloseOnEscape_Function);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', HomePage_CloseOnGlobal_Function);
  window.removeEventListener('contextmenu', HomePage_CloseOnGlobal_Function);
  window.removeEventListener('scroll', HomePage_CloseOnGlobal_Function, true);
  window.removeEventListener('resize', HomePage_CloseOnGlobal_Function);
  window.removeEventListener('blur', HomePage_CloseOnGlobal_Function);
  window.removeEventListener('keydown', HomePage_CloseOnEscape_Function);
});

watch(
  () => props.App_StatusRefreshSeed_Number,
  () => {
    HomePage_LoadStatuses_AsyncFunction();
  }
);

watch(
  () => props.App_SearchTrigger_Number,
  () => {
    HomePage_RunSearch_AsyncFunction();
  }
);
</script>
