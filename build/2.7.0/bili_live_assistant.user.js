// ==UserScript==
// @name         B站直播小工具
// @namespace    https://github.com/isma123HH/bilibili_live-assistant
// @version      2.7.0
// @description  一个直播小工具，功能包括但不限于获取直播流、获取直播封面
// @tips         v2.7.0:现已支持B站直播间wss连接，以及支持了Acfun的直播流获取
// @author       isma
// @license      MIT
// @match        https://live.bilibili.com/*
// @match        https://live.acfun.cn/live/*
// @match        https://live.douyin.com/*
// @icon         https://i1.hdslb.com/bfs/live/83f48bf72165be6ed8d59ac249aec58e48360575.png
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        unsafeWindow
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// @require      https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/xgplayer@2.31.2/browser/index.js
// @require      https://cdn.jsdelivr.net/npm/xgplayer-hls.js@2.2.2/browser/index.js
// @require      https://cdn.jsdelivr.net/npm/xgplayer-flv.js@2.1.2/browser/index.js
// @require      https://cdn.bootcss.com/pako/1.0.6/pako.min.js
// ==/UserScript==

(function () {
    'use strict';
    // 函数
    function send_toast(icon, title, text, time, pos) { // 将提示封装成函数以便调用
        const Toast = Swal.mixin({
            toast: true,
            position: pos,
            showConfirmButton: false,
            timer: time,
            text: text,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            },
        });
        Toast.fire({
            icon: icon,
            title: title,
        })
    }
    function copy_this(copy_content) { // 利于复制内容
        const __copy__input = document.createElement('input');
        document.body.appendChild(__copy__input);
        __copy__input.setAttribute('value', copy_content);
        __copy__input.select();
        document.execCommand('copy')
        document.body.removeChild(__copy__input);
    }
    function timestamptotime(timestamp){ // 时间戳解析
        return new Date(parseInt(timestamp) * 1000).toLocaleString().replace(/年|月/g, "-").replace(/日/g, " ");
    }
    function time_stamp_ten(tm){ // 转换为10位时间戳，做这个函数才不是因为只写了解析10位时间戳呢！
        var tma = tm.toString()
        var tmp = tma.substr(0,10)
        return tmp
    }
    // 开始检测直播网站
    if(window.location.host == 'live.acfun.cn'){
        acfun_run()
    }
    if(window.location.host == 'live.bilibili.com'){
        bilibili_run()
    }
    if(window.location.host == 'live.douyin.com'){
        douyin_run()
    }
    function douyin_run(){
        init_douyin()
        const ids = {
            LIVE__GET_STREAM_LINK_FLV: '#get_stream_link_flv',
            LIVE__GET_STREAM_LINK_MU: '#get_stream_link_mu'
        }
        function mmsn_log(description,msg){
            console.log(`${NAMESPACE}: ${description}`, msg)
        }
        var dy_room_id = null // 储存一下抖音直播间id，方便以后使用
        var NAMESPACE = 'douyin-live_tools'
        function init_douyin(){
            dy_room_id = window.location.pathname.replace('/', '') // 获取网址，例如 https://live.douyin.com/801196266504 = /801196266504
            send_toast('success', 'html注入成功！享用脚本', '', 3000, 'top') 
        }
        const wrapperObserver = new MutationObserver((mutationsList) => { // 监听变动
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {// 子元素变动，也有characterData(节点内容或节点文本)，attributes(属性变动)，subtree(所有下属节点的变动)
                    [...mutation.addedNodes].map(item => {// 在新增的节点 返回数组(map)，并且带上item
                        // mmsn_log('非目标变更', item);
                        if(typeof item.innerHTML == 'string'){
                            if(item.parentNode.type == 'button')
                            {
                                if(item.children[0].innerHTML == '举报直播间'){
                                    attack_sgd(item)
                                }
                            }
                        }
                    })
                }
            }
        });
        wrapperObserver.observe(document.body, { attributes: true, childList: true, subtree: true }); // 设置监听参数
        function attack_sgd(item){
            // flv
            var nodef = document.createElement('li')
            nodef.id = 'get_stream_link_flv'
            nodef.classList.add(item.firstChild.className)
            nodef.appendChild(document.createTextNode('获取flv直播流'))
            // m3u8
            var nodem = document.createElement('li')
            nodem.id = 'get_stream_link_mu'
            nodem.classList.add(item.firstChild.className)
            nodem.appendChild(document.createTextNode('获取m3u8直播流'))
            // 插入
            item.append(nodef)
            item.append(nodem)
            var live_data = JSON.parse(decodeURIComponent(document.getElementById("RENDER_DATA").innerText));
            // flv
            document.querySelector(ids.LIVE__GET_STREAM_LINK_FLV).addEventListener('click', function () {
                copy_this(live_data.initialState.roomStore.roomInfo.room.stream_url.flv_pull_url.FULL_HD1)
                send_toast('success', '已复制直播流链接', '', 2000, 'top') 
            })
            // m3u8
            document.querySelector(ids.LIVE__GET_STREAM_LINK_MU).addEventListener('click', function () {
                copy_this(live_data.initialState.roomStore.roomInfo.room.stream_url.hls_pull_url_map.FULL_HD1)
                send_toast('success', '已复制直播流链接', '', 2000, 'top') 
            })
        }
    }
    function acfun_run(){
        const ids = {
            LIVE__MENU_ID: '#get_stream_link',
            LIVE__COVER_ID: '#get_cover_link'
        }
        init_acfun()
        function mmsn_log(description,msg){
            console.log(`${NAMESPACE}: ${description}`, msg)
        }
        get_live_info()
        function get_live_info(){
            $.ajax(
                {
                    url:"https://id.app.acfun.cn/rest/app/visitor/login",
                    type:'post',
                    xhrFields:{ withCredentials: true },
                    contentType:'application/x-www-form-urlencoded',
                    data:'sid=acfun.api.visitor',
                    success:function(data){
                        anonymous_uid = data.userId
                        var visitor_st = data['acfun.api.visitor_st']
                        var rmid = window.location.pathname.replace('/live/', '')
                        $.ajax(
                            {
                                url:"https://api.kuaishouzt.com/rest/zt/live/web/startPlay?subBiz=mainApp&kpn=ACFUN_APP&kpf=PC_WEB&userId="+anonymous_uid+'&did=H5_&acfun.api.visitor_st='+visitor_st,
                                type:'post',
                                xhrFields:{ withCredentials: true },
                                contentType:'application/x-www-form-urlencoded',
                                data:'authorId=' + rmid + '&pullStreamType=FLV',
                                success:function(data){
                                    live_data = data
                                }
                            }
                        )
                    },
                }
            )
        }
        var ac_room_id = null // 房间号
        var anonymous_uid = null // 匿名id
        var NAMESPACE = 'acfun-live_tools' // 和B站相互对应
        var live_data = null
        function init_acfun(){
            ac_room_id = window.location.pathname.replace('/live/', '') // 获取网址，例如 https://live.acfun.cn/live/38382871 = /live/38382871
            send_toast('success', 'html注入成功！享用脚本', '', 3000, 'top') 
        }
        const wrapperObserver = new MutationObserver((mutationsList) => { // 监听变动
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {// 子元素变动，也有characterData(节点内容或节点文本)，attributes(属性变动)，subtree(所有下属节点的变动)
                    [...mutation.addedNodes].map(item => {// 在新增的节点 返回数组(map)，并且带上item
                        //mmsn_log('非目标变更', item);
                        if (item.classList?.contains('btn-lab')) {
                            attack_player_player()
                        }
                    })
                }
            }
        });
        wrapperObserver.observe(document.body, { attributes: true, childList: true, subtree: true }); // 设置监听参数
        function attack_player_player(){
            console.log('插入播放器')
            $('.context-menu')[0].insertBefore($('<li id="get_stream_link">获取直播流</li>')[0],document.querySelector('.context-menu').childNodes[6]);
            $('.context-menu')[0].insertBefore($('<li id="get_cover_link">获取直播封面</li>')[0],document.querySelector('.context-menu').childNodes[7]);
            // 直播封面
            document.querySelector(ids.LIVE__COVER_ID).addEventListener('click',function(){
                Swal.fire({
                    title: '直播间封面',
                    text: '右键或点击下方按钮即可复制链接!',
                    imageUrl: 'https://ali2.a.kwimgs.com/bs2/ztlc/cover_'+live_data.data.liveId + '_raw.jpg',
                    confirmButtonText: '复制',
                }).then((result) => {
                    if (result.isConfirmed) {
                        copy_this('https://ali2.a.kwimgs.com/bs2/ztlc/cover_'+live_data.data.liveId + '_raw.jpg')
                        send_toast('success', '已复制图片链接', '', 2000, 'top')
                    }
                })
            })
            // 直播流
            document.querySelector(ids.LIVE__MENU_ID).addEventListener('click', function () {
                var stlk_json = JSON.parse(live_data.data.videoPlayRes) // stlk=stream link
                console.log(stlk_json.liveAdaptiveManifest[0].adaptationSet.representation[stlk_json.liveAdaptiveManifest[0].adaptationSet.representation.length -1].url)
                copy_this(stlk_json.liveAdaptiveManifest[0].adaptationSet.representation[stlk_json.liveAdaptiveManifest[0].adaptationSet.representation.length -1].url)
                send_toast('success', '已复制直播流链接', '', 2000, 'top') 
            }) 
        }
    }
    function bilibili_run(){
        const ids = {
            MENU__SETTING_ID: '#plugins_setting',
            MENU__LIVE_TOALS_ID: '#totals_menu',
            RIGHT_MENU__CLICK_GET_STREAM_LINK_ID: '#right_click_menu_getstreamlink',
            RIGHT_MENU__CLICK_GET_STREAM_LINK_FLV_ID : '#right_click_menu_getstreamlink_flv',
            RIGHT_MENU__CLICK_GET_STREAM_COVER_ID: '#right_click_menu_getstreamcover',
            RIGHT_MENU__CLICK_NO_IN_SHOW : '#right_click_menu_no_in_show',
            RIGHT_MENU__CLICK_300S : '#right_click_menu_300s',
            RIGHT_MENU__CLICK_180S : '#right_click_menu_180s',
            RIGHT_MENU__CLICK_60S : '#right_click_menu_60s',
            RIGHT_MENU__CLICK_30S : '#right_click_menu_30s',
            RIGHT_MENU__CLICK_15S : '#right_click_menu_15s',
            LIVE_TOALS_SHOW_HIGH: '#high_people'
        }
        var room_total = {
            // 各种统计
            high_people: 0,
            entry_people: 0,
            boat_guy: 0,
            follow_people: 0,
            block_guys: 0,
            danmu_total: 0,
            // 付费相关
            silver: 0,
            free_gift: 0,
            pay_gift: 0,
            // sc相关
            super_chat_total:0,
            super_chat_rmb: 0,
        }
        function getCertification(json) { // 这里的代码来源:https://blog.csdn.net/yyznm/article/details/116543107，非常感谢这位博主。
            var bytes = str2bytes(json);  //字符串转bytes
            var n1 = new ArrayBuffer(bytes.length + 16)
            var i = new DataView(n1);
                i.setUint32(0, bytes.length + 16), //封包总大小
                i.setUint16(4, 16), // 头部长度
                i.setUint16(6, 1), // 协议版本
                i.setUint32(8, 7),  // 操作码 7表示认证并加入房间
                i.setUint32(12, 1); // 就1
            for (var r = 0; r < bytes.length; r++){
                i.setUint8(16 + r, bytes[r]); //把要认证的数据添加进去
            }
            return i; //返回
        }
        function str2bytes(str) {
            const bytes = []
            let c
            const len = str.length
            for (let i = 0; i < len; i++) {
                c = str.charCodeAt(i)
                if (c >= 0x010000 && c <= 0x10FFFF) {
                    bytes.push(((c >> 18) & 0x07) | 0xF0)
                    bytes.push(((c >> 12) & 0x3F) | 0x80)
                    bytes.push(((c >> 6) & 0x3F) | 0x80)
                    bytes.push((c & 0x3F) | 0x80)
                } else if (c >= 0x000800 && c <= 0x00FFFF) {
                    bytes.push(((c >> 12) & 0x0F) | 0xE0)
                    bytes.push(((c >> 6) & 0x3F) | 0x80)
                    bytes.push((c & 0x3F) | 0x80)
                } else if (c >= 0x000080 && c <= 0x0007FF) {
                    bytes.push(((c >> 6) & 0x1F) | 0xC0)
                    bytes.push((c & 0x3F) | 0x80)
                } else {
                    bytes.push(c & 0xFF)
                }
            }
            return bytes
        }
        // 文本解码器
        var textDecoder = new TextDecoder('utf-8');
        // 从buffer中读取int
        const readInt = function (buffer, start, len) {
            let result = 0
            for (let i = len - 1; i >= 0; i--) {
                result += Math.pow(256, len - i - 1) * buffer[start + i]
            }
            return result
        }
        // blob blob数据
        // call 回调 解析数据会通过回调返回数据
        function decode(blob, call) {
            let reader = new FileReader();
            reader.onload = function (e) {
                let buffer = new Uint8Array(e.target.result)
                let result = {}
                result.packetLen = readInt(buffer, 0, 4)
                result.headerLen = readInt(buffer, 4, 2)
                result.ver = readInt(buffer, 6, 2)
                result.op = readInt(buffer, 8, 4)
                result.seq = readInt(buffer, 12, 4)
                if (result.op == 5) {
                    result.body = []
                    let offset = 0;
                    while (offset < buffer.length) {
                        let packetLen = readInt(buffer, offset + 0, 4)
                        let headerLen = 16 // readInt(buffer,offset + 4,4)
                        let data = buffer.slice(offset + headerLen, offset + packetLen);
                        let body = "{}"
                        if (result.ver == 2) {
                            body = textDecoder.decode(pako.inflate(data)); //协议版本为 2 时代表数据有进行压缩，通过pako.js进行解压
                        }else {
                            body = textDecoder.decode(data); //协议版本为 0 时，代表数据没有进行压缩
                        }
                        if (body) {
                            const group = body.split(/[\x00-\x1f]+/); // 同一条消息中可能存在多条信息，用正则筛出来
                            group.forEach(item => {
                                try {
                                    result.body.push(JSON.parse(item));
                                }catch (e) {
                                    // 忽略非JSON字符串，通常情况下为分隔符
                                }
                            });
                        }
                        offset += packetLen;
                    }
                }
                call(result); //回调
            }
            reader.readAsArrayBuffer(blob);
        }
        function mmsn_log(description,msg){
            console.log(`${NAMESPACE}: ${description}`, msg)
        }
        function bili_toast(type,left,top,message,time){ // type可用:success、error、info
            var send_msg = '<div id="bili_toast" class="link-toast '+type+'" style="left:'+left+'px; top: '+top+'px;"><span class="toast-text">'+message+'</span></div>'
            $('body').append(send_msg)
            setTimeout(function(){
                $('#bili_toast').remove()
            },time)
        }
        //初始化
        var ls_stream_link = null; // ls其实是60的意思，因为一开始切片只做了60秒的
        var ls_stream = null; // link和这个的区别就是没有&tmshift=xxx
        var uid = null; // 当前用户uid
        var room_id = null; // 房间号
        var rm_real_id = null; // 真正的房间号，因为有些房间是短号
        var rdm_id = null; // 随机id，运用在 _context-menu-item_ + rdm_id
        var room_site = null; // 用来请求直播流的site参数，但还没有必要写进去
        var room_init_res = null; // 房间初始化信息
        var NAMESPACE = 'bilibili-live_tools' // 脚本命名空间
        var bili_video_id = null; // video标签的id，方便对播放器进行操作
        var send_time_show = null; // 时间显示的html
        var data_v = null; // 一种data-v
        var data_v1 = null; // 第二种data-v，但和data_v2一起使用
        var data_v2 = null // 第二种data-v，和v1一起使用
        var timer = null; // 将定时器声明为全局变量，因为在丢失wss连接后要清除定时器
        var load_time = null; // 加载好本脚本的时间戳
        var now_time = null; // 现在时间
        var ws_content = null; // wss连接，方便在任何地方调用
        var recon_wss = null
        var wss_re_second = 10
        init() // 运行初始化函数
        function init() {
            room_id = window.location.pathname.replace('/', '') // 获取网址，例如 https://live.bilibili.com/213 = /213
            if (room_id.indexOf('blanc') != -1) { // 如果有blanc
                room_id = room_id.replace('/', '') // 那就继续解析!
                room_id = room_id.replace('blanc', '') 
            }
            try{
                data_v = document.querySelector('.follow-ctnr .left-part').getAttributeNames()[0] // 获取data-v
            }
            catch{ 
                console.log('可能无法获取data-v') // 在一些特殊的直播间会获取不到data-v，但如果想做一个正常的样式，data-v是必须存在的。
                data_v = 'no_dude' // 我在LIVE__MENU_INJECT里内置了圆角边框和字体居中，如果没有data-v也能模仿其他按钮的样式
            }
            //注入
            load_time = time_stamp_ten(Date.now()) // 给加载时间复制
            console.info('在'+timestamptotime(load_time)+'时脚本加载成功!')
            send_toast('success', 'html注入成功！享用脚本', '', 3000, 'top') //调用示例 第一个参数是提示图标，可以在sweetalert2官网查询;第二个参数是标题;第三个参数是内容，不填则无;第四个参数是显示时间，毫秒为单位;第五个为显示位置，同样在sweetalert2官网查询。
        }
        const htmls = {
            LIVE__TOTALS_MENU: '<div id="totals_menu" '+data_v+'="" style="margin-right:5px;border-radius:5px;" role="button" aria-label="数据统计" title="点击打开数据统计菜单" class="left-part live-skin-highlight-bg live-skin-button-text dp-i-block pointer p-relative"><!----><!----><span '+data_v+'="" class="follow-text v-middle d-inline-block" style="text-align: center;line-height: 20px;">数据统计</span><!----><!----></div>',
            LIVE__MENU_INJECT: '<div id="plugins_setting" '+data_v+'="" style="margin-right:5px;border-radius:5px;" role="button" aria-label="插件菜单" title="点击打开插件菜单" class="left-part live-skin-highlight-bg live-skin-button-text dp-i-block pointer p-relative"><!----><!----><span '+data_v+'="" class="follow-text v-middle d-inline-block" style="text-align: center;line-height: 20px;">插件菜单</span><!----><!----></div>'
        };
        //菜单注入
        window.setTimeout(function () {
            $('.web-player-icon-roomStatus').remove() // 删除"bilibili直播"水印
            $('.follow-ctnr')[0].insertBefore($(htmls.LIVE__MENU_INJECT)[0], $('.follow-ctnr .left-part')[0]) // 将"直播菜单注入"
            $('.follow-ctnr')[0].insertBefore($(htmls.LIVE__TOTALS_MENU)[0], $('.follow-ctnr .left-part')[0]) // 将"数据统计"注入
            var high_people_show = '<div title="" '+data_v1+'="" '+data_v2+'="" class="live-skin-normal-a-text pointer not-hover" style="line-height: 16px;"><i '+data_v1+'="" style="font-size: 16px;"></i><span '+data_v1+'="" class="action-text v-middle" id="high_people" style="font-size: 12px;">高能榜占位</span></div>'
            $('.right-ctnr')[0].insertBefore($(high_people_show)[0],document.querySelector('.right-ctnr').childNodes[5]) // 注入高能榜
            document.querySelector(ids.MENU__SETTING_ID).addEventListener('click', function () {
                var show_words = GM_getValue('ban_word');
                Swal.fire({
                    title: '插件菜单',
                    showCancelButton: true,
                    showDenyButton: true,
                    cancelButtonText: '退出',
                    confirmButtonText: '屏蔽设置',
                    denyButtonText: '直播流播放器',
                }).then((result) => {
                    if (result.isConfirmed) {
                        Swal.fire({
                            title: '编辑屏蔽词',
                            input: 'text',
                            inputLabel: '在下方输入要屏蔽的弹幕关键词，用/分割关键词，但无法识别符号！',
                            inputValue: show_words,
                            inputAttributes: {
                                autocapitalize: 'off' //关闭自动大写
                            },
                            showCancelButton: true,
                            cancelButtonText: '取消',
                            confirmButtonText: '确认',
                            showDenyButton: true,
                            denyButtonText: '清空关键词',
                            inputValidator: (value) => {
                                if (!value) {
                                    return '你需要输入至少一个屏蔽词!如果要清空关键词请点击下方"清空关键词"按钮!'
                                }
                            },
                            allowOutsideClick: () => !Swal.isLoading() // 说实话，这个有什么用我忘了
                        }).then((result) => {
                            GM_setValue('ban_word', result.value)
                            if (result.isConfirmed) {
                                Swal.fire({
                                    icon: 'success',
                                    title: '设置成功,当前屏蔽词为:' + result.value,
                                })
                            }
                            if (result.isDismissed) {
                                GM_setValue('ban_word', show_words)
                            }
                            if (result.isDenied) {
                                Swal.fire({
                                    title: '你想要清空关键词吗?',
                                    icon: 'warning',
                                    showDenyButton: true,
                                    confirmButtonText: '我再想想?',
                                    denyButtonText: '确定清空!',
                                }).then((result) => {
                                    if (result.isDenied) {
                                        GM_setValue('ban_word', '')
                                        send_toast('success', '清空成功', '', 1500, 'top')
                                    }
                                    if (result.isConfirmed) {
                                        GM_setValue('ban_word', show_words)
                                        send_toast('success', '那我先不清空吧!', '', 2000, 'top')
                                    }
                                })
                            }
                        });
                    }
                    if(result.isDenied){
                        let is_m3u8,is_flv = false;
                        Swal.fire({
                            title: '直播流播放',
                            input: 'text', // 允许输入text,但没有任何原生检测
                            inputLabel: '注意！播放器已经同时支持m3u8与flv播放！',
                            inputPlaceholder: '在这里粘贴直播流链接',
                            confirmButtonText: '继续',
                            inputValidator: (value) => {
                                if (!value) {
                                    return '请输入直播流链接!'
                                }
                                if(value.indexOf(".m3u8") != -1){
                                    is_m3u8 = true
                                }
                                if(value.indexOf(".flv") != -1){
                                    is_flv = true
                                }
                                if(value.indexOf(".m3u8") != -1 & value.indexOf(".flv") != -1){
                                    return '既有.m3u8又有.flv，你这个链接不对吧?'
                                }
                            },
                        }).then((result) => {
                            if (result.isConfirmed) {
                                bili_video_id = document.querySelector('.live-player-mounter').lastChild.id // 播放器控件最后一个节点
                                document.getElementById(bili_video_id).muted = true; // 对播放器静音
                                Swal.fire({ // 如果通过video.js来播放m3u8视频。请在将要关闭时使用dispose()，也就是删除播放器的所有事件、元素，完美符合我们"重新创建标签"的需求
                                    showConfirmButton: false,
                                    width: 1280,
                                    html: // 这里就写html代码，其实我更想是找到swal窗口用innerHTML插入的，库本身支持的方法更好，唯一的缺点就是换行需要+
                                    '<div id="video_run_m3u8"></div>',
                                    showCloseButton: true, // 显示关闭框
                                    willClose: () =>{
                                        document.getElementById(bili_video_id).muted = false; // 取消对B站播放器的静音
                                    },
                                })
                                if(is_m3u8 == true){
                                    let myvideo = new HlsJsPlayer({
                                        id:'video_run_m3u8',
                                        url: result.value ,
                                        width: 1200,
                                        height: 700,
                                        autoplay: true,
                                        pip: true,
                                    })
                                }
                                else if(is_flv == true){
                                    let myvideo = new FlvJsPlayer({
                                        id:'video_run_m3u8',
                                        url: result.value ,
                                        isLive: true,
                                        width: 1200,
                                        height: 700,
                                        autoplay: true,
                                        pip: true,
                                        hasVideo: true,
                                        hasAudio: true,
                                    })
                                }
                            }
                        })
                    }
                })
            })
            document.querySelector(ids.MENU__LIVE_TOALS_ID).addEventListener('click',function(){ // 监听点击"数据菜单"
                now_time = timestamptotime(time_stamp_ten(Date.now())) // 获取现在时间
                Swal.fire({
                    title: '<font size=5>'+timestamptotime(load_time) + '到<br>' + now_time +'的统计</font>',
                    html:
                      '<h3>房间'+room_id+'的统计信息:<br>' +
                      '有' + room_total.follow_people + '人关注了该主播<br>共有' + room_total.entry_people + '个人进入直播间<br>以及' + room_total.boat_guy + '个开通了大航海的用户<br>已经接收了' + room_total.danmu_total + '条弹幕<br>'+'共收到价值' + room_total.silver/100 + '电池的礼物，等同于' + String(room_total.silver/100).slice(0,String(room_total.silver/100).length -1) + '人民币<br>共收到' + room_total.pay_gift + '个付费礼物,' + room_total.free_gift + '个免费礼物<br>共收到了' + room_total.super_chat_total + '条SuperChat,总价值' + room_total.super_chat_rmb + '人民币<br>共禁言了' + room_total.block_guys + '位用户',
                    showCloseButton: true,
                    showCancelButton: true,
                    showConfirmButton: false,
                    cancelButtonText: '退出'
                  })
            })
        }, 510);
        window.setTimeout(function attack_player() {
            //注入部分
            rdm_id = $('.live-player-mounter')[0].childNodes[5].className.split('_')[2] // 获取随机的id,分割_得到随机id
            var LIVE__PLAYER_MENU = '<li class="_context-menu-item_'+rdm_id+'"><span class="_context-menu-text_'+rdm_id+'">小功能</span><div class="_context-menu-right-arrow_'+rdm_id+'"></div><ul class="_context-sub-menu_'+rdm_id+'"><li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_getstreamlink">获取m3u8直播流</li><li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_getstreamlink_flv">获取flv直播流</li><li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_getstreamcover">获取直播封面</li></ul></li>'
            var LIVE__QC_MENU = '<li class="_context-menu-item_'+rdm_id+'"><span class="_context-menu-text_'+rdm_id+'">直播切片</span><div class="_context-menu-right-arrow_'+rdm_id+'"></div><ul class="_context-sub-menu_'+rdm_id+'"> <li class="_context-sub-menu-item_'+rdm_id+' _disabled_'+rdm_id+'">仅在某些直播间可用!</li> <li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_300s">300秒(5分钟)回放</li> <li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_180s">180秒(3分钟)回放</li> <li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_60s">60秒回放</li> <li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_30s">30秒回放</li> <li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_15s">15秒回放</li> </ul></li>'
            var inject_live_player_menu_here = $('._web-player-context-menu_'+rdm_id+'') // 这里就有必要声明一个变量了
            var inject_live_player_here = document.querySelectorAll('.live-player-mounter ._context-menu-item_'+rdm_id+'')[3]
            inject_live_player_menu_here[0].insertBefore($(LIVE__PLAYER_MENU)[0],inject_live_player_here); // 向播放器注入"小功能"菜单
            inject_live_player_menu_here[0].insertBefore($(LIVE__QC_MENU)[0],inject_live_player_here); // 向播放器注入"直播切片"菜单
            // 复制m3u8直播流链接
            document.querySelector(ids.RIGHT_MENU__CLICK_GET_STREAM_LINK_ID).addEventListener('click', function () {
                $.get('https://api.live.bilibili.com/room/v1/Room/playUrl?cid=' + room_id + '&platform=h5', function (data) {
                    copy_this(data.data.durl[0].url)
                    send_toast('success', '已复制直播流链接', '', 2000, 'top')
                })
                document.getElementsByClassName('_web-player-context-menu_'+rdm_id+'')[0].setAttribute('style', 'opacity : 0;')
            });
            // 复制flv直播流链接
            document.querySelector(ids.RIGHT_MENU__CLICK_GET_STREAM_LINK_FLV_ID).addEventListener('click', function () {
                $.get('https://api.live.bilibili.com/room/v1/Room/playUrl?cid=' + room_id, function (data) {
                    copy_this(data.data.durl[0].url)
                    send_toast('success', '已复制直播流链接', '', 2000, 'top')
                })
                document.getElementsByClassName('_web-player-context-menu_'+rdm_id+'')[0].setAttribute('style', 'opacity : 0;')
            });
            // 获取直播间封面
            document.querySelector(ids.RIGHT_MENU__CLICK_GET_STREAM_COVER_ID).addEventListener('click', function () {
                $.get('https://api.live.bilibili.com/room/v1/Room/get_info?id=' + room_id, function (data) {
                    Swal.fire({
                        title: '直播间封面',
                        text: '右键或点击下方按钮即可复制链接!',
                        imageUrl: data.data.user_cover,
                        confirmButtonText: '复制',
                    }).then((result) => {
                        if (result.isConfirmed) {
                            copy_this(data.data.user_cover)
                            send_toast('success', '已复制图片链接', '', 2000, 'top')
                        }
                    })
                })
                document.getElementsByClassName('_web-player-context-menu_'+rdm_id+'')[0].setAttribute('style', 'opacity : 0;')
            });
            try{
                room_init_res = JSON.parse(document.getElementsByClassName('script-requirement')[0].firstChild.innerHTML.replace(/window.__NEPTUNE_IS_MY_WAIFU__=/,''))
                ls_stream = room_init_res.roomInitRes.data.playurl_info.playurl.stream[1].format[1].codec[0].url_info[0].host + room_init_res.roomInitRes.data.playurl_info.playurl.stream[1].format[1].codec[0].base_url + room_init_res.roomInitRes.data.playurl_info.playurl.stream[1].format[1].codec[0].url_info[0].extra
                uid = room_init_res.userLabInfo.data.uid // 获取一下uid，以后备用
                console.log("当前用户uid:"+uid)
            }
            catch{
                $.get('https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id='+room_id+'&protocol=0,1&format=0,1,2&codec=0,1',function(data){
                    console.error('开始获取链接')
                    console.log(data)
                    room_init_res = data
                    ls_stream = room_init_res.data.playurl_info.playurl.stream[1].format[1].codec[0].url_info[0].host + room_init_res.data.playurl_info.playurl.stream[1].format[1].codec[0].base_url + room_init_res.data.playurl_info.playurl.stream[1].format[1].codec[0].url_info[0].extra
                    uid = Number(document.querySelector('.user-panel-ctnr').firstChild.href.split('https://space.bilibili.com/')[1])
                })
                console.log('获取房间初始信息出现错误')
            }
            // 直播流300秒(5分钟)切片
            document.querySelector(ids.RIGHT_MENU__CLICK_300S).addEventListener('click', function () {
                ls_stream_link = ls_stream + '&tmshift=300'
                copy_this(ls_stream_link)
                send_toast('success', '已复制直播流链接', '', 2000, 'top')
                document.getElementsByClassName('_web-player-context-menu_'+rdm_id+'')[0].setAttribute('style', 'opacity : 0;')
            });
            // 直播流180秒(3分钟)切片
            document.querySelector(ids.RIGHT_MENU__CLICK_180S).addEventListener('click', function () {
                ls_stream_link = ls_stream + '&tmshift=180'
                copy_this(ls_stream_link)
                send_toast('success', '已复制直播流链接', '', 2000, 'top')
                document.getElementsByClassName('_web-player-context-menu_'+rdm_id+'')[0].setAttribute('style', 'opacity : 0;')
            });
            // 直播流60秒切片
            document.querySelector(ids.RIGHT_MENU__CLICK_60S).addEventListener('click', function () {
                ls_stream_link = ls_stream + '&tmshift=60'
                copy_this(ls_stream_link)
                send_toast('success', '已复制直播流链接', '', 2000, 'top')
                document.getElementsByClassName('_web-player-context-menu_'+rdm_id+'')[0].setAttribute('style', 'opacity : 0;')
            });
            // 直播流30秒切片
            document.querySelector(ids.RIGHT_MENU__CLICK_30S).addEventListener('click', function () {
                ls_stream_link = ls_stream + '&tmshift=30'
                copy_this(ls_stream_link)
                send_toast('success', '已复制直播流链接', '', 2000, 'top')
                document.getElementsByClassName('_web-player-context-menu_'+rdm_id+'')[0].setAttribute('style', 'opacity : 0;')
            });
            // 直播流15秒切片
            document.querySelector(ids.RIGHT_MENU__CLICK_15S).addEventListener('click', function () {
                ls_stream_link = ls_stream + '&tmshift=15'
                copy_this(ls_stream_link)
                send_toast('success', '已复制直播流链接', '', 2000, 'top')
                document.getElementsByClassName('_web-player-context-menu_'+rdm_id+'')[0].setAttribute('style', 'opacity : 0;')
            });
        }, 800);
        window.setTimeout(function wss_get() {
            data_v1 = document.querySelector('.right-ctnr').childNodes[2].getAttributeNames()[0] // data-v
            data_v2 = document.querySelector('.right-ctnr').childNodes[2].getAttributeNames()[1] // 也是data-v 
            $.get('https://api.live.bilibili.com/room/v1/Room/room_init?id='+room_id,function(rddata){ // 获取真实的房间号，因为有些房间是短号
                rm_real_id = rddata.data.room_id // 有些房间是短号，还有长一点的id
                $.get('https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo?id=' + rm_real_id, function (data) {
                    data.code == 0 // 判断一下返回结果
                    ws_content = new WebSocket('wss://'+data.data.host_list[2].host + '/sub') // 这里还有有个host_list[0]可以用，但相关的事件信息会较少
                    console.log('wss://'+data.data.host_list[2].host + '/sub') // 拼接一下ws连接
                    ws_content.onopen = function(){ // 在ws连接成功后
                        if (recon_wss != null)
                            clearInterval(recon_wss);
                        send_toast('success', '与wss服务器连接成功!', '', 3000, 'top')
                        console.log('连接wss成功') // 注意！必须要在5秒内发送正确的验证包，不然会被服务器断开wss连接
                        var auth_bag = {
                            "uid": 0, // 用户uid，非必要可不填
                            'roomid': rm_real_id, // 房间id,必填参数
                            'protover': 1, // 协议版本，我这里填1，填其他的或许会有错误吧
                            "platform": "web", // 播放平台
                            "clientver": "1.4.0", // 连接客户端版本
                        }
                        ws_content.send(getCertification(JSON.stringify(auth_bag)).buffer) // 发送请求，已经在getCertification处理好了，但我也看不懂
                        timer = setInterval(function () { // 定时每30秒发送一次心跳包，不然会被服务端断开连接
                            var n1 = new ArrayBuffer(16) // 心跳包结构比较简单，直接写
                            var i = new DataView(n1);
                                i.setUint32(0, 0),  //封包总大小
                                i.setUint16(4, 16), //头部长度
                                i.setUint16(6, 1), //协议版本
                                i.setUint32(8, 2),  // 操作码，2为心跳包
                                i.setUint32(12, 1); //就1
                            ws_content.send(i.buffer); //发送
                            console.log('发送心跳包')
                        }, 30000)   //30秒
                    }
                    ws_content.onmessage = function(event){
                        decode(event.data, function (packet) { // 调用函数来解码
                            //解码成功回调
                            if (packet.op == 5) {
                                //会同时有多个数发过来 所以要循环
                                for (let i = 0; i < packet.body.length; i++) {
                                    var element = packet.body[i];
                                    //console.log(element); // 打印
                                    switch (element.cmd){
                                        case "DANMU_MSG": // 弹幕事件
                                            room_total.danmu_total++;
                                            if(element.info[2][0] == uid){
                                                console.log('弹幕发送成功~')
                                                var send_pos = document.querySelector('#chat-control-panel-vm').getBoundingClientRect()
                                                bili_toast('success',send_pos.left,send_pos.top,'你的弹幕发送成功了~',3000)
                                                //var send_ok_toast = '<div id="bili_toast" class="link-toast success " style="left: '+send_pos.left+'px; top: '+send_pos.top+'px;"><span class="toast-text">弹幕发送成功~</span></div>'
                                            }
                                            break;
                                        case "ROOM_CHANGE": // 直播信息更改
                                            console.log('直播信息更改了'+ element.data)
                                            break;
                                        case "SEND_GIFT": // 礼物事件
                                            if(element.data.coin_type != "silver"){
                                                room_total.pay_gift = room_total.pay_gift + element.data.num
                                                room_total.silver = room_total.silver + element.data.price
                                            }
                                            else{
                                                room_total.free_gift = room_total.free_gift + element.data.num
                                            }
                                            break;
                                        case "SUPER_CHAT_MESSAGE": // SuperChat事件
                                            room_total.super_chat_total++;
                                            room_total.super_chat_rmb = room_total.super_chat_rmb + element.data.price
                                            break;
                                        case "ONLINE_RANK_COUNT": // 高能榜
                                            room_total.high_people = element.data.count
                                            document.querySelector(ids.LIVE_TOALS_SHOW_HIGH).innerHTML = '高能榜人数:'+room_total.high_people
                                            console.log('直播高能榜更新为'+element.data.count)
                                            break;
                                        case "INTERACT_WORD": // 进场事件为1，关注事件为2
                                            if(element.data.msg_type == 1){
                                                room_total.entry_people++;
                                            }
                                            if(element.data.msg_type == 2){
                                                room_total.follow_people++;
                                            }
                                            break;
                                        case "ENTRY_EFFECT": // 进场特效
                                            room_total.boat_guy++;
                                            break;
                                        case "ROOM_BLOCK_MSG": // 禁言事件
                                            room_total.block_guys++;
                                            send_toast('error', element.data.uname+'被禁言了，好可怜啊...', '', 1900, 'top-end')
                                            break;
                                    }
                                }
                    
                            }
                        });
                        
                    }
                    ws_content.onclose = function(e){
                        console.log('断开了wss连接,错误代码'+e.code+'断开原因'+e.reason+' 是否正常断开'+e.wasClean)
                        send_toast('error', '断开了wss连接，正在尝试重连，请向脚本作者反馈！详细信息按f12查看', '', 3000, 'top')
                        if (timer != null)
                            clearInterval(timer); // 断开连接后把定时器清理掉
                        var reconnect_second = 0
                        var tips_pos = document.querySelector('.left-ctnr').getBoundingClientRect()
                        recon_wss = setInterval(function() {
                            if(e.wasClean == false & reconnect_second < wss_re_second){
                                reconnect_second++
                                var be_left_second =  wss_re_second-reconnect_second
                                bili_toast('error',tips_pos.left,tips_pos.top+100,'正在尝试重连，剩余重试次数' + be_left_second ,1500)
                                console.log('正在尝试重连，剩余重试次数' + be_left_second )
                                wss_get()
                            }
                        }, 2000);
                    }
                })
            })
        },500)
        // 变动后执行函数
        function observeComments(wrapper) {
            var insert_here = wrapper.querySelector('.danmaku-content') // 再搜索到具体弹幕
            wrapper.getAttribute('data-danmaku') || undefined // 区分普通弹幕和礼物、系统提示
                if(wrapper.getAttribute('data-ts') == "0"){ // 自己发的弹幕是没有时间戳的
                    send_time_show = '<span id="time_menu" style="color:#00D1F1;"><br>你应该知道自己是在什么时候发的弹幕吧！</span>'
                    $(send_time_show).insertAfter(insert_here); // 附加上去
                }
                else{
                    var dm_send_time = timestamptotime(wrapper.getAttribute('data-ts')) // 获取弹幕发送时间戳
                    send_time_show = '<span id="time_menu" style="color:#00D1F1;"><br>'+dm_send_time+'</span>' // 时间戳显示
                    $(send_time_show).insertAfter(insert_here); // 附加上去
                }
                var ban_words = GM_getValue('ban_word').replace('/', '') // 获取屏蔽词
                let dm_content = wrapper.querySelector('.danmaku-content').innerHTML // 继续搜索danmaku-content，因为显示的文本在里面
                for (var i = 0; i < ban_words.length; i++) { //循环
                    var ban_word = "/"+ban_words[i]+"/g"; // 希望你看得懂正则表达式
                    dm_content = dm_content.replace(eval(ban_word), '□') // 将屏蔽词替换为口
                    wrapper.querySelector('.danmaku-content').innerHTML = dm_content // 覆盖原文本
                }
        }
        function show_dm_ban(wrapper){
            var ban_words = GM_getValue('ban_word').replace('/', '') // 获取屏蔽词
            let show_dm_content = wrapper.innerHTML // 获取显示的文本
            for (var i = 0; i < ban_words.length; i++) { //循环
                var ban_word = "/"+ban_words[i]+"/g"; // 希望你看得懂正则表达式
                show_dm_content = show_dm_content.replace(eval(ban_word), '□') // 将屏蔽词替换为口
                wrapper.innerHTML = show_dm_content // 覆盖原文本
            }
        }
        // 观察变动
        const wrapperObserver = new MutationObserver((mutationsList) => { // 监听变动
            for (const mutation of mutationsList) {
              if (mutation.type === 'childList') { // 子元素变动，也有characterData(节点内容或节点文本)，attributes(属性变动)，subtree(所有下属节点的变动)
                [...mutation.addedNodes].map(item => { // 在新增的节点 返回数组(map)，并且带上item
                    //mmsn_log('非目标变更', item);
                  if (item.classList?.contains('chat-item')) { // 聊天框
                    //mmsn_log('目标变更', item);
                    observeComments(item);
                  }
                  if(item.classList?.contains('mode-roll')) { // 弹幕
                      //mmsn_log('目标变更', item);
                      show_dm_ban(item)
                  }
                })
              }
              if(mutation.type === 'attributes'){ // 属性变动，因为某些直播间弹幕较多
                [mutation.target].map(item => { // 如果要发送一个新弹幕，不会新建一个div而是在原有的div基础上修改弹幕内容来达到想要的效果
                    if(item.getAttribute('class') != null){
                        if(item.getAttribute('class').indexOf('mode-roll') != -1){
                            show_dm_ban(item)
                        }
                    }
                })
              }
            }
          });
          wrapperObserver.observe(document.body, { attributes: true, childList: true, subtree: true }); // 设置监听参数
    }
})();
