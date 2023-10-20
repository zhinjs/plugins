<script setup lang="ts">

const props=defineProps<{
  user_id?:string
  user_name?:string
  content:string
  is_self?:boolean
}>()
</script>

<template>
<div class="c-message-item" :class="is_self && 'reverse'">
  <el-avatar>{{user_name.slice(0,1)}}</el-avatar>
  <div class="message">
    <div class="user_name">{{user_name}}</div>
    <div class="content" v-html="props.content">

    </div>
  </div>
</div>
</template>

<style scoped lang="scss">
.c-message-item{
  display: flex;
  align-items: flex-start;
  gap:8px;
  justify-content: flex-start;
  &.reverse{
    flex-direction: row-reverse;
    .message{
      border-radius: 4px 4px 0 4px;
    }
  }
  .el-avatar{
    width: 40px;
    max-width: 40px;
    min-width: 40px;
  }
  .message{
    display: flex;
    flex-direction: column;
    gap:4px;
    .user_name{
      font-size: 14px;
      font-weight: 400;
    }
    .content{
      border: 1px solid var(--el-border-color);
      border-radius: 4px 4px 4px 0;
      font-size: 13px;
      padding: 4px 6px;
      word-break: break-all;
      white-space: pre-wrap;
    }
  }
}
</style>
