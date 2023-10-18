<script setup lang="ts">
import {Bot} from '../bot'
import MessageItem from "./messageItem.vue";
import {ref, watch} from "vue";
const props=defineProps<{
  bot:Bot
  mock_id:string
  target_id:string
  target_type:'group'|'private'
  messages:any[]
}>()
const msgBox=ref()
const message=ref('')
const sendMessage=()=>{
  props.target_type==='group'?props.bot.sendGroupMsg(props.target_id,props.mock_id,message.value):
  props.bot.sendPrivateMsg(props.mock_id,message.value)
  message.value=''
}
watch(props.messages,()=>{
  msgBox.value.scrollTop=msgBox.value.scrollHeight
})
</script>

<template>
<div class="c-chat-window">
  <div class="message-box" ref="msgBox">
    <message-item v-for="message in messages"
                  :content="message.content"
                  :user_id="message.from_id"
                  :user_name="message.user_name||''"
                  :is_self="message.user_id===mock_id"
                  :key="message.id">

    </message-item>
  </div>
  <el-input v-model="message">
    <template #append>
      <el-button @click="sendMessage" @keyup.enter="sendMessage">发送</el-button>
    </template>
  </el-input>
</div>
</template>

<style scoped lang="scss">
.c-chat-window{
  padding: 8px;
  height: 600px;
  width: 300px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color);
  .message-box{
    flex: auto;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
}
</style>
