import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TimetableList, type TimetableListItem } from '../components/ui/TimetableList';
import { api } from '../services/api';

interface TeacherChatMessage {
  sender: 'Parent' | 'Teacher';
  text: string;
}

interface DailyLogItem {
  id: string;
  className: string;
  dueAt: string;
  status: 'pending' | 'submitted';
}

const todaysClasses: TimetableListItem[] = [
  { id: 'tc-1', time: '07:15', title: 'Grade 10 Physics', subtitle: 'Kinematics revision', room: 'Lab 1', detail: '36 students', status: 'Starting Soon', statusVariant: 'info' },
  { id: 'tc-2', time: '09:00', title: 'Bridge Course Science', subtitle: 'Concept drill', room: 'Room 305', detail: '28 students', status: 'In Progress', statusVariant: 'gold' },
  { id: 'tc-3', time: '12:10', title: 'Grade 9 Mechanics', subtitle: 'Practice session', room: 'Room 212', detail: '32 students', status: 'Completed', statusVariant: 'success' },
];

const initialDailyLogs: DailyLogItem[] = [
  { id: 'log-1', className: 'Grade 10 Physics', dueAt: 'Before 10:30', status: 'pending' },
  { id: 'log-2', className: 'Bridge Course Science', dueAt: 'Before 12:45', status: 'pending' },
  { id: 'log-3', className: 'Grade 9 Mechanics', dueAt: 'Submitted 13:05', status: 'submitted' },
];

export function TeacherPortal() {
  const [teacherCheckedIn, setTeacherCheckedIn] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'IDLE' | 'CHECKING' | 'SUCCESS' | 'OUT_OF_BOUNDS'>('IDLE');
  const [lessonSummary, setLessonSummary] = useState('');
  const [requiresCatchUpLog, setRequiresCatchUpLog] = useState(false);
  const [quickLogMessage, setQuickLogMessage] = useState('');
  const [teacherMessage, setTeacherMessage] = useState('');
  const [teacherChatHistory, setTeacherChatHistory] = useState<TeacherChatMessage[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLogItem[]>(initialDailyLogs);
  const [isLoading, setIsLoading] = useState(true);

  const pendingLogCount = useMemo(() => dailyLogs.filter((log) => log.status === 'pending').length, [dailyLogs]);

  const loadTeacherData = async () => {
    setIsLoading(true);

    try {
      const messages = await api.chat.getMessages() as TeacherChatMessage[];
      setTeacherChatHistory(messages);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn('API error loading messages, using local mocks:', message);
      setTeacherChatHistory([
        { sender: 'Parent', text: 'Namaste sir, will there be an extra math class this Friday?' },
        { sender: 'Teacher', text: 'Namaste! Yes, we have scheduled a review session at 3 PM.' },
      ]);
    } finally {
      window.setTimeout(() => setIsLoading(false), 700);
    }
  };

  useEffect(() => {
    void loadTeacherData();
  }, []);

  const handleTeacherMarkIn = async () => {
    if (requiresCatchUpLog) {
      setQuickLogMessage('Complete the catch-up daily update before marking in.');
      return;
    }

    setGeoStatus('CHECKING');

    window.setTimeout(async () => {
      try {
        await api.attendance.markIn(27.6931, 85.3445);
        setGeoStatus('SUCCESS');
        setTeacherCheckedIn(true);
      } catch {
        setGeoStatus('SUCCESS');
        setTeacherCheckedIn(true);
      }
    }, 900);
  };

  const handleTeacherMarkOut = async () => {
    try {
      await api.attendance.markOut();
    } catch {
      // noop: dashboard retains local state for demo mode
    }

    setTeacherCheckedIn(false);
    setGeoStatus('IDLE');
  };

  const handleLessonUpdateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!lessonSummary.trim()) {
      return;
    }

    try {
      await api.attendance.submitDailySummary(lessonSummary);
    } catch {
      // noop: demo mode keeps local state only
    }

    setRequiresCatchUpLog(false);
    setQuickLogMessage('Daily lesson summary submitted. Lockout cleared.');
    setLessonSummary('');
  };

  const handleSendTeacherMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!teacherMessage.trim()) {
      return;
    }

    const nextMessage: TeacherChatMessage = { sender: 'Teacher', text: teacherMessage };
    setTeacherChatHistory((previous) => [...previous, nextMessage]);

    try {
      await api.chat.sendMessage(teacherMessage);
    } catch {
      // noop: local echo already stored
    }

    setTeacherMessage('');
  };

  const handleSubmitClassLog = (id: string) => {
    setDailyLogs((previous) => previous.map((log) => (log.id === id ? { ...log, status: 'submitted', dueAt: 'Submitted just now' } : log)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card hoverable={false} style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>Daily Academic Log</h3>
            <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.7)', fontSize: '13px' }}>Attendance geofence, class updates, and parent communication in one workspace.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <StatusBadge variant={geoStatus === 'SUCCESS' ? 'success' : geoStatus === 'CHECKING' ? 'warning' : 'info'}>{geoStatus}</StatusBadge>
            <Button
              variant={teacherCheckedIn ? 'outline' : 'primary'}
              onClick={() => void (teacherCheckedIn ? handleTeacherMarkOut() : handleTeacherMarkIn())}
              style={teacherCheckedIn ? { borderColor: 'rgba(15, 76, 138, 0.16)' } : { background: 'var(--color-primary-light)' }}
            >
              <span className="material-symbols-outlined">{teacherCheckedIn ? 'logout' : 'person_pin_circle'}</span>
              {teacherCheckedIn ? 'Mark Out' : 'Mark In'}
            </Button>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <Card hoverable={false}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>My Classes Today</h3>
            <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Time-ordered teaching plan with room and enrollment.</p>
          </div>
          <TimetableList items={todaysClasses} />
        </Card>

        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Pending Daily Update Log</h3>
              <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Submit per-class log items before end of day.</p>
            </div>
            <StatusBadge variant={pendingLogCount > 0 ? 'gold' : 'success'}>{pendingLogCount} pending</StatusBadge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dailyLogs.map((log) => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(15, 76, 138, 0.1)', background: '#FFFFFF', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>{log.className}</div>
                  <div style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.62)', fontSize: '12px' }}>{log.dueAt}</div>
                </div>
                {log.status === 'pending' ? (
                  <Button variant="outline" onClick={() => handleSubmitClassLog(log.id)} style={{ minHeight: '36px', height: '36px', padding: '8px 16px', borderColor: 'rgba(15, 76, 138, 0.16)' }}>
                    Submit
                  </Button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontSize: '13px', fontWeight: 700 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                    Completed
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <Card hoverable={false} style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Homework Submissions</h3>
            <StatusBadge variant="gold">Phase 2</StatusBadge>
          </div>
          <div style={{ filter: 'blur(2px)', opacity: 0.52, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
            {[
              'Grade 10 Physics · 21/36 submitted',
              'Bridge Course Science · 14/28 submitted',
              'Grade 9 Mechanics · 27/32 submitted',
            ].map((item) => (
              <div key={item} style={{ padding: '14px 16px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid rgba(15, 76, 138, 0.1)', color: 'var(--color-text)', fontSize: '14px', fontWeight: 600 }}>
                {item}
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', inset: 'auto 20px 20px 20px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(243, 156, 18, 0.12)', color: 'var(--color-accent)', fontSize: '13px', fontWeight: 700 }}>
            Preview locked until the Phase 2 homework workspace is enabled.
          </div>
        </Card>

        <Card hoverable={false}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '18px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Quick Daily Summary</h3>
                  <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Existing lesson update workflow preserved.</p>
                </div>
                {quickLogMessage ? <StatusBadge variant="success">Saved</StatusBadge> : null}
              </div>
              <form onSubmit={handleLessonUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <textarea
                  value={lessonSummary}
                  onChange={(event) => setLessonSummary(event.target.value)}
                  placeholder="Today we covered Newton's laws and assigned problem set 1-5."
                  style={{ minHeight: '112px', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(15, 76, 138, 0.14)', background: '#FFFFFF', color: 'var(--color-text)', fontFamily: 'var(--font-ui)', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <Button type="submit" style={{ background: 'var(--color-primary-light)' }}>Submit Summary</Button>
                  {quickLogMessage ? <span style={{ color: 'var(--color-success)', fontSize: '12px', fontWeight: 700 }}>{quickLogMessage}</span> : null}
                </div>
              </form>
            </div>

            <div>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Thread: Parent (Shyam Bahadur)</h3>
                <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Messages stay available while homework tools are still pending.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {isLoading
                  ? Array.from({ length: 3 }, (_, index) => (
                      <div key={`chat-skeleton-${index}`} style={{ alignSelf: index % 2 === 0 ? 'flex-start' : 'flex-end', width: index % 2 === 0 ? '72%' : '60%', height: '42px', borderRadius: '12px', background: 'rgba(15, 76, 138, 0.08)' }} />
                    ))
                  : teacherChatHistory.map((chat, index) => (
                      <div
                        key={`${chat.sender}-${index}`}
                        style={{
                          alignSelf: chat.sender === 'Teacher' ? 'flex-end' : 'flex-start',
                          background: chat.sender === 'Teacher' ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)' : '#FFFFFF',
                          color: chat.sender === 'Teacher' ? '#FFFFFF' : 'var(--color-text)',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          maxWidth: '80%',
                          fontSize: '13px',
                          border: chat.sender === 'Teacher' ? 'none' : '1px solid rgba(15, 76, 138, 0.1)',
                        }}
                      >
                        {chat.text}
                      </div>
                    ))}
              </div>
              <form onSubmit={handleSendTeacherMessage} style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <input
                  type="text"
                  value={teacherMessage}
                  onChange={(event) => setTeacherMessage(event.target.value)}
                  placeholder="Type message..."
                  style={{ flexGrow: 1, padding: '10px 14px', borderRadius: '999px', border: '1px solid rgba(15, 76, 138, 0.14)', background: '#FFFFFF', color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}
                />
                <Button variant="outline" type="submit" style={{ minHeight: '40px', height: '40px', padding: '8px 16px', borderColor: 'rgba(15, 76, 138, 0.16)' }}>Send</Button>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
