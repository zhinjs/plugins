import {Context,h} from "zhin";
import {MusicPlatform} from 'oicq'
import {default as axios} from 'axios'
import * as qs from 'querystring'
import * as lodash from 'lodash'

const m_ERR_CODE = Object.freeze({
    ERR_SRC: "1",
    ERR_404: "2",
    ERR_API: "3",
});

const m_ERR_MSG = Object.freeze({
    [m_ERR_CODE.ERR_SRC]: "错误的音乐源",
    [m_ERR_CODE.ERR_404]: "没有查询到对应歌曲",
    [m_ERR_CODE.ERR_API]: "歌曲查询出错",
});

async function musicQQ(keyword) {
    const url = "https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg";

    const {
        data
    } = await axios.get(url, {
        params:{
            key: keyword,
            format:'json'
        }
    });
    if(!data || data.code || data.data.song.count === 0) return m_ERR_CODE.ERR_API
    return data.data.song.itemlist.map((song) => ({
        type: 'qq',
        id: song.id,
    }))[0]
}

async function music163(keyword) {
    const url = "https://music.163.com/api/search/get/";
    const form = {
        s: keyword,
        // 1:单曲、 10:专辑、 100:歌手、 1000:歌单、 1002:用户、 1004:MV、 1006:歌词、 1009:电台、 1014:视频
        type: 1,
        limit: 1,
        offset: 0,
    };
    const body = qs.stringify(form);
    const headers = {
        "Content-Length": String(body.length),
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: "https://music.163.com",
        Cookie: "appver=2.0.2",
    };
    let jbody;
    try {
        jbody = await axios.post(url, body, {headers});
        jbody=jbody.data
    } catch (e) {
        return m_ERR_CODE.ERR_API;
    }

    if (!jbody) {
        return m_ERR_CODE.ERR_API;
    }

    if (lodash.hasIn(jbody, "result.songs[0].id")) {
        return {type: "163" as MusicPlatform, id: jbody.result.songs[0].id};
    }

    return m_ERR_CODE.ERR_404;
}

type MusicInfo = {
    type: MusicPlatform,
    id: string
}
export const name='music'
export function install(bot: Context) {
    bot
        .command('common/music [keyword:string]')
        .desc('点歌')
        .alias('点歌')
        .sugar(/^(QQ|qq|扣扣)点歌(.+)$/,{args:['$2'],options:{platform:'qq'}})
        .sugar(/^来一首(\S+)$/, {args: ['$1']})
        .option('-p <platform:string> 音乐平台', "163")
        .action(async ({session, options}, keyword) => {
            if (!keyword) {
                return '请正确输入搜索词'
            }
            let musicInfo: string | MusicInfo
            switch (options.platform) {
                case '163':
                    musicInfo = await music163(keyword)
                    break;
                case 'qq':
                    musicInfo = await musicQQ(keyword)
                    break;
                default:
                    musicInfo = m_ERR_CODE.ERR_SRC
                    break;
            }
            if (typeof musicInfo === 'string') {
                return m_ERR_MSG[musicInfo]
            }
            return h('music',{type:musicInfo.type,id:musicInfo.id})
        })
}
