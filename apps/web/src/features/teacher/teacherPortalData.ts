export const teacherClasses = [
  { id: 'math-8', time: '08:00–09:00', title: 'Mathematics', className: 'Grade 8 · Section A', branch: 'Main Branch', room: 'Room 2A', radius: 120, state: 'Update pending', personalized: false },
  { id: 'science-7', time: '10:15–11:15', title: 'Science', className: 'Grade 7 · Section B', branch: 'Main Branch', room: 'Lab 1', radius: 120, state: 'Scheduled', personalized: false },
  { id: 'personal-1', time: '13:30–14:15', title: 'Algebra support', className: 'Aarav + Mira', branch: 'Lakeside Branch', room: 'Studio 3', radius: 80, state: 'Scheduled', personalized: true },
];
export const teacherRoster = [
  { id: 's1', name: 'Aarav Shrestha', initials: 'AS', roll: 'Roll 08', blocked: false, excused: false },
  { id: 's2', name: 'Mira Karki', initials: 'MK', roll: 'Roll 11', blocked: false, excused: true },
  { id: 's3', name: 'Sujal Thapa', initials: 'ST', roll: 'Roll 15', blocked: true, excused: false },
  { id: 's4', name: 'Nisha Rai', initials: 'NR', roll: 'Roll 19', blocked: false, excused: false },
];
export const teacherStamps = [
  { id: 'st1', type: 'IN', time: '07:52', branch: 'Main Branch', detail: '18 m from centre' },
  { id: 'st2', type: 'OUT', time: '11:21', branch: 'Main Branch', detail: 'Teacher marked out' },
  { id: 'st3', type: 'AUTO_OUT', time: '13:02', branch: 'Lakeside Branch', detail: 'Grace period exceeded · admin notified' },
  { id: 'st4', type: 'RE_IN', time: '13:18', branch: 'Lakeside Branch', detail: 'Fresh stamp · session resumed' },
];
export const teacherPerformance = [
  { label: 'Attendance rate', detail: 'Geo-verified sessions', score: 94 },
  { label: 'Update compliance', detail: 'Daily class updates', score: 86 },
  { label: 'Student & parent feedback', detail: 'Published feedback', score: 82 },
  { label: 'Leave compliance', detail: 'Policy adherence', score: 91 },
];
export const teacherLeave = { casual: 5, sick: 9, earlyOut: 1 };
