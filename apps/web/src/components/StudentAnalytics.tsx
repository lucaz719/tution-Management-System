import { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from './ui/StatusBadge';

interface TrendPoint { month: string; present: number; total: number; rate: number | null }
interface HomeworkItem {
  id: string; title: string; subject: string; course: string | null; deadline: string;
  status: 'GRADED' | 'SUBMITTED' | 'OVERDUE' | 'PENDING'; late: boolean; grade: string | null; submittedAt: string | null;
}
interface CourseNode {
  course: string; className: string; teacher: string | null; status: string;
  attendanceRate: number | null; homeworkAssigned: number; homeworkSubmitted: number;
}
interface ActivityItem { type: string; date: string; label: string; detail?: string }

interface Analytics {
  name: string;
  grade: string | null;
  attendance: { present: number; absent: number; excused: number; blocked: number; totalMarked: number; rate: number | null; trend: TrendPoint[] };
  homework: { assigned: number; submitted: number; graded: number; pending: number; overdue: number; completionRate: number | null; onTimeRate: number | null; timeline: HomeworkItem[] };
  fees: { paid: number; due: number; overdue: number; collectionRate: number | null };
  activeCourses: string[];
  perCourse: CourseNode[];
  activity: ActivityItem[];
  connections: { courses: string[]; teachers: string[]; parents: string[] };
}

interface StudentAnalyticsProps {
  userId: string;
  fetcher: (userId: string) => Promise<Analytics>;
  onClose: () => void;
}

const NODE_COLORS = { Grade: '#1560BD', Course: '#00AB66', Teacher: '#FFBC3B', Parent: '#E24B4A' } as const;

function money(n: number): string {
  return `NPR ${n.toLocaleString()}`;
}

function shortDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
      {children}
    </div>
  );
}

// A compact KPI tile with an optional progress ring.
function Kpi({ label, value, sub, pct, tone, icon }: { label: string; value: string; sub?: string; pct?: number | null; tone: string; icon?: string }) {
  const r = 20, c = 2 * Math.PI * r;
  return (
    <div style={{ background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      {pct != null ? (
        <svg width="52" height="52" viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
          <circle cx="26" cy="26" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
          <circle cx="26" cy="26" r={r} fill="none" stroke={tone} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, pct)) / 100)} transform="rotate(-90 26 26)" />
          <text x="26" y="30" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)">{pct}%</text>
        </svg>
      ) : (
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <span className="material-symbols-outlined">{icon ?? 'insights'}</span>
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>{value}</div>
        {sub ? <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{sub}</div> : null}
      </div>
    </div>
  );
}

// Plain-language health summary so parents can read the numbers at a glance.
function ParentSummary({ data }: { data: Analytics }) {
  const firstName = data.name.split(' ')[0];
  const att = data.attendance.rate;
  const hw = data.homework.completionRate;

  const verdict = (pct: number | null, good: string, ok: string, bad: string): [string, string] => {
    if (pct == null) return ['var(--text-muted)', 'No data recorded yet'];
    if (pct >= 90) return ['var(--color-success)', good];
    if (pct >= 70) return ['var(--color-warning)', ok];
    return ['var(--color-error)', bad];
  };

  const [attColor, attVerdict] = verdict(att, 'Excellent — rarely misses class', 'Good, but a few classes missed', 'Needs attention — many classes missed');
  const [hwColor, hwVerdict] = verdict(hw, 'Excellent — homework is up to date', 'Good, some homework still pending', 'Needs attention — homework is falling behind');
  const feeColor = data.fees.overdue > 0 ? 'var(--color-error)' : data.fees.due > 0 ? 'var(--color-warning)' : 'var(--color-success)';
  const feeVerdict = data.fees.overdue > 0
    ? `${data.fees.overdue} overdue invoice${data.fees.overdue > 1 ? 's' : ''} — ${money(data.fees.due)} pending`
    : data.fees.due > 0 ? `${money(data.fees.due)} pending` : 'All fees cleared';

  const rows: Array<[string, string, string, string]> = [
    ['fact_check', attColor, att != null ? `Attended ${data.attendance.present} of ${data.attendance.totalMarked} classes (${att}%)` : 'Attendance', attVerdict],
    ['assignment_turned_in', hwColor, data.homework.assigned > 0 ? `Completed ${data.homework.submitted} of ${data.homework.assigned} homework${data.homework.onTimeRate != null ? ` (${data.homework.onTimeRate}% on time)` : ''}` : 'Homework', hwVerdict],
    ['payments', feeColor, 'Fees', feeVerdict],
  ];

  return (
    <div style={{ background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)', borderRadius: '14px', padding: '14px 16px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>How is {firstName} doing?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map(([icon, color, headline, sub]) => (
          <div key={icon} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color, marginTop: '1px' }}>{icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>{headline}</div>
              <div style={{ fontSize: '12px', color }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Six-month attendance trend as a mini bar chart.
function AttendanceTrend({ trend }: { trend: TrendPoint[] }) {
  const hasData = trend.some((t) => t.total > 0);
  if (!hasData) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '96px', padding: '4px 2px 0' }}>
      {trend.map((t) => (
        <div key={t.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
          {t.rate != null ? <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>{t.rate}%</div> : null}
          <div style={{
            width: '100%', maxWidth: '34px', borderRadius: '6px 6px 2px 2px',
            height: t.rate != null ? `${Math.max(6, t.rate * 0.6)}px` : '4px',
            background: t.rate == null ? 'var(--border)'
              : t.rate >= 90 ? 'var(--color-success)'
              : t.rate >= 70 ? 'var(--color-warning)' : 'var(--color-error)',
            opacity: t.rate == null ? 0.6 : 0.9,
          }} />
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{t.month}</div>
        </div>
      ))}
    </div>
  );
}

// Interactive knowledge graph: student at the centre, courses on an inner ring
// (each carrying its own attendance/homework stats), and grade / teachers /
// parents on an outer ring. Course→teacher edges show who teaches what, and
// clicking a course highlights its cluster and opens a detail card.
function KnowledgeGraph({ data }: { data: Analytics }) {
  const [selected, setSelected] = useState<number | null>(null);

  const W = 380, H = 340, cx = W / 2, cy = H / 2, R1 = 66, R2 = 132;

  const { courses, outer, edges } = useMemo(() => {
    const courses = data.perCourse.map((c, i) => {
      const n = Math.max(1, data.perCourse.length);
      const a = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
      return { ...c, x: cx + Math.cos(a) * R1, y: cy + Math.sin(a) * R1 };
    });

    const teacherNames = Array.from(new Set(data.perCourse.map((c) => c.teacher).filter(Boolean) as string[]));
    const outerList: Array<{ kind: 'Grade' | 'Teacher' | 'Parent'; label: string; x: number; y: number }> = [];
    if (data.grade) outerList.push({ kind: 'Grade', label: data.grade, x: 0, y: 0 });
    teacherNames.forEach((t) => outerList.push({ kind: 'Teacher', label: t, x: 0, y: 0 }));
    data.connections.parents.forEach((p) => outerList.push({ kind: 'Parent', label: p, x: 0, y: 0 }));
    outerList.forEach((n, i) => {
      const a = (i / Math.max(1, outerList.length)) * Math.PI * 2 - Math.PI / 2;
      n.x = cx + Math.cos(a) * R2;
      n.y = cy + Math.sin(a) * R2;
    });

    // Edges: centre→course, course→its teacher, centre→grade/parents.
    const edges: Array<{ x1: number; y1: number; x2: number; y2: number; color: string; courseIdx: number | null; dashed?: boolean }> = [];
    courses.forEach((c, i) => {
      edges.push({ x1: cx, y1: cy, x2: c.x, y2: c.y, color: NODE_COLORS.Course, courseIdx: i, dashed: c.status !== 'ACTIVE' });
      const t = outerList.find((o) => o.kind === 'Teacher' && o.label === c.teacher);
      if (t) edges.push({ x1: c.x, y1: c.y, x2: t.x, y2: t.y, color: NODE_COLORS.Teacher, courseIdx: i });
    });
    outerList.forEach((o) => {
      if (o.kind !== 'Teacher') {
        edges.push({ x1: cx, y1: cy, x2: o.x, y2: o.y, color: NODE_COLORS[o.kind], courseIdx: null });
      }
    });
    return { courses, outer: outerList, edges };
  }, [data, cx, cy]);

  const dimmed = (courseIdx: number | null) => selected != null && courseIdx !== selected;
  const sel = selected != null ? courses[selected] : null;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Student knowledge graph"
        style={{ maxWidth: '400px', display: 'block', margin: '0 auto' }} onClick={() => setSelected(null)}>
        {edges.map((e, i) => (
          <line key={`e${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={dimmed(e.courseIdx) ? 'var(--border)' : e.color}
            strokeOpacity={dimmed(e.courseIdx) ? 0.4 : 0.55}
            strokeWidth={e.courseIdx != null && e.courseIdx === selected ? 2.5 : 1.5}
            strokeDasharray={e.dashed ? '4 4' : undefined} />
        ))}

        {outer.map((n, i) => {
          const isDim = selected != null && !(n.kind === 'Teacher' && sel?.teacher === n.label);
          const label = n.label.length > 15 ? n.label.slice(0, 14) + '…' : n.label;
          return (
            <g key={`o${i}`} opacity={isDim ? 0.35 : 1}>
              <circle cx={n.x} cy={n.y} r="7" fill={NODE_COLORS[n.kind]} />
              <text x={n.x} y={n.y - 11} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text)">{label}</text>
              <text x={n.x} y={n.y + 18} textAnchor="middle" fontSize="8" fill="var(--text-muted)">{n.kind}</text>
            </g>
          );
        })}

        {courses.map((c, i) => {
          const label = c.course.length > 13 ? c.course.slice(0, 12) + '…' : c.course;
          const stats = [
            c.attendanceRate != null ? `${c.attendanceRate}% att` : null,
            c.homeworkAssigned > 0 ? `${c.homeworkSubmitted}/${c.homeworkAssigned} hw` : null,
          ].filter(Boolean).join(' · ');
          return (
            <g key={`c${i}`} opacity={dimmed(i) ? 0.35 : 1} style={{ cursor: 'pointer' }}
              onClick={(ev) => { ev.stopPropagation(); setSelected(selected === i ? null : i); }}>
              <circle cx={c.x} cy={c.y} r={selected === i ? 10 : 8} fill={NODE_COLORS.Course}
                stroke={selected === i ? 'var(--text)' : 'none'} strokeWidth="1.5" />
              <text x={c.x} y={c.y - 13} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text)">{label}</text>
              {stats ? <text x={c.x} y={c.y + 20} textAnchor="middle" fontSize="8" fill="var(--text-muted)">{stats}</text> : null}
            </g>
          );
        })}

        <circle cx={cx} cy={cy} r="26" fill="var(--color-primary)" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
          {data.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
        </text>
      </svg>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '4px' }}>
        {(Object.entries(NODE_COLORS) as Array<[string, string]>).map(([kind, color]) => (
          <span key={kind} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />{kind}
          </span>
        ))}
      </div>

      {sel ? (
        <div style={{ marginTop: '12px', background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{sel.course}</div>
            <StatusBadge variant={sel.status === 'ACTIVE' ? 'success' : 'warning'}>{sel.status}</StatusBadge>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {sel.className}{sel.teacher ? ` · taught by ${sel.teacher}` : ' · no teacher assigned'}
          </div>
          <div style={{ display: 'flex', gap: '18px', marginTop: '8px', fontSize: '12.5px' }}>
            <span><strong>{sel.attendanceRate != null ? `${sel.attendanceRate}%` : '—'}</strong> attendance</span>
            <span><strong>{sel.homeworkSubmitted}/{sel.homeworkAssigned}</strong> homework done</span>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
          Tap a course node to see its class, teacher, and performance.
        </p>
      )}
    </div>
  );
}

const HW_CHIP: Record<HomeworkItem['status'], { color: string; label: string }> = {
  GRADED: { color: 'var(--color-success)', label: 'Graded' },
  SUBMITTED: { color: 'var(--color-info)', label: 'Submitted' },
  PENDING: { color: 'var(--color-warning)', label: 'Pending' },
  OVERDUE: { color: 'var(--color-error)', label: 'Overdue' },
};

// Per-homework tracker: every assignment with its submission state and grade.
function HomeworkTracker({ items }: { items: HomeworkItem[] }) {
  if (items.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No homework assigned yet.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
      {items.map((hw) => {
        const chip = HW_CHIP[hw.status];
        return (
          <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 12px' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hw.title}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {hw.subject}{hw.course ? ` · ${hw.course}` : ''} · due {shortDate(hw.deadline)}
                {hw.late ? <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}> · late</span> : null}
              </div>
            </div>
            {hw.grade ? <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-success)', flexShrink: 0 }}>{hw.grade}</span> : null}
            <span style={{
              flexShrink: 0, fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '999px',
              color: chip.color, background: `color-mix(in srgb, ${chip.color} 13%, transparent)`,
            }}>{chip.label}</span>
          </div>
        );
      })}
    </div>
  );
}

const ACTIVITY_ICON: Record<string, string> = {
  submission: 'upload_file',
  grade: 'grading',
  attendance: 'event_available',
  payment: 'payments',
};

// Newest-first feed of everything the student did across the system.
function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No recorded activity yet.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((a, i) => (
        <div key={`${a.type}-${i}`} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '7px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '17px', color: 'var(--text-muted)', marginTop: '1px' }}>
            {ACTIVITY_ICON[a.type] ?? 'history'}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '12.5px', color: 'var(--text)' }}>{a.label}</div>
            {a.detail ? <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>&ldquo;{a.detail}&rdquo;</div> : null}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{shortDate(a.date)}</span>
        </div>
      ))}
    </div>
  );
}

export function StudentAnalytics({ userId, fetcher, onClose }: StudentAnalyticsProps) {
  const [data, setData] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showGraph, setShowGraph] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetcher(userId)
      .then((d) => { if (active) setData(d); })
      .catch((e: unknown) => { if (active) setErrorMsg(e instanceof Error ? e.message : 'Failed to load analytics.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [userId, fetcher]);

  const att = data?.attendance;
  const attTotal = att?.totalMarked ?? 0;
  const overdueItems = (data?.homework.overdue ?? 0) + (data?.fees.overdue ?? 0);

  return (
    <>
      <div className="people-drawer-overlay" onClick={onClose} />
      <aside className="people-drawer" role="dialog" aria-modal="true" style={{ width: '560px' }}>
        <div className="people-drawer-head">
          <div>
            <h2>{data?.name ?? 'Analytics'}</h2>
            <p>Performance overview{data?.grade ? ` · ${data.grade}` : ''}</p>
          </div>
          <button type="button" className="people-drawer-close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="people-drawer-body">
          {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}
          {isLoading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '30px 0' }}>Loading analytics…</p>
          ) : data ? (
            <>
              <ParentSummary data={data} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Kpi label="Attendance" value={att?.rate != null ? `${att.rate}%` : 'No data'} sub={`${att?.present ?? 0}/${attTotal} present`} pct={att?.rate ?? null} tone="var(--color-success)" />
                <Kpi label="Homework" value={data.homework.completionRate != null ? `${data.homework.completionRate}%` : 'No data'} sub={`${data.homework.submitted}/${data.homework.assigned} done`} pct={data.homework.completionRate} tone="var(--color-primary)" />
                <Kpi label="On-Time Submissions" value={data.homework.onTimeRate != null ? `${data.homework.onTimeRate}%` : '—'} sub={`${data.homework.graded} graded`} pct={data.homework.onTimeRate} tone="var(--color-info)" />
                <Kpi label="Fees Collected" value={data.fees.collectionRate != null ? `${data.fees.collectionRate}%` : '—'} sub={`${money(data.fees.due)} due`} pct={data.fees.collectionRate} tone="var(--color-accent)" />
                <Kpi label="Active Courses" value={String(data.activeCourses.length)} sub={data.homework.pending > 0 ? `${data.homework.pending} hw pending` : 'up to date'} tone="var(--color-info)" icon="school" />
                <Kpi label="Overdue Items" value={String(overdueItems)} sub={`${data.homework.overdue} homework · ${data.fees.overdue} invoices`} tone={overdueItems > 0 ? 'var(--color-error)' : 'var(--color-success)'} icon={overdueItems > 0 ? 'warning' : 'task_alt'} />
              </div>

              {att && att.trend.some((t) => t.total > 0) ? (
                <div>
                  <SectionTitle>Attendance trend (6 months)</SectionTitle>
                  <AttendanceTrend trend={att.trend} />
                </div>
              ) : null}

              <div>
                <SectionTitle>Attendance breakdown</SectionTitle>
                {attTotal === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No attendance recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {([['Present', att!.present, 'var(--color-success)'], ['Absent', att!.absent, 'var(--color-error)'], ['Excused', att!.excused, 'var(--color-warning)']] as const).map(([label, n, color]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '60px', fontSize: '12.5px', color: 'var(--text-muted)' }}>{label}</span>
                        <div style={{ flex: 1, height: '8px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round((n / attTotal) * 100)}%`, height: '100%', background: color }} />
                        </div>
                        <span style={{ width: '32px', textAlign: 'right', fontSize: '12.5px', fontWeight: 700 }}>{n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <button type="button" onClick={() => setShowGraph((s) => !s)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 700, fontSize: '13px', padding: 0, fontFamily: 'inherit' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{showGraph ? 'expand_less' : 'hub'}</span>
                  {showGraph ? 'Hide knowledge graph' : 'View knowledge graph'}
                </button>
                {showGraph ? (
                  <div style={{ marginTop: '10px', background: 'var(--color-bg)', border: '1px solid var(--border)', borderRadius: '14px', padding: '12px' }}>
                    <KnowledgeGraph data={data} />
                  </div>
                ) : null}
              </div>

              <div>
                <SectionTitle>Homework tracker</SectionTitle>
                <HomeworkTracker items={data.homework.timeline} />
              </div>

              <div>
                <SectionTitle>Recent activity</SectionTitle>
                <ActivityFeed items={data.activity} />
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
