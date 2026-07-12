import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

interface TeacherChatMessage {
  sender: string;
  text: string;
}

interface TodayClass {
  sessionId: string;
  classId: string;
  className: string;
  courseName: string;
  schedule: unknown;
  status: string;
  dailyUpdateSubmitted: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
}

interface PendingUpdate {
  sessionId: string;
  classId: string;
  className: string;
  courseName: string;
  date: string;
}

interface TeacherDashboard {
  teacher: { id: string; name: string };
  branch: { id: string; name: string; latitude: number; longitude: number; radiusMeters: number } | null;
  attendance: { checkedIn: boolean; lastStampType: string | null; lastStampAt: string | null };
  todayClasses: TodayClass[];
  pendingUpdates: PendingUpdate[];
}

function readSessionStatus(status: string): { label: string; variant: 'info' | 'gold' | 'success' | 'warning' | 'error' } {
  switch (status) {
    case 'PRESENT_CONFIRMED':
      return { label: 'Confirmed', variant: 'success' };
    case 'PRESENT_UPDATE_PENDING':
      return { label: 'Update pending', variant: 'gold' };
    case 'PARTIAL_PRESENCE':
      return { label: 'Partial', variant: 'warning' };
    case 'UNSCHEDULED_PRESENCE':
      return { label: 'Unscheduled', variant: 'info' };
    case 'ABSENT':
      return { label: 'Absent', variant: 'error' };
    default:
      return { label: status, variant: 'info' };
  }
}

// Promise wrapper around the browser geolocation API.
function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not available in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  });
}

export function TeacherPortal() {
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState<TeacherDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [attendanceBusy, setAttendanceBusy] = useState(false);

  const [activeLogSession, setActiveLogSession] = useState('');
  const [logDraft, setLogDraft] = useState('');
  const [logBusy, setLogBusy] = useState(false);

  const [teacherMessage, setTeacherMessage] = useState('');
  const [teacherChatHistory, setTeacherChatHistory] = useState<TeacherChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);

  const pendingCount = dashboard?.pendingUpdates.length ?? 0;
  const checkedIn = dashboard?.attendance.checkedIn ?? false;

  const loadDashboard = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await api.teacher.getDashboard();
      setDashboard(data);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load your workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadChat = async () => {
    setChatLoading(true);
    try {
      const messages = (await api.chat.getMessages()) as TeacherChatMessage[];
      setTeacherChatHistory(Array.isArray(messages) ? messages : []);
    } catch {
      setTeacherChatHistory([]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
    void loadChat();
  }, []);

  const handleMarkAttendance = async () => {
    if (!dashboard?.branch) {
      showToast('No branch is assigned to your account. Contact your administrator.', 'error');
      return;
    }
    if (!checkedIn && pendingCount > 0) {
      showToast('Submit your pending daily updates before marking in.', 'error');
      return;
    }

    setAttendanceBusy(true);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude, accuracy } = position.coords;
      const branchId = dashboard.branch.id;

      if (checkedIn) {
        await api.attendance.markOut(branchId, latitude, longitude, accuracy);
        showToast('Marked out successfully.', 'success');
      } else {
        const result = await api.attendance.markIn(branchId, latitude, longitude, accuracy);
        showToast(
          `Marked in — ${result.geofenceMeta?.distanceFromBranchCenterMeters ?? 0}m from branch center.`,
          'success'
        );
      }
      await loadDashboard();
    } catch (error: unknown) {
      const message =
        error instanceof GeolocationPositionError || (error as GeolocationPositionError)?.code
          ? 'Location permission denied or unavailable. Enable location access to mark attendance.'
          : error instanceof Error
            ? error.message
            : 'Attendance could not be recorded.';
      showToast(message, 'error');
    } finally {
      setAttendanceBusy(false);
    }
  };

  const openLog = (sessionId: string) => {
    setActiveLogSession(sessionId);
    setLogDraft('');
  };

  const submitLog = async (sessionId: string) => {
    if (!logDraft.trim()) {
      showToast('Write a short lesson summary first.', 'error');
      return;
    }
    setLogBusy(true);
    try {
      await api.teacher.submitSessionUpdate(sessionId, logDraft.trim());
      showToast('Daily update submitted.', 'success');
      setActiveLogSession('');
      setLogDraft('');
      await loadDashboard();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to submit the update.', 'error');
    } finally {
      setLogBusy(false);
    }
  };

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teacherMessage.trim()) return;
    const text = teacherMessage.trim();
    setTeacherChatHistory((prev) => [...prev, { sender: 'Teacher', text }]);
    setTeacherMessage('');
    try {
      await api.chat.sendMessage(text);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Message could not be sent.', 'error');
    }
  };

  const attendanceLabel = useMemo(() => {
    if (!dashboard) return '—';
    if (checkedIn) return 'On campus';
    return dashboard.attendance.lastStampType === 'OUT' ? 'Marked out' : 'Not marked in';
  }, [dashboard, checkedIn]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card hoverable={false} style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>Daily Academic Log</h3>
            <p style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '13px' }}>
              {dashboard?.branch ? `Geofenced to ${dashboard.branch.name}.` : 'Attendance, class updates, and parent communication.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <StatusBadge variant={checkedIn ? 'success' : 'info'}>{attendanceLabel}</StatusBadge>
            <Button
              variant={checkedIn ? 'outline' : 'primary'}
              onClick={() => void handleMarkAttendance()}
              disabled={attendanceBusy || isLoading}
              style={checkedIn ? { borderColor: 'rgba(21, 96, 189, 0.16)' } : { background: 'var(--color-primary-light)' }}
            >
              <span className="material-symbols-outlined">{checkedIn ? 'logout' : 'person_pin_circle'}</span>
              {attendanceBusy ? 'Locating…' : checkedIn ? 'Mark Out' : 'Mark In'}
            </Button>
          </div>
        </div>
      </Card>

      {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>My Classes Today</h3>
              <p style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '13px' }}>Sessions scheduled for you today.</p>
            </div>
            <StatusBadge variant="info">{dashboard?.todayClasses.length ?? 0}</StatusBadge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!dashboard || dashboard.todayClasses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                {isLoading ? 'Loading your schedule…' : 'No classes scheduled for you today.'}
              </p>
            ) : (
              dashboard.todayClasses.map((cls) => {
                const status = readSessionStatus(cls.status);
                return (
                  <div key={cls.sessionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.1)', background: 'var(--color-bg)', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>{cls.className}</div>
                      <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '12px' }}>{cls.courseName}</div>
                    </div>
                    <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Pending Daily Update Log</h3>
              <p style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '13px' }}>Submit each class summary — attendance stays locked until these are cleared.</p>
            </div>
            <StatusBadge variant={pendingCount > 0 ? 'gold' : 'success'}>{pendingCount} pending</StatusBadge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!dashboard || dashboard.pendingUpdates.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                {isLoading ? 'Loading…' : 'All caught up — no pending updates.'}
              </p>
            ) : (
              dashboard.pendingUpdates.map((item) => (
                <div key={item.sessionId} style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.1)', background: 'var(--color-bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>{item.className}</div>
                      <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {item.courseName} · {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>
                    {activeLogSession !== item.sessionId ? (
                      <Button variant="outline" onClick={() => openLog(item.sessionId)} style={{ minHeight: '36px', height: '36px', padding: '8px 16px', borderColor: 'rgba(21, 96, 189, 0.16)' }}>
                        Add update
                      </Button>
                    ) : null}
                  </div>
                  {activeLogSession === item.sessionId ? (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <textarea
                        value={logDraft}
                        onChange={(event) => setLogDraft(event.target.value)}
                        placeholder="Summary of what was taught, homework assigned, etc."
                        autoFocus
                        style={{ minHeight: '84px', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.14)', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-ui)', resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <Button onClick={() => void submitLog(item.sessionId)} disabled={logBusy} style={{ minHeight: '38px', height: '38px', background: 'var(--color-primary-light)' }}>
                          {logBusy ? 'Submitting…' : 'Submit update'}
                        </Button>
                        <Button variant="outline" onClick={() => { setActiveLogSession(''); setLogDraft(''); }} style={{ minHeight: '38px', height: '38px', borderColor: 'rgba(21, 96, 189, 0.16)' }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <Card hoverable={false} style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Homework Submissions</h3>
            <StatusBadge variant="gold">Phase 2</StatusBadge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '28px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgba(21, 96, 189, 0.24)' }}>assignment</span>
            <p style={{ fontSize: '13px', maxWidth: '260px' }}>The homework workspace unlocks in Phase 2. Class updates and attendance are fully active now.</p>
          </div>
        </Card>

        <Card hoverable={false}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Parent Messages</h3>
            <p style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '13px' }}>Direct thread with parents.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
            {chatLoading ? (
              Array.from({ length: 3 }, (_, index) => (
                <div key={`chat-skeleton-${index}`} style={{ alignSelf: index % 2 === 0 ? 'flex-start' : 'flex-end', width: index % 2 === 0 ? '72%' : '60%', height: '42px', borderRadius: '12px', background: 'rgba(21, 96, 189, 0.08)' }} />
              ))
            ) : teacherChatHistory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '18px 0' }}>No messages yet.</p>
            ) : (
              teacherChatHistory.map((chat, index) => (
                <div
                  key={`${chat.sender}-${index}`}
                  style={{
                    alignSelf: chat.sender === 'Teacher' ? 'flex-end' : 'flex-start',
                    background: chat.sender === 'Teacher' ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)' : 'var(--color-bg)',
                    color: chat.sender === 'Teacher' ? '#FFFFFF' : 'var(--color-text)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    maxWidth: '80%',
                    fontSize: '13px',
                    border: chat.sender === 'Teacher' ? 'none' : '1px solid rgba(21, 96, 189, 0.1)',
                  }}
                >
                  {chat.text}
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <input
              type="text"
              value={teacherMessage}
              onChange={(event) => setTeacherMessage(event.target.value)}
              placeholder="Type message…"
              style={{ flexGrow: 1, padding: '10px 14px', borderRadius: '999px', border: '1px solid rgba(21, 96, 189, 0.14)', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}
            />
            <Button variant="outline" type="submit" style={{ minHeight: '40px', height: '40px', padding: '8px 16px', borderColor: 'rgba(21, 96, 189, 0.16)' }}>Send</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
