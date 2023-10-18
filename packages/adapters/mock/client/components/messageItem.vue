<script setup lang="ts">
import {computed} from "vue";

const props=defineProps<{
  user_id:string
  user_name:string
  content:string
  is_self?:boolean
}>()
const parsed_content=computed(()=>{
  return decodeURIComponent(props.content)
})
</script>

<template>
<div class="c-message-item" :class="is_self && 'reverse'">
  <el-avatar>{{user_name.slice(0,1)}}</el-avatar>
  <div class="message" v-html="parsed_content">

  </div>
</div>
</template>

<style scoped lang="scss">
.c-message-item{
  display: flex;
  align-items: center;
  gap:4px;
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
    display: inline-flex;
    border: 1px solid var(--el-border-color);
    word-break: break-all;
    flex-wrap: wrap;
    max-width: calc(100% - 44px);
    padding: 0 4px;
    border-radius: 4px 4px 4px 0;
    white-space: pre;
  }
}
</style>
