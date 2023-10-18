<template>
  <div class="p-mock-page">
    <el-select v-model="currentBot" placeholder="选择机器人" @change="initBot">
      <el-option v-for="bot in bots" :key="bot.self_id" :label="bot.self_id" :value="bot.self_id"/>
    </el-select>
    <el-tabs v-if="bot" v-model="mock_user" >
      <el-tab-pane v-for="mock in mockList" :name="mock.user_id" :key="mock.user_id" :label="mock.user_name">
        <div class="chat-area-wrap">
          <chat-list :bot="bot" :mock_id="mock.user_id" @pick="handlePickTarget"></chat-list>
          <chat-window v-if="target_id" :mock_id="mock.user_id" :messages="messages" :bot="bot" :target_id="target_id" :target_type="target_type"/>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted} from "vue";
import {send} from "@zhinjs/client";
import {ref} from "vue";
import {Bot} from "../bot";
import ChatWindow from "../components/chatWindow.vue";
import ChatList from "../components/chatList.vue";
import {receive} from "@zhinjs/client";
import chatList from '../components/chatList.vue'
const currentBot=ref('');
const mock_user=ref('')
const target_id=ref('')
const target_type=ref<'group'|'private'>()
const messages= ref([])
const bots=ref([]);
const connectMap=ref(new Map());
const bot=computed(()=>{
  return connectMap.value.get(currentBot.value)
})
receive('mock/message_receive',(event)=>{
  switch (target_type.value){
    case "group":
      if(event.group_id===target_id.value && event.detail_type==='group'){
        messages.value.push(event);
      }
      break;
    case "private":
      if((event.user_id===target_id.value||event.self_id===target_id.value) && event.detail_type==='private'){
        messages.value.push(event)
      }
  }
})
const mockList=computed(()=>{
  const bot=connectMap.value.get(currentBot.value)
  if(!bot) return []
  return bot.mockList
})
const friendList=computed(()=>{
  const bot=connectMap.value.get(currentBot.value)
  if(!bot) return []
  return bot.friendList
})
const groupList=computed(()=>{
  const bot=connectMap.value.get(currentBot.value)
  if(!bot) return []
  return bot.groupList
})
const groupMemberList=computed(()=>{
  const bot=connectMap.value.get(currentBot.value)
  if(!bot) return []
  return bot.groupMemberList
})
const initBot=async (self_id)=>{
  if(connectMap.value.has(self_id)) return
  const bot=new Bot(self_id)
  await bot.init()
  connectMap.value.set(self_id,bot)
}
const handlePickTarget=(ti,tt)=>{
  messages.value=[]
  target_id.value=ti
  target_type.value=tt
}
onMounted(async ()=>{
  bots.value=await send('mock/bots')
})
</script>

<style scoped lang="scss">
.p-mock-page{
  .chat-area-wrap{
    display: flex;
    justify-content: flex-start;
    gap: 20px;
  }
}
</style>
