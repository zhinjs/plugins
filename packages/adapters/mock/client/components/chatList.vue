<script setup lang="ts">
import {Bot} from "../bot";
import ChatItem from "./chatItem.vue";
import {computed} from "vue";

const props = defineProps<{
  bot: Bot
  mock_id: string
}>()
const emits = defineEmits<{
  (e: 'pick', target_id: string,target_type: 'group'|'private'): void
}>()
const friendList=computed(()=>{
  return props.bot.friendList
})
const groupList=computed(()=>{
  return props.bot.groupList
})
</script>

<template>
  <div class="c-chat-list">
    <chat-item v-for="group in groupList"
               :key="group.group_id"
               :bot="props.bot"
               :mock_id="mock_id"
               :target_id="group.group_id"
               :target_name="group.group_name"
               @click="emits('pick',group.group_id,'group')"
               target_type="group"
    />
    <chat-item v-for="friend in friendList"
               :key="friend.user_id"
               :bot="props.bot"
               :mock_id="mock_id"
               :target_id="friend.user_id"
               :target_name="friend.user_name"
               @click="emits('pick',friend.user_id,'private')"
               target_type="friend"
    />
  </div>
</template>

<style scoped lang="scss">
.c-chat-list{
  display: flex;
  flex-direction: column;
  width: 200px;
  max-width: 200px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  flex: 1;
}
</style>
