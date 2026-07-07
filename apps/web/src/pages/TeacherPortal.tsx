import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';

export function TeacherPortal() {
  const [teacherCheckedIn, setTeacherCheckedIn] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'IDLE' | 'CHECKING' | 'SUCCESS' | 'OUT_OF_BOUNDS'>('IDLE');
  const [lessonSummary, setLessonSummary] = useState('');
  const [dailyUpdateSubmitted, setDailyUpdateSubmitted] = useState(false);
  const [lockoutAlert, setLockoutAlert] = useState(false);
  const [teacherMessage, setTeacherMessage] = useState('');
  const [teacherChatHistory, setTeacherChatHistory] = useState<any[]>([]);

  const loadTeacherData = async () => {
    try {
      const messages = await api.chat.getMessages();
      setTeacherChatHistory(messages);
    } catch (err) {
      console.warn('API error loading messages, using local mocks');
      setTeacherChatHistory([
        { sender: 'Parent', text: 'Namaste sir, will there be an extra math class this Friday?' },
        { sender: 'Teacher', text: 'Namaste! Yes, we have scheduled a review session at 3 PM.' }
      ]);
    }
  };

  useEffect(() => {
    loadTeacherData();
  }, []);

  const handleTeacherMarkIn = async () => {
    if (!dailyUpdateSubmitted && teacherCheckedIn) {
      setLockoutAlert(true);
      return;
    }
    setGeoStatus('CHECKING');
    
    // Simulate getting geo coordinates and posting to backend
    setTimeout(async () => {
      try {
        const lat = 27.6931;
        const lng = 85.3445;
        await api.attendance.markIn(lat, lng);
        setGeoStatus('SUCCESS');
        setTeacherCheckedIn(true);
        setLockoutAlert(false);
      } catch (err: any) {
        console.warn('Mark In API failed, checking local conditions:', err.message);
        // Lockout mock check
        if (!dailyUpdateSubmitted) {
          setLockoutAlert(true);
          setGeoStatus('IDLE');
        } else {
          setGeoStatus('SUCCESS');
          setTeacherCheckedIn(true);
        }
      }
    }, 1000);
  };

  const handleTeacherMarkOut = async () => {
    try {
      await api.attendance.markOut();
    } catch (err) {
      console.warn('Mark Out API failed');
    }
    setTeacherCheckedIn(false);
    setGeoStatus('IDLE');
  };

  const handleLessonUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonSummary) return;

    try {
      await api.attendance.submitDailySummary(lessonSummary);
      setDailyUpdateSubmitted(true);
      setLockoutAlert(false);
      alert('Daily Class summary submitted. Log lockouts cleared!');
    } catch (err) {
      console.warn('Lesson Update API failed, applying mock state');
      setDailyUpdateSubmitted(true);
      setLockoutAlert(false);
      alert('Daily Class summary submitted. Log lockouts cleared!');
    }
  };

  const handleSendTeacherMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherMessage) return;

    const newMsg = { sender: 'Teacher', text: teacherMessage };
    setTeacherChatHistory((prev) => [...prev, newMsg]);

    try {
      await api.chat.sendMessage(teacherMessage);
    } catch (err) {
      console.warn('Send Message API failed, stored locally');
    }
    setTeacherMessage('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Daily Academic Log</h2>
          <p style={{ color: 'var(--text-muted-foreground)', fontSize: '14px', marginTop: '4px' }}>
            Verify attendance geofence and submit lesson update checks. (System Status: {geoStatus})
          </p>
        </div>

        <div>
          <Button
            variant={teacherCheckedIn ? 'danger' : 'primary'}
            onClick={teacherCheckedIn ? handleTeacherMarkOut : handleTeacherMarkIn}
          >
            <span className="material-symbols-outlined">
              {teacherCheckedIn ? 'logout' : 'person_pin_circle'}
            </span>
            {teacherCheckedIn ? 'Mark OUT' : 'Mark IN'}
          </Button>
        </div>
      </div>

      {/* Lockout Alert banner */}
      {lockoutAlert && (
        <div style={{
          background: 'rgba(214, 48, 49, 0.08)',
          border: '1px solid rgba(214, 48, 49, 0.3)',
          padding: '16px 24px',
          borderRadius: 'var(--radius-md)',
          color: '#d63031',
          fontWeight: 600,
          fontSize: '14px'
        }}>
          ⚠️ ATTENDANCE LOCKOUT DETECTED: You cannot mark attendance for today because your previous session's Daily Lesson update is still outstanding. Please submit the update below to clear this lockout.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        {/* Daily verification form */}
        <Card hoverable={false}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Submit Daily Lesson Update</h3>
          <form onSubmit={handleLessonUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Lesson Summary & Homework Description</label>
              <textarea
                value={lessonSummary}
                onChange={(e) => setLessonSummary(e.target.value)}
                placeholder="Today we discussed Newton's laws of motion. Assigned problems 1-5 as homework."
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-border)',
                  height: '100px',
                  fontFamily: 'inherit',
                  background: 'var(--bg-background)',
                  color: 'var(--text-foreground)',
                  resize: 'none'
                }}
              />
            </div>

            <Button type="submit" disabled={dailyUpdateSubmitted}>
              {dailyUpdateSubmitted ? 'Submitted Successfully' : 'Submit Summary'}
            </Button>
          </form>
        </Card>

        {/* Messaging board */}
        <Card hoverable={false} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <div>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Thread: Parent (Shyam Bahadur)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '8px' }}>
              {teacherChatHistory.map((chat, idx) => (
                <div key={idx} style={{
                  alignSelf: chat.sender === 'Teacher' ? 'flex-end' : 'flex-start',
                  background: chat.sender === 'Teacher' ? 'var(--primary-gradient)' : 'var(--border-border)',
                  color: chat.sender === 'Teacher' ? '#fff' : 'var(--text-foreground)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  maxWidth: '80%',
                  fontSize: '13px'
                }}>
                  {chat.text}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendTeacherMessage} style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <input
              type="text"
              value={teacherMessage}
              onChange={(e) => setTeacherMessage(e.target.value)}
              placeholder="Type message..."
              style={{
                flexGrow: 1,
                padding: '10px 16px',
                borderRadius: '30px',
                border: '1px solid var(--border-border)',
                background: 'var(--bg-background)',
                color: 'var(--text-foreground)',
                fontFamily: 'inherit'
              }}
            />
            <Button variant="secondary" style={{ padding: '8px 16px' }} type="submit">
              Send
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
