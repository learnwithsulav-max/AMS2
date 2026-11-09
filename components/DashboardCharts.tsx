import { Card } from './ui';

export type ChartPoint = { label: string; value: number };
export type ChartSlice = { label: string; value: number; color: string };

export function TrendChart({ title, description, points, formatValue = (value: number) => String(value) }: {
  title: string;
  description: string;
  points: ChartPoint[];
  formatValue?: (value: number) => string;
}) {
  const width = 640;
  const height = 190;
  const padding = 22;
  const max = Math.max(1, ...points.map((point) => point.value));
  const coords = points.map((point, index) => ({
    x: points.length <= 1 ? width / 2 : padding + index * (width - padding * 2) / (points.length - 1),
    y: height - padding - point.value / max * (height - padding * 2),
  }));
  const polyline = coords.map(({ x, y }) => `${x},${y}`).join(' ');
  const area = coords.length ? `${padding},${height - padding} ${polyline} ${width - padding},${height - padding}` : '';

  return (
    <Card className="p-5">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: ${points.map((point) => `${point.label} ${formatValue(point.value)}`).join(', ')}`} className="h-48 w-full overflow-visible">
          {[0, 1, 2, 3].map((line) => {
            const y = padding + line * (height - padding * 2) / 3;
            return <line key={line} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="4 5" />;
          })}
          {coords.length > 1 && <polygon points={area} fill="#0A4F8A" opacity="0.08" />}
          {coords.length > 1 && <polyline points={polyline} fill="none" stroke="#0A4F8A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
          {coords.map(({ x, y }, index) => <circle key={points[index].label} cx={x} cy={y} r="5" fill="#F15A24" stroke="white" strokeWidth="2" />)}
        </svg>
        <div className="mt-1 flex justify-between gap-2 text-xs text-slate-500">
          {points.map((point) => <span key={point.label} className="text-center">{point.label}</span>)}
        </div>
      </div>
    </Card>
  );
}

export function BarChart({ title, description, points }: {
  title: string;
  description: string;
  points: ChartPoint[];
}) {
  const max = Math.max(1, ...points.map((point) => point.value));
  return (
    <Card className="p-5">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5 grid gap-3">
        {points.map((point) => (
          <div key={point.label} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-xs">
            <span className="truncate text-slate-600">{point.label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#F15A24]" style={{ width: `${point.value / max * 100}%` }} />
            </div>
            <b className="text-right text-slate-800">{point.value}</b>
          </div>
        ))}
        {!points.length && <p className="text-sm text-slate-500">No records yet</p>}
      </div>
    </Card>
  );
}

export function DonutChart({ title, description, slices }: {
  title: string;
  description: string;
  slices: ChartSlice[];
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let cumulative = 0;
  const gradient = total
    ? slices.map((slice) => {
        const start = cumulative / total * 100;
        cumulative += slice.value;
        return `${slice.color} ${start}% ${cumulative / total * 100}%`;
      }).join(', ')
    : '#e2e8f0 0% 100%';

  return (
    <Card className="p-5">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-6">
        <div className="grid h-36 w-36 shrink-0 place-items-center rounded-full" role="img" aria-label={`${title}: ${slices.map((slice) => `${slice.label} ${slice.value}`).join(', ')}`} style={{ background: `conic-gradient(${gradient})` }}>
          <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
            <span><b className="block text-2xl text-slate-900">{total}</b><span className="text-xs text-slate-500">total</span></span>
          </div>
        </div>
        <ul className="grid gap-2 text-sm">
          {slices.map((slice) => (
            <li key={slice.label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: slice.color }} aria-hidden="true" />
              <span className="text-slate-600">{slice.label}</span><b className="ml-auto">{slice.value}</b>
            </li>
          ))}
          {!slices.length && <li className="text-slate-500">No records yet</li>}
        </ul>
      </div>
    </Card>
  );
}
