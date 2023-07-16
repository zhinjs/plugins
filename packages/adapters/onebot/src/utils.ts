import {Types} from "./types";
import {Element} from "zhin";

export function toString(message: Types.Message): string {
    return [].concat(message).filter(Boolean).map(msg => {
        if (typeof msg === 'string') return msg
        if (msg.type === 'text') return (msg as Types.TextSegment).data.text || ''
        const {type, data = {}} = msg
        return `<${type} ${Object.entries(data).map(([key, value]) => `${key}="${String(value)}"`).join(' ')}/>`
    }).join('')
}

export function toElement<S>(message: Types.Message, ctx?: S): Element[] {
    return [].concat(message).filter(Boolean).reduce((result: Element[], msg: Types.Segment | string) => {
        if (typeof msg === 'string') msg = {type: 'text', data: {text: msg}}
        if (msg.type === 'text') result.push(...Element.parse((msg as Types.TextSegment).data.text || '', ctx))
        else if (['video', 'voice', 'audio', 'image'].includes(msg.type)) {
            result.push(Element(msg.type, {src: (msg as Types.ImageSegment).data.file_id, ...msg.data}))
        } else if (msg.type === 'mention_all') {
            result.push(Element('mention'))
        } else result.push(Element(msg.type, msg.data || {}))
        return result
    }, [])
}

export function fromFragment(fragment: Element.Fragment): Types.Message {
    if (typeof fragment !== 'object') return Element.unescape(String(fragment))
    return [].concat(fragment).filter(Boolean).map((ele: Element | string) => {
        if (typeof ele === 'string') return Element.unescape(ele)
        if (['video', 'voice', 'audio', 'image'].includes(ele.type)) {
            return {
                type: ele.type,
                data: {file_id: ele.attrs?.src || ele.children.join(''), ...ele.attrs}
            } as unknown as Types.Segment
        } else if (ele.type === 'mention' && !ele.attrs.user_id) {
            return {type: 'mention_all', data: ele.attrs} as unknown as Types.Segment
        }else if(ele.type==='node'){
            return {
                type:'node',
                data:{
                    user_id:ele.attrs.user_id,
                    nickname:ele.attrs.nickname,
                    time:ele.attrs.time,
                    message:fromFragment(ele.children)
                }
            }
        }
        return {
            type: ele.type, data: Object.fromEntries(Object.entries(ele.attrs || {}).map(([key, v]) => {
                return [key, typeof v === 'string' ? Element.unescape(v) : v]
            }))
        } as unknown as Types.Segment
    }) as Types.Message
}
