/* ================= PORTS =================
   The visible main line. The ship is not a hotel the player rides: it is a
   round that calls at four places, each of which asked for one lit plant.

   Every port names the lane that leads to it, so taking a call is also the
   choice of lane the cabin used to make on its own. `mins` is real travel
   time; the ship comes alongside whether or not anyone is aboard to see it,
   and then it waits at the gangway until the door is opened.

   The three beacon colours were already named after three of these places in
   data/index.ts, so the lights the player answers from the cabin window are
   the places the ship is working toward. */
import { tr } from '../i18n';
import { CROSSING } from './chart';

export interface Port {
  id: string; name: string; lane: string; col: string | null; who: string;
  mins: number; ask: string; near: string; meet: string[]; take: string;
  after: string; part: string;
  look: { h: number; w: number; arms: number; eyes: number; body: string; lamp: string };
}

export const PORTS: Record<string, Port> = {
  dock: {
    id:'dock', name:tr('旧码头'), lane:'harbor', col:'amber', who:tr('看码头的'), mins:CROSSING.dock,
    ask:tr('旧码头只剩一盏灯了。看码头的问，能不能换一盏活的。'),
    near:tr('船贴上旧码头。这里比船上冷，泡过水的木头味道一直飘上来。'),
    meet:[tr('我在这儿守着。有船经过，我就把那盏灯擦一遍。'),
          tr('擦了很多年了。它还是那么暗。')],
    take:tr('我接着。我手慢，你别松太快。'),
    after:tr('看码头的把灯举过头顶。木板上落下一圈光，照出一截旧栏杆。'),
    part:tr('船退开。那圈光还留在码头上，越来越小。'),
    look:{ h:250, w:96, arms:2, eyes:2, body:'#8a7f9c', lamp:'#f2a95b' }
  },
  echo: {
    id:'echo', name:tr('回声浮标'), lane:'nebula', col:'teal', who:tr('守浮标的'), mins:CROSSING.echo,
    ask:tr('回声浮标那边太静了。守浮标的想要一样晚上会亮的东西。'),
    near:tr('船停在浮标边上。你说一句话，过好一会儿它才还给你。'),
    meet:[tr('我先听见你们，过了很久才看见你们。'),
          tr('这儿什么都慢。你说的话我也要等一等。')],
    take:tr('我把它放窗台上。那扇窗朝着你们来的方向。'),
    after:tr('守浮标的把灯捧进舱里。浮标的玻璃上多了一个暖色的点。'),
    part:tr('船开出去。身后传来一声你刚才说过的话。'),
    look:{ h:210, w:120, arms:3, eyes:4, body:'#5e8f94', lamp:'#62b0a8' }
  },
  bell: {
    id:'bell', name:tr('晚钟'), lane:'ring', col:'rose', who:tr('敲钟的'), mins:CROSSING.bell,
    ask:tr('晚钟一夜只响一次。敲钟的问，能不能在钟底下放一点光。'),
    near:tr('船靠上晚钟。这里很冷，钟声在冰面上传得特别远。'),
    meet:[tr('有船来我才敲。今晚那一下已经敲过了。'),
          tr('敲完以后这儿就很长时间没有声音。')],
    take:tr('放钟底下正好。我够不着高的地方。'),
    after:tr('灯放进钟座里。钟的内壁亮起来，上面有许多道旧的划痕。'),
    part:tr('船绕开冰面。后面的钟响了第二下。'),
    look:{ h:170, w:150, arms:4, eyes:1, body:'#a8788a', lamp:'#e98f8c' }
  },
  ship: {
    id:'ship', name:tr('对面那艘船'), lane:'quiet', col:null, who:tr('对面船上的'), mins:CROSSING.ship,
    ask:tr('静默段里停着另一艘夜航船。他们的温室空了很久。'),
    near:tr('两艘船并排停住。这一段没有航标，说话的声音听起来很近。'),
    meet:[tr('前几天我在舷窗外看见你们了。'),
          tr('你们的窗是暖色的。我们这边的灯坏了一个月。')],
    take:tr('我端稳了。我们温室里一直空着一个架子。'),
    after:tr('对面船上的转身走回去。对面船的一扇窗，慢慢变成了暖色。'),
    part:tr('两艘船分开。对面那扇窗还亮着。'),
    look:{ h:230, w:104, arms:2, eyes:3, body:'#6f7fa8', lamp:'#ffd9a3' }
  }
};
export const PORT_ORDER = ['dock','echo','bell','ship'];
export function portById(id): Port | null { return (id && PORTS[id]) || null; }
