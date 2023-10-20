<script setup lang="ts">
import {Bot} from '../bot'
import MessageItem from "./messageItem.vue";
import {ref, watch, nextTick, reactive} from "vue";
const props=defineProps<{
  bot:Bot
  mock_id:string
  mock_name?:string
  target_id:string
  target_type:'group'|'private'
  messages:any[]
}>()
const msgBox=ref<HTMLDivElement>()
const sendForm=reactive({
  message:''
})
const sendMessage=()=>{
  props.target_type==='group'?props.bot.sendGroupMsg(props.target_id,props.mock_id,sendForm.message):
  props.bot.sendPrivateMsg(props.mock_id,sendForm.message)
  sendForm.message=''
}
watch(props.messages,()=>{
  nextTick(()=>{
    msgBox.value.scrollTo({
      top:msgBox.value.scrollHeight,
      behavior:'smooth'
    })
  })
})
</script>

<template>
<div class="c-chat-window">
  <div class="top-bar">
    <el-button plain circle icon="back"/>
    <div class="chat-info">
      {{target_id}}
    </div>
  </div>
  <div class="message-box" ref="msgBox">
    <message-item v-for="message in messages"
                  :content="message.content"
                  :user_id="message.from_id"
                  :user_name="message.user_name||''"
                  :is_self="message.user_id===mock_id"
                  :key="message.id">

    </message-item>
  </div>
  <el-form :model="sendForm" @submit.prevent="sendMessage">
    <el-form-item>
      <el-input v-model="sendForm.message">
        <template #append>
          <el-button @click="sendMessage">发送</el-button>
        </template>
      </el-input>
    </el-form-item>
  </el-form>
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
  gap:8px;
  .top-bar{
    display: flex;
    gap: 20px;
    align-items: center;
    .chat-info{
      font-weight: 600;
    }
  }
  .message-box{
    flex: auto;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
}
</style>
