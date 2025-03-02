// 自动从 地址发布页 获取&跳转url地址
import { load, _ } from './lib/cat.js';

var key = 'ncat';
var DLHOST = 'https://dl.ncat3.com/'; // 地址发布页
var host = '';
var siteKey = '';
var siteType = 0;

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 11; M2007J3SC Build/RKQ1.200826.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045714 Mobile Safari/537.36';

async function request(reqUrl, agentSp) {
    var res = await req(reqUrl, {
        method: 'get',
        headers: {
            'User-Agent': agentSp || MOBILE_UA,
            'Referer': host
        },
    });
    return res.content;
}

// cfg = {skey: siteKey, ext: extend}
async function init(cfg) {
    siteKey = cfg.skey;
    siteType = cfg.stype;
    var html = await request(DLHOST);
    var $ = load(html);
    host = $('a.copy-btn').attribs['data-clipboard-text'];
    //console.debug('ncat跳转地址 =====>' + host); // js_debug.log
}

async function home(filter) {
    var html = await request(host);
    var $ = load(html);
    var class_parse = $('div.nav-swiper-slide > a[href*=channel]');
    var classes = [];
    classes = _.map(class_parse, (cls) => {
        var typeId = cls.attribs.href;
        typeId = typeId.substring(typeId.lastIndexOf('/') + 1).replace('.html','');
        return {
            type_id: typeId,
            type_name: cls.children[0].data,
        };
    });
    var filterObj = {};
    return JSON.stringify({
        class: classes,
        filters: filterObj,
    });
}

async function homeVod() {
    var link = host + '/label/new.html';
    var html = await request(link);
    var $ = load(html);
    var items = $('div.module-item');
    let videos = _.map(items, (item) => {
        var remarks = $($(item).find('div.v-item-bottom > span')[0]).text().trim();
        return {
            vod_id: $($(item).find('a:first')[0]).attribs.href.replace(/.*?\/detail\/(.*).html/g, '$1'),
            vod_name: $($(item).find('div.v-item-title')[0]).text(),
            vod_pic: $($(item).find('img:first')[0]).attribs.src,
            vod_remarks: remarks || '',
        };
    });
    return JSON.stringify({
        list: videos,
    });
}

async function category(tid, pg, filter, extend) {
    if (pg <= 0 || typeof(pg) == 'undefined') pg = 1;
    var link = host + '/show/' + tid + '-----2-' + pg + '.html';
    var html = await request(link);
    var $ = load(html);
    var items = $('div.module-item');
    let videos = _.map(items, (item) => {
        var remarks = $($(item).find('div.v-item-bottom > span')[0]).text().trim();
        return {
            vod_id: $($(item).find('a:first')[0]).attribs.href.replace(/.*?\/detail\/(.*).html/g, '$1'),
            vod_name: $($(item).find('div.v-item-title')[0]).text(),
            vod_pic: $($(item).find('img:first')[0]).attribs.src,
            vod_remarks: remarks || '',
        };
    });
    var hasMore = $('div.page-item-next').length > 0;
    var pgCount = hasMore ? parseInt(pg) + 1 : parseInt(pg);
    return JSON.stringify({
        page: parseInt(pg),
        pagecount: pgCount,
        limit: 24,
        total: 24 * pgCount,
        list: videos,
    });
}

async function detail(id) {
    var html = await request(host + '/detail/' + id + '.html');
    var $ = load(html);
    var vod = {
        vod_id: id,
        vod_name: $('h1:first').text().trim(),
        vod_type: $('.stui-content__detail p:first a').text(),
        vod_actor: $('.stui-content__detail p:nth-child(3)').text().replace('主演：',''),
        vod_pic: $('.stui-content__thumb img:first').attr('data-original'),
        vod_remarks : $('.stui-content__detail p:nth-child(5)').text() || '',
        vod_content: $('span.detail-content').text().trim(),
    };
    var playMap = {};
    var tabs = $('div.stui-pannel__head > h3[class*=iconfont]');
    var playlists = $('ul.stui-content__playlist');
    _.each(tabs, (tab, i) => {
        var from = tab.children[0].data;
        var list = playlists[i];
        list = $(list).find('a');
        _.each(list, (it) => {
            var title = it.children[0].data;
            var playUrl = it.attribs.href;
            if (title.length == 0) title = it.children[0].data.trim();
            if (!playMap.hasOwnProperty(from)) {
                playMap[from] = [];
            }
            playMap[from].push( title + '$' + playUrl);
        });
    });
    vod.vod_play_from = _.keys(playMap).join('$$$');
    var urls = _.values(playMap);
    var vod_play_url = _.map(urls, (urlist) => {
        return urlist.join('#');
    });
    vod.vod_play_url = vod_play_url.join('$$$');
    return JSON.stringify({
        list: [vod],
    });
}

async function play(flag, id, flags) {
    var html = await request(host + id);
    html = html.match(/r player_.*?=(.*?)</)[1];
    var js = JSON.parse(html);
    //var url = js.url;
    //var from = js.from;
    //var next = js.link_next;
    //var id = js.id;
    //var nid = js.nid;
    //var paurl = await request(host +'/static/player/' + from + '.js');
    //paurl = paurl.match(/ src="(.*?)'/)[1];
    //var purl = paurl + url + '&next=' + next + '&id=' + id + '&nid=' + nid;
    //var playUrl = await request(purl);
    //playUrl = playUrl.match(/var .* = '(.*?)'/)[1];
    // console.debug('libvio playUrl =====>' + playUrl); // js_debug.log
    return JSON.stringify({
        parse: 0,
        url: js.url,
    });
}

async function search(wd, quick) {
    var data = JSON.parse(await request(host + '/index.php/ajax/suggest?mid=1&wd=' + wd + '&limit=50')).list;
    var videos = [];
    for (const vod of data) {
        videos.push({
            vod_id: vod.id,
            vod_name: vod.name,
            vod_pic: vod.pic,
            vod_remarks: '',
        });
    }
    return JSON.stringify({
        list: videos,
        limit: 50,
    });
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        play: play,
        search: search,
    };
}