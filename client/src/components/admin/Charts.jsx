// رسوم لوحة التحكم — recharts.
//
// كل الرسوم هنا responsive بـ ResponsiveContainer، ومتظبطة على التيمة
// الداكنة (recharts افتراضيًا بيرسم بألوان فاتحة مش بتبان على خلفية غامقة).
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const GOLD = '#c9a24a';
const GOLD_SOFT = '#e6c684';
const ROSE = '#c9788a';
const EMERALD = '#2f9c80';
const GRID = 'rgba(250,245,236,0.10)';
const AXIS = 'rgba(250,245,236,0.40)';

export const PIE_COLORS = [GOLD, EMERALD, ROSE, GOLD_SOFT, '#7d9bd1', '#c98a5a', '#9c7fc9'];

/** التاريخ على المحور: يوم/شهر بس، عشان ميزدحمش */
function shortDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const axisProps = {
  stroke: AXIS,
  tick: { fontSize: 11, fill: AXIS },
  tickLine: false,
  axisLine: { stroke: GRID },
};

function TooltipBox({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-line-lite bg-night px-3 py-2 text-[12px] shadow-xl">
      <div className="mb-1 font-bold text-ivory/80">{shortDate(label)}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-ivory/70">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <b className="text-ivory">{Number(p.value).toLocaleString('en-US')}</b>
        </div>
      ))}
    </div>
  );
}

/** خط زمني بمساحة تحته — للنمو التراكمي (مستخدمين، دعوات) */
export function AreaTrend({ data, keys, height = 230 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
        <defs>
          {keys.map((k) => (
            <linearGradient key={k.key} id={`grad-${k.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={k.color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={k.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={24} />
        <YAxis allowDecimals={false} {...axisProps} width={44} />
        <Tooltip content={<TooltipBox />} cursor={{ stroke: GRID }} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: AXIS }} />}
        {keys.map((k) => (
          <Area
            key={k.key}
            type="monotone"
            dataKey={k.key}
            name={k.label}
            stroke={k.color}
            strokeWidth={2}
            fill={`url(#grad-${k.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** أعمدة — للأرباح اليومية */
export function BarTrend({ data, keys, height = 230 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={24} />
        <YAxis allowDecimals={false} {...axisProps} width={52} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(250,245,236,0.05)' }} />
        <Legend wrapperStyle={{ fontSize: 11, color: AXIS }} />
        {keys.map((k) => (
          <Bar key={k.key} dataKey={k.key} name={k.label} fill={k.color} radius={[4, 4, 0, 0]} maxBarSize={26} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** خط بسيط — للردود */
export function LineTrend({ data, keys, height = 230 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={24} />
        <YAxis allowDecimals={false} {...axisProps} width={44} />
        <Tooltip content={<TooltipBox />} cursor={{ stroke: GRID }} />
        <Legend wrapperStyle={{ fontSize: 11, color: AXIS }} />
        {keys.map((k) => (
          <Line
            key={k.key}
            type="monotone"
            dataKey={k.key}
            name={k.label}
            stroke={k.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** دونات — لتوزيع القوالب/الباقات/الدول */
export function Donut({ data, height = 210 }) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius="55%"
          outerRadius="82%"
          paddingAngle={2}
          stroke="none"
        >
          {data.map((entry, i) => (
            <Cell key={entry.label} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#08130f', border: '1px solid rgba(250,245,236,0.14)',
            borderRadius: 12, fontSize: 12, color: '#faf5ec',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: AXIS }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export const COLORS = { GOLD, GOLD_SOFT, ROSE, EMERALD };
