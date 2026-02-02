<template>
  <aside class="sidebar" :class="{ 'sidebar-collapsed': collapsed }">
    <nav class="sidebar-nav">
      <button
        v-for="item in sidebarItems"
        :key="item.key"
        type="button"
        class="sidebar-item"
        :class="{ active: activePage === item.key }"
        :title="collapsed ? item.label : ''"
        @click="$emit('change-page', item.key)"
      >
        <span class="sidebar-icon" aria-hidden="true" v-html="item.icon"></span>
        <span v-if="!collapsed" class="sidebar-label">{{ item.label }}</span>
      </button>
    </nav>
  </aside>
</template>

<script setup>
const props = defineProps({
  activePage: {
    type: String,
    default: 'home'
  },
  collapsed: {
    type: Boolean,
    default: false
  }
});

const sidebarItems = [
  {
    key: 'home',
    label: '主页',
    icon:
      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z"/></svg>'
  },
  {
    key: 'download',
    label: '下载',
    icon:
      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v9.17l2.59-2.58a1 1 0 1 1 1.41 1.42l-4.3 4.29a1 1 0 0 1-1.4 0l-4.3-4.29a1 1 0 1 1 1.41-1.42L11 13.17V4a1 1 0 0 1 1-1zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z"/></svg>'
  },
  {
    key: 'account',
    label: '账户',
    icon:
      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4.42 0-8 2.24-8 5v2h16v-2c0-2.76-3.58-5-8-5z"/></svg>'
  },
  {
    key: 'setting',
    label: '设置',
    icon:
      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94a7.5 7.5 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.48 7.48 0 0 0-1.63-.95l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.48 7.48 0 0 0-1.63.95l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.5 7.5 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96a7.48 7.48 0 0 0 1.63.95l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7.48 7.48 0 0 0 1.63-.95l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15.5a3.5 3.5 0 1 1 3.5-3.5 3.5 3.5 0 0 1-3.5 3.5z"/></svg>'
  }
];
</script>
