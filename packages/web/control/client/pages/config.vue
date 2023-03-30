<template>
  <div class="plugin-manage">
    配置管理
    <codemirror v-model="config"/>
    <el-button type="primary" @click="saveConfig">保存</el-button>
  </div>
</template>

<script>
import {send, store} from "@zhinjs/client";
import {ElMessage} from "element-plus";

export default {
  name: "配置管理",
  data(){
    return {
      config:JSON.stringify(store.config||{},null,2)
    }
  },
  methods:{
    async saveConfig(){
      try {
        const result=await send('config/update', JSON.parse(this.config))
        console.log(result)
      } catch (e) {
        ElMessage.error(e)
      }
    }
  },
  mounted() {
  }
}
</script>

<style scoped>

</style>