import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TimetableList, type TimetableListItem } from '../components/ui/TimetableList';
import { useAuth } from '../context/AuthContext';

interface AnnouncementItem {
  id: string;
  title: string;
  dateLabel: string;
  isNew: boolean;
}

interface StudentProfile {
  name: string;
  grade: string;
  branch: string;
  enrollmentId: string;
  feeStatus: 'PAID' | 'DUE';
  nextInvoiceDate: string;
}

interface ParentChildRecord {
  id: string;
  name: string;
  attendance: 'Present' | 'Absent' | 'Excused';
  feeBalance: string;
  nextInvoiceDate: string;
  upcomingTimetable: TimetableListItem[];
}

const studentProfile: StudentProfile = {
  name: 'Shyam Bahadur',
  grade: 'Grade 10 · Science',
  branch: 'Baneshwor Branch',
  enrollmentId: 'ST-01-SHYAM',
  feeStatus: 'DUE',
  nextInvoiceDate: '12 July 2026',
};

const studentTimetable: TimetableListItem[] = [
  { id: 'st-1', time: '07:15', title: 'Physics', room: 'Lab 1', detail: 'Aarati Sharma', status: 'Present', statusVariant: 'success' },
  { id: 'st-2', time: '09:00', title: 'Mathematics', room: 'Room 204', detail: 'Ritesh Karki', status: 'Upcoming', statusVariant: 'info' },
  { id: 'st-3', time: '11:30', title: 'English', room: 'Room 110', detail: 'Bina Rai', status: 'Upcoming', statusVariant: 'info' },
];

const announcements: AnnouncementItem[] = [
  { id: 'ann-1', title: 'Unit test schedule for Grade 10 released.', dateLabel: 'Today · 08:30', isNew: true },
  { id: 'ann-2', title: 'Damak inter-branch science fair forms close tomorrow.', dateLabel: 'Today · 06:45', isNew: true },
  { id: 'ann-3', title: 'Saturday remedial classes start next week.', dateLabel: '06 Jul 2026', isNew: false },
];

const parentChildren: ParentChildRecord[] = [
  {
    id: 'child-1',
    name: 'Shyam Bahadur',
    attendance: 'Present',
    feeBalance: 'NPR 5,650',
    nextInvoiceDate: '12 July 2026',
    upcomingTimetable: [
      { id: 'pt-1', time: '09:00', title: 'Mathematics', room: 'Room 204', detail: 'Ritesh Karki', status: 'Upcoming', statusVariant: 'info' },
      { id: 'pt-2', time: '11:30', title: 'English', room: 'Room 110', detail: 'Bina Rai', status: 'Upcoming', statusVariant: 'info' },
    ],
  },
  {
    id: 'child-2',
    name: 'Riya Bahadur',
    attendance: 'Excused',
    feeBalance: 'NPR 0',
    nextInvoiceDate: '05 Aug 2026',
    upcomingTimetable: [
      { id: 'pt-3', time: '08:30', title: 'Social Studies', room: 'Room 115', detail: 'Sushma Adhikari', status: 'Upcoming', statusVariant: 'info' },
      { id: 'pt-4', time: '10:15', title: 'Computer', room: 'Lab 3', detail: 'Milan Gautam', status: 'Upcoming', statusVariant: 'info' },
    ],
  },
];

function getAttendanceVariant(attendance: ParentChildRecord['attendance']) {
  if (attendance === 'Present') {
    return 'success';
  }
  if (attendance === 'Excused') {
    return 'warning';
  }
  return 'error';
}

export function ParentStudentPortal() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState(parentChildren[0]?.id ?? '');

  const isParentView = user?.role === 'PARENT';
  const activeChild = useMemo(
    () => parentChildren.find((child) => child.id === selectedChildId) ?? parentChildren[0],
    [selectedChildId]
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => setIsLoading(false), 700);
    return () => window.clearTimeout(timerId);
  }, []);

  if (isParentView && !activeChild) {
    return null;
  }

  const studentFeeIsDue = studentProfile.feeStatus === 'DUE';
  const parentFeeOutstanding = activeChild ? activeChild.feeBalance !== 'NPR 0' : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {isParentView ? (
        <>
          <Card hoverable={false} style={{ padding: '18px 20px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>Family Overview</h3>
              <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.7)', fontSize: '13px' }}>Switch between children without leaving the dashboard.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
              {parentChildren.map((child) => {
                const isActive = child.id === activeChild.id;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedChildId(child.id)}
                    style={{
                      minHeight: '40px',
                      padding: '10px 16px',
                      borderRadius: '999px',
                      border: isActive ? 'none' : '1px solid rgba(21, 96, 189, 0.12)',
                      background: isActive ? 'var(--color-accent)' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : 'var(--color-text)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {child.name}
                  </button>
                );
              })}
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
            <Card hoverable={false}>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Today's Attendance</h3>
                <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Latest attendance status for {activeChild.name}.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <StatusBadge variant={getAttendanceVariant(activeChild.attendance)}>{activeChild.attendance}</StatusBadge>
                <span style={{ color: 'rgba(44, 62, 80, 0.62)', fontSize: '12px', fontWeight: 600 }}>Recorded at 07:12 AM</span>
              </div>
            </Card>

            <Card hoverable={false}>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Pending Fee Balance</h3>
                <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Current outstanding amount and next invoice date.</p>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, color: 'var(--color-text)' }}>{activeChild.feeBalance}</div>
              <div style={{ marginTop: '6px', color: 'rgba(44, 62, 80, 0.62)', fontSize: '13px' }}>Next invoice: {activeChild.nextInvoiceDate}</div>
              {parentFeeOutstanding ? (
                <Button style={{ marginTop: '16px', background: 'var(--color-accent)', boxShadow: 'none' }}>Pay Now</Button>
              ) : (
                <StatusBadge variant="success">No outstanding balance</StatusBadge>
              )}
            </Card>

            <Card hoverable={false}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Upcoming Timetable</h3>
                <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Remaining classes for the day.</p>
              </div>
              <TimetableList items={activeChild.upcomingTimetable} />
            </Card>

            <Card hoverable={false} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Recent Results</h3>
                <StatusBadge variant="gold">Phase 2</StatusBadge>
              </div>
              <div style={{ filter: 'blur(2px)', opacity: 0.55, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['Physics · 91%', 'Mathematics · 88%', 'English · 93%'].map((item) => (
                  <div key={item} style={{ padding: '14px 16px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid rgba(21, 96, 189, 0.1)', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ position: 'absolute', inset: 'auto 20px 20px 20px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(255, 188, 59, 0.12)', color: 'var(--color-accent)', fontSize: '13px', fontWeight: 700 }}>
                Results unlock here once the Phase 2 results workspace is enabled.
              </div>
            </Card>
          </div>

          <Card hoverable={false}>
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>School Announcements</h3>
              <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Latest branch notices for all enrolled children.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {announcements.map((announcement) => (
                <div key={announcement.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.1)', background: '#FFFFFF', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>{announcement.title}</div>
                    <div style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.62)', fontSize: '12px' }}>{announcement.dateLabel}</div>
                  </div>
                  {announcement.isNew ? <StatusBadge variant="gold">NEW</StatusBadge> : null}
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          <Card hoverable={false}>
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Today's Timetable</h3>
              <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Today's subjects, rooms, and attendance status.</p>
            </div>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={`tt-skeleton-${index}`} style={{ height: '62px', borderRadius: '12px', background: 'rgba(21, 96, 189, 0.08)' }} />
                ))}
              </div>
            ) : (
              <TimetableList items={studentTimetable} />
            )}
          </Card>

          <div style={{ display: 'grid', gap: '18px' }}>
            <Card hoverable={false}>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Fee Status</h3>
                <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Current billing standing and next invoice date.</p>
              </div>
              <StatusBadge variant={studentFeeIsDue ? 'error' : 'success'}>{studentProfile.feeStatus}</StatusBadge>
              <div style={{ marginTop: '16px', color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600 }}>{studentFeeIsDue ? 'NPR 5,650 due' : 'All fees cleared'}</div>
              <div style={{ marginTop: '6px', color: 'rgba(44, 62, 80, 0.62)', fontSize: '13px' }}>Next invoice date: {studentProfile.nextInvoiceDate}</div>
              {studentFeeIsDue ? <Button style={{ marginTop: '16px', background: 'var(--color-accent)', boxShadow: 'none' }}>Pay Now</Button> : null}
            </Card>

            <Card hoverable={false}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Announcements</h3>
                <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Newest branch notices first.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {announcements.map((announcement) => (
                  <div key={announcement.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.1)', background: '#FFFFFF', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>{announcement.title}</div>
                      <div style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.62)', fontSize: '12px' }}>{announcement.dateLabel}</div>
                    </div>
                    {announcement.isNew ? <StatusBadge variant="gold">NEW</StatusBadge> : null}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card hoverable={false}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Digital Student ID</h3>
                <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Branch-scoped identity card ready for download.</p>
              </div>
              <Button variant="outline" style={{ minHeight: '38px', height: '38px', padding: '8px 16px', borderColor: 'rgba(21, 96, 189, 0.16)' }}>
                Download PDF
              </Button>
            </div>
            <div style={{ padding: '20px', borderRadius: '18px', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)', color: '#FFFFFF', boxShadow: '0 16px 34px -20px rgba(21, 96, 189, 0.6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '18px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.82 }}>TMS DIGITAL ID</div>
                  <div style={{ marginTop: '10px', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600 }}>{studentProfile.name}</div>
                  <div style={{ marginTop: '6px', fontSize: '13px', opacity: 0.82 }}>{studentProfile.grade}</div>
                  <div style={{ marginTop: '2px', fontSize: '13px', opacity: 0.82 }}>{studentProfile.branch}</div>
                  <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: 700, opacity: 0.88 }}>Enrollment ID · {studentProfile.enrollmentId}</div>
                </div>
                <div style={{ width: '86px', height: '86px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.18)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '44px' }}>person</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
