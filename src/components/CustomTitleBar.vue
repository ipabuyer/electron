<template>
  <div class="titlebar">
    <title-bar windowtitle=""></title-bar>
    <div class="titlebar-overlay">
      <div class="titlebar-left">
        <button class="ui-icon-button no-drag" type="button" @click="$emit('toggle-sidebar')">
          <svg v-if="isSidebarCollapsed" viewBox="0 0 24 24" class="icon" aria-hidden="true">
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
        <img :src="AppIcon" alt="IPAbuyer" class="titlebar-logo" />
        <span class="titlebar-title">{{ title }}</span>
      </div>
      <div class="titlebar-center">
        <slot name="center"></slot>
      </div>
      <div class="titlebar-right"></div>
    </div>
  </div>
</template>

<script setup>
import AppIcon from '../../assets/Square44x44Logo.scale-200.png';

defineProps({
  title: {
    type: String,
    default: ''
  },
  isSidebarCollapsed: {
    type: Boolean,
    default: false
  }
});

defineEmits(['toggle-sidebar']);
</script>
