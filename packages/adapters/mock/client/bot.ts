import {send} from "@zhinjs/client";
import {reactive, ref} from "vue";
type FriendInfo={
    user_id:string
    user_name:string
}
type GroupInfo={
    group_id:string
    group_name:string
}
type GroupMember={
    group_id:string
    user_id:string
    title:string
}
export class Bot{
    friendList=ref<FriendInfo[]>([])
    groupList=ref<GroupInfo[]>([])
    mockList=ref<FriendInfo[]>([])
    groupMemberList=reactive<Record<string, GroupMember[]>>({})
    constructor(public self_id:string) {
        this.init()
    }
    sendGroupMsg(group_id:string,user_id:string,message:string){
        return send('mock/send_group_msg',this.self_id,group_id,user_id,message)
    }
    sendPrivateMsg(user_id:string,message:string){
        return send('mock/send_private_msg',this.self_id,user_id,message)
    }
    getGroupList(){
        return send('mock/get_group_list',this.self_id)
    }
    getGroupInfo(group_id:string){
        return send('mock/get_group_info',this.self_id,group_id)
    }
    getFriendList(){
        return send('mock/get_friend_list',this.self_id)
    }
    getFriendInfo(user_id:string){
        return send('mock/get_friend_info',this.self_id,user_id)
    }
    getMockList(){
        return send('mock/get_mock_list',this.self_id)
    }
    getGroupMemberList(group_id:string){
        return send('mock/get_group_member_list',this.self_id,group_id)
    }
    getGroupMemberInfo(group_id:string,user_id:string){
        return send('mock/get_group_member_info',this.self_id,group_id,user_id)
    }
    async init(){
        this.mockList=await this.getMockList()
        this.friendList.value=await this.getFriendList()
        this.groupList.value=await this.getGroupList()
        for(const group of this.groupList.value){
            this.groupMemberList[group.group_id]=await this.getGroupMemberList(group.group_id)
        }
    }
}
