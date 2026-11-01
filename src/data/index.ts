/* ================= DATA ================= */
import { tr } from '../i18n';
export const COL = {
  amber:{ name:tr('琥珀色'), hex:'#f2a95b', grad:'url(#gAmber)', blinks:1, midi:74, beacon:tr('旧码头'),
    line:tr('琥珀色那盏叫“旧码头”。以前那里真有个码头，后来只剩下灯。') },
  teal:{ name:tr('青色'), hex:'#62b0a8', grad:'url(#gTeal)', blinks:2, midi:78, beacon:tr('回声浮标'),
    line:tr('青色的叫“回声浮标”。它会把听见的声音，慢慢还回来。') },
  rose:{ name:tr('玫瑰色'), hex:'#e98f8c', grad:'url(#gRose)', blinks:3, midi:81, beacon:tr('晚钟'),
    line:tr('玫瑰色的叫“晚钟”。管它的人说，有船经过它才响。') }
};
export const ORDER = ['amber','teal','rose'];
export const CN = ['', tr('一'), tr('两'), tr('三'), tr('四'), tr('五')];
export const ROUTES = {
  harbor:{ name:tr('近港航道'), colors:['amber','teal'], spawn:[13,20], chords:[[50,57,64,66],[47,54,57,64],[43,50,54,57],[45,52,57,61]], dur:11, amp:.05, scale:[62,64,66,69,71,74], gap:[5,9], arp:2.4, bright:1,
    desc:tr('港口的灯还在身后。航标不多，琥珀色和青色。'), arrive:tr('船回到了近港航道。'), say:tr('回近港也好。港口的灯还认得我们。') },
  nebula:{ name:tr('星云浅湾'), colors:['amber','teal','rose'], spawn:[8,13], chords:[[50,57,61,68],[52,59,62,69],[43,50,57,61],[47,54,61,64]], dur:10, amp:.05, scale:[66,68,69,73,76,78], gap:[3.5,6], arp:1.8, bright:1.25,
    desc:tr('穿过一片粉青色的雾。航标多，三种颜色都有。'), arrive:tr('船拐进了星云浅湾。窗外起了一层粉青色的雾。'), say:tr('这片雾里灯多。管灯的人每晚都换滤片。') },
  ring:{ name:tr('环带慢道'), colors:['teal','amber','teal'], spawn:[12,18], chords:[[50,57,62,64],[45,52,57,64],[47,54,59,62],[43,50,55,62]], dur:13, amp:.055, scale:[62,64,69,71,74], gap:[6,10], arp:2.8, bright:.9,
    desc:tr('贴着一颗带环的行星绕半圈。航标少，节奏稳。'), arrive:tr('船贴着环带走。一颗很大的行星从右边慢慢过来。'), say:tr('这颗行星没有名字。我在图上就画了个圈。') },
  quiet:{ name:tr('静默段'), colors:[], spawn:[999,999], chords:[[38,45,52],[38,45,54],[35,42,50],[38,45,52]], dur:17, amp:.06, scale:[], gap:[20,30], arp:4, bright:.75,
    desc:tr('几乎没有航标。星星最密，适合什么也不做。'), arrive:tr('船进了静默段。外面几乎没有灯，星星很密。'), say:tr('这一段没什么灯。我一般在这儿睡一会儿。') }
};
export const TEA = {
  osm:{ name:tr('桂花乌龙'), jar:'#e0a85a', hex:'#c9853f', lid:'#f2a95b', sip:[tr('有一点桂花的甜味。'),tr('茶汤是琥珀色的。')], steep:tr('叶子一片片舒展开，桂花浮在上面。') },
  mint:{ name:tr('薄荷'), jar:'#7cc4a8', hex:'#a9c98a', lid:'#62b0a8', sip:[tr('凉丝丝的，一直凉到鼻子里。'),tr('薄荷的味道很亮。')], steep:tr('薄荷叶在水里打了个转，颜色变浅绿。') },
  barley:{ name:tr('炒大麦'), jar:'#b88050', hex:'#9a5f34', lid:'#e98f8c', sip:[tr('有一股烤过的香味。'),tr('像晒过的谷仓。')], steep:tr('麦粒沉下去，水慢慢变成深棕色。') },
  water:{ name:tr('白水'), hex:'#cfe2ee', sip:[tr('就是热水。也挺好。')], steep:'' }
};
export const SEEDS = {
  vine:{ name:tr('星藤'), color:'#e98f8c', desc:tr('往上爬的藤。开花时，花是五个尖的，会发一点光。') },
  bell:{ name:tr('月铃'), color:'#9fd2c4', desc:tr('三根细茎，垂着淡蓝的铃。手慢慢经过时，会响。') },
  fern:{ name:tr('雾蕨'), color:'#ffd9a3', desc:tr('卷着的嫩叶一圈圈打开。喷水时会冒一点雾。') }
};
export const NOTE_MIDI = [74,71,69,66,64,62]; // strip rows, top to bottom (D major pentatonic)
export const STATIONS = [
  { id:'weather', f:.68, name:tr('无处天气'), hours:[0,24], kind:'murmur', desc:tr('全天'),
    lines:[tr('以下是今夜各处的天气。'),tr('无处：有雾，局部有星。风从左舷来。'),tr('远港：晴转更晴。海面平。'),tr('回声浮标附近：小雨，雨声会晚一点到。'),tr('明日：大部分地方，跟今天差不多。')] },
  { id:'numbers', f:.97, name:tr('慢数台'), hours:[0,24], kind:'beeps', desc:tr('全天，很弱'),
    lines:[tr('三。七。七。一。'),tr('……停顿。'),tr('二。二。九。'),tr('这是一串坐标。没人知道是哪里的。')] },
  { id:'music', f:1.21, name:tr('星港夜曲'), hours:[12,22], kind:'music', desc:tr('12–22 点'),
    lines:[tr('（一段很慢的曲子，只有几个音。）'),tr('曲子在重复。纸带上浮出几个淡淡的格子。'),tr('（同一段旋律，又一遍。）')] },
  { id:'lighthouse', f:1.34, name:tr('灯塔夜读'), hours:[22,6], kind:'murmur', desc:tr('22–6 点'),
    lines:[tr('这里是灯塔。现在念今晚经过的船。'),tr('“晚钟”号，向北。'),tr('一艘没有名字的船，灯是暖的。'),tr('还有你们这艘。看见你们了。'),tr('念完了。灯还亮着。')] },
  { id:'whale', f:1.52, name:tr('鲸歌中继'), hours:[23,4], kind:'whale', desc:tr('23–4 点'),
    lines:[tr('（很低、很长的声音，一会儿升上去。）'),tr('（像是从很远的地方传过来，又绕了一圈。）'),tr('（停了一下，又开始。）')] },
  { id:'mailcast', f:.56, name:tr('邮船广播'), hours:[6,12], kind:'murmur', desc:tr('6–12 点'),
    lines:[tr('早班邮船广播。'), '@MAIL', tr('邮包里有信，也有空白明信片。'),tr('广播完毕。')] }
];
export const MUSIC_MOTIF = [[0,3],[2,2],[4,1],[6,3],[8,4],[10,2],[12,5],[14,3]]; // [col,row] ghost holes from 星港夜曲
export const LETTERS = [
  { id:'welcome', from:tr('船务处'), body:tr('欢迎登船。\n本船是一艘环形客船。沿着环廊走一圈，可以进客舱、小厨房、温室、电台室，梯子往上是观景穹顶。\n船上的东西都可以用。面团要等，种子要等，信也要等。等的时候，你不必在。\n邮船大约每两个钟头靠一次舷。'), sig:tr('船务处') },
  { id:'keeper', from:tr('灯塔看守'), body:tr('你们的船从我这儿经过好几次了。\n夜里十点以后，调到一点三四附近，能听见我念今晚过往的船名。\n念到你们的时候，我会念慢一点。'), sig:tr('灯塔') },
  { id:'gardener', from:tr('温室的前任管理员'), body:tr('那几盆植物怕快。\n手在旁边晃得快了，叶子会合上。慢慢来，它们会朝你那边歪。\n生长灯开着长得快一些。关了灯，它们就找别的光，比如你的手。'), sig:tr('一个种过它们的人') },
  { id:'watcher', from:tr('穹顶的常客'), body:tr('穹顶里，先把小灯关掉，然后眼睛别动，等一会儿。\n暗的星要等眼睛适应才出来。\n还有几颗是一阵一阵亮的。线可以先连过去，悬着，等它亮。'), sig:tr('常在长椅上躺着的人') },
  { id:'cook', from:tr('邻船的厨师'), body:tr('送了几个星梨过去，酸，配茶正好。\n面团喜欢暖和的地方。刚烧过水、刚烤过东西的厨房最好。\n发过头也没关系，烤出来胖一点而已。'), sig:tr('厨师') },
  { id:'blank', from:tr('邮差'), body:tr('这一班没有特别的信。\n附一张空白明信片。想写就写，不想写就留着，夹在哪里都行。'), sig:tr('邮差') },
  { id:'passenger', from:tr('另一艘船上的旅客'), body:tr('我这边的舷窗朝下，只能看见很远的一片光。\n今天把窗擦了一遍，没擦干净，也就这样了。\n不知道这封信会到谁手里。到了就好。'), sig:tr('同一条航线上的人') },
  { id:'repair', from:tr('八音盒修理匠'), body:tr('纸带不必打满。\n空着的格子也是拍子。\n发条往一个方向拧，拧多少圈，它就转多少遍。'), sig:tr('修理铺') },
  { id:'harbor', from:tr('港务局'), body:tr('各航道情况如下：\n近港航道，灯多。星云浅湾，三色航标都有。环带慢道，节奏稳。\n静默段夜里最安静，适合不说话。'), sig:tr('港务局 · 夜班') },
  { id:'colleague', from:tr('岸的老同事'), body:tr('听说她又在画航图。\n她画图从来不画终点，线画到哪儿算哪儿。\n替我问声好。不用回信。'), sig:tr('测绘处') },
  { id:'forecast', from:tr('无处天气'), body:tr('明日天气：\n无处有雾，局部有星。\n风从左舷来，傍晚转小。\n适合晾衣服，也适合不晾。'), sig:tr('天气台') },
  { id:'nobody', from:tr('（没有署名）'), body:tr('如果你在读这封信，说明邮船又绕回来了。\n这一圈和上一圈差不多。窗外的星换了几颗。'), sig:'—' },
  { id:'florist', from:tr('在别的船上种花的人'), body:tr('我种的月铃今天响了一声，就一声。\n我站着没动，等了很久，它没再响。\n我猜它要的就是这个。'), sig:tr('种花的人') },
  { id:'stub', from:tr('一张旧船票的背面'), body:tr('（字迹很淡）\n“第一次坐夜航船。灯关掉以后，外面原来有这么多东西。”'), sig:tr('不知道是谁') },
  { id:'radio', from:tr('电台室'), body:tr('收音机的魔眼合上的时候，就是调准了。\n有的台只在某些钟点出来，台表会替你记着。'), sig:tr('值班的人') },
  { id:'ship', from:tr('对面那艘夜航船'), body:tr('前几天在舷窗外看见你们的船了。\n你们的窗是暖色的。我们的也是。\n就写这些。'), sig:tr('对面的船') }
];
