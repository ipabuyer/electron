<template>
  <section class="page">
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
              :class="{
                selected: DownloadPage_SelectedIds_Array.includes(app.bundleId),
                'context-selected': DownloadPage_ContextMenu_Object?.app?.bundleId === app.bundleId
              }"
              @click="DownloadPage_ToggleSelect_Function(app.bundleId)"
              @contextmenu.prevent="DownloadPage_HandleContextMenu_Function($event, app)"
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

    <div
      v-if="DownloadPage_ContextMenu_Object"
      class="context-menu"
      :style="{
        left: `${DownloadPage_ContextMenu_Object.mouseX}px`,
        top: `${DownloadPage_ContextMenu_Object.mouseY}px`
      }"
      @click="DownloadPage_CloseContextMenu_Function"
    >
      <button type="button" @click.stop="DownloadPage_HandlePurchase_AsyncFunction([DownloadPage_ContextMenu_Object.app.bundleId])">
        购买此App
      </button>
      <button type="button" @click.stop="DownloadPage_HandleRemoveFromQueue_Function([DownloadPage_ContextMenu_Object.app.bundleId])">
        移出下载队列
      </button>
      <div class="context-menu-divider" role="separator" aria-hidden="true"></div>
      <button type="button" @click.stop="DownloadPage_CopyAppField_Function('name', DownloadPage_ContextMenu_Object.app)">
        复制app名称
      </button>
      <button type="button" @click.stop="DownloadPage_CopyAppField_Function('bundleId', DownloadPage_ContextMenu_Object.app)">
        复制app包名
      </button>
      <div class="context-menu-divider" role="separator" aria-hidden="true"></div>
      <button type="button" @click.stop="DownloadPage_HandleMarkStatus_AsyncFunction('unbought', [DownloadPage_ContextMenu_Object.app.bundleId])">
        标记为未购买
      </button>
      <button type="button" @click.stop="DownloadPage_HandleMarkStatus_AsyncFunction('purchased', [DownloadPage_ContextMenu_Object.app.bundleId])">
        标记为已购买
      </button>
      <button type="button" @click.stop="DownloadPage_HandleMarkStatus_AsyncFunction('owned', [DownloadPage_ContextMenu_Object.app.bundleId])">
        标记为已拥有
      </button>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  App_DownloadQueue_Array: {
    type: Array,
    default: () => []
  },
  App_Passphrase_String: {
    type: String,
    default: ''
  },
  App_AuthState_Object: {
    type: Object,
    required: true
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
const DownloadPage_ContextMenu_Object = ref(null);
const DownloadPage_LastContextOpen_Number = ref(0);

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

const DownloadPage_HandleRemoveFromQueue_Function = (bundleIds) => {
  const ids = bundleIds && bundleIds.length ? bundleIds : DownloadPage_SelectedIds_Array.value;
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
  DownloadPage_CloseContextMenu_Function();
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

const DownloadPage_StatusLabel_Function = (status) => {
  if (status === 'purchased') return '已购买';
  if (status === 'owned') return '已拥有';
  return '未购买';
};

const DownloadPage_HandleMarkStatus_AsyncFunction = async (status, targetIds) => {
  if (!window.electronAPI?.setAppStatuses) return;
  const ids = targetIds && targetIds.length ? targetIds : DownloadPage_SelectedIds_Array.value;
  if (!ids.length) {
    props.App_Notify_Function('warning', '请选择需要处理的应用');
    return;
  }
  DownloadPage_ActionLoading_Boolean.value = true;
  try {
    const rows = ids.map((bundleId) => ({
      bundleId,
      appName: props.App_DownloadQueue_Array.find((app) => app.bundleId === bundleId)?.name || '',
      email: props.App_AuthState_Object.email || '',
      status
    }));
    await window.electronAPI.setAppStatuses(rows);
    if (status === 'purchased') {
      rows.forEach((row) => {
        props.App_Notify_Function('success', `${row.appName || row.bundleId} 已购买`);
      });
    } else {
      props.App_Notify_Function('success', `已标记 ${ids.length} 个为${DownloadPage_StatusLabel_Function(status)}`);
    }
  } catch (error) {
    props.App_Notify_Function('error', error.message || '标记失败');
  } finally {
    DownloadPage_ActionLoading_Boolean.value = false;
    DownloadPage_CloseContextMenu_Function();
  }
};

const DownloadPage_HandlePurchase_AsyncFunction = async (bundleIds) => {
  const ids = bundleIds && bundleIds.length ? bundleIds : DownloadPage_SelectedIds_Array.value;
  if (!ids.length) {
    props.App_Notify_Function('warning', '请选择要购买的应用');
    return;
  }
  DownloadPage_ActionLoading_Boolean.value = true;
  try {
    const appNameMap = Object.fromEntries(props.App_DownloadQueue_Array.map((app) => [app.bundleId, app.name]));
    for (const bundleId of ids) {
      const appName = appNameMap[bundleId] || bundleId;
      props.App_Notify_Function('info', `${appName} 正在购买`);
      const payload = {
        bundleIds: [bundleId],
        passphrase: props.App_Passphrase_String || '',
        appNameMap: { [bundleId]: appName },
        email: props.App_AuthState_Object.email || ''
      };
      const res = await window.electronAPI.purchase(JSON.parse(JSON.stringify(payload)));
      if (res.ok) {
        const resultItem = res.results?.find((item) => item.bundleId === bundleId);
        if (resultItem?.ok) {
          props.App_Notify_Function('success', `${appName} 购买成功`);
        } else {
          props.App_Notify_Function('success', `${appName} 购买完成`);
        }
      } else if (Array.isArray(res.ownedApps) && res.ownedApps.length) {
        res.ownedApps.forEach((item) => {
          const name = item.appName || item.bundleId || appName;
          props.App_Notify_Function('warning', `${name} 疑似已拥有，已归类到“已拥有”`);
        });
      } else {
        const detail =
          res.error ||
          res.message ||
          res.results?.find((item) => !item.ok)?.stderr ||
          res.results?.find((item) => !item.ok)?.output ||
          '购买失败';
        props.App_Notify_Function('error', `${appName} 购买失败：${detail}`, { copyText: detail });
      }
    }
  } catch (error) {
    props.App_Notify_Function('error', error.message || '购买失败');
  } finally {
    DownloadPage_ActionLoading_Boolean.value = false;
    DownloadPage_CloseContextMenu_Function();
  }
};

const DownloadPage_CopyText_AsyncFunction = async (text) => {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch (_error) {
    return false;
  }
};

const DownloadPage_CopyAppField_Function = async (field, app) => {
  const value = app?.[field] || '';
  const ok = await DownloadPage_CopyText_AsyncFunction(value);
  if (ok && value) {
    const label = field === 'bundleId' ? '包名' : '名称';
    props.App_Notify_Function('success', `已复制app${label}`);
  } else {
    props.App_Notify_Function('error', '复制失败');
  }
  DownloadPage_CloseContextMenu_Function();
};

const DownloadPage_HandleContextMenu_Function = (event, app) => {
  event.stopPropagation();
  DownloadPage_ContextMenu_Object.value = {
    mouseX: event.clientX + 2,
    mouseY: event.clientY - 6,
    app
  };
  DownloadPage_LastContextOpen_Number.value = Date.now();
};

const DownloadPage_CloseContextMenu_Function = () => {
  DownloadPage_ContextMenu_Object.value = null;
};

const DownloadPage_CloseOnGlobal_Function = (event) => {
  if (!DownloadPage_ContextMenu_Object.value) return;
  if (event?.type === 'contextmenu') {
    if (Date.now() - DownloadPage_LastContextOpen_Number.value < 200) {
      return;
    }
  }
  DownloadPage_CloseContextMenu_Function();
};

const DownloadPage_CloseOnEscape_Function = (event) => {
  if (event.key === 'Escape') DownloadPage_CloseOnGlobal_Function(event);
};

onMounted(() => {
  window.addEventListener('click', DownloadPage_CloseOnGlobal_Function);
  window.addEventListener('contextmenu', DownloadPage_CloseOnGlobal_Function);
  window.addEventListener('scroll', DownloadPage_CloseOnGlobal_Function, true);
  window.addEventListener('resize', DownloadPage_CloseOnGlobal_Function);
  window.addEventListener('blur', DownloadPage_CloseOnGlobal_Function);
  window.addEventListener('keydown', DownloadPage_CloseOnEscape_Function);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', DownloadPage_CloseOnGlobal_Function);
  window.removeEventListener('contextmenu', DownloadPage_CloseOnGlobal_Function);
  window.removeEventListener('scroll', DownloadPage_CloseOnGlobal_Function, true);
  window.removeEventListener('resize', DownloadPage_CloseOnGlobal_Function);
  window.removeEventListener('blur', DownloadPage_CloseOnGlobal_Function);
  window.removeEventListener('keydown', DownloadPage_CloseOnEscape_Function);
});

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
