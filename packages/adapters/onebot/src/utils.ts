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
export async function fromElement(elementList: Element[]): Promise<Types.Segment[]> {
    const result=await  Element.transform<Types.Segment>(elementList, {
        text({text}, children): Types.TextSegment {
            if (text) return {type: 'text', data: {text}}
            return {type: 'text', data: {text: text || children?.join('') || children}}
        },
        image({src, file_id, url}, children): Types.ImageSegment {
            return {
                type: 'image',
                data: {
                    file_id: file_id || src || url || children?.join('') || children,
                }
            }
        },
        flash({src, file_id, url}, children): Types.FlashSegment {
            return {
                type: 'flash',
                data: {
                    file_id: file_id || src || url || children?.join('') || children,
                }
            }
        },
        mention({qq, user_id}, children): Types.MentionSegment {
            return {
                type: 'mention',
                data: {
                    user_id: user_id || qq || children?.join('') || children,
                }
            }
        },
        mention_all(): Types.MentionAllSegment {
            return {
                type: 'mention_all',
                data: {} as never
            }
        },
        audio({src, file_id, url}, children): Types.AudioSegment {
            return {
                type: 'audio',
                data: {
                    file_id: file_id || src || url || children?.join('') || children,
                }
            }
        },
        video({src, file_id, url}, children): Types.VideoSegment {
            return {
                type: 'video',
                data: {
                    file_id: file_id || src || url || children?.join('') || children,
                }
            }
        },
        music({id,platform}, children): Types.MusicSegment {
            return {
                type: 'music',
                data: {
                    id: id || children?.join('') || children,
                    platform:platform||'163'
                }
            }
        },
        reply({message_id, user_id,id}, children): Types.ReplySegment {
            return {
                type: 'reply',
                data: {
                    message_id: id || message_id || children?.join('') || children,
                    user_id:user_id
                }
            }
        },
        xml({data,id}, children): Types.XmlSegment {
            return {
                type: 'xml',
                data: {
                    data: data || children?.join('') || children,
                    id
                }
            }
        },
        json({data}, children): Types.JsonSegment {
            return {
                type: 'json',
                data: {
                    data: data || children?.join('') || children,
                }
            }
        },
        location({lat,lon,latitude,longitude, title, content}, children): Types.LocationSegment {
            return {
                type: 'location',
                data: {
                    latitude: lat||latitude,
                    longitude: lon||longitude,
                    title: title,
                    content: content || children?.join('') || children,
                }
            }
        },
        face({id,text}): Types.FaceSegment {
            return {
                type: 'face',
                data: {
                    id,
                    text
                }
            }
        },
        dice({id}): Types.DiceSegment {
            return {
                type: 'dice',
                data: {
                    id,
                }
            }
        },
        rps({id}): Types.RpsSegment {
            return {
                type: 'rps',
                data: {
                    id,
                }
            }
        },
        poke({id}): Types.PokeSegment {
            return {
                type: 'poke',
                data: {
                    id,
                }
            }
        },
        node({qq,user_id,user_name,nickname,time,message},children):Types.NodeSegment{
            return {
                type: 'node',
                data: {
                    user_id:user_id||qq,
                    user_name:user_name||nickname,
                    time,
                    message:message||children,
                }
            }
        }
    })
    return result.map(ele=>{
        if(typeof ele==="string") return {
            type:'text',
            data:{
                text:ele
            }
        }
        return ele
    })
}
