export namespace Types {
    type SegmentMap={
        text:{
            text:string
        }
        mention:{
            user_id:string
        }
        mention_all:never
        image:{
            file_id:string
        }
        voice:{
            file_id:string
        }
        audio:{
            file_id:string
        }
        video:{
            file_id:string
        }
        file:{
            file_id:string
        }
        location:{
            latitude:number
            longitude:number
            title:string
            content:string
        }
        reply:{
            message_id:string
            user_id?:string
        }
    }

    export interface Segment<T extends keyof SegmentMap=keyof SegmentMap>{
        type:T,
        data:SegmentMap[T]
    }
    export type TextSegment=Segment<'text'>
    export type MentionSegment=Segment<'mention'>
    export type MentionAllSegment=Segment<'mention_all'>
    export type ImageSegment=Segment<'image'>
    export type AudioSegment=Segment<'audio'>
    export type VideoSegment=Segment<'video'>
    export type VoiceSegment=Segment<'voice'>
    export type LocationSegment=Segment<'location'>
    export type ReplySegment=Segment<'reply'>
    export type SingleMessage=AudioSegment|VideoSegment|VoiceSegment|LocationSegment|MentionAllSegment
    export type CanComposeMessage=string|MentionSegment|TextSegment|ImageSegment
    export type ReplyMessage=[ReplySegment,...CanComposeMessage[]]
    export type Message=SingleMessage|[SingleMessage]|ReplyMessage|CanComposeMessage|CanComposeMessage[]
    export interface GroupInfo {
        group_id: string
        group_name: string
    }

    export interface UserInfo {
        user_id: string
        user_name: string
    }

    export interface DiscussInfo {
        discuss_id: string
        discuss_name: string
    }

    export interface GuildInfo {
        guild_id: string
        guild_name: string
    }

    export interface ChannelInfo {
        channel_id: string
        channel_name: string
    }

    export interface MessageRet {
        message_id: string
        time: number
    }
    export interface MessageBase extends MessageRet{
        alt_message:string
        message:Message
    }
    type EventPayloadBase<T extends string, D extends string,S extends string=string> = {
        type: T,
        detail_type: D
        sub_type?:S
    }

    export interface PrivateMessageEvent extends EventPayloadBase<'message', 'private'>,
        Omit<MessageBase, 'time'>,
        Pick<UserInfo, 'user_id'> {
    }
    export interface GroupMessageEvent extends EventPayloadBase<'message', 'group'>,
        Omit<MessageBase, 'time'>,
        Pick<GroupInfo, 'group_id'>,
        Pick<UserInfo, 'user_id'> {
    }
    export interface DiscussMessageEvent extends EventPayloadBase<'message', 'discuss'>,
        Omit<MessageBase, 'time'>,
        Pick<DiscussInfo, 'discuss_id'>,
        Pick<UserInfo, 'user_id'> {
    }
    export interface GuildMessageEvent extends EventPayloadBase<'message', 'guild'>,
        Omit<MessageBase, 'time'>,
        Pick<GuildInfo, 'guild_id'>,
        Pick<UserInfo, 'user_id'> {
    }

    export type CanSendMessage = (Pick<UserInfo, 'user_id'> |
        Pick<GroupInfo, 'group_id'> |
        Pick<DiscussInfo, 'discuss_id'> |
        (Pick<GuildInfo, 'guild_id'> & Pick<ChannelInfo, 'channel_id'>)) & { message: Message }

    export interface ActionMap {
        send_message(params: CanSendMessage): MessageRet
        get_msg(params:{message_id:string}):MessageBase
        delete_message(params: Pick<MessageRet, 'message_id'>): void

        get_friend_list(): UserInfo[]

        get_friend_info(params: Pick<UserInfo, 'user_id'>): UserInfo

        get_group_list(): GroupInfo[]

        get_group_info(params: Pick<GroupInfo, 'group_id'>): GroupInfo

        get_group_member_list(params: Pick<GroupInfo, 'group_id'>): UserInfo[]

        get_group_member_info(params: Pick<GroupInfo, 'group_id'> & { member_id: string }): UserInfo

        get_discuss_list(): DiscussInfo[]

        get_discuss_info(params: Pick<DiscussInfo, 'discuss_id'>): DiscussInfo

        get_guild_list(): GuildInfo[]

        get_guild_info(params: Pick<GuildInfo, 'guild_id'>): GuildInfo

        get_channel_list(params: Pick<GuildInfo, 'guild_id'>): ChannelInfo[]

        get_channel_info(params: Pick<GuildInfo, 'guild_id'> & Pick<ChannelInfo, 'channel_id'>): ChannelInfo[]
    }
}

export interface OneBotPayload<T extends keyof Types.ActionMap = keyof Types.ActionMap> {
    action: `${T}_async`|T
    params?: Parameters<Types.ActionMap[T]>[0]
    echo?: string | number
}

export type OneBotEventMap = {
    'message.private'(e:Types.PrivateMessageEvent):void
    'message.group'(e:Types.GroupMessageEvent):void
    'message.discuss'(e:Types.DiscussMessageEvent):void
    'message.guild'(e:Types.GuildMessageEvent):void
    'echo'(e:any):void
}
