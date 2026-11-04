/* ================= ENGLISH =================
   Keyed by the exact Chinese source string. A key that differs by one
   character -- including a curly quote where the source has a straight one --
   falls through silently and renders as Chinese here, so changing a Chinese
   string means changing its key in the same edit. Use tools/retext.mjs, which
   does both sides at once, and `npm run voice`, which fails on an orphan.

   THE VOICE IS SET BY docs/VOICE.md. Read it before touching a value.

   Its one correcting principle, because this is the rule that gets broken:
   spend words on grammar, save words on content. Keep the subject, the verb,
   the articles and the auxiliaries -- they are nearly free to read. Cut
   adjectives, abstractions and metaphors instead. A complete ordinary sentence
   beats a shorter one with the verb missing, every time. "Few beacons, amber
   and teal" is not discipline; it is a telegram, and it costs most for the
   reader working in a second language.

   Contractions are required in anything spoken -- An, the letters, the radio.
   A character who never says "I'm" is a notice board, not a person. Only the
   Harbour Authority, the Ship's Office and the noticeboard are allowed to be
   stiff, and tools/voice-allow.json lists every line that claims the exemption.

   The copy still describes what the world does and never tells the player what
   they feel ("the lamp is on, so the window only shows the room", not "you feel
   less alone"). That rule was always right.

   Straight quotes only, in keys and values: ZCOOL XiaoWei, which sets the
   display face in both languages, maps U+2019 and U+201C/D to full-width CJK
   glyphs, so a curly apostrophe opens a 41px hole in the middle of a word. */
export const EN: Record<string, string> = {

/* ---------- data/index.ts : beacons ---------- */
'琥珀色': 'Amber',
'青色': 'Teal',
'玫瑰色': 'Rose',
'旧码头': 'Old Wharf',
'回声浮标': 'Echo Buoy',
'晚钟': 'Evening Bell',
'琥珀色那盏叫"旧码头"。以前那里真有个码头，后来只剩下灯。':
  "The amber one's called Old Wharf. There really was a wharf there once. Now there's only the light.",
'青色的叫"回声浮标"。它会把听见的声音，慢慢还回来。':
  "The teal one's called Echo Buoy. It takes in a sound, then gives it back slowly.",
'玫瑰色的叫"晚钟"。管它的人说，有船经过它才响。':
  "The rose one's called Evening Bell. The keeper says it only rings when a ship goes past.",

/* ---------- data/index.ts : routes ---------- */
'近港航道': 'Near-Harbour Lane',
'星云浅湾': 'Nebula Shallows',
'环带慢道': 'Ringbelt Slow Lane',
'静默段': 'The Quiet Stretch',
'港口的灯还在身后。航标不多，多半是琥珀色的。':
  "The harbour lights are still behind us. There aren't many beacons out here, and most of them are amber.",
'船回到了近港航道。': 'The ship is back in Near-Harbour Lane.',
'回近港我喜欢。港口的灯还认得我们。':
  "I like going back to Near-Harbour. The harbour lights still know us.",
'穿过一片粉青色的雾。航标多，三种颜色都有。':
  "The ship goes through a pale blue-green fog. There are plenty of beacons here, in all three colours.",
'船拐进了星云浅湾。窗外起了一层粉青色的雾。':
  "The ship turns into Nebula Shallows. A pale blue-green fog comes up outside the window.",
'这片雾里灯多。管灯的人每晚都换滤片。':
  "There are a lot of lights in this fog. The keepers change the filters every night.",
'贴着一颗带环的行星绕半圈。航标少，节奏稳。':
  "The ship goes half way round a planet with rings. There aren't many beacons, and the rhythm is steady.",
'船贴着环带走。一颗很大的行星从右边慢慢过来。':
  'The ship runs along the ringbelt. A very large planet comes up slowly on the right.',
'这颗行星没有名字。我在图上就画了个圈。':
  "This planet doesn't have a name. I just drew a circle for it on the chart.",
'几乎没有航标。星星最密，适合什么也不做。':
  "There are almost no beacons here. The stars are at their thickest. It's a good place to do nothing.",
'船进了静默段。外面几乎没有灯，星星很密。':
  "The ship enters the Quiet Stretch. There are hardly any lights outside, and the stars are thick.",
'这一段没什么灯。我一般在这儿睡一会儿。':
  "There isn't much light on this stretch. I usually sleep a while here.",

/* ---------- data/index.ts : tea ---------- */
'桂花乌龙': 'Osmanthus Oolong',
'薄荷': 'Mint',
'炒大麦': 'Roasted Barley',
'白水': 'Plain Water',
'有一点桂花的甜味。': "It tastes a little sweet, like osmanthus.",
'茶汤是琥珀色的。': 'The tea is amber.',
'叶子一片片舒展开，桂花浮在上面。': "The leaves open one by one, and the blossoms float on top.",
'凉丝丝的，一直凉到鼻子里。': "It's cool, and the cool goes all the way up into your nose.",
'薄荷的味道很亮。': 'The mint tastes bright.',
'薄荷叶在水里打了个转，颜色变浅绿。': 'The mint turns once in the water and goes pale green.',
'有一股烤过的香味。': 'It smells roasted.',
'像晒过的谷仓。': "It smells like a barn in the sun.",
'麦粒沉下去，水慢慢变成深棕色。': 'The grains sink. The water slowly goes dark brown.',
'就是热水。': "It's just hot water.",

/* ---------- data/index.ts : seeds ---------- */
'星藤': 'Starvine',
'月铃': 'Moonbell',
'雾蕨': 'Mistfern',
'往上爬的藤。开花时，花是五个尖的，会发一点光。':
  "This one climbs. When it flowers, each flower has five points and gives off a little light.",
'三根细茎，垂着淡蓝的铃。手慢慢经过时，会响。':
  "Three thin stems, with pale blue bells hanging from them. They ring if your hand goes past slowly.",
'卷着的嫩叶一圈圈打开。喷水时会冒一点雾。':
  "The new leaves are coiled up, and they open a turn at a time. Water it and it gives off a little mist.",
'纸灯果': 'Lampberry',
'潮苔': 'Tidemoss',
'伞木': 'Umbrella Tree',
'它挂一串纸一样的灯笼。开花的时候，里面会亮起来。':
  'It hangs a string of paper lanterns. When it flowers, they light up from inside.',
'它长成贴着土的一团。喷过水以后，它会涨起来一点。':
  'It grows in a low cushion on the soil. A spray of water swells it a little.',
'叶子一层一层地摊开。它长得最慢。':
  'Its leaves spread out in flat tiers. It grows more slowly than the rest.',

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
'以下是今夜各处的天气。': "Here's tonight's weather, everywhere.",
'无处：有雾，局部有星。风从左舷来。':
  "Nowhere: fog, with stars in places. The wind is coming off the port side.",
'远港：晴转更晴。海面平。': 'Far Harbour: clear, turning clearer. The sea is flat.',
'回声浮标附近：小雨，雨声会晚一点到。':
  "Near Echo Buoy: light rain. The sound of it will get to you a little later.",
'明日：大部分地方，跟今天差不多。': 'Tomorrow: in most places, much like today.',
'三。七。七。一。': 'Three. Seven. Seven. One.',
'……停顿。': '… a pause.',
'二。二。九。': 'Two. Two. Nine.',
'这是一串坐标。没人知道是哪里的。': "These are coordinates. Nobody knows where they point.",
'（一段很慢的曲子，只有几个音。）': '(A very slow tune. Only a few notes.)',
'曲子在重复。纸带上浮出几个淡淡的格子。':
  "The tune repeats. A few faint squares come up on the paper tape.",
'（同一段旋律，又一遍。）': '(The same melody, once more.)',
'这里是灯塔。现在念今晚经过的船。':
  "This is the lighthouse. Here are the ships that went past tonight.",
'"晚钟"号，向北。': "The Evening Bell, heading north.",
'一艘没有名字的船，灯是暖的。': 'A ship with no name. Its lights are warm.',
'还有你们这艘。看见你们了。': "And yours. We've seen you.",
'念完了。灯还亮着。': "That's all of them. The light's still on.",
'（一个很低的长音，一会儿升上去。）': "(A very low, long note. After a while it rises.)",
'（像是从很远的地方传过来，又绕了一圈。）':
  '(As if it came from far away, and went around once more.)',
'（停了一下，又开始。）': '(It stops a moment, then starts again.)',
'早班邮船广播。': 'Morning mail boat broadcast.',
'邮包里有信，也有空白明信片。': "There are letters in the sack, and blank postcards too.",
'广播完毕。': 'End of broadcast.',

/* ---------- data/index.ts : letters ----------
   Each letter is a voice the player never meets. Senders are named by their job,
   the way a stranger signs a note, so the English keeps the role rather than
   inventing a name. */
'船务处': 'Ship\'s Office',
'灯塔看守': 'The Lighthouse Keeper',
'灯塔': 'The Lighthouse',
'温室的前任管理员': "The Last Keeper of the Greenhouse",
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
'天气台': 'The weather station',
'（没有署名）': '(unsigned)',
'—': '—',
'在别的船上种花的人': 'Someone Growing Flowers on Another Ship',
'种花的人': 'The one who grows them',
'一张旧船票的背面': 'The Back of an Old Ticket',
'不知道是谁': "Nobody knows whose",
'电台室': 'Radio Room',
'值班的人': 'Whoever was on duty',
'对面那艘夜航船': "The Night Ship Across the Way",
'对面的船': 'The ship opposite',

'欢迎登船。\n本船是一艘环形客船，沿着环廊走一圈就回到原处。\n邮船大约每两个钟头靠一次舷。':
  "Welcome aboard.\nThis is a ring-shaped passenger ship, and walking once round the corridor brings you back where you started.\nThe mail boat comes alongside about every two hours.",
'你们的船从我这儿经过好几次了。\n夜里十点以后，调到一点三四附近，能听见我念今晚过往的船名。\n念到你们的时候，我会念慢一点。':
  "Your ship has gone past me several times now.\nAfter ten at night, tune to around 1.34 and you'll hear me read out the ships that went by.\nWhen I get to yours, I read it a little slower.",
'那几盆植物怕快。\n手在旁边晃得快了，叶子会合上。慢慢来，它们会朝你那边歪。\n生长灯开着长得快一些。关了灯，它们就找别的光，比如你的手。':
  "Those plants don't like being rushed.\nMove your hand near them too fast and the leaves shut. Go slowly and they'll lean your way.\nThey grow faster with the lamp on. With it off, they go looking for some other light. Your hand, for one.",
'穹顶里，先把小灯关掉，然后眼睛别动，等一会儿。\n暗的星要等眼睛适应才出来。\n还有几颗是一阵一阵亮的。线可以先连过去，悬着，等它亮。':
  "In the dome, turn the small lamp off first. Then keep your eyes still and wait.\nThe faint stars only come out once your eyes have adjusted.\nA few of them brighten now and then. You can run a line out to one and leave it hanging there, waiting for it to light up.",
'送了几个星梨过去，酸，配茶正好。\n面团喜欢暖和的地方，刚烧过水的厨房最好。\n发过头的面团，烤出来会胖一点。':
  "I sent over a few star-pears. They're sour, which is just right with tea.\nDough likes a warm place, and a galley is best just after the water has boiled.\nDough that rises too long only bakes up rounder.",
'这一班没有特别的信。\n附一张空白明信片，背面还没写过字。':
  "There's nothing particular on this run.\nI've put in a blank postcard. Nothing has been written on the back of it yet.",
'我这边的舷窗朝下，只能看见很远的一片光。\n今天把窗擦了一遍，没擦干净。\n不知道这封信会到谁手里。':
  "My porthole faces down, so all I can see is a patch of light a long way off.\nI wiped the glass today. It didn't come clean.\nI don't know whose hands this will reach.",
'空着的格子也是一拍。\n发条往一个方向拧，拧多少圈，它就转多少遍。':
  "An empty square is a beat too.\nThe spring only winds one way. However many turns you give it, that's how many times it plays.",
'各航道情况如下：\n近港航道，灯多。星云浅湾，三色航标都有。环带慢道，节奏稳。\n静默段夜里最安静，适合不说话。':
  "Here is how the lanes are tonight.\nNear-Harbour Lane has plenty of lights. Nebula Shallows has beacons in all three colours. Ringbelt Slow Lane keeps a steady rhythm.\nThe Quiet Stretch is quietest at night. It is a good place for not talking.",
'明日天气：\n无处有雾，局部有星。\n风从左舷来，傍晚转小。':
  "Tomorrow:\nFog at Nowhere, with stars in places.\nWind off the port side, easing towards evening.",
'如果你在读这封信，说明邮船又绕回来了。\n这一圈和上一圈差不多。窗外的星换了几颗。':
  "If you're reading this, the mail boat has come round again.\nThis time round is much like the last one. A few of the stars outside have changed.",
'我种的月铃今天响了一声，就一声。\n我站着没动，等了很久，它没再响。\n我猜它要的就是这个。':
  "My moonbell rang once today. Just the once.\nI stood still and waited a long time, and it didn't ring again.\nMaybe once was all it wanted to do.",
'（字迹很淡）\n"第一次坐夜航船。灯关掉以后，外面原来有这么多东西。"':
  "(the writing is very faint)\n\"My first time on a night ship. I turned the lamp off, and it turns out there's all this outside.\"",
'收音机上那只绿色的小眼睛合上，就是调准了。\n有的台只在某些钟点出来，台表会替你记着。':
  "When the little green eye on the radio closes, you're tuned in.\nSome stations only come out at certain hours. The station log remembers them for you.",
'前几天在舷窗外看见你们的船了。\n你们的窗是暖色的。我们的也是。\n就写这些。':
  "I saw your ship out of the porthole a few days ago.\nYour windows are a warm colour. So are ours.\nThat's all I wanted to say.",

/* ---------- rooms/galley.ts : labels ---------- */
'水壶': 'kettle',
'水龙头（按住）': 'tap (press and hold)',
'炉子': 'stove',
'烤箱': 'oven',
'发酵箱': "rising box",
'面板': 'board',
'面粉': 'flour',
'茶杯': 'cup',
'茶叶罐': 'tea jars',
'面包架': 'bread rack',
'挂着的厨具': 'hanging utensils',
'星梨': 'star-pears',

/* ---------- rooms/galley.ts : tea ---------- */
'小厨房里一直有点面包的味道。':
  "The galley always smells faintly of bread.",
'挑一罐。开罐的时候味道最冲。':
  "Pick one. The smell is strongest when the jar first opens.",
'杯里还有茶。喝完再换一种。': "There's still tea in the cup. Finish it before you change kinds.",
'你舀了一小勺{0}，放进杯里。': 'You spoon a little {0} into the cup.',
'等水开了，按住水壶往杯里倒。':
  'Once the water boils, press and hold the kettle to pour.',
'按住水龙头放水。': 'Press and hold the tap to run water.',
'壶接满了。': 'The kettle is full.',
'接了大半壶。': "The kettle is most of the way full.",
'接了一点水。': "There's a little water in the kettle.",
'壶在炉子上，水直接流进了水槽。':
  'The kettle is on the stove, so the water runs straight into the sink.',
'壶里没什么水。按住水龙头接一点。':
  "There isn't much water in the kettle. Press and hold the tap to run some.",
'壶里没什么水。': "There isn't much water in the kettle.",
'你把水壶放上炉子。': 'You set the kettle on the stove.',
'炉子的旋钮在下面。': "The stove knob is down below.",
'水还在烧。': "The water is still heating.",
'水还热着。': 'The water is still hot.',
'按住水壶，往杯子里倒。': 'Press and hold the kettle to pour.',
'水壶放回水槽边。': 'The kettle goes back beside the sink.',
'火点上了。水壶开始轻轻响。':
  'The flame catches. The kettle starts to tick quietly.',
'炉火开着，上面什么也没有。': "The burner is lit, with nothing on it.",
'火关了。': 'The flame is out.',
'水开了。蒸汽扑上舷窗，起了一层雾。':
  'The water boils. Steam hits the porthole and fogs it over.',
'厨房的水壶响了。': 'The kettle is whistling in the galley.',
'泡了一杯{0}': 'brewed a cup of {0}',
'倒了一杯热水。': "You pour a cup of hot water.",
'水倒进去了。': 'The water goes in.',
'按住久一点，才倒得出来。': "Hold it a bit longer to get it pouring.",
'满了，溢出来一点。你甩了甩手。':
  "It's full, and a little goes over. You shake your hand off.",
'杯子满了。': 'The cup is full.',
'壶倒空了。': 'The kettle is empty.',
'杯子是空的。': 'The cup is empty.',
'杯子是空的。茶在小厨房泡。': "The cup is empty. You brew tea in the galley.",
'茶很烫，先捧在手里。': "It's too hot. You hold it a while first.",
'茶凉了一点，正好入口。': "It's cooled a little. About right to drink now.",
'还淡，叶子才刚开始舒展。': "It's still weak. The leaves have only just started to open.",
'喝完了。': "You finish it.",
'喝完了。杯底剩几片叶子。': "You finish it. A few leaves are left in the bottom.",
'杯底剩几片茶叶。想换一种，就点茶叶罐。':
  "There are a few leaves in the bottom. Tap a jar to change kinds.",

/* ---------- rooms/galley.ts : bread ---------- */
'舀两勺面粉，加水，和成一团。':
  "Two scoops of flour, then some water, and you work it into a lump.",
'在面团上左右来回拖，慢慢揉。':
  'Drag back and forth across the dough. Knead slowly.',
'面团已经在板上了。': 'The dough is already on the board.',
'面粉袋还有大半袋。': "The sack is still most of the way full.",
'板上空着。面粉袋在右边。': 'The board is empty. The flour is on the right.',
'太急了，面团有点粘手。慢一点推。':
  "That's too quick. The dough sticks. Push more slowly.",
'面团光滑了，按一下会慢慢弹回来。':
  'The dough is smooth. Press it and it comes back slowly.',
'面团开始不粘手了。': 'The dough stops sticking.',
'揉好了。挑一个形状。': "That's kneaded. Now pick a shape.",
'团成一个圆面包。': "You round it into a loaf.",
'搓成长长的一条。': "You roll it out long.",
'分成三股，编成辫子。': "You split it in three and braid it.",
'团成圆的': 'round',
'搓成长的': 'long',
'编成辫子': 'braided',
'再点一下面团，放进发酵箱。': "Tap the dough again to put it in the rising box.",
'你把面团放进发酵箱，关上小门。它要自己待一阵，大约二十分钟。':
  "You put the dough in the rising box and shut the little door. It needs a while to itself, about twenty minutes.",
'揉好一团面，放进发酵箱': "kneaded dough and set it to rise",
'面团在上面的发酵箱里。': "The dough is up in the rising box.",
'面团在烤箱里。': 'The dough is in the oven.',
'面团鼓起来一些了。大概还要 {0} 分钟。':
  "The dough has risen a little. It needs about {0} minutes more.",
'厨房暖，发得快。': "The galley is warm, so it rises faster.",
'面团发好了，胖胖的。你把它挪进烤箱。':
  "The dough has risen, round and full. You move it into the oven.",
'拧一下烤箱的旋钮。': 'Turn the oven knob.',
'发酵箱空着，里面暖烘烘的。': "The rising box is empty, and warm inside.",
'发酵箱里的面团发好了。': "The dough in the rising box has risen.",
'烤箱开了。玻璃后面亮起橙色的光。':
  'The oven is on. Orange light comes up behind the glass.',
'闻到香味了。再等一下。': "You can smell it now. A little longer to go.",
'刚开始烤。': "It's only just started baking.",
'面团还在发酵箱里。': "The dough is still in the rising box.",
'烤箱是空的。': 'The oven is empty.',
'烤好一个面包': 'baked a loaf',
'叮。面包烤好了，放在左边的架子上晾着。':
  'Ding. The bread is done, cooling on the rack to the left.',
'厨房那边"叮"了一声。面包烤好了。':
  "There's a ding from the galley. The bread is done.",
'架子上空着。面团烤好了会放在这里。':
  "The rack is empty. Bread goes here once it's baked.",
'盘子空了。': 'The plate is empty.',
'面包还是温的，外皮脆。': "It's still warm, and the crust is crisp.",
'面包凉了，嚼起来有麦子的甜。':
  "It's cooled now, and sweet with wheat when you chew it.",

/* ---------- rooms/galley.ts : pears + An ---------- */
'果盘空了。邻船下一班会再送一些。':
  'The dish is empty. The next ship over will send more.',
'咬了一口星梨。很酸，水很多。': "You take a bite of star-pear. Very sour, and very wet.",
'咬了一口星梨。': "You take a bite of star-pear.",
'又一口。': "You take another bite.",
'吃完了。核放在碟子边上。': "You finish it. The core goes on the edge of the dish.",

/* ---------- rooms/cabin.ts : labels ---------- */
'舱门（回环廊）': 'cabin door (back to the ring)',
'舷窗（长按哈气）': 'porthole (hold to breathe on it)',
'舷窗': 'porthole',
'灯绳': 'lamp cord',
'毯子': 'blanket',
'盆栽': 'potted plant',
'花瓶': 'vase',
'提灯': 'lantern',
'面包': 'bread',
'夜航': 'Night Crossing',

/* ---------- rooms/cabin.ts : the lamp and the window ----------
   The three lamp settings are the room's quietest rule: the brighter the cabin,
   the less of the outside the glass will give you. The copy states the trade,
   never the feeling. */
'舱灯开着的时候，窗玻璃上只映得出舱里的东西。':
  "With the lamp on, the glass only shows the room behind you.",
'左边是舱门。出去是环廊，沿着它能走到别的舱。':
  "The door is on the left. Outside is the ring corridor, with every other room along it.",
'灯罩下面垂着一根灯绳。': 'A cord hangs under the shade.',
'灯暗了一档。窗外的星星浮出来一些。':
  "The lamp goes down one step. Some of the stars outside come up.",
'灯熄了。窗外的东西一下子清楚了。':
  'The lamp is out. Everything outside comes clear at once.',
'灯熄了。': 'The lamp is out.',
'灯亮了。倒影又回到玻璃上。':
  'The lamp is on. The reflection comes back to the glass.',
'灯亮了。': 'The lamp is on.',
'灯调到中间那档。': "The lamp goes to the middle step.",
'玻璃上只有舱里的倒影。': "The glass only shows the room.",
'玻璃上只有舱里的倒影，看不清外面。':
  "The glass only shows the room. You can't see out.",
'那里只有星星。航标隔一阵会从右边漂过来。':
  "There are only stars out there. A beacon drifts past on the right every so often.",
'你对着玻璃哈了一口气。起雾的地方可以画。':
  'You breathe on the glass. You can draw where it fogs.',
'指尖在雾上划过。划开的地方透出外面的星星。':
  'Your fingertip goes through the fog. The stars outside come through where it opens.',

/* ---------- rooms/cabin.ts : beacons and the lantern ---------- */
'窗外有一盏灯在闪。闪{0}下，停一停。':
  "A light is blinking outside. It blinks {0}, then stops for a moment.",
'它每轮闪{0}下。提灯底座上也有刻痕。':
  'It blinks {0} each round. There are notches on the lantern base too.',
'提灯转到{0}那一格。底座上有{1}道刻痕。':
  "The lantern turns to {0}. There are {1} notches on the base.",
'那盏灯亮了一下，回了一声。舱顶的灯串上多了一颗{0}的灯。':
  "The light flares once and answers. There's one more {0} bulb on the string overhead.",
'那盏灯照着自己的节奏，又闪了几下。':
  'The light keeps its own rhythm and blinks a few more times.',
'这盏已经回过你了。它的光现在是稳的。':
  'This one has already answered you. Its light is steady now.',
'回应了一盏「{0}」': 'answered an {0}',

/* ---------- rooms/cabin.ts : route, blanket, vase, plant ---------- */
'」': '',
'照现在这样走。': 'Carry on as we are.',
'船身微微一斜，开始转弯。': 'The ship tilts a little and begins to turn.',
'你把毯子拿过来，搭在腿上。毯子有点旧，很厚。':
  "You pull the blanket over your legs. It's old, and thick.",
'毯子叠好，放回长椅上。': 'The blanket is folded back onto the bench.',
'一只空的小花瓶。温室里的花开了，可以剪一枝来。':
  "The vase is small and empty. When something flowers in the greenhouse, you can cut a stem for it.",
'瓶子还空着。': 'The vase is still empty.',
'星藤的花在瓶里亮着，五个尖。':
  "The starvine flower glows in the vase, with its five points.",
'月铃垂在瓶口。碰一下，它轻轻响了。':
  'A moonbell hangs over the lip. Touch it and it rings, softly.',
'一枝雾蕨，叶尖上挂着水珠。':
  "There's a sprig of mistfern in the vase, a drop of water on each leaf tip.",
'盆土是湿的，有人浇过水。': 'The soil is damp. Someone has watered it.',
'叶子晃了晃。': 'The leaves sway.',
'叶子背面有一层细绒毛。': "There's a fine down on the underside of the leaves.",
'一片新叶还卷着。': 'One new leaf is still curled.',

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
'温室比船上别处暖，玻璃内侧挂着一层水汽。':
  "The greenhouse is warmer than the rest of the ship. There's a film of water on the inside of the glass.",
'盆先空着。': 'The pot stays empty for now.',
'盆都种上了。': 'Every pot is planted.',
'温室比你看见的长。按住不放，可以往两边走。':
  'The greenhouse is longer than what you can see. Hold and drag to walk along it.',
'育苗架这头冷一些，玻璃上结着一层水。':
  "It's colder at the seedling end. Water beads on the glass there.",
'台子这头烤得暖，木头有一点香味。':
  "It's warm down at the bench end, and the wood smells of it.",
'你把一颗{0}的种子按进土里，盖上一层。':
  'You press a {0} seed into the soil and cover it over.',
'种下一颗{0}': 'planted a {0}',
'种在第 {0} 个盆里。它们长得慢。':
  "Planted in pot {0}. They grow slowly.",
'它会自己长。土干了就停一停，喷点水又接着长。':
  "It grows on its own. When the soil dries out it stops. Water it and it carries on.",
'拿起喷壶。拖过哪几盆，就浇哪几盆。':
  'You pick up the can. Drag it across the pots to water them.',
'又喷了一层水雾。': "You give it another fine mist.",
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
  "The grow lamp is off. The greenhouse goes dark. All that's left is the light from outside, and the little bit at your hand.",
'那盆植物慢慢朝你手边的光歪过来。':
  'The plant leans slowly toward the light at your hand.',
'叶子一下子合上了。': 'The leaves shut all at once.',
'它们怕快。手慢一点，它们会再打开。':
  "They don't like being rushed. Slow your hand down and they'll open again.",
'你把花盆转了半圈。它原本朝窗那边歪，现在要重新长直。':
  "You turn the pot half around. It had been leaning toward the window, so now it has to straighten itself again.",
'花盆转了半圈。': 'The pot is turned half around.',
'土里刚冒出一点绿。': 'A little green has just come up out of the soil.',
'一根细藤，往木棍上绕了半圈。': "A thin vine has gone half a turn round the stake.",
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
'叶背面有一排小点。': "There's a row of small dots on the underside.",
'叶子一对一对的。顶上有个小花苞。':
  "The leaves come in pairs. There's a small bud at the top.",
'雾蕨冒出一小团雾，慢慢散开。':
  'The mistfern puts out a small cloud of fog that slowly spreads.',
'潮苔吸饱水，鼓起来一点。': 'The tidemoss drinks it up and swells a little.',
'它在长。': "It's growing.",
'土面上支起两片厚叶子。': 'Two thick leaves stand up out of the soil.',
'茎是方的，捏着有棱。': 'The stem is square. You can feel the corners of it.',
'一个空灯笼挂下来，还是绿的。': 'An empty lantern hangs down, still green.',
'灯笼薄得像纸，对着光能看见里面的籽。':
  'The husk is as thin as paper. Hold it up and you can see the seed inside.',
'土上有一层薄薄的绿。': "There's a thin green film over the soil.",
'按下去是软的，手一松又弹回来。': "It's soft under your hand. It comes back up when you let go.",
'细丝都立起来，朝着亮的那边。': 'The threads are standing up. They all lean toward the bright side.',
'丝尖上的白点，一碰就飘起来。': 'The white beads lift off the tips as soon as you touch them.',
'一根小木茎立起来了，皮是灰的。': 'A small woody stem has come up. Its bark is grey.',
'第一层叶子摊平了，底下有一小块阴影。':
  "The first tier has flattened out. There's a patch of shade under it.",
'每一层都比底下那层小一点。': 'Each tier is a little smaller than the one under it.',
'花挂在最下面一层底下，要蹲下来才看得见。':
  'The flowers hang under the lowest tier. You have to crouch to see them.',

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
'电台室里很安静，只有机器自己的底噪。':
  "The radio room is quiet, apart from the hum the machines make themselves.",
'收音机开了。': 'The radio is on.',
'收音机关了。': 'The radio is off.',
'收音机亮了，先是一阵沙沙声。':
  "The set lights up. There's static first.",
'旋钮转了，但收音机还没开。': 'The knob turns, but the set is off.',
'左右拖动右边的大旋钮调频。那只绿色的小眼睛合上，就是调准了。':
  "Drag the big knob on the right to tune. When the little green eye closes, you're on it.",
'用鼠标拖动旋钮会快很多。': 'Dragging the knob with a mouse is much quicker.',
'这个频率上只有很远的沙沙声。也许现在不是时候。':
  "There's only distant static on this frequency. Maybe it's the wrong hour.",
'「{0}」这会儿不播（{1}）。只有很远的沙沙声。':
  "{0} isn't broadcasting now ({1}). There's only distant static.",
'收到了：「{0}」。台表上多了一行。':
  "You're receiving {0}. That's one more line in the log.",
'在 {0} 收到「{1}」': 'picked up {1} at {0}',
'台表还是空的。调到一个台，它会自己记上。':
  'The log is still empty. Tune to a station and it writes itself in.',
'台表上记了 {0} 个台，一共 {1} 行。有的台只在某些钟点出来。':
  "You've filled in {0} of {1} lines. Some stations only come out at certain hours.",
'下一班邮船大约 {0} 靠舷。': 'The next mail boat comes alongside around {0}.',
'信箱里现在有 {0} 封。': 'There are {0} in the box now.',
'台灯亮了。': 'The desk lamp is on.',
'台灯关了。收音机的刻度盘成了屋里最亮的东西。':
  'The desk lamp is off. The dial is now the brightest thing in the room.',
'你戴上耳机。别的声音一下子远了。':
  'You put the headphones on. Everything else goes far away at once.',
'摘下耳机': 'take the headphones off',
'耳机挂回钩子上。': 'The headphones go back on their hook.',
'用鼠标点纸带上的格子打孔。再点一次，就把孔糊上。':
  'Click a square on the tape to punch it. Click again to patch it over.',
'纸带上打了一个孔。上紧发条，它就会响。':
  "That's one hole in the tape. Wind the spring and it'll sound.",
'这个孔被你用纸片糊上了。': 'You patch the hole over with paper.',
'纸带上浮出几个淡淡的格子，跟着曲子的拍子。':
  "A few faint squares come up on the tape, in time with the tune.",
'淡淡的格子都打上了。这段曲子现在是你纸带上的了。':
  'Every faint square is punched. The tune belongs to your tape now.',
'把「星港夜曲」的一段抄在了八音盒纸带上':
  'copied a passage of Starport Nocturne onto the tape',
'按住摇柄，绕着它画圈。': 'Hold the crank and draw circles around it.',
'发条只能往一个方向拧。顺着钟表走的方向转。':
  'The spring only winds one way. Go the way a clock goes.',
'发条上了一圈。': "That's one turn on the spring.",
'发条上了 {0} 圈。八音盒开始转。':
  '{0} turns on the spring. The music box starts.',
'发条上满了。': 'The spring is fully wound.',
'发条走完了，八音盒停下来。': 'The spring runs out and the music box stops.',
'纸带上还没有孔，只听见齿轮在转。':
  "There are no holes in the tape yet. You only hear the gears turning.",

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
'小灯开着的时候，头顶只看得见最亮的那几颗。':
  "With the small lamp on, only the brightest few show overhead.",
'小灯亮了。玻璃上又有了倒影。':
  'The small lamp is on. The glass has a reflection again.',
'小灯熄了。': 'The small lamp is out.',
'小灯熄了。先别急，眼睛要一会儿才适应。':
  "The small lamp is out. Give it a moment. Your eyes take a while.",
'眼睛慢慢适应了。更暗的星浮出来了。':
  'Your eyes adjust. Fainter stars come up.',
'光标一晃，眼睛就跟着动。停一停试试。':
  'The cursor moves and your eyes go with it. Try holding still.',
'你在长椅上躺下来。整片穹顶都在眼睛上面。':
  'You lie down on the bench. The whole dome is above your eyes.',
'你坐起来。': 'You sit up.',
'用鼠标在星空里点星，连线。': 'Click stars in the sky to join them up.',
'先点一颗星。': 'Tap a star first.',
'选中了一颗星。再点另一颗，连一条线。点空处，线就悬在那儿。':
  "You've chosen a star. Tap another to draw a line. Tap empty sky and the line hangs there.",
'连上了。再点一下这颗星就停笔。':
  "That's joined. Tap this star again to stop.",
'线停在了空处，悬着。也许那里以后会亮起一颗星，也许不会。':
  'The line stops on empty sky and hangs. A star may come up there later. It may not.',
'从悬着的那一头接着画。': 'Carry on from the hanging end.',
'这一笔先到这里。': 'That line stops here for now.',
'这一笔悬在那儿。': 'That line is left hanging.',
'那根悬着的线，落在了一颗刚亮起来的星上。':
  'The hanging line comes down on a star that has just lit.',
'一根悬着的星线落在了一颗变星上': 'a hanging line found a variable star',
'那里看不见星星。小灯开着，暗的星都藏起来了。':
  "There's no star to see there. With the small lamp on, the faint ones stay hidden.",
'在穹顶连了第一笔星线': 'drew a first line in the dome',
'你连过的星线还在头顶。': 'The lines you drew are still overhead.',
'你连过的星线这会儿转到别处去了。过一阵，它们会转回来。':
  "Your lines have turned away for now. They'll come back round.",
'星图上写了一行小字：「{0}」。':
  'A line of small writing goes on the chart: {0}.',
'给一组星线起名「{0}」': 'named a group {0}',
'就让它没名字。': 'Leave it unnamed.',

/* ---------- rooms/corridor.ts ---------- */
'信箱': 'mailbox',
'船钟': "ship\'s bell",
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
'还没有记录。': 'Nothing is written down yet.',
'<div>还没有记录。</div>': '<div>Nothing is written down yet.</div>',
'<text x="780" y="480" text-anchor="middle" font-family="ZCOOL XiaoWei, serif" font-size="20" fill="#2a1a10">还没有记录。</text>':
  '<text x="780" y="480" text-anchor="middle" font-family="ZCOOL XiaoWei, serif" font-size="20" fill="#2a1a10">Nothing is written down yet.</text>',
'航行第 {0} 夜': 'Night {0} of the crossing',
'船钟指着 {0}。航行第 {1} 夜。': 'The bell reads {0}. Night {1} of the crossing.',
'（{0} 封）': '({0})',
/* The four notices are set one line each, in a column, on the board. Kept short
   enough to hold the same shape in English. */
'一　炉子用完关掉。': "1 Mind the stove.",
'二　夜里走廊扶栏。': "2 Hold the rail.",
'三　邮船每两钟头': "3 Mail boat every",
'　　靠一次舷。': "  two hours.",
'四　穹顶熄灯轻声。': "4 Quiet up top.",
'你在长椅上坐下。': 'You sit down on the bench.',
'你在长椅上坐下。星星从窗的一边转到另一边：这艘船在自己转。':
  "You sit down on the bench. The stars cross from one side of the window to the other. The ship is turning on itself.",
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
'<g class="st" data-i="{0}" tabindex="0" role="button" aria-label="走到{1}"><circle cx="{2}" cy="{3}" r="{4}" fill="{5}"/><circle cx="{6}" cy="{7}" r="12" fill="transparent"/></g>':
  '<g class="st" data-i="{0}" tabindex="0" role="button" aria-label="walk to {1}"><circle cx="{2}" cy="{3}" r="{4}" fill="{5}"/><circle cx="{6}" cy="{7}" r="12" fill="transparent"/></g>',

/* ---------- rooms/registry.ts : rooms and stations ---------- */
'环廊': 'Ring corridor',
'驾驶舱': 'Bridge',
'驾驶舱门': 'bridge door',
'工单板': 'work board',
'小厨房': 'Galley',
'温室': 'Greenhouse',
'观景穹顶': 'Observation dome',
'小厨房门': 'galley door',
'温室门': 'greenhouse door',
'电台室门': "radio room door",
'信箱与船钟': 'mailbox and bell',

/* ---------- characters/an-lines.ts ----------
   An is a cartographer who is drawing this leg of the route. She offers what she
   knows about the ship and never comments on the player. */
'……': '…',

/* ---------- state/progress.ts : what happens while you are away ---------- */
'星藤冒芽了': 'the starvine has sprouted',
'星藤往木棍上爬了一截': 'the starvine has climbed a stretch of the stake',
'星藤的叶子长满了': 'the starvine is full of leaves',
'星藤开花了，花是五个尖的': "the starvine has flowered, with five points to it",
'月铃冒出两片圆叶': 'the moonbell has put out two round leaves',
'月铃的细茎分开了': 'the moonbell\'s stems have parted',
'月铃的茎尖垂下来': 'the moonbell\'s stem tips have bent over',
'月铃挂上了铃': 'the moonbell has hung its bells',
'雾蕨探出一个卷着的嫩芽': 'the mistfern has put out a curled shoot',
'雾蕨打开了第一片叶': 'the mistfern has opened its first leaf',
'雾蕨的叶子一圈圈展开': 'the mistfern is opening turn by turn',
'雾蕨全展开了，叶尖挂着水珠':
  'the mistfern is fully open, a drop of water on each leaf tip',
'纸灯果顶出两片厚叶': 'the lampberry has pushed up two thick leaves',
'纸灯果的茎上分出了节': 'the lampberry has made its first joints',
'纸灯果挂出了第一个灯笼': 'the lampberry has hung its first lantern',
'纸灯果的灯笼亮起来了': "the lampberry's lanterns have lit up",
'潮苔在土上铺开一小片': 'the tidemoss has spread a small patch',
'潮苔鼓成了一个小丘': 'the tidemoss has mounded up',
'潮苔长出了细丝': 'the tidemoss has put out fine threads',
'潮苔的丝尖上结了白点': 'the tidemoss has beaded white at the tips',
'伞木立起了一根小木茎': 'the umbrella tree has set a woody stem',
'伞木摊开了第一层叶': 'the umbrella tree has spread its first tier',
'伞木又摊开了一层': 'the umbrella tree has spread another tier',
'伞木的伞底下挂出了花': 'the umbrella tree has flowered under its tiers',
'杯里的茶泡开了。': "The tea in the cup has brewed.",
'发酵箱里的面团发好了，胖了一圈。':
  "The dough in the rising box has risen, a size rounder.",
'邻船又送来几个星梨，果盘满了一些。':
  'The next ship over sent more star-pears. The dish is fuller.',
'{0}的土干了，它停下来等水。':
  "The {0} soil has dried out. It's stopped, and it's waiting for water.",
'{0}又开了。': 'The {0} has flowered again.',
'八音盒转完了，停在那儿。':
  'The music box ran down and stopped where it was.',
'邮船靠了一次舷。信箱里多了一封信。':
  "The mail boat came alongside once. There's one more letter in the box.",
'收到一封信：{0}': 'a letter arrived: {0}',
'你写的明信片随邮船走了。': 'Your postcard went off with the mail boat.',
'明信片随邮船寄出': 'postcard went out with the mail boat',

/* ---------- boot.ts : the door screen ---------- */
'登船': 'Board',
'再次登船': 'board again',
'回到船上': 'Back aboard',
'回到船上了。': 'Back aboard.',
'声音 开': 'Sound on',
'声音 关': 'Sound off',
'欢迎回来。船一直在走。': 'Welcome back. The ship has kept going.',
'上次下船是 {0}前。': 'You went ashore {0} ago.',
'东西都在你离开时的地方，只是多走了一段时间。':
  "Everything is where you left it. It has just had more time.",
'夜航 No.{0} · 第 {1} 夜。':
  "Night Crossing No.{0} · night {1}.",

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
'暂时连不上你的账户，先存在这个浏览器里':
  "can't reach your account right now, so it's kept in this browser",
'时间流速 ×20（测试用）。': 'Time speed ×20 (for testing).',
'时间流速恢复 ×1。': 'Time speed back to ×1.',

/* ---------- ui/away.ts ---------- */
'你不在的时候': 'While you were away',
'你回来了': 'You came back',
'你回来了。': 'You came back.',
'船还在走。': 'The ship is still going.',
'杯里的茶凉了。': 'The tea in the cup has gone cold.',
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
'读过 {0} 封 · 寄出 {1} 张': '{0} read · {1} sent',
'电台': 'Radio',
'台表记了 {0} / {1}': '{0} of {1} logged',
'穹顶': 'Dome',
'星线 {0} 笔': '{0} star-lines',
'：': ': ',
'「{0}」': '"{0}"',
'留下的': 'Left behind',
'星线': 'star-lines',
'卡片背面': 'Back of the card',
'（空着）': '(empty)',
'写一件窗外看见的东西。':
  "One thing you saw out of the window.",
'第{0}夜': 'NIGHT {0}',
'还没有。窗外的灯会一直经过。':
  "Nothing yet. The lights outside keep going past.",
'　你忙的时候，窗外经过了 {0} 盏灯。':
  ' While you were busy, {0} lights went past the window.',
'今天就到这里': "That's all for today",
'船会继续航行。': "The ship keeps going. ",
'面团在发酵箱里慢慢发着。': "The dough is still rising in its box. ",
'有 {0} 个盆里的植物还在长。': "Plants are still growing in {0} of the pots. ",
'有一笔星线还悬着。': "A star-line is still left hanging. ",
'明信片还在寄出口。': "A postcard is still in the outgoing slot. ",
'航程已经存好了。下次打开，船还在原处。':
  "The crossing is saved. Open it again and the ship is where it was.",

/* ---------- ui/mail.ts ---------- */
'新到': 'new',
'{0} 靠舷': 'alongside {0}',
'空着。下一班邮船大约 {0} 靠舷。':
  'Empty. The next mail boat comes alongside around {0}.',
'读过的': 'Read',
'寄出': 'Outgoing',
'写一张明信片': 'Write a postcard',
'下一班邮船带走': "the next mail boat takes it",
'明信片': 'Postcard',
'已随 {0} 的邮船离开': 'left on the {0} mail boat',
'在寄出口，等下一班邮船': 'in the slot, waiting for the next boat',
'寄出口不看收信人。':
  "The outgoing slot doesn't check who it's for.",
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
'<i>你在忙，船在走</i>': "<i>you're busy, the ship sails on</i>",
'你回来看了一眼。': 'You looked in on the ship.',
'你回来看了一眼。刚才的 {0} 分钟里，船一直在走。':
  'You looked in. For those {0} minutes, the ship kept going.',
'按住环廊也能左右拖。': "You can hold the corridor and drag it left or right.",
'<i></i><span>沿环走 · 点圆点直达</span>': '<i></i><span>walk the ring · tap a dot to go straight there</span>',

/* ---------- index.html : the door screen, HUD, panels, the ending ---------- */
'夜航·长航': 'Night Crossing · Long Haul',
'NIGHT CROSSING · 长航': 'NIGHT CROSSING · LONG HAUL',
'夜': 'Night',
'航': 'Crossing',
'航程存在这艘船上。下次打开，船还在原处。':
  "The crossing is kept on the ship. Open it again and the ship is where it was.",
'能碰什么': "What\'s touchable",
'设置': 'Settings',
'‹ 回环廊': '‹ Back to the ring',
'沿环往左走': 'walk left along the ring',
'沿环往右走': 'walk right along the ring',
'环形船的位置图': 'map of your position on the ring',
'横过来看会更舒服': 'Easier to look at in landscape',

'种点什么': 'Plant something',
'选一种种子。它们长得慢。':
  "Pick a seed. They grow slowly.",
'先空着': 'Leave it empty',
'给这组星线起个名字': 'Name this group of lines',
'名字只写在这张星图上。过些天它们转回头顶的时候，名字还在。':
  "The name goes only on this chart. It'll still be there when they come back overhead.",
'比如：没画完的船': 'for instance: the unfinished ship',
'写上': 'Write it',
'就让它没名字': 'Leave it unnamed',

'声音': 'Sound',
'动态': 'Motion',
'选"减少"以后，船身的晃动会小很多。':
  "Reduced makes the ship's roll much smaller.",
'测试用：时间流速': 'Testing: time speed',
'调到 ×20，船上要等的东西都会走得快一些。正常玩请用 ×1。':
  "At ×20 everything on the ship that has to wait runs faster. Use ×1 to play.",
'存档': 'Save',
'关上': 'Close',
'语言': 'Language',

'合上信箱': 'Close the mailbox',
'回到环廊': 'Back to the ring',
'知道了': 'All right',
'放回桌上': 'Put it back on the table',
'下船以后': "After you go ashore",
'倒一杯温水': 'Pour a glass of warm water',
'好。慢慢喝。': "All right. Drink it slowly.",
'把屋里的灯调暗一点，看一会儿窗外':
  'Turn the lights down and look out the window a while',
'好。灯一暗，窗外就清楚了。':
  "All right. Once the lights are low, the window clears.",
'站起来伸个懒腰': 'Stand up and stretch',
'好。先动肩膀。':
  "All right. Shoulders first.",
'换个舒服的姿势': 'Shift to a more comfortable position',
'好。靠着比坐直舒服。':
  "All right. Leaning back beats sitting up straight.",
'什么也不做': 'Do nothing',
'好。今天就到这里。': "All right. That's all for today.",
'回船上再待一会儿': 'Stay aboard a little longer',

/* ---------- core/loop.ts : the status line ---------- */
'第 {0} 夜': 'Night {0}',
'舱时 ': 'Ship time ',
' · 时间 ×': ' · time ×',

/* ---------- index.html : the language note ---------- */
'换语言会重新载入这一页。航程已经存好，不会丢。':
  "Changing language reloads the page. The crossing is already saved, so nothing will be lost.",

/* ---------- the round: ports, the gangway, the work bench ---------- */
/* The main line. Residents are not people, so nothing here carries a gendered
   pronoun; where the Chinese would have used one, the line names the job
   instead. Every spoken line contracts, because every one of them is somebody
   talking across a doorway. */
'看码头的': 'the dock keeper',
'旧码头只剩一盏灯了。看码头的问，能不能换一盏活的。':
  "Only one lamp is left on the old wharf. The dock keeper asked for a living one instead.",
'船贴上旧码头。这里比船上冷，泡过水的木头味道一直飘上来。':
  "The ship comes alongside the old wharf. It's colder here than aboard, and the smell of soaked timber keeps rising.",
'我在这儿守着。有船经过，我就把那盏灯擦一遍。':
  "I keep this place. When a ship goes past, I wipe the lamp down.",
'擦了很多年了。它还是那么暗。': "I've been wiping it for years. It's still that dim.",
'我接着。我手慢，你别松太快。': "I've got it. My hands are slow, so don't let go too fast.",
'看码头的把灯举过头顶。木板上落下一圈光，照出一截旧栏杆。':
  "The dock keeper holds the lamp up overhead. A ring of light falls on the boards, and an old railing comes out of the dark.",
'船退开。那圈光还留在码头上，越来越小。':
  "The ship backs away. That ring of light stays on the wharf, getting smaller.",
'守浮标的': 'the buoy keeper',
'回声浮标那边太静了。守浮标的想要一样晚上会亮的东西。':
  "It's too quiet out at the echo buoy. The buoy keeper wants something that lights up at night.",
'船停在浮标边上。你说一句话，过好一会儿它才还给你。':
  "The ship stops beside the buoy. Say something, and it gives the words back a long while later.",
'我先听见你们，过了很久才看见你们。': "I heard you first, and I didn't see you until much later.",
'这儿什么都慢。你说的话我也要等一等。': "Everything is slow here. I've got to wait for what you say, too.",
'我把它放窗台上。那扇窗朝着你们来的方向。':
  "I'll put it on the windowsill. That window faces the way you came from.",
'守浮标的把灯捧进舱里。浮标的玻璃上多了一个暖色的点。':
  "The buoy keeper carries the lamp inside. A warm point shows on the buoy's glass now.",
'船开出去。身后传来一声你刚才说过的话。':
  "The ship pulls out. Behind it, something you said comes back once.",
'敲钟的': 'the bell ringer',
'晚钟一夜只响一次。敲钟的问，能不能在钟底下放一点光。':
  "The evening bell only rings once a night. The bell ringer asked for some light under it.",
'船靠上晚钟。这里很冷，钟声在冰面上传得特别远。':
  "The ship comes alongside the evening bell. It's cold here, and the sound carries a long way over the ice.",
'有船来我才敲。今晚那一下已经敲过了。': "I only ring it when a ship comes. I've rung tonight's already.",
'敲完以后这儿就很长时间没有声音。': "After that there's no sound here for a long time.",
'放钟底下正好。我够不着高的地方。': "Under the bell is right. I can't reach anywhere high.",
'灯放进钟座里。钟的内壁亮起来，上面有许多道旧的划痕。':
  "The lamp goes into the base of the bell. The inside lights up, covered in old scratches.",
'船绕开冰面。后面的钟响了第二下。':
  "The ship steers clear of the ice. Behind it, the bell rings a second time.",
'对面那艘船': 'The Ship Across',
'对面船上的': 'the one on the other ship',
'静默段里停着另一艘夜航船。他们的温室空了很久。':
  "Another night ship is lying in the quiet stretch. Their greenhouse has been empty a long time.",
'两艘船并排停住。这一段没有航标，说话的声音听起来很近。':
  "The two ships stop side by side. There are no beacons here, so a voice sounds very close.",
'前几天我在舷窗外看见你们了。': "I saw you out the porthole a few days ago.",
'你们的窗是暖色的。我们这边的灯坏了一个月。':
  "Your windows are a warm colour. Our lamp has been out for a month.",
'我端稳了。我们温室里一直空着一个架子。':
  "I've got it steady. There's a shelf in our greenhouse that's been empty.",
'对面船上的转身走回去。对面船的一扇窗，慢慢变成了暖色。':
  "The one from the other ship turns and goes back. Over there, a window slowly turns a warm colour.",
'两艘船分开。对面那扇窗还亮着。': "The two ships draw apart. That window is still lit.",

/* the gangway */
'舷梯': 'Gangway',
'舷门': 'gangway door',
'开舷门': 'open the door',
'关上舷门': 'close the door',
'把灯递过去': 'hand the lamp over',
'那盏灯': 'the lamp',
'架子': 'the stand',
'门锁着。船还在走。': 'The door is locked. The ship is still under way.',
'门还锁着。': 'The door is still locked.',
'舷门从里面锁着。船在走的时候它打不开。':
  "The door locks from the inside. It won't open while the ship is moving.",
'舷门锁着。航程单上还没有下一站。':
  'The door is locked. The run sheet has no next stop on it.',
'到{0}还有大约 {1} 分钟。': '{0} is about {1} minutes off.',
'快到{0}了。': '{0} is coming up.',
'船停住了。门外有脚步声，不快。':
  "The ship has stopped. There are footsteps outside the door, and they're not quick.",
'门外站着一位。你站在门里，船就停在这儿等。':
  'Someone is standing out there. The ship holds here while you stand in the doorway.',
'门合上了。外面的声音一下子远了。': 'The door closes. The sound outside goes far away at once.',
'架子空着。温室的台子上才装得起来。':
  'The stand is empty. One gets built at the work bench in the greenhouse.',
'还差一道。装配台上接着做。': 'It needs one more step. Carry on at the work bench.',
'玻璃罩里那朵花还开着，灯在它上面一点。':
  'The flower under the glass is still open, and the lamp sits a little above it.',
'手上空着。温室的台子上装得起来一盏。':
  'Your hands are empty. One gets built at the work bench in the greenhouse.',
'那盏灯还差一道。': 'The lamp needs one more step.',
'温室的台子上还空着。': 'The work bench in the greenhouse is still empty.',
'船还靠在{0}。舷门那边有人在等。':
  'The ship is still alongside {0}. Someone is waiting at the gangway door.',
'船靠上了{0}。舷门那边有人在等。':
  'The ship has come alongside {0}. Someone is waiting at the gangway door.',
'船还靠在{0}，门外有人在等。':
  'The ship is still alongside {0}, and someone is waiting outside the door.',
'靠上{0}': 'came alongside {0}',
'在{0}留下一盏灯': 'left a lamp at {0}',

/* the work bench */
'装配台': 'work bench',
'罩子架': 'cover shelf',
'灯盘': 'lamp tray',
'订单板': 'order boards',
'罩子要扣在一株植物上。': 'A cover goes down over a plant.',
'罩子已经扣上了。': 'The cover is already down.',
'灯卡在罩子顶上。先有罩子。': 'The lamp clips into the top of a cover. The cover comes first.',
'灯已经装好了。': 'The lamp is already in.',
'台子上这一株还没装完。': "The one on the bench isn't finished yet.",
'那盏装好了，在舷梯的架子上。': "That one's finished. It's on the stand by the gangway.",
'送到那儿的是一株{0}。': 'A {0} went out to them.',
'这一块还空着。调度台还没叫到它。': "This one's still blank. Dispatch hasn't called it yet.",
'玻璃罩扣下来，里面一下子安静了。': 'The glass cover comes down, and everything inside goes quiet.',
'小灯卡进罩顶。叶子底下亮起来一点。':
  'The small lamp clicks into the top. Under the leaves it gets a little brighter.',
'装好一盏灯': 'built a lamp',
'装好了。它在舷梯的架子上等着。': "It's built. It's waiting on the stand by the gangway.",

/* the run sheet, and the line that is always on screen */
'航程单': 'Run sheet',
'下 一 站': 'NEXT STOP',
'先不挑': 'Not yet',
'航行记录': 'Record',
'到访': 'CALLS',
'还没有送到过。': 'Nothing has been delivered yet.',
'没有下一站': 'No next stop',
'下一站': 'Next stop',
'已靠上': 'Alongside',
'靠在 {0}': 'Alongside {0}',
'下一站 {0} · 还有 {1}': 'Next stop {0} · {1} to go',
'船正往{0}去。': 'The ship is on its way to {0}.',
'船还在往{0}去，剩 {1}。': 'The ship is still on its way to {0}, with {1} to go.',
'船正靠着。先把舷门那边的事办完。':
  "The ship is alongside. Finish what's at the gangway door first.",
'接下{0}这一趟': 'took the run to {0}',
'<span class="rcur">在路上</span>': '<span class="rcur">under way</span>',
'<span class="rcur">已靠上</span>': '<span class="rcur">alongside</span>',
'<span class="rcur">去过 {0} 次</span>': '<span class="rcur">been {0}×</span>',
'<span class="rname">{0}{1}</span><span class="rdots">{2}</span><span class="rdesc">{3}<br>走{4}，大约 {5} 分钟。</span>':
  '<span class="rname">{0}{1}</span><span class="rdots">{2}</span><span class="rdesc">{3}<br>By way of {4}, about {5} minutes.</span>',

/* the door screen and the first night */
'正在找这艘船…': 'Finding your ship…',
'你在开一艘夜航船。用鼠标或者触摸点船上的东西；按 Tab 在可以碰的东西之间切换，按回车使用。':
  "You're running a night ship. Use the mouse or touch to tap things aboard. Press Tab to move between what you can touch, and Enter to use it.",

/* ---------- the chart table, and the one who ran this ship before ---------- */
/* There is one crew now. What used to be a person sitting in the cabin is a
   table with her unfinished chart on it, and two or three letters. */
'图桌': 'chart table',
'打开图桌的灯': 'turn the chart lamp on',
'关掉图桌的灯': 'turn the chart lamp off',
'图桌的灯亮了，照在那张没画完的图上。': 'The chart lamp comes on, over the drawing that was never finished.',
'图桌的灯关了。': 'The chart lamp goes off.',
'上一个开这艘船的人留下的图。线画到一半就停了。':
  'The chart was left by whoever ran this ship before. The line stops half way across.',
'你回应过的灯，图上都点了个点，一共 {0} 种颜色。':
  'Every light you have answered has a dot on the chart, in {0} colours now.',
'图上还没有点。窗外的灯回应过一盏，这里就多一个点。':
  'There are no dots yet. Answer a light out the window and one more shows up here.',
'上一个开这艘船的人': 'the one who ran this ship before',
'已经下船了': 'gone ashore',
'图桌上那张图是我画的，没画完。\n我画图从来不画终点，线走到哪儿算哪儿。\n温室左边第一盆是我种的，开了就端走吧。':
  "I drew the chart on your table and never finished it.\nI don't draw an end to a line. It stops where it stops.\nThe first pot on the left in the greenhouse is mine. Take it when it flowers.",
'夜深了。外面的灯也少了。': "It's late. There are fewer lights outside now.",
'船自己走了 {0}。': 'The ship sailed itself for {0}.',

/* ---------- the line: the five things one job is made of ---------- */
'定航向': 'Set course',
'电台室：调到调度台，撕一张单子。': 'Radio room: tune to dispatch and tear off a slip.',
'驾驶舱：点航向板，选择目的地。': 'Bridge: tap the course board and choose a destination.',
'温室：种一盆，浇上水，等它开花。': 'Greenhouse: water a planted pot and wait for it to flower.',
'温室：走近装配台。扣上玻璃罩。接着安装灯头。': 'Greenhouse: move closer to the workbench. Fit the glass cover, then the lamp cap.',
'舷梯：靠上以后开门，把灯递过去。': 'Gangway: open the door once alongside and hand the lamp over.',
'手上 {0} 张单子': 'slips in hand: {0}',
'还没有单子': 'No slip yet',

/* ---------- what each of the five is made of, ticked off on the slips ---------- */
'开电台': 'switch the set on',
'对上调度台': 'find dispatch',
'拿着单子': 'hold the slip',
'选择目的地': 'choose a destination',
'下一粒种': 'plant a seed',
'浇上水': 'water it',
'等它开花': 'wait for the flower',
'端上转台': 'carry it to the turntable',
'扣上罩子': 'put the cover on',
'装上灯': 'fit the lamp',
'船靠上来': 'the ship comes alongside',
'递过去': 'hand it over',

/* ---------- the round, as the slip on the cork board reads it ---------- */
'送到了': 'delivered',
'在路上': 'on the way',
'接了': 'taken',
'还没叫到': 'not called yet',
'送出 {0} 盏灯': 'lamps sent out: {0}',
'还没有送出一盏灯': 'No lamps delivered yet',
'还有 {0} 个地方在等灯。': '{0} more places are waiting for a lamp.',
'四个地方的灯都送到了。': 'Every place that asked has its lamp now.',

/* ---------- dispatch ---------- */
'调度台': 'Dispatch',
'调度': 'DISPATCH',
'调度打印机': 'dispatch printer',
'撕下单子': 'tear the slip off',
'单': 'JOB',
'要一盏灯': 'asked for a lamp',
'打印口响了一下，吐出一张单子。': 'The printer knocks once and feeds out a slip.',
'你撕下单子。{0}那边要一盏灯。': 'You tear the slip off. {0} has asked for a lamp.',
'单子带到驾驶舱，选择目的地，船就往那边开。':
  'Carry the slip to the bridge and put it on the course board, and the ship heads that way.',
'打印口是空的。收音机调到 {0} 的调度台，委托会从这儿出来。':
  'The slot is empty. Tune the set to dispatch at {0} and a job comes out here.',
'打印口还是空的。': 'The slot is still empty.',
'打印口空着。手上的单子先送完吧。': 'The slot is empty. Finish the slips in hand first.',
'今晚没有新的委托了。': "There's nothing new tonight.",

/* ---------- the course board ---------- */
'航向板': 'Course board',
'还没定': 'not set',
'这一趟': 'This run',
'这一趟做完了。电台室会有下一张单子。': "This run is finished. There's another slip waiting at the radio room.",
'选择目的地后，船会自行航行。': 'Choose a destination. The ship will sail there on its own.',
'板子空着。单子从电台室的调度打印机出来。':
  'The board is empty. Slips come out of the dispatch printer in the radio room.',
'单子卡上航向板。船转向{0}。': 'The slip clips onto the board. The ship turns toward {0}.',
'定了航向：{0}': 'set course for {0}',

/* ---------- the door: three ships to choose between ---------- */
'空位 {0}': 'Berth {0}',
'新的一艘': 'A new ship',
'夜航 No.{0}': 'Night Crossing No.{0}',
'{0}前下的船': 'ashore {0} ago',
'删掉这一位的航程': 'delete this voyage',
'再点一次那个叉，{0} 号位就清空了。': 'Click that cross again and berth {0} is cleared.',
'换一位': 'Another ship',
'回到门口': 'Back to the door',
'回到三个存档位那一页。这一位的航程已经存好。':
  'Back to the page with the three berths. This voyage is already saved.',
'清空这一位的航程': 'Clear this voyage',
/* viewpoints in the 3D rooms (src/three/view.ts) */
'观察点': 'Places to look from',
'走近看：{0}': 'go to the {0}',
'回到{0}': 'back to the {0}',
'桌前': 'desk',
'窗边': 'window',
'收音机': 'radio',
'八音盒': 'music box',
'门口': 'doorway',
'水槽和炉子': 'sink and stove',
'种植区': 'garden',
'育苗区': 'nursery',
'‹ 返回': '‹ Back',
'坐着': 'sitting',
'躺着': 'lying down',

/* First voyage and visible interaction prompts. */
'登上一艘夜航船，为沿途的人送去一盏灯。': "Come aboard a night ship and bring a light to someone along the way.",
'选一个目的地，把开花植物装成灯。第一张委托和一盆月铃已经备好。': "Choose a destination and make a lamp from a flowering plant. Your first request is ready. A moonbell is already in bloom.",
'静音登船': "Come aboard quietly",
'第一张委托来自旧码头。点窗间的航向板，选择目的地。': "Your first request is from Old Wharf. Tap the course board between the windows to choose your destination.",
'领取委托': "Collect a request",
'培育植物': "Grow a plant",
'装配植物灯': "Build a plant lamp",
'交付植物灯': "Deliver the lamp",
'已经备好': "prepared",
'装配台上已有一株植物。先把这一盏装好。': "There's already a plant on the workbench. Finish this lamp first.",
'先选一盆开花的植物，再移到装配台。': "Choose a flowering plant and move it to the workbench.",
'{0}已经移到装配台。接着扣上左边的玻璃罩。': "The {0} is on the workbench. Fit the glass cover from the rack on the left.",
'装配台已有植物。先完成台上的那一盏。': "There's a plant on the workbench. Finish that lamp first.",
'把这盆开花植物装成灯，或剪一枝放进驾驶舱的花瓶。': "Make this flowering plant into a lamp, or cut a stem for the vase on the bridge.",
'移到装配台': "Move to the workbench",
'剪一枝插瓶': "Cut a stem for the vase",
'留在这里': "Leave it here",
'剪下一枝放进花瓶。这盆约五分钟后再开花。': "You cut a stem for the vase. This plant will flower again in about five minutes.",
'剪下一枝放进花瓶。剩下的花还可以装成灯。': "You cut a stem for the vase. The remaining flowers can still go into a lamp.",
'点下方的位置按钮，走近种植区或装配台。': "Use the place buttons below to move closer to the garden or workbench.",
'这一趟已经送到。下一张委托可以去电台室领取。': "This delivery is complete. Pick up your next request in the radio room.",
'把开花植物移到装配台': "Move a flowering plant to the workbench",
'玻璃罩已扣好': "The cover is fitted",
'植物灯已装好': "The plant lamp is ready",
'选择开花植物': "Choose a flowering plant",
'设定航向': "Set the course",
'安装灯头': "Fit the lamp cap",
'当前步骤': "Current step",
'下一步': "Next step",
'航向': "Course",
'装灯': "Build",
'交付': "Deliver",
'第一趟 · {0}': "First delivery · {0}",
'航程指引': "Voyage guide",
'委托已备好 · 月铃已开花': "Request ready · Moonbell in bloom",
'取下打印出的委托': "Collect the printed request",
'打印机里已有单子。点它取下，再到驾驶舱设定航向。': "There's a request in the printer. Take it to the bridge and set your course.",
'走近收音机': "Move closer to the radio",
'取下委托': "Collect the request",
'打开收音机': "Switch on the radio",
'点收音机左侧开关，再左右拖动右侧旋钮。': "Tap the switch on the left of the radio. Then drag the right-hand tuning knob sideways.",
'调到调度台': "Tune in to dispatch",
'左右拖动右侧旋钮，调到 1.09。委托会从打印机出来。': "Drag the right-hand knob sideways to 1.09. A request will come out of the printer.",
'左右拖动 · 调到 1.09': "Drag sideways · Tune to 1.09",
'这一趟送到了': "Delivery complete",
'领取下一张委托': "Collect the next request",
'{0}的灯亮了。下一张委托在电台室。': "The light at {0} is on. Your next request is in the radio room.",
'打开收音机，调到 1.09 的调度台。': "Switch on the radio and tune to dispatch at 1.09.",
'去电台室': "Go to the radio room",
'选定目的地': "Choose your destination",
'查看航向板': "Open the course board",
'先放下喷壶': 'Put the watering can down',
'植物已经开花。点喷壶原来的位置放下它，再选择植物。': 'The plant has flowered. Tap the can\'s original place to put it down, then choose the plant.',
'把开花植物装成灯': "Make a lamp from the plant",
'已有一盆开花植物。点它，选择移到装配台。': "A plant is already in bloom. Tap it and choose to move it to the workbench.",
'去温室': "Go to the greenhouse",
'选择这盆植物': "Choose this plant",
'植物正在生长': "The plant is growing",
'种下一盆植物': "Plant a seed",
'去种植区': "Go to the garden",
'选择种子': "Choose a seed",
'植物已经放好。点装配台左边的玻璃罩。': "The plant is in place. Tap the glass cover to the left of the workbench.",
'走近装配台': "Move closer to the workbench",
'玻璃罩已经扣好。点右边灯盘上的灯头。': "The cover is fitted. Tap a lamp cap in the tray on the right.",
'植物灯装好了': "The plant lamp is ready",
'船正在前往目的地。到港时，这里会亮起提示。': "The ship is on its way. This guide will show you when it arrives.",
'去厨房坐坐': "Visit the galley",
'把灯送到门外': "Deliver the lamp",
'门外有人正在等。点他，把植物灯递过去。': "Someone is waiting outside. Tap them to hand over the plant lamp.",
'船已经靠好。点舷门把手，打开门。': "The ship has docked. Tap the gangway handle to open the door.",
'去舷梯': "Go to the gangway",
'打开舷门': "Open the gangway door",
'自由探索': "Explore freely",
'重看提示': "Read the hint again",
'已到港 · {0}': "Docked · {0}",
'前往{0} · {1}:{2}': "To {0} · {1}:{2}",
'点按': "Tap",
'按住 · 拖画': "Hold · Draw",
'走近': "Move closer",
'走近查看': "Look closer",
'调节吊灯': "Adjust the hanging lamp",
'切换提灯颜色': "Change the lantern colour",
'哈气，再在雾上画画': "Breathe on the glass, then draw in the mist",
'查看植物的用途': "Choose what to do with the plant",
'转动花盆': "Turn the pot",
'拖动': "Drag",
'拿起或放下喷壶': "Pick up or put down the watering can",
'调到 1.09 的调度台': "Tune to dispatch at 1.09",
'开关收音机': "Switch the radio on or off",
'左右拖动': "Drag sideways",
'给八音盒上发条': "Wind the music box",
'顺时针画圈': "Turn clockwise",
'在纸带上打孔': "Punch the tape",
'点按 · 拖动': "Tap · Drag",
'揉面团': "Knead the dough",
'移动水壶，热水烧好后按住倒水': "Move the kettle; hold to pour when the water is hot",
'点按 · 按住': "Tap · Hold",
'引导': "Guide",
'开启': "On",
'关闭': "Off",
'显示当前步骤和场景中的操作提示。': "Show the current step and action prompts in the scene.",
'下一趟': "Next delivery",
'扣上玻璃罩': 'Fit the glass cover',

'打印机': 'Printer',
'走近打印机': 'Move closer to the printer',
'委托已经备好。点窗间的航向板，选择{0}。': 'Your request is ready. Tap the course board between the windows and choose {0}.',
'四处都亮起灯了': 'All four lights are on',
'送过的灯都记在航行记录里。船上还有地方可以坐坐。': 'Your deliveries are in the voyage record. There are still places to sit aboard.',
'看看航行记录': 'Open the voyage record',

'点种子盒，选一种种进空盆。': 'Tap the seed box and choose a seed for an empty pot.',
'土干了，浇一点水': 'The soil is dry',
'点喷壶拿起来，再点干土的花盆。': 'Pick up the watering can, then tap a pot with dry soil.',
'给这盆浇水': 'Water this pot',
'拿起喷壶': 'Pick up the watering can',
'打开生长灯': 'Switch on the grow lamp',
'点上方的生长灯，花苞会长得快一些。': 'Switch on the grow lamp above. The buds will grow faster.',
'花苞正在长大，预计还需约 {0} 分钟。': 'The buds are growing. They should flower in about {0} minutes.',
};
