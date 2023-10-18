<script setup lang="ts">
import {Bot} from "../bot";

const props=defineProps<{
  bot:Bot
  mock_id:string
  target_id:string
  target_name:string
  target_type:'group'|'friend'
}>()
</script>

<template>
<div class="c-chat-item">
  <el-avatar size="small">{{target_name.slice(0,1)}}</el-avatar>
  <p class="user_name">{{target_name}}</p>
</div>
</template>

<style scoped lang="scss">
.c-chat-item{
  display: flex;
  align-items: center;
  gap:8px;
  border-bottom: 1px solid var(--el-border-color);
  padding: 0 8px;
  .user_name{
    font-size: 12px;
    font-weight: 400;
  }
  &:last-child{
    border-bottom: none;
  }
}
</style>
