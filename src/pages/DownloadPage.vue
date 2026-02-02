<template>
  <section class="page download-page">
    <div class="panel">
      <div class="panel-row">
        <div class="button-group">
          <button
            class="ui-button primary"
            type="button"
            :disabled="DownloadPage_ActionLoading_Boolean"
            @click="DownloadPage_StartQueue_AsyncFunction"
          >
            开始下载队列
          </button>
          <button class="ui-button ghost" type="button" @click="DownloadPage_RemoveSelected_Function">
            移出下载队列
          </button>
          <button class="ui-button ghost" type="button" @click="DownloadPage_OpenDownloadPath_Function">
            打开下载目录
          </button>
          <button
            class="ui-button danger"
            type="button"
            :disabled="!App_DownloadRunning_Boolean"
            @click="DownloadPage_CancelAll_AsyncFunction"
          >
            终止所有下载
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
                    :checked="DownloadPage_SelectedAll_Boolean"
                    :indeterminate.prop="DownloadPage_PartialSelect_Boolean"
                    @change="DownloadPage_ToggleSelectAll_Function"
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
              v-for="app in App_DownloadQueue_Array"
              :key="app.bundleId"
              :class="{ selected: DownloadPage_SelectedIds_Array.includes(app.bundleId) }"
              @click="DownloadPage_ToggleSelect_Function(app.bundleId)"
            >
              <td>
                <div class="app-cell">
                  <input
                    type="checkbox"
                    :checked="DownloadPage_SelectedIds_Array.includes(app.bundleId)"
                    @click.stop="DownloadPage_ToggleSelect_Function(app.bundleId)"
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
              <td>{{ DownloadPage_FormatPrice_Function(app.price) }}</td>
            </tr>
            <tr v-if="App_DownloadQueue_Array.length === 0">
              <td colspan="5" class="empty">下载队列为空，请先添加应用</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="download-log-panel">
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
            @click="DownloadPage_CancelAll_AsyncFunction"
          >
            终止下载
          </button>
        </div>
      </div>
      <div ref="DownloadPage_LogBody_Ref" class="download-log-body">
        <div v-for="(line, index) in App_DownloadLogs_Array" :key="`${index}-${line}`" class="download-log-line">
          {{ line }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';

const props = defineProps({
  App_DownloadQueue_Array: {
    type: Array,
    default: () => []
  },
  App_Passphrase_String: {
    type: String,
    default: ''
  },
  App_DownloadPath_String: {
    type: String,
    default: ''
  },
  App_Notify_Function: {
    type: Function,
    required: true
  },
  App_DownloadRunning_Boolean: {
    type: Boolean,
    default: false
  },
  App_DownloadLogs_Array: {
    type: Array,
    default: () => []
  },
  App_DownloadLog_Text_String: {
    type: String,
    default: ''
  },
  App_CopyText_Function: {
    type: Function,
    required: true
  },
  App_ClearDownloadLog_Function: {
    type: Function,
    required: true
  },
  App_RemoveFromDownloadQueue_Function: {
    type: Function,
    required: true
  }
});

const DownloadPage_ActionLoading_Boolean = ref(false);
const DownloadPage_SelectedIds_Array = ref([]);
const DownloadPage_LogBody_Ref = ref(null);

const DownloadPage_FormatPrice_Function = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return value === 0 ? '免费' : value;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'free') return '免费';
  return value;
};

const DownloadPage_ToggleSelect_Function = (bundleId) => {
  if (DownloadPage_SelectedIds_Array.value.includes(bundleId)) {
    DownloadPage_SelectedIds_Array.value = DownloadPage_SelectedIds_Array.value.filter((id) => id !== bundleId);
  } else {
    DownloadPage_SelectedIds_Array.value = [...DownloadPage_SelectedIds_Array.value, bundleId];
  }
};

const DownloadPage_ToggleSelectAll_Function = () => {
  if (!props.App_DownloadQueue_Array.length) return;
  const allIds = props.App_DownloadQueue_Array.map((app) => app.bundleId);
  const allSelected = allIds.every((id) => DownloadPage_SelectedIds_Array.value.includes(id));
  DownloadPage_SelectedIds_Array.value = allSelected ? [] : allIds;
};

const DownloadPage_SelectedAll_Boolean = computed(() =>
  props.App_DownloadQueue_Array.length > 0 &&
  props.App_DownloadQueue_Array.every((app) => DownloadPage_SelectedIds_Array.value.includes(app.bundleId))
);

const DownloadPage_PartialSelect_Boolean = computed(() =>
  props.App_DownloadQueue_Array.some((app) => DownloadPage_SelectedIds_Array.value.includes(app.bundleId)) &&
  !DownloadPage_SelectedAll_Boolean.value
);

const DownloadPage_StartQueue_AsyncFunction = async () => {
  const ids = DownloadPage_SelectedIds_Array.value.length
    ? DownloadPage_SelectedIds_Array.value
    : props.App_DownloadQueue_Array.map((app) => app.bundleId);
  if (!ids.length) {
    props.App_Notify_Function('warning', '下载队列为空');
    return;
  }
  DownloadPage_ActionLoading_Boolean.value = true;
  try {
    window.dispatchEvent(new CustomEvent('download-start'));
    const payload = {
      bundleIds: [...ids],
      passphrase: props.App_Passphrase_String || ''
    };
    const res = await window.electronAPI.download(JSON.parse(JSON.stringify(payload)));
    if (res.ok) {
      props.App_Notify_Function('success', `下载完成，输出目录：${res.outputDir || ''}`);
    } else if (res.canceled) {
      props.App_Notify_Function('warning', '下载已取消');
    } else {
      props.App_Notify_Function('error', res.error || res.message || '下载失败');
    }
  } catch (error) {
    props.App_Notify_Function('error', error.message || '下载失败');
  } finally {
    DownloadPage_ActionLoading_Boolean.value = false;
    window.dispatchEvent(new CustomEvent('download-end'));
  }
};

const DownloadPage_RemoveSelected_Function = () => {
  const ids = DownloadPage_SelectedIds_Array.value;
  if (!ids.length) {
    props.App_Notify_Function('warning', '请选择要移出的应用');
    return;
  }
  const removed = props.App_RemoveFromDownloadQueue_Function(ids);
  if (removed > 0) {
    props.App_Notify_Function('success', `已移出 ${removed} 个应用`);
  } else {
    props.App_Notify_Function('info', '未移出任何应用');
  }
  DownloadPage_SelectedIds_Array.value = [];
};

const DownloadPage_OpenDownloadPath_Function = async () => {
  const path = props.App_DownloadPath_String;
  if (!path) {
    props.App_Notify_Function('warning', '下载路径为空');
    return;
  }
  const res = await window.electronAPI.openDownloadPath(path);
  if (!res?.ok && !res?.canceled) {
    props.App_Notify_Function('error', res?.error || '打开失败');
  }
};

const DownloadPage_CancelAll_AsyncFunction = async () => {
  if (!window.electronAPI?.cancelDownload) return;
  try {
    await window.electronAPI.cancelDownload();
    props.App_Notify_Function('info', '已请求终止所有下载');
  } catch (_error) {
    props.App_Notify_Function('error', '终止下载失败');
  }
};


watch(
  () => props.App_DownloadLogs_Array,
  async () => {
    await nextTick();
    const el = DownloadPage_LogBody_Ref.value;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  },
  { deep: true }
);

watch(
  () => props.App_DownloadQueue_Array,
  (list) => {
    const visibleIds = new Set(list.map((item) => item.bundleId));
    DownloadPage_SelectedIds_Array.value = DownloadPage_SelectedIds_Array.value.filter((id) => visibleIds.has(id));
  }
);
</script>
