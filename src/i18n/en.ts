/* ================= ENGLISH =================
   Keyed by the Chinese source string. A missing key renders as Chinese, so an
   untranslated line is visible on screen rather than silently wrong.

   The voice is the work: short sentences, concrete nouns, no adjectives doing
   emotional labour. The copy describes what the world does and never tells the
   player what they feel ("the lamp is on, so the window only shows us", not
   "you feel less alone"). Translations keep that discipline and keep the
   original's trailing full stops and its habit of ending on the smaller fact.

   Straight quotes only: ZCOOL XiaoWei, which sets the display face in both
   languages, maps U+2019 and U+201C/D to full-width CJK glyphs, so a curly
   apostrophe opens a 41px hole in the middle of an English word. */
export const EN: Record<string, string> = {

/* ---------- data/index.ts : beacons ---------- */
'琥珀色': 'Amber',
'青色': 'Teal',
'玫瑰色': 'Rose',
'旧码头': 'Old Wharf',
'回声浮标': 'Echo Buoy',
'晚钟': 'Evening Bell',
'琥珀色那盏叫"旧码头"。以前那里真有个码头，后来只剩下灯。':
  'The amber one is called Old Wharf. There really was a wharf there once. Afterwards, only the light.',
'青色的叫"回声浮标"。它会把听见的声音，慢慢还回来。':
  'The teal one is Echo Buoy. Whatever it hears, it gives back slowly.',
'玫瑰色的叫"晚钟"。管它的人说，有船经过它才响。':
  'The rose one is Evening Bell. Its keeper says it only rings when a ship goes past.',

/* ---------- data/index.ts : routes ---------- */
'近港航道': 'Near-Harbour Lane',
'星云浅湾': 'Nebula Shallows',
'环带慢道': 'Ringbelt Slow Lane',
'静默段': 'The Quiet Stretch',
'港口的灯还在身后。航标不多，琥珀色和青色。':
  'The harbour lights are still behind us. Few beacons, amber and teal.',
'船回到了近港航道。': 'The ship is back in Near-Harbour Lane.',
'回近港也好。港口的灯还认得我们。':
  'Near-Harbour is fine by me. The harbour lights still know us.',
'穿过一片粉青色的雾。航标多，三种颜色都有。':
  'Through a pink-green fog. Many beacons, all three colours.',
'船拐进了星云浅湾。窗外起了一层粉青色的雾。':
  'The ship turns into Nebula Shallows. A pink-green fog comes up outside.',
'这片雾里灯多。管灯的人每晚都换滤片。':
  'Lots of lights in this fog. The keepers change the filters every night.',
'贴着一颗带环的行星绕半圈。航标少，节奏稳。':
  'Half a turn close against a ringed planet. Few beacons, steady rhythm.',
'船贴着环带走。一颗很大的行星从右边慢慢过来。':
  'The ship runs along the ringbelt. A very large planet comes up slowly on the right.',
'这颗行星没有名字。我在图上就画了个圈。':
  'This planet has no name. On the chart I just drew a circle.',
'几乎没有航标。星星最密，适合什么也不做。':
  'Almost no beacons. The stars are thickest here. Good for doing nothing.',
'船进了静默段。外面几乎没有灯，星星很密。':
  'The ship enters the Quiet Stretch. Hardly any lights outside. The stars are thick.',
'这一段没什么灯。我一般在这儿睡一会儿。':
  'Not much light on this stretch. I usually sleep a while here.',

/* ---------- data/index.ts : tea ---------- */
'桂花乌龙': 'Osmanthus Oolong',
'薄荷': 'Mint',
'炒大麦': 'Roasted Barley',
'白水': 'Plain Water',
'有一点桂花的甜味。': 'A little sweetness of osmanthus.',
'茶汤是琥珀色的。': 'The tea is amber.',
'叶子一片片舒展开，桂花浮在上面。': 'The leaves open one by one. The blossoms float on top.',
'凉丝丝的，一直凉到鼻子里。': 'Cool, and the cool goes all the way up into your nose.',
'薄荷的味道很亮。': 'The mint tastes bright.',
'薄荷叶在水里打了个转，颜色变浅绿。': 'The mint turns once in the water and goes pale green.',
'有一股烤过的香味。': 'It smells roasted.',
'像晒过的谷仓。': 'Like a barn in the sun.',
'麦粒沉下去，水慢慢变成深棕色。': 'The grains sink. The water slowly goes dark brown.',
'就是热水。也挺好。': 'Just hot water. That is fine too.',

/* ---------- data/index.ts : seeds ---------- */
'星藤': 'Starvine',
'月铃': 'Moonbell',
'雾蕨': 'Mistfern',
'往上爬的藤。开花时，花是五个尖的，会发一点光。':
  'A vine that climbs. Its flowers have five points and give off a little light.',
'三根细茎，垂着淡蓝的铃。手慢慢经过时，会响。':
  'Three thin stems hung with pale blue bells. They ring when a hand passes slowly.',
'卷着的嫩叶一圈圈打开。喷水时会冒一点雾。':
  'Coiled new leaves open turn by turn. Misting it raises a little fog.',

/* ---------- data/index.ts : radio stations ---------- */
'无处天气': 'Nowhere Weather',
'慢数台': 'The Slow Numbers',
'星港夜曲': 'Starport Nocturne',
'灯塔夜读': 'The Lighthouse Reads',
'鲸歌中继': 'Whalesong Relay',
'邮船广播': 'Mail Boat Broadcast',
'全天': 'all hours',
'全天，很弱': 'all hours, very faint',
'12–22 点': '12:00–22:00',
'22–6 点': '22:00–06:00',
'23–4 点': '23:00–04:00',
'6–12 点': '06:00–12:00',
'以下是今夜各处的天气。': 'Here is tonight\'s weather, everywhere.',
'无处：有雾，局部有星。风从左舷来。':
  'Nowhere: fog, stars in places. Wind off the port side.',
'远港：晴转更晴。海面平。': 'Far Harbour: clear, turning clearer. The sea is flat.',
'回声浮标附近：小雨，雨声会晚一点到。':
  'Near Echo Buoy: light rain. The sound of the rain will arrive a little later.',
'明日：大部分地方，跟今天差不多。': 'Tomorrow: in most places, much like today.',
'三。七。七。一。': 'Three. Seven. Seven. One.',
'……停顿。': '… a pause.',
'二。二。九。': 'Two. Two. Nine.',
'这是一串坐标。没人知道是哪里的。': 'These are coordinates. Nobody knows what for.',
'（一段很慢的曲子，只有几个音。）': '(A very slow tune. Only a few notes.)',
'曲子在重复。纸带上浮出几个淡淡的格子。':
  'The tune repeats. A few faint squares surface on the paper tape.',
'（同一段旋律，又一遍。）': '(The same melody, once more.)',
'这里是灯塔。现在念今晚经过的船。':
  'This is the lighthouse. Now, the ships that passed tonight.',
'"晚钟"号，向北。': 'The Evening Bell, northbound.',
'一艘没有名字的船，灯是暖的。': 'A ship with no name. Its lights are warm.',
'还有你们这艘。看见你们了。': 'And yours. We see you.',
'念完了。灯还亮着。': 'That is all of them. The light stays on.',
'（很低、很长的声音，一会儿升上去。）': '(A very low, very long sound. After a while it rises.)',
'（像是从很远的地方传过来，又绕了一圈。）':
  '(As if it came from far away, and went around once more.)',
'（停了一下，又开始。）': '(It stops a moment, then starts again.)',
'早班邮船广播。': 'Morning mail boat broadcast.',
'邮包里有信，也有空白明信片。': 'The sack holds letters, and blank postcards.',
'广播完毕。': 'End of broadcast.',

/* ---------- data/index.ts : letters ----------
   Each letter is a voice the player never meets. Senders are named by their job,
   the way a stranger signs a note, so the English keeps the role rather than
   inventing a name. */
'船务处': 'Ship\'s Office',
'灯塔看守': 'The Lighthouse Keeper',
'灯塔': 'The Lighthouse',
'温室的前任管理员': 'The Previous Keeper of the Greenhouse',
'一个种过它们的人': 'Someone who grew them once',
'穹顶的常客': 'A Regular in the Dome',
'常在长椅上躺着的人': 'The one usually lying on the bench',
'邻船的厨师': 'The Cook on the Next Ship',
'厨师': 'The cook',
'邮差': 'The Postman',
'另一艘船上的旅客': 'A Passenger on Another Ship',
'同一条航线上的人': 'Someone on the same route',
'八音盒修理匠': 'The Music-Box Repairer',
'修理铺': 'The repair shop',
'港务局': 'The Harbour Authority',
'港务局 · 夜班': 'Harbour Authority · night shift',
'岸的老同事': 'An Old Colleague of An\'s',
'测绘处': 'The Survey Office',
'天气台': 'The weather station',
'（没有署名）': '(unsigned)',
'—': '—',
'在别的船上种花的人': 'Someone Growing Flowers on Another Ship',
'种花的人': 'The one who grows them',
'一张旧船票的背面': 'The Back of an Old Ticket',
'不知道是谁': 'No knowing whose',
'电台室': 'Radio Room',
'值班的人': 'Whoever was on duty',
'对面那艘夜航船': 'The Night Crossing Opposite',
'对面的船': 'The ship opposite',

'欢迎登船。\n本船是一艘环形客船。沿着环廊走一圈，可以进客舱、小厨房、温室、电台室，梯子往上是观景穹顶。\n船上的东西都可以用。面团要等，种子要等，信也要等。等的时候，你不必在。\n邮船大约每两个钟头靠一次舷。':
  'Welcome aboard.\nThis is a ring-shaped passenger ship. Walk the corridor round once and you can enter the cabin, the galley, the greenhouse and the radio room; the ladder goes up to the observation dome.\nEverything on board may be used. Dough takes time. Seeds take time. Letters take time. You do not have to be here while they take it.\nThe mail boat comes alongside about every two hours.',
'你们的船从我这儿经过好几次了。\n夜里十点以后，调到一点三四附近，能听见我念今晚过往的船名。\n念到你们的时候，我会念慢一点。':
  'Your ship has passed me several times now.\nAfter ten at night, tune to around 1.34 and you can hear me read out the ships that went by.\nWhen I come to yours, I read it a little slower.',
'那几盆植物怕快。\n手在旁边晃得快了，叶子会合上。慢慢来，它们会朝你那边歪。\n生长灯开着长得快一些。关了灯，它们就找别的光，比如你的手。':
  'Those plants are afraid of quickness.\nMove your hand near them too fast and the leaves close. Go slowly and they will lean your way.\nThey grow faster with the lamp on. With it off, they look for some other light. Your hand, for instance.',
'穹顶里，先把小灯关掉，然后眼睛别动，等一会儿。\n暗的星要等眼睛适应才出来。\n还有几颗是一阵一阵亮的。线可以先连过去，悬着，等它亮。':
  'In the dome, turn the small lamp off first, then keep your eyes still and wait.\nThe dim stars only come out once your eyes have adjusted.\nA few of them brighten in spells. You can run a line out to one and leave it hanging, waiting for it to light.',
'送了几个星梨过去，酸，配茶正好。\n面团喜欢暖和的地方。刚烧过水、刚烤过东西的厨房最好。\n发过头也没关系，烤出来胖一点而已。':
  'Sent over a few star-pears. Sour. They go well with tea.\nDough likes a warm place. A galley where water has just boiled, or something has just baked, is best.\nOver-proving is no disaster. It only bakes up rounder.',
'这一班没有特别的信。\n附一张空白明信片。想写就写，不想写就留着，夹在哪里都行。':
  'Nothing particular this run.\nA blank postcard enclosed. Write on it if you want to. If you do not, keep it. It can live anywhere.',
'我这边的舷窗朝下，只能看见很远的一片光。\n今天把窗擦了一遍，没擦干净，也就这样了。\n不知道这封信会到谁手里。到了就好。':
  'My porthole faces down. All I can see is a patch of light, far off.\nI wiped the glass today. It did not come clean. So it goes.\nI do not know whose hands this will reach. Reaching them is enough.',
'纸带不必打满。\n空着的格子也是拍子。\n发条往一个方向拧，拧多少圈，它就转多少遍。':
  'The tape does not have to be full.\nAn empty square is also a beat.\nThe spring winds one way. However many turns you give it, that is how many it plays.',
'各航道情况如下：\n近港航道，灯多。星云浅湾，三色航标都有。环带慢道，节奏稳。\n静默段夜里最安静，适合不说话。':
  'Lane conditions as follows.\nNear-Harbour Lane: many lights. Nebula Shallows: beacons in all three colours. Ringbelt Slow Lane: steady rhythm.\nThe Quiet Stretch is quietest at night. Good for not talking.',
'听说她又在画航图。\n她画图从来不画终点，线画到哪儿算哪儿。\n替我问声好。不用回信。':
  'I hear she is drawing charts again.\nShe never draws the destination. The line stops wherever it stops.\nSay hello from me. No need to write back.',
'明日天气：\n无处有雾，局部有星。\n风从左舷来，傍晚转小。\n适合晾衣服，也适合不晾。':
  'Tomorrow:\nFog at Nowhere, stars in places.\nWind off the port side, easing towards evening.\nGood for hanging washing out. Also good for not.',
'如果你在读这封信，说明邮船又绕回来了。\n这一圈和上一圈差不多。窗外的星换了几颗。':
  'If you are reading this, the mail boat has come round again.\nThis circuit is much like the last. A few of the stars outside have changed.',
'我种的月铃今天响了一声，就一声。\n我站着没动，等了很久，它没再响。\n我猜它要的就是这个。':
  'My moonbell rang once today. Just once.\nI stood still and waited a long time. It did not ring again.\nI think that was what it wanted.',
'（字迹很淡）\n"第一次坐夜航船。灯关掉以后，外面原来有这么多东西。"':
  '(the writing is very faint)\n"First time on a night crossing. With the lamp off, it turns out there is all this outside."',
'收音机的魔眼合上的时候，就是调准了。\n有的台只在某些钟点出来，台表会替你记着。':
  'When the radio\'s magic eye closes, you are tuned.\nSome stations only come out at certain hours. The log will remember them for you.',
'前几天在舷窗外看见你们的船了。\n你们的窗是暖色的。我们的也是。\n就写这些。':
  'Saw your ship out the porthole a few days ago.\nYour windows are a warm colour. So are ours.\nThat is all I wanted to say.',

/* ---------- rooms/galley.ts : labels ---------- */
'水壶': 'kettle',
'水龙头（按住）': 'tap (press and hold)',
'炉子': 'stove',
'烤箱': 'oven',
'发酵箱': 'proofing box',
'面板': 'board',
'面粉': 'flour',
'茶杯': 'cup',
'茶叶罐': 'tea jars',
'面包架': 'bread rack',
'挂着的厨具': 'hanging utensils',
'星梨': 'star-pears',
'岸': 'An',

/* ---------- rooms/galley.ts : tea ---------- */
'小厨房。水龙头、炉子、三罐茶叶，还有一袋面粉。':
  'The galley. A tap, a stove, three jars of tea, and a sack of flour.',
'架子上有三罐茶叶，挑一罐。不挑也行，就喝白水。':
  'Three jars of tea on the shelf. Pick one. Or do not, and have plain water.',
'杯里还有茶。喝完再换一种。': 'There is still tea in the cup. Finish it before changing.',
'你舀了一小勺{0}，放进杯里。': 'You spoon a little {0} into the cup.',
'等水开了，按住水壶往杯里倒。':
  'Once the water boils, press and hold the kettle to pour.',
'按住水龙头放水。': 'Press and hold the tap to run water.',
'壶接满了。': 'The kettle is full.',
'接了大半壶。': 'Most of a kettle.',
'接了一点水。': 'A little water.',
'壶在炉子上，水直接流进了水槽。':
  'The kettle is on the stove, so the water runs straight into the sink.',
'壶里没什么水。按住水龙头接一点。':
  'Not much water in the kettle. Press and hold the tap for some.',
'壶里没什么水。': 'Not much water in the kettle.',
'你把水壶放上炉子。': 'You set the kettle on the stove.',
'炉子的旋钮在下面。': 'The stove knob is below.',
'水还在烧。': 'Still heating.',
'水还热着。': 'The water is still hot.',
'按住水壶，往杯子里倒。': 'Press and hold the kettle to pour.',
'水壶放回水槽边。': 'The kettle goes back beside the sink.',
'火点上了。水壶开始轻轻响。':
  'The flame catches. The kettle starts to tick quietly.',
'炉火开着，上面什么也没有。': 'The burner is lit with nothing on it.',
'火关了。': 'The flame is out.',
'水开了。蒸汽扑上舷窗，起了一层雾。':
  'The water boils. Steam hits the porthole and fogs it over.',
'厨房的水壶响了。': 'The kettle is whistling in the galley.',
'泡了一杯{0}': 'brewed a cup of {0}',
'倒了一杯热水。': 'A cup of hot water.',
'水倒进去了。': 'The water goes in.',
'按住久一点，才倒得出来。': 'Hold it longer to pour.',
'满了，溢出来一点。你甩了甩手。':
  'Full, and a little over. You shake your hand off.',
'杯子满了。': 'The cup is full.',
'壶倒空了。': 'The kettle is empty.',
'杯子是空的。': 'The cup is empty.',
'杯子是空的。茶在小厨房泡。': 'The cup is empty. Tea is brewed in the galley.',
'茶很烫，先捧在手里。': 'Too hot. You hold it a while first.',
'茶凉了一点，正好入口。': 'Cooled a little. About right.',
'还淡，叶子才刚开始舒展。': 'Still weak. The leaves have only begun to open.',
'喝完了。': 'Finished.',
'喝完了。杯底剩几片叶子。': 'Finished. A few leaves left in the bottom.',
'杯底剩几片茶叶。想换一种，就点茶叶罐。':
  'A few leaves in the bottom. Tap a jar to change kinds.',

/* ---------- rooms/galley.ts : bread ---------- */
'舀两勺面粉，加水，和成一团。':
  'Two scoops of flour, water, and work it into a lump.',
'在面团上左右来回拖，慢慢揉。':
  'Drag back and forth across the dough. Knead slowly.',
'面团已经在板上了。': 'The dough is already on the board.',
'面粉袋还有大半袋。': 'The sack is still most full.',
'板上空着。面粉袋在右边。': 'The board is empty. The flour is on the right.',
'太急了，面团有点粘手。慢一点推。':
  'Too quick. The dough sticks. Push slower.',
'面团光滑了，按一下会慢慢弹回来。':
  'The dough is smooth. Press it and it comes back slowly.',
'面团开始不粘手了。': 'The dough stops sticking.',
'揉好了。挑一个形状。': 'Kneaded. Pick a shape.',
'团成一个圆面包。': 'Rounded into a loaf.',
'搓成长长的一条。': 'Rolled out long.',
'分成三股，编成辫子。': 'Split in three and braided.',
'团成圆的': 'round',
'搓成长的': 'long',
'编成辫子': 'braided',
'再点一下面团，放进发酵箱。': 'Tap the dough again to put it in the proofing box.',
'你把面团放进发酵箱，关上小门。它要自己待一阵，大约二十分钟。你可以走开。':
  'You put the dough in the proofing box and shut the little door. It needs a while to itself, about twenty minutes. You can go.',
'揉好一团面，放进发酵箱': 'kneaded dough and set it to prove',
'面团在上面的发酵箱里。': 'The dough is up in the proofing box.',
'面团在烤箱里。': 'The dough is in the oven.',
'面团鼓起来一些了。大概还要 {0} 分钟。':
  'The dough has risen a little. About {0} minutes more.',
'厨房暖，发得快。': 'The galley is warm. It proves faster.',
'面团发好了，胖胖的。你把它挪进烤箱。':
  'The dough has proved, round and full. You move it into the oven.',
'拧一下烤箱的旋钮。': 'Turn the oven knob.',
'发酵箱空着，里面暖烘烘的。': 'The proofing box is empty, and warm inside.',
'发酵箱里的面团发好了。': 'The dough in the proofing box has proved.',
'烤箱开了。玻璃后面亮起橙色的光。':
  'The oven is on. Orange light comes up behind the glass.',
'闻到香味了。再等一下。': 'You can smell it now. A little longer.',
'刚开始烤。': 'Only just started.',
'面团还在发酵箱里。': 'The dough is still in the proofing box.',
'烤箱是空的。': 'The oven is empty.',
'烤好一个面包': 'baked a loaf',
'叮。面包烤好了，放在左边的架子上晾着。':
  'Ding. The bread is done, cooling on the rack to the left.',
'好香。': 'It smells good.',
'厨房那边"叮"了一声。面包烤好了。':
  'A ding from the galley. The bread is done.',
'架子上空着。面团烤好了会放在这里。':
  'The rack is empty. Bread goes here when it is baked.',
'盘子空了。': 'The plate is empty.',
'面包还是温的，外皮脆。': 'Still warm, with a crisp crust.',
'面包凉了，嚼起来有麦子的甜。':
  'Cooled now, and sweet with wheat when you chew it.',
'你掰了一半给岸。': 'You break off half for An.',
'谢谢。我在图边上画个面包，记着。':
  'Thank you. I will draw a loaf in the margin of the chart, to remember.',
'又是你烤的。图边上的面包快排成一排了。':
  'Yours again. The loaves in the margin are nearly a row.',
'分了半个面包给岸': 'gave An half a loaf',

/* ---------- rooms/galley.ts : pears + An ---------- */
'果盘空了。邻船下一班会再送一些。':
  'The dish is empty. The next ship over will send more.',
'咬了一口星梨。很酸，水很多。': 'A bite of star-pear. Very sour, very wet.',
'咬了一口星梨。': 'A bite of star-pear.',
'又一口。': 'Another bite.',
'吃完了。核放在碟子边上。': 'Finished. The core goes on the edge of the dish.',
'早。': 'Morning.',
'早。我在这儿吃早饭，你随便用厨房。':
  'Morning. I am having breakfast. Use the galley however you like.',

/* ---------- rooms/cabin.ts : labels ---------- */
'舱门（回环廊）': 'cabin door (back to the ring)',
'舷窗（长按哈气）': 'porthole (hold to breathe on it)',
'舷窗': 'porthole',
'灯绳': 'lamp cord',
'毯子': 'blanket',
'盆栽': 'potted plant',
'花瓶': 'vase',
'航道牌': 'route card',
'船票': 'Ticket',
'提灯': 'lantern',
'面包': 'bread',
'夜航': 'Night Crossing',
'航 道': 'LANE',
'<span class="rcur">当前</span>': '<span class="rcur">current</span>',

/* ---------- rooms/cabin.ts : the lamp and the window ----------
   The three lamp settings are the room's quietest rule: the brighter the cabin,
   the less of the outside the glass will give you. The copy states the trade,
   never the feeling. */
'客舱。舱灯开着，窗玻璃上映着舱里的东西。':
  'The cabin. With the lamp on, the glass holds a reflection of the room.',
'客舱里很静。岸已经睡了。': 'The cabin is quiet. An is already asleep.',
'左边是舱门。出去是环廊，沿着它能走到别的舱。':
  'The door is on the left. Outside is the ring corridor, and every other room along it.',
'灯罩下面垂着一根灯绳。': 'A cord hangs under the shade.',
'灯暗了一档。窗外的星星浮出来一些。':
  'The lamp drops a notch. Some of the stars outside come up.',
'灯熄了。窗外的东西一下子清楚了。':
  'The lamp is out. Everything outside comes clear at once.',
'灯熄了。': 'The lamp is out.',
'灯亮了。倒影又回到玻璃上。':
  'The lamp is on. The reflection comes back to the glass.',
'灯亮了。': 'The lamp is on.',
'灯调到中间那档。': 'The lamp goes to the middle notch.',
'玻璃上只有舱里的倒影。': 'The glass holds only the room.',
'玻璃上只有舱里的倒影，看不清外面。':
  'The glass holds only the room. You cannot see out.',
'那里只有星星。航标隔一阵会从右边漂过来。':
  'Only stars there. A beacon drifts past on the right every so often.',
'你对着玻璃哈了一口气。起雾的地方可以画。':
  'You breathe on the glass. You can draw where it fogs.',
'指尖在雾上划过。划开的地方透出外面的星星。':
  'Your fingertip goes through the fog. The stars outside come through where it opens.',

/* ---------- rooms/cabin.ts : beacons and the lantern ---------- */
'窗外有一盏灯在闪。闪{0}下，停一停。':
  'A light is blinking outside. {0}, then a pause.',
'它每轮闪{0}下。提灯底座上也有刻痕。':
  'It blinks {0} each round. There are notches on the lantern base too.',
'提灯转到{0}那一格。底座上有{1}道刻痕。':
  'The lantern turns to {0}. {1} notches on the base.',
'那盏灯亮了一下，回了一声。舱顶的灯串上多了一颗{0}的灯。':
  'The light flares once and answers. One more {0} bulb on the string overhead.',
'那盏灯照着自己的节奏，又闪了几下。':
  'The light keeps its own rhythm and blinks a few more times.',
'这盏已经回过你了。它的光现在是稳的。':
  'This one has already answered you. Its light is steady now.',
'回应了一盏「{0}」': 'answered an {0}',
'又一盏"{0}"。我在图上点了个点。':
  'Another {0}. I have put a dot on the chart.',
'刚才你回应的那盏灯，我认得。点我一下，我跟你说。':
  'That light you answered, I know it. Tap me and I will tell you.',

/* ---------- rooms/cabin.ts : route, blanket, vase, plant ---------- */
'前面要分岔了。往哪边走都行，我都画。':
  'There is a fork ahead. Either way is fine. I draw them both.',
'航道改为「': 'lane changed to ',
'」': '',
'照现在这样走。': 'Carry on as we are.',
'船身微微一斜，开始转弯。': 'The ship tilts a little and begins to turn.',
'那条毯子是船上的，随便用。': 'That blanket belongs to the ship. Use it.',
'你把毯子拿过来，搭在腿上。毯子有点旧，很厚。':
  'You pull the blanket over your legs. It is old, and thick.',
'你好一会儿没动。岸把毯子拿过来，搭在你腿上。':
  'You have not moved in a while. An brings the blanket over and lays it across your legs.',
'毯子叠好，放回长椅上。': 'The blanket is folded back onto the bench.',
'一只空的小花瓶。温室里的花开了，可以剪一枝来。':
  'A small empty vase. When something flowers in the greenhouse, you can cut a stem for it.',
'瓶子还空着。': 'The vase is still empty.',
'星藤的花在瓶里亮着，五个尖。':
  'The starvine flower glows in the vase, five points.',
'月铃垂在瓶口。碰一下，它轻轻响了。':
  'A moonbell hangs over the lip. Touch it and it rings, softly.',
'一枝雾蕨，叶尖上挂着水珠。':
  'A sprig of mistfern, a drop of water on each leaf tip.',
'盆土是湿的，有人浇过水。': 'The soil is damp. Someone has watered it.',
'叶子晃了晃。': 'The leaves sway.',
'叶子背面有一层细绒毛。': 'There is a fine down on the underside of the leaves.',
'一片新叶还卷着。': 'One new leaf is still curled.',
'岸把航图盖在腿上，睡着了。':
  'An has fallen asleep with the chart over her knees.',
'岸拧亮了自己的小灯。': 'An turns her own small lamp up.',
'岸醒了，揉了揉眼睛。': 'An wakes and rubs her eyes.',

/* ---------- rooms/green.ts ----------
   The greenhouse rule: with the grow lamp off, a plant leans toward a slow hand
   and shuts at a fast one. The copy reports the leaf, not the lesson. */
'种子盒': 'seed box',
'花盆': 'pots',
'生长灯': 'grow lamp',
'喷壶': 'watering can',
'放下喷壶': 'put the can down',
'植物': 'plant',
'种子': 'SEEDS',
'温室。五个空花盆，一盒种子，一只喷壶。':
  'The greenhouse. Five empty pots, a box of seeds, a watering can.',
'盆先空着。': 'The pot stays empty for now.',
'五个盆都种上了。': 'All five pots are planted.',
'你把一颗{0}的种子按进土里，盖上一层。':
  'You press a {0} seed into the soil and cover it over.',
'种下一颗{0}': 'planted a {0}',
'种在第 {0} 个盆里。它们长得慢，长的时候你不必在旁边。':
  'Planted in pot {0}. They grow slowly, and you do not have to be here while they do.',
'它会自己长。土干了就停一停，喷点水又接着长。':
  'It grows on its own. When the soil dries it pauses; water it and it carries on.',
'拿起喷壶。点哪一盆，就喷哪一盆。':
  'You pick up the can. Tap a pot to water it.',
'又喷了一层水雾。': 'Another fine mist.',
'只喷湿了空盆里的土。': 'You only dampen the soil in an empty pot.',
'干了的土一下子吸饱了水。': 'The dry soil drinks it straight down.',
'叶子上挂满了细细的水珠。': 'The leaves hang full of fine beads of water.',
'土是干的。它停着，在等水。': 'The soil is dry. It has stopped, waiting for water.',
'有一盆土干了。': 'One pot has dried out.',
'有 {0} 盆土干了。': '{0} pots have dried out.',
'生长灯亮了，粉色的光。植物在这种光下长得快一点。':
  'The grow lamp comes on, pink. Plants grow faster under it.',
'生长灯关了。': 'The grow lamp is off.',
'生长灯关了。温室暗下来，只剩窗外的光，和你手边一点光。':
  'The grow lamp is off. The greenhouse darkens: only the light from outside, and the little there is at your hand.',
'那盆植物慢慢朝你手边的光歪过来。':
  'The plant leans slowly toward the light at your hand.',
'叶子一下子合上了。': 'The leaves shut all at once.',
'它们怕快。手慢一点，它们会再打开。':
  'They are afraid of quickness. Slow your hand and they will open again.',
'你把花盆转了半圈。它原本朝窗那边歪，现在要重新长直。':
  'You turn the pot half around. It had been leaning toward the window; now it has to straighten itself again.',
'花盆转了半圈。': 'The pot is turned half around.',
'你剪下一枝{0}，插到客舱桌上的小瓶里。这一株过一阵还会再开。':
  'You cut a stem of {0} for the little vase on the cabin table. This one will flower again in time.',
'剪了一枝{0}放进客舱的花瓶': 'cut a stem of {0} for the cabin vase',
'土里刚冒出一点绿。': 'A little green has just come up out of the soil.',
'一根细藤，往木棍上绕了半圈。': 'A thin vine, half a turn round the stake.',
'藤尖卷住了你的手指一下，又松开。':
  'The tip curls round your finger once, then lets go.',
'两片圆叶子贴着土。': 'Two round leaves lie flat against the soil.',
'三根细茎分开，各长各的方向。':
  'Three thin stems part, each growing its own way.',
'茎尖垂下来，像要挂什么东西。':
  'The stem tips bend over, as if to hang something.',
'茎有点软，摸起来凉。': 'The stem is soft, and cool to touch.',
'月铃响了一声。': 'A moonbell rings, once.',
'一个卷着的小拳头，从土里探出来。':
  'A small curled fist comes up out of the soil.',
'嫩叶一圈一圈地打开。': 'The new leaf opens turn by turn.',
'叶子展开了，边上是细细的锯齿。':
  'The leaf is open, finely toothed along the edge.',
'叶背面有一排小点。': 'There is a row of small dots on the underside.',
'叶子一对一对的。顶上有个小花苞。':
  'The leaves come in pairs. There is a small bud at the top.',
'雾蕨冒出一小团雾，慢慢散开。':
  'The mistfern puts out a small cloud of fog that slowly spreads.',
'你来了。': 'There you are.',
'中午我在这儿看书。别管我，你忙。':
  'I read here at midday. Do not mind me. Go on.',

/* ---------- rooms/radio.ts ---------- */
'开关': 'power',
'调频旋钮': 'tuning knob',
'刻度盘': 'dial',
'台表': 'station log',
'台 表': 'STATIONS',
'台灯': 'desk lamp',
'耳机': 'headphones',
'八音盒纸带': 'music-box tape',
'摇柄（画圈）': 'crank (draw circles)',
'发条': 'SPRING',
'航频 · MHz': 'BAND · MHz',
'电台室。一台老收音机，一只八音盒，一条还没打孔的纸带。':
  'The radio room. An old set, a music box, and a tape with no holes in it yet.',
'收音机开了。': 'The radio is on.',
'收音机关了。': 'The radio is off.',
'收音机亮了，先是一阵沙沙声。':
  'The set lights up. Static first.',
'旋钮转了，但收音机还没开。': 'The knob turns, but the set is off.',
'左右拖动右边的大旋钮调频。魔眼合上的时候，就是调准了。':
  'Drag the big knob on the right to tune. When the magic eye closes, you are on it.',
'用鼠标拖动旋钮会快很多。': 'Dragging the knob with a mouse is much quicker.',
'这个频率上只有很远的沙沙声。也许不是时候。':
  'Only distant static on this frequency. Perhaps the wrong hour.',
'「{0}」这会儿不播（{1}）。只有很远的沙沙声。':
  '{0} is not broadcasting now ({1}). Only distant static.',
'收到了：「{0}」。台表上多了一行。':
  'Receiving: {0}. One more line in the log.',
'在 {0} 收到「{1}」': 'picked up {1} at {0}',
'台表还是空的。调到一个台，它会自己记上。':
  'The log is still empty. Tune to a station and it writes itself in.',
'台表上记了 {0} 个台，一共有 {1} 行。有的台只在某些钟点出来。':
  '{0} of {1} lines filled in. Some stations only come out at certain hours.',
'下一班邮船大约 {0} 靠舷。': 'The next mail boat comes alongside around {0}.',
'信箱里现在有 {0} 封。': 'There are {0} in the box now.',
'台灯亮了。': 'The desk lamp is on.',
'台灯关了。收音机的刻度盘成了屋里最亮的东西。':
  'The desk lamp is off. The dial is now the brightest thing in the room.',
'你戴上耳机。别的声音一下子远了。':
  'You put the headphones on. Everything else goes far away at once.',
'摘下耳机': 'take the headphones off',
'耳机挂回钩子上。': 'The headphones go back on their hook.',
'用鼠标点纸带上的格子打孔；再点一次可以糊上。':
  'Click a square on the tape to punch it. Click again to patch it over.',
'纸带上打了一个孔。上紧发条，它就会响。':
  'One hole in the tape. Wind the spring and it will sound.',
'这个孔被你用纸片糊上了。': 'You patch the hole over with paper.',
'纸带上浮出几个淡淡的格子，跟着曲子的拍子。':
  'A few faint squares surface on the tape, in time with the tune.',
'淡淡的格子都打上了。这段曲子现在是你纸带上的了。':
  'Every faint square is punched. The tune belongs to your tape now.',
'把「星港夜曲」的一段抄在了八音盒纸带上':
  'copied a passage of Starport Nocturne onto the tape',
'按住摇柄，绕着它画圈。': 'Hold the crank and draw circles around it.',
'发条只能往一个方向拧。顺着钟表走的方向转。':
  'The spring only winds one way. Go the way a clock goes.',
'发条上了一圈。': 'One turn on the spring.',
'发条上了 {0} 圈。八音盒开始转。':
  '{0} turns on the spring. The music box starts.',
'发条上满了。': 'The spring is fully wound.',
'发条走完了，八音盒停下来。': 'The spring runs out and the music box stops.',
'纸带上还没有孔，只听见齿轮在转。':
  'No holes in the tape yet. Only the gears turning.',

/* ---------- rooms/dome.ts ----------
   Dark adaptation is the rule here: hold still with the lamp off and fainter
   stars appear. A line may be left hanging on empty sky, waiting. */
'小灯': 'small lamp',
'星空：点星连线': 'the sky: tap stars to join them',
'长椅（躺下）': 'bench (lie down)',
'停笔': 'stop drawing',
'擦掉最后一笔': 'rub out the last line',
'给这组起名': 'name this group',
'关掉小灯': 'turn the lamp off',
'打开小灯': 'turn the lamp on',
'躺下': 'lie down',
'坐起来': 'sit up',
'观景穹顶。头顶全是星星。小灯开着的时候，只看得见亮的那些。':
  'The observation dome. Stars the whole way overhead. With the small lamp on, only the bright ones show.',
'小灯亮了。玻璃上又有了倒影。':
  'The small lamp is on. The glass has a reflection again.',
'小灯熄了。': 'The small lamp is out.',
'小灯熄了。先别急，眼睛要一会儿才适应。':
  'The small lamp is out. Give it a moment; your eyes take a while.',
'眼睛慢慢适应了。更暗的星浮出来了。':
  'Your eyes adjust. Fainter stars come up.',
'手别动。眼睛跟着手跑，就看不见暗的了。':
  'Keep your hand still. If your eyes follow it, the faint ones go.',
'光标一晃，眼睛就跟着动。停一停试试。':
  'The cursor moves and your eyes go with it. Try holding still.',
'你在长椅上躺下来。整片穹顶都在眼睛上面。':
  'You lie down on the bench. The whole dome is above your eyes.',
'你坐起来。': 'You sit up.',
'用鼠标在星空里点星，连线。': 'Click stars in the sky to join them up.',
'先点一颗星。': 'Tap a star first.',
'选中了一颗星。再点另一颗，连一条线。点空处，线就悬在那儿。':
  'A star is chosen. Tap another to draw a line. Tap empty sky and the line hangs there.',
'连上了。可以接着往下连，也可以再点一下这颗星停笔。':
  'Joined. Carry on from here, or tap this star again to stop.',
'线停在了空处，悬着。也许那里以后会亮起一颗星，也许不会。':
  'The line stops on empty sky and hangs. A star may come up there later. It may not.',
'从悬着的那一头接着画。': 'Carry on from the hanging end.',
'这一笔先到这里。': 'That line stops here for now.',
'这一笔悬在那儿。': 'That line is left hanging.',
'那根悬着的线，落在了一颗刚亮起来的星上。':
  'The hanging line comes down on a star that has just lit.',
'一根悬着的星线落在了一颗变星上': 'a hanging line found a variable star',
'那里看不见星星。小灯开着，暗的星都藏起来了。':
  'No star to see there. With the small lamp on, the faint ones stay hidden.',
'在穹顶连了第一笔星线': 'drew a first line in the dome',
'你连过的星线还在头顶。': 'The lines you drew are still overhead.',
'你连过的星线这会儿转到别处去了。过一阵，它们会转回来。':
  'Your lines have turned away for now. They will come back round.',
'星图上写了一行小字：「{0}」。':
  'A line of small writing goes on the chart: {0}.',
'给一组星线起名「{0}」': 'named a group {0}',
'就让它没名字。': 'Leave it unnamed.',
'晚上我在这儿对图。把灯关了，眼睛别动，等一会儿。':
  'I check the chart here at night. Turn the lamp off, keep your eyes still, and wait a while.',
'来了。': 'You came.',

/* ---------- rooms/corridor.ts ---------- */
'信箱': 'mailbox',
'船钟': "ship\'s bell",
'布告板': 'noticeboard',
'穹顶梯': 'dome ladder',
'舷窗长椅': 'window bench',
'那艘船': 'that ship',
'站起来': 'stand up',
'环廊 · ': 'Ring corridor · ',
'本船须知': 'SHIP\'S NOTICES',
'航行日志': "SHIP\'S LOG",
'观景穹顶 ↑': 'OBSERVATION DOME ↑',
'信': 'MAIL',
'MAIL · 寄出↓': 'MAIL · OUTGOING↓',
'还没有记录。': 'Nothing written down yet.',
'航行第 {0} 夜': 'Night {0} of the crossing',
'船钟指着 {0}。航行第 {1} 夜。': 'The bell reads {0}. Night {1} of the crossing.',
'（{0} 封）': '({0})',
/* The four notices are set one line each, in a column, on the board. Kept short
   enough to hold the same shape in English. */
'一　东西都可以碰。': '1 Touch anything.',
'二　没有什么会坏。': '2 Nothing breaks.',
'三　等的时候，': '3 While it waits,',
'　　可以走开。': '  you may go.',
'四　困了就睡。': '4 Sleep if tired.',
'你在长椅上坐下。': 'You sit down on the bench.',
'你在长椅上坐下。星星从窗的一边转到另一边：这艘船在自己转。':
  'You sit down on the bench. The stars cross from one side of the window to the other: the ship is turning on itself.',
'你从长椅上站起来。': 'You get up from the bench.',
'坐着别动，窗外有时会经过别的东西。':
  'Sit still a while and other things go past the window.',
'窗外远处，有另一艘船的灯慢慢移过来。':
  'Far out, the lights of another ship come slowly across.',
'你朝那艘船挥了挥手。它的窗灯一盏盏眨了一下。':
  'You wave at the ship. Its windows blink, one after another.',
'那艘船的窗灯又眨了一下。': 'The ship\'s windows blink again.',
'在舷窗看见另一艘夜航船，它眨了眨窗灯':
  'saw another night crossing from the window, and it blinked back',
'夜深了，岸多半在上面的穹顶，或者睡了。':
  'It is late. An is most likely up in the dome, or asleep.',
'<g class="st" data-i="{0}" tabindex="0" role="button" aria-label="走到{1}"><circle cx="{2}" cy="{3}" r="{4}" fill="{5}"/><circle cx="{6}" cy="{7}" r="12" fill="transparent"/></g>':
  '<g class="st" data-i="{0}" tabindex="0" role="button" aria-label="walk to {1}"><circle cx="{2}" cy="{3}" r="{4}" fill="{5}"/><circle cx="{6}" cy="{7}" r="12" fill="transparent"/></g>',

/* ---------- rooms/registry.ts : rooms and stations ---------- */
'环廊': 'Ring corridor',
'客舱': 'Cabin',
'小厨房': 'Galley',
'温室': 'Greenhouse',
'观景穹顶': 'Observation dome',
'客舱门': 'cabin door',
'小厨房门': 'galley door',
'温室门': 'greenhouse door',
'电台室门': 'radio room door',
'信箱与船钟': 'mailbox and bell',

/* ---------- characters/an-lines.ts ----------
   An is a cartographer who is drawing this leg of the route. She offers what she
   knows about the ship and never comments on the player. */
'这趟船走得慢。我在画这一段的航图，你忙你的就好。':
  'This ship goes slowly. I am drawing the chart for this leg. Go on with whatever you were doing.',
'舱里亮着的时候，窗户只照得出我们自己。':
  'With the cabin lit, the window only gives us back ourselves.',
'外面那些是航标。拿桌上的提灯照它一下，颜色对上了，它会回你。':
  'Those outside are beacons. Shine the lantern from the table at one. Match its colour and it answers.',
'想换航道，点一下航道牌，或者我腿上的图。':
  'To change lanes, tap the route card, or the chart on my knees.',
'我一天里会到处走。早上在厨房，中午在温室，夜深了上穹顶。':
  'I move about over the day. The galley in the morning, the greenhouse at midday, the dome when it gets late.',
'我画图不急。航线自己会长出来。':
  'I am in no hurry with the chart. The route grows itself.',
'困了就睡。下船前我会叫你。':
  'Sleep if you are tired. I will wake you before we dock.',
'这张图画完，我也不知道要寄给谁。先画着。':
  'When this chart is done I will not know who to send it to. I draw it anyway.',
'她睡着了，呼吸很慢。航图从膝盖上滑下来一点。':
  'She is asleep, breathing slowly. The chart has slid a little off her knees.',
'早上的厨房最暖。面团放这儿发得快。':
  'The galley is warmest in the morning. Dough proves quickly here.',
'星梨是邻船送的。酸，配茶正好。':
  'The star-pears came from the next ship over. Sour. They go well with tea.',
'水壶把手烫，拿的时候小心。':
  'The kettle handle gets hot. Mind it.',
'我早上就吃一片面包。你烤的话，分我一点。':
  'I only have a slice of bread in the morning. If you bake, spare me some.',
'这几盆怕快。你手慢一点，它们会朝你歪。':
  'These are afraid of quickness. Slow your hand and they will lean your way.',
'生长灯开着长得快。关了，它们就找别的光。':
  'They grow faster with the lamp on. With it off, they look for some other light.',
'我只是在这儿看书。浇水的事归你。':
  'I am only reading here. The watering is yours.',
'花开了可以剪一枝，插到客舱的小瓶里。':
  'When one flowers you can cut a stem for the little vase in the cabin.',
'把灯关了，眼睛别动，等一会儿。暗的星要等。':
  'Turn the lamp off, keep your eyes still, and wait a while. The faint stars need waiting for.',
'有几颗星一阵一阵亮的。线可以先连过去，悬着。':
  'A few of them brighten in spells. You can run a line out and leave it hanging.',
'这些星一天转一圈。你连的线，明天这个时候又会转回头顶。':
  'These turn once a day. The lines you draw come back overhead at this hour tomorrow.',
'我在对图。你连你的。': 'I am checking the chart. Draw yours.',
'港口的灯还看得见，再过一会儿就没了。':
  'The harbour lights are still in sight. Not for much longer.',
'这条船的舵是自己转的。我们只管坐着。':
  'This ship steers itself. We only sit.',
'星云里的声音好像传得远一些。至少看起来是这样。':
  'Sound seems to carry further in the nebula. It seems that way, at least.',
'这片雾每次经过都不太一样。':
  'This fog is a little different every time we pass through it.',
'环带上的碎冰，被灯一照就亮。':
  'The broken ice on the ringbelt lights up when the lamp catches it.',
'绕完这半圈要很久。不着急。':
  'This half-turn takes a long time. No hurry.',
'……': '…',

/* ---------- state/progress.ts : what happens while you are away ---------- */
'星藤冒芽了': 'the starvine has sprouted',
'星藤往木棍上爬了一截': 'the starvine has climbed a stretch of the stake',
'星藤的叶子长满了': 'the starvine is full of leaves',
'星藤开花了，花是五个尖的': 'the starvine has flowered, five points to it',
'月铃冒出两片圆叶': 'the moonbell has put out two round leaves',
'月铃的细茎分开了': 'the moonbell\'s stems have parted',
'月铃的茎尖垂下来': 'the moonbell\'s stem tips have bent over',
'月铃挂上了铃': 'the moonbell has hung its bells',
'雾蕨探出一个卷着的嫩芽': 'the mistfern has put out a curled shoot',
'雾蕨打开了第一片叶': 'the mistfern has opened its first leaf',
'雾蕨的叶子一圈圈展开': 'the mistfern is opening turn by turn',
'雾蕨全展开了，叶尖挂着水珠':
  'the mistfern is fully open, a drop of water on each leaf tip',
'杯里的茶泡开了。': 'The tea in the cup has steeped.',
'发酵箱里的面团发好了，胖了一圈。':
  'The dough in the proofing box has proved, a size rounder.',
'邻船又送来几个星梨，果盘满了一些。':
  'The next ship over sent more star-pears. The dish is fuller.',
'{0}的土干了，它停下来等水。':
  'The {0} soil has dried out. It has stopped to wait for water.',
'{0}又开了。': 'The {0} has flowered again.',
'八音盒转完了，停在那儿。':
  'The music box ran down and stopped where it was.',
'邮船靠了一次舷。信箱里多了一封信。':
  'The mail boat came alongside once. One more letter in the box.',
'收到一封信：{0}': 'a letter arrived: {0}',
'你写的明信片随邮船走了。': 'Your postcard went off with the mail boat.',
'明信片随邮船寄出': 'postcard went out with the mail boat',

/* ---------- boot.ts : the door screen ---------- */
'登船': 'Board',
'再次登船': 'board again',
'回到船上': 'Back aboard',
'回到船上了。': 'Back aboard.',
'正在找你的船票…': 'Finding your ticket…',
'声音 开': 'Sound on',
'声音 关': 'Sound off',
'末班船离港了。下一站很远，船会自己开。':
  'The last boat has left. The next stop is far off. The ship sails itself.',
'欢迎回来。船一直在走。': 'Welcome back. The ship has kept going.',
'上次下船是 {0}前。': 'You went ashore {0} ago.',
'面团、种子、信件和星线，都在你离开时的地方，只是多走了一段时间。':
  'The dough, the seeds, the letters and the star-lines are where you left them. They have only had more time.',
'夜航 No.{0} · 第 {1} 夜。东西不会因为你没来而坏掉。':
  'Night Crossing No.{0} · night {1}. Nothing spoils because you were not here.',

/* ---------- ui/settings.ts ---------- */
'开': 'on',
'关': 'off',
'完整': 'full',
'减少': 'reduced',
'清空': 'Clear',
'再点一次，确认清空': 'Tap again to confirm',
'这次不会保存': 'not saved this time',
'存在你的账户里（只有你看得见）': 'in your account (only you can see it)',
'存在这个浏览器里': 'in this browser',
'账户存档暂时连不上，先存在本浏览器':
  'account save unreachable for now; kept in this browser',
'时间流速 ×20（测试用）。': 'Time speed ×20 (for testing).',
'时间流速恢复 ×1。': 'Time speed back to ×1.',

/* ---------- ui/away.ts ---------- */
'你不在的时候': 'While you were away',
'你回来了': 'You came back',
'你回来了。': 'You came back.',
'船还在走。': 'The ship is still going.',
'这些都不用急着处理。': 'None of this needs attending to.',
'船走了 {0}。岸的航图又长了一段。':
  'The ship went on for {0}. An\'s chart grew another stretch.',
'杯里的茶凉了。': 'The tea in the cup has gone cold.',
'岸这会儿在小厨房。': 'An is in the galley just now.',
'岸这会儿在温室。': 'An is in the greenhouse just now.',
'岸这会儿在客舱。': 'An is in the cabin just now.',
'岸这会儿在穹顶上。': 'An is up in the dome just now.',
'岸在客舱里睡着了。': 'An has fallen asleep in the cabin.',
'星空转过去了一些。你连的星线，每天这个钟点会回到头顶。':
  'The sky has turned a little. The lines you drew come back overhead at this hour each day.',

/* ---------- ui/ticket.ts + the ending ---------- */
'首次登船': 'First boarded',
'这次': 'This time',
'{0} 登船': 'boarded {0}',
'航程': 'Crossing',
'第 {0} 夜 · 共航行 {1}': 'night {0} · {1} sailed in all',
'航道': 'Lane',
'灯串': 'Bulb string',
'厨房': 'Galley',
'茶 {0} 杯 · 面包 {1} 个': '{0} cups of tea · {1} loaves',
' · 分给岸 {0} 次': ' · shared with An {0} times',
'读过 {0} 封 · 寄出 {1} 张': '{0} read · {1} sent',
'电台': 'Radio',
'台表记了 {0} / {1}': '{0} of {1} logged',
'穹顶': 'Dome',
'星线 {0} 笔': '{0} star-lines',
'：': ': ',
'「{0}」': '"{0}"',
'留下的': 'Left behind',
'星线': 'star-lines',
'票背面': 'Back of the ticket',
'票背面（可以空着）': 'Back of the ticket (may be left empty)',
'（空着）': '(empty)',
'可以写窗外看见的东西，也可以写一个想去的地方。真的假的都行。':
  'Something you saw out the window, or a place you would like to go. True or not.',
'第{0}夜': 'NIGHT {0}',
'还没有。窗外的灯会一直经过。':
  'None yet. The lights outside keep going past.',
'　你忙的时候，窗外经过了 {0} 盏灯。':
  ' While you were busy, {0} lights went past the window.',
'今天就到这里': 'That is all for today',
'船会继续航行。': 'The ship keeps going. ',
'面团在发酵箱里': 'the dough is in the proofing box',
'{0} 盆植物还在长': '{0} plants are still growing',
'有星线悬着': 'a star-line is left hanging',
'明信片在寄出口': 'a postcard is in the outgoing slot',
'，它们不急。': ' — none of them in a hurry. ',
'关掉这一页就行，航程已经存好；下次打开，船还在原处。':
  'Closing this page is enough. The crossing is saved; open it again and the ship is where it was.',

/* ---------- ui/mail.ts ---------- */
'新到': 'new',
'{0} 靠舷': 'alongside {0}',
'空着。下一班邮船大约 {0} 靠舷。':
  'Empty. The next mail boat comes alongside around {0}.',
'读过的': 'Read',
'寄出': 'Outgoing',
'写一张明信片': 'Write a postcard',
'写给谁都行，可以不写': 'to anyone, or to no one',
'明信片': 'Postcard',
'已随 {0} 的邮船离开': 'left on the {0} mail boat',
'在寄出口，等下一班邮船': 'in the slot, waiting for the next boat',
'写给谁都行，也可以写给一颗星、一艘船。真的假的都可以。不写也能寄。':
  'To anyone, or to a star, or to a ship. True or not. It will send blank.',
'窗外今天……': 'Out the window today…',
'投进寄出口': 'Put it in the slot',
'写了一张明信片，投进寄出口': 'wrote a postcard and put it in the slot',
'寄出一张空白明信片': 'sent a blank postcard',
'明信片投进寄出口了。下一班邮船会带走它。':
  'The postcard is in the slot. The next mail boat will take it.',
'已寄出<br>{0}': 'sent<br>{0}',
'待寄': 'to send',
'你的明信片': 'Your postcard',
'{0} {1} 写': 'written {0} {1}',
'（空白）': '(blank)',
'邮戳<br>{0}<br>{1}': 'postmark<br>{0}<br>{1}',
'寄 夜航 No.{0}': 'to Night Crossing No.{0}',

/* ---------- misc ---------- */
'一': 'once',
'两': 'twice',
'三': 'three times',
'四': 'four times',
'五': 'five times',
'<i>你在忙，船在走</i>': '<i>you are busy, the ship sails on</i>',
'你回来看了一眼。刚才的 {0} 分钟里，船一直在走。':
  'You looked in. For those {0} minutes, the ship kept going.',
'也可以按住环廊左右拖。': 'You can also hold and drag the corridor left or right.',
'沿环走 · 点圆点直达': 'walk the ring · tap a dot to go straight there',

/* ---------- index.html : the door screen, HUD, panels, the ending ---------- */
'夜航·长航': 'Night Crossing · Long Haul',
'NIGHT CROSSING · 长航': 'NIGHT CROSSING · LONG HAUL',
'夜': 'Night',
'航': 'Crossing',
'夜航船：用鼠标或触摸点选船上的东西；Tab 键在可碰的东西之间切换，回车使用':
  'A night ship. Click or touch things aboard to use them. Tab moves between what can be touched, Enter uses it.',
'末班船刚离港。下一站很远，船会自己开。':
  'The last boat has just left. The next stop is far off. The ship sails itself.',
'这是一艘环形的船：沿着环廊走，能进客舱、小厨房、温室、电台室和观景穹顶。面团要等，种子要等，信也要等。等的时候，你不必在。':
  'The ship is a ring. Walk the corridor and you can enter the cabin, the galley, the greenhouse, the radio room, and the observation dome. Dough takes time. Seeds take time. Letters take time. You do not have to be here while they take it.',
'静音登船': 'Board muted',
'没有倒计时，也没有失败。东西不会因为你没来而坏掉。航程会保存在这艘船上，下次打开还在原处。':
  'No countdown, and nothing to fail. Nothing spoils because you were not here. The crossing is kept on the ship; open it again and everything is where it was.',
'能碰什么': "What\'s touchable",
'设置': 'Settings',
'‹ 回环廊': '‹ Back to the ring',
'沿环往左走': 'walk left along the ring',
'沿环往右走': 'walk right along the ring',
'环形船的位置图': 'map of your position on the ring',
'横过来看会更舒服': 'Easier to look at in landscape',

'前方岔航道': 'A fork ahead',
'往哪边走都行，岸都会画进图里。选了以后，船在下一个弯慢慢转过去；之后点航道牌还能再换。航道会一直保持，下次登船也一样。':
  'Either way is fine; An draws them both. Once you choose, the ship turns slowly at the next bend. Tap the route card later to change again. The lane holds, including the next time you board.',
'先照现在这样走': 'Carry on as we are',
'种点什么': 'Plant something',
'选一种种子。它们长得慢，长的时候你不必在旁边。':
  'Pick a seed. They grow slowly, and you do not have to be beside them while they do.',
'先空着': 'Leave it empty',
'给这组星线起个名字': 'Name this group of lines',
'可以不起。名字只写在这张星图上，过些天它们转回头顶时还在。':
  'You need not. The name goes only on this chart, and will still be there when they come back overhead.',
'比如：没画完的船': 'for instance: the unfinished ship',
'写上': 'Write it',
'就让它没名字': 'Leave it unnamed',

'声音': 'Sound',
'动态': 'Motion',
'减少后，船身摇晃、视差与转弯幅度变小。':
  'Reduced lessens the ship\'s roll, the parallax, and how far it leans into a turn.',
'测试用：时间流速': 'Testing: time speed',
'×20 时面团、植物、信件与星空都会加快，方便走查长流程。正式体验请用 ×1。':
  'At ×20 the dough, plants, letters and sky all run faster, for walking through the long systems. Use ×1 to play.',
'存档': 'Save',
'清空航程，从头登船': 'Clear the crossing and board fresh',
'关上': 'Close',
'语言': 'Language',

'合上信箱': 'Close the mailbox',
'回到环廊': 'Back to the ring',
'知道了': 'All right',
'放回桌上': 'Put it back on the table',
'下船以后，如果想的话': 'After you go ashore, if you want to',
'倒一杯温水': 'Pour a glass of warm water',
'好。不用烧开，温的就行。': 'All right. It need not be boiling. Warm will do.',
'把屋里的灯调暗一点，看一会儿窗外':
  'Turn the lights down and look out the window a while',
'好。看见什么都行，看不见也行。':
  'All right. Whatever you see is fine, and seeing nothing is fine.',
'站起来伸个懒腰': 'Stand up and stretch',
'好。肩膀、脖子，哪里紧就动一动哪里。':
  'All right. Shoulders, neck — whatever is tight, move that.',
'换个舒服的姿势': 'Shift to a more comfortable position',
'好。椅背、枕头、地板，哪里都行。':
  'All right. The back of a chair, a pillow, the floor. Anywhere.',
'什么也不做': 'Do nothing',
'好。今天就到这里。': 'All right. That is all for today.',
'回船上再待一会儿': 'Stay aboard a little longer',

/* ---------- core/loop.ts : the status line ---------- */
'第 {0} 夜': 'Night {0}',
'舱时 ': 'Ship time ',
' · 时间 ×': ' · time ×',

/* ---------- index.html : the language note ---------- */
'换语言会重新载入这一页。航程已经存好，不会丢。':
  'Changing language reloads the page. The crossing is already saved and will not be lost.',
};
