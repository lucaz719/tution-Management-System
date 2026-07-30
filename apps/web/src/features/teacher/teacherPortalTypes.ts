export type TeacherView = 'dashboard' | 'timetable' | 'attendance' | 'daily-update-log' | 'homework' | 'results' | 'profile' | 'leave-requests';
export interface TeacherDashboard {
  teacher: { id: string; name: string };
  branch: { id: string; name: string; latitude: number; longitude: number; radiusMeters: number } | null;
  attendance: { checkedIn: boolean; lastStampType: string | null; lastStampAt: string | null };
  todayClasses: Array<{ sessionId: string; classId: string; className: string; courseName: string; schedule: unknown; status: string; dailyUpdateSubmitted: boolean; checkInTime: string | null; checkOutTime: string | null }>;
  pendingUpdates: Array<{ sessionId: string; classId: string; className: string; courseName: string; date: string }>;
}
