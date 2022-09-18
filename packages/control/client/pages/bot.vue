<template>
  <div class="p-bot-manage">
    <el-button-group size="small">
      <el-button :disabled="isOnline" type="success" @click="login({},bot.uin,'password')">上线</el-button>
      <el-button :disabled="isOffline" type="warning" @click="logout">下线</el-button>
      <el-button :disabled="isEdit" type="info" @click="edit">编辑</el-button>
      <el-button :disabled="!isEdit" type="primary" @click="save">保存</el-button>
    </el-button-group>
    <el-form class="bot-form" :model="bot">
      <el-form-item prop="uin">
        <el-input v-model.number="bot.uin" :readonly="!isEdit"></el-input>
      </el-form-item>
      <el-form-item prop="nickname" label="昵称">
        <span>{{ bot.nickname }}</span>
      </el-form-item>
      <el-form-item prop="config.password" label="密码">
        <el-input show-password type="password" v-model="bot.config.password"></el-input>
      </el-form-item>
      <el-form-item prop="status" label="在线状态">
        <el-radio-group :model-value="bot.status">
          <el-radio :label="11">在线</el-radio>
          <el-radio :label="31">离开</el-radio>
          <el-radio :label="41">隐身</el-radio>
          <el-radio :label="50">忙碌</el-radio>
          <el-radio :label="60">Q我吧</el-radio>
          <el-radio :label="70">勿扰</el-radio>
          <el-radio :label="0">离线</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item prop="master" label="主人账号">
        <el-input v-model="bot.config.master"></el-input>
      </el-form-item>
      <el-form-item prop="admins" label="管理员" class="admins-wrap">
        <div class="admin-tag-wrap">
          <el-tag v-for="(admin,idx) in bot.config.admins" :key="admin" type="success" closable
                  @close="removeAdmin(idx,bot.config.admins)">
            {{ admin }}
          </el-tag>
        </div>
        <el-input v-model.number="newAdmin">
          <template #suffix>
            <el-icon class="el-input__icon" @click="addAdmin(bot.config.admins)">
              <plus/>
            </el-icon>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item prop="config" label="icqq配置">
        <el-form :model="bot.config" class="sub-form">
          <el-form-item v-for="([key,value],idx) in Object.entries(bot.config)"
                        :key="key+idx"
                        :prop="key" :label="key"
          >
            <el-input v-if="typeof value==='string'" v-model="bot.config[key]"/>
            <el-checkbox v-else-if="typeof value==='boolean'" v-model="bot.config[key]"/>
            <el-input-number v-else-if="typeof value==='number'" v-model="bot.config[key]"/>
            <el-select allow-create filterable v-else-if="Array.isArray(value)" multiple v-model="bot.config[key]"/>
            <el-button type="danger" size="small" style="display:inline-block;margin-left: 8px" icon="close" circle
                       @click="delete bot.config[key]"/>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="createOicqConfig">新增一行配置</el-button>
          </el-form-item>
        </el-form>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import {send,message, store,pick} from "@zhinjs/client";

export default {
  name: "Bot",
  data(){
    return {
      bot:store.bot,
      isEdit:false,
      visibleDrawer:false,
      newAdmin:null
    }
  },
  computed:{
    isOnline(){
      return store.bot.status===11
    },
    isOffline(){
      return store.bot.status!==11
    }
  },
  methods:{
    pick,
    createOicqConfig() {
      this.visibleDrawer = true
    },
    async login(context,uin,type,value){
      if(type==='password' && !value){
        const {value:password}=await this.$messageBox.prompt('请输入密码(留空则扫码登录)',{inputType:'password'})
        context=await send('control/bot-login',uin,type,password)
      }else if(type==='qrcode'){
        context=await send('control/bot-login',uin,'password')
      }else{
        context=await send('control/bot-login',uin,type,value)
      }
      if(!context.success){
        switch (context.reason){
          case 'device':{
            const {value:sms}=await this.$messageBox.prompt(context.message,'设备锁验证')
            return this.login(context,uin,'sms',sms)
          }
          case 'slider':{
            const {value:ticket}=await this.$messageBox.prompt(context.data,context.message)
            return this.login(context,uin,'slider',ticket)
          }
          case 'qrcode':{
            await this.$messageBox.confirm(`<img src="${context.data}"/>`,'请扫码后继续',
                {
                  dangerouslyUseHTMLString: true,
                  center:true
                })
            return this.login({},uin,'qrcode')
          }
          default: {
            this.$message.error(context.reason)
          }
        }
      }else{
        this.$message.success(context.message)
      }
    },
    logout(){

    },
    addAdmin(admins) {
      if (!Boolean(this.newAdmin)) return message.error('请输入管理员账号')
      admins.push(Number(this.newAdmin))
      this.newAdmin=''
    },
    removeAdmin(index, admins) {
      admins.splice(index, 1)
    },
    edit(){
      if(this.isOnline) return message.error('请先下线后再继续')
    },
    save(){

    }
  },
  mounted() {
    console.log(store)
  }
}
</script>

<style lang="scss" scoped>
  .p-bot-manage{
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    .bot-form{
      margin-top: 32px;
      .admins-wrap{
        .admin-tag-wrap{
          margin-bottom: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
      }
    }
  }
</style>