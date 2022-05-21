// ==UserScript==
// @name         B站直播小工具
// @namespace    https://github.com/isma123HH/bilibili_live-assistant
// @version      2.5.4
// @description  一个辅助观看B站直播的小工具
// @author       isma
// @license      MIT
// @match        https://live.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico?v=1
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        unsafeWindow
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// @require      https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.min.js
// @require      https://unpkg.com/video.js/dist/video.min.js
// ==/UserScript==

(function () {
    'use strict';
    // html部分以及id列表
    const htmls = {
        LIVE__MENU_INJECT: '<div id="plugins_setting" data-v-19af4d50="" style="margin-right:5px;" role="button" aria-label="点击加入粉丝团" title="点击加入粉丝团" class="left-part live-skin-highlight-bg live-skin-button-text dp-i-block pointer p-relative"><!----><!----><span data-v-19af4d50="" class="follow-text v-middle d-inline-block">插件设置</span><!----><!----></div>',
    };
    const ids = {
        MENU__SETTING_ID: '#plugins_setting',
        RIGHT_MENU__CLICK_GET_STREAM_LINK_ID: '#right_click_menu_getstreamlink',
        RIGHT_MENU__CLICK_GET_STREAM_COVER_ID: '#right_click_menu_getstreamcover',
        RIGHT_MENU__CLICK_NO_IN_SHOW : '#right_click_menu_no_in_show',
        RIGHT_MENU__CLICK_300S : '#right_click_menu_300s',
        RIGHT_MENU__CLICK_180S : '#right_click_menu_180s',
        RIGHT_MENU__CLICK_60S : '#right_click_menu_60s',
        RIGHT_MENU__CLICK_30S : '#right_click_menu_30s',
        RIGHT_MENU__CLICK_15S : '#right_click_menu_15s',
    }
    // 函数部分
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
    function timestamptotime(timestamp){ // 时间戳转化
        return new Date(parseInt(timestamp) * 1000).toLocaleString().replace(/年|月/g, "-").replace(/日/g, " ");
    }
    function mmsn_log(description,msg){
        console.log(`${NAMESPACE}: ${description}`, msg)
    }
    //初始化
    var ls_stream_link = null;
    var room_id = null;
    var rdm_id = null;
    var room_site = null;
    var room_init_res = null;
    var NAMESPACE = 'bilibili-live_tools'
    var bili_video_id = null;
    var send_time_show = null;
    init()
    function init() {
        room_id = window.location.pathname
        room_id = room_id.replace('/', '')
        if (room_id.indexOf('blanc') != -1) {
            room_id = room_id.replace('/', '')
            room_id = room_id.replace('blanc', '')
        }
        //注入
        send_toast('success', 'html注入成功！享用脚本', '', 3000, 'top') //调用示例 第一个参数是提示图标，可以在sweetalert2官网查询;第二个参数是标题;第三个参数是内容，不填则无;第四个参数是显示时间，毫秒为单位;第五个为显示位置，同样在sweetalert2官网查询。
    }
    //菜单注入
    window.setTimeout(function () {
        $('.web-player-icon-roomStatus').remove() // 删除"bilibili直播"水印
        $('.follow-ctnr')[0].insertBefore($(htmls.LIVE__MENU_INJECT)[0], $('.follow-ctnr .left-part')[0])
        document.querySelector('.live-player-mounter').childNodes.forEach(function (item, index) { // 这段是获取播放器的id,方便对播放器进行操作。其实应该放在最开始的init函数,但这时候播放器还没加载好
            if(item.id.indexOf('video') != -1){
                bili_video_id = item.id
            }
        })
        document.querySelector(ids.MENU__SETTING_ID).addEventListener('click', function () {
            var show_words = GM_getValue('ban_word');
            Swal.fire({
                title: '插件设置',
                showCancelButton: true,
                showDenyButton: true,
                cancelButtonText: '退出',
                confirmButtonText: '屏蔽设置',
                denyButtonText: 'm3u8播放器',
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
                    Swal.fire({
                        input: 'text', // 允许输入text,但没有任何检测
                        inputLabel: '在下方粘贴m3u8直播流链接',
                        confirmButtonText: '继续',
                        inputValidator: (value) => {
                            if (!value) {
                                return '请输入直播流链接!'
                            }
                            if(value.indexOf(".m3u8") == -1){
                                return '这个播放器只支持.m3u8的直播流呢...'
                            }
                        },
                    }).then((result) => {
                        if (result.isConfirmed) {
                            document.getElementById(bili_video_id).muted = true; // 对播放器静音
                            Swal.fire({ // 在新的Swal窗口通过video.js来播放m3u8视频。并且在将要关闭时使用dispose()，也就是删除播放器的所有事件、元素，完美符合我们"重新创建标签"的需求
                                heightAuto: false,
                                showConfirmButton: false,
                                width: 1280,
                                html: // 这里就写html代码，其实我更想是找到swal窗口用innerHTML插入的，但我想库本身支持的方法更好，唯一的缺点就是换行需要+
                                '<video id=video_run_m3u8 class="video-js vjs-default-skin" controlBar="true" autoplay="autoplay">' +
                                '<source src="'+result.value+'" type="application/x-mpegURL">'+
                                '</video>',
                                showCloseButton: true, // 显示关闭框
                                willClose: () =>{
                                    console.log('正在销毁播放器...')
                                    myvideo.dispose()
                                    document.getElementById(bili_video_id).muted = false; // 取消对播放器的静音
                                },
                            })
                            const myvideo = videojs('video_run_m3u8', {
                                bigPlayButton: false,
                                textTrackDisplay: false,
                                errorDisplay: false,
                            })
                        }
                    })
                }
            })
        })
    }, 500);
    window.setTimeout(function attack_player() {
        //注入部分
        room_init_res = JSON.parse(document.getElementsByClassName('script-requirement')[0].firstChild.innerHTML.replace(/window.__NEPTUNE_IS_MY_WAIFU__=/,''))
        var ls_stream = room_init_res.roomInitRes.data.playurl_info.playurl.stream[1].format[1].codec[0].url_info[0].host + room_init_res.roomInitRes.data.playurl_info.playurl.stream[1].format[1].codec[0].base_url + room_init_res.roomInitRes.data.playurl_info.playurl.stream[1].format[1].codec[0].url_info[0].extra
        rdm_id = document.querySelector('.live-player-mounter').childNodes[5].className.split('_')[2] // 获取随机的id,分割_得到随机id
        var LIVE__PLAYER_MENU = '<li class="_context-menu-item_'+rdm_id+'"><span class="_context-menu-text_'+rdm_id+'">小功能</span><div class="_context-menu-right-arrow_'+rdm_id+'"></div><ul class="_context-sub-menu_'+rdm_id+'"><li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_getstreamlink">获取直播流</li><li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_getstreamcover">获取直播封面</li></ul></li>'
        var LIVE__QC_MENU = '<li class="_context-menu-item_'+rdm_id+'"><span class="_context-menu-text_'+rdm_id+'">直播切片</span><div class="_context-menu-right-arrow_'+rdm_id+'"></div><ul class="_context-sub-menu_'+rdm_id+'"> <li class="_context-sub-menu-item_'+rdm_id+' _disabled_'+rdm_id+'">仅在某些直播间可用!</li> <li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_300s">300秒(5分钟)回放</li> <li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_180s">180秒(3分钟)回放</li> <li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_60s">60秒回放</li> <li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_30s">30秒回放</li> <li class="_context-sub-menu-item_'+rdm_id+'" id="right_click_menu_15s">15秒回放</li> </ul></li>'
        var inject_live_player_menu_here = $('._web-player-context-menu_'+rdm_id+'')
        var inject_live_player_here = document.querySelectorAll('.live-player-mounter ._context-menu-item_'+rdm_id+'')[3]
        inject_live_player_menu_here[0].insertBefore($(LIVE__PLAYER_MENU)[0],inject_live_player_here); // 向播放器注入"小功能"菜单
        inject_live_player_menu_here[0].insertBefore($(LIVE__QC_MENU)[0],inject_live_player_here); // 向播放器注入"直播切片"菜单
        // 复制直播流链接
        document.querySelector(ids.RIGHT_MENU__CLICK_GET_STREAM_LINK_ID).addEventListener('click', function () {
            $.get('https://api.live.bilibili.com/room/v1/Room/playUrl?cid=' + room_id + '&platform=h5', function (data) {
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
    }, 500);
    // 变动后执行函数
    function observeComments(wrapper) {
        var insert_here = wrapper.querySelector('.danmaku-content')
        if(wrapper.getAttribute('data-danmaku') != undefined){
            if(wrapper.getAttribute('data-ts') == "0"){
                send_time_show = '<span id="time_menu" style="color:#00D1F1;"><br>你应该知道自己是在什么时候发的弹幕吧！</span>'
                $(send_time_show).insertAfter(insert_here);
            }
            else{
                var dm_send_time = timestamptotime(wrapper.getAttribute('data-ts'))
                send_time_show = '<span id="time_menu" style="color:#00D1F1;"><br>'+dm_send_time+'</span>'
                $(send_time_show).insertAfter(insert_here);
            }
            var ban_words = GM_getValue('ban_word').replace('/', '')
            let dm_content = wrapper.querySelector('.danmaku-content').innerHTML
            for (var i = 0; i < ban_words.length; i++) { //循环
                var ban_word = "/"+ban_words[i]+"/g";
                dm_content = dm_content.replace(eval(ban_word), '□')
                wrapper.querySelector('.danmaku-content').innerHTML = dm_content
            }
        }
    }
    function show_dm_ban(wrapper){
        var ban_words = GM_getValue('ban_word').replace('/', '')
        let show_dm_content = wrapper.innerHTML
        for (var i = 0; i < ban_words.length; i++) { //循环
            var ban_word = "/"+ban_words[i]+"/g";
            show_dm_content = show_dm_content.replace(eval(ban_word), '□')
            wrapper.innerHTML = show_dm_content
        }
    }
    // 观察变动
    const wrapperObserver = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            [...mutation.addedNodes].map(item => {
                //mmsn_log('非目标变更', item);
              if (item.classList?.contains('chat-item')) {
                //mmsn_log('目标变更', item);
                observeComments(item);
              }
              else if(item.classList?.contains('mode-roll')) {
                mmsn_log('目标变更', item);
                show_dm_ban(item)
              }
            })
          }
          if(mutation.type === 'attributes'){
            [mutation.target].map(item => {
                if(item.getAttribute('class') != null){
                    if(item.getAttribute('class').indexOf('mode-roll') != -1){
                        show_dm_ban(item)
                    }
                }
            })
          }
        }
      });
      wrapperObserver.observe(document.body, { attributes: true, childList: true, subtree: true });
})();