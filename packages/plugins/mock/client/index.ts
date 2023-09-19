import {defineExtension, ZhinWeb} from "@zhinjs/client";
export default defineExtension((web:ZhinWeb)=>{
  console.log(1111111)
  web.addPage({
    path:'/sandbox',
    name:'沙盒',
    icon:'sandbox',
    position:'left',
    component:()=>import('./pages/sandbox.vue')
  })
})
