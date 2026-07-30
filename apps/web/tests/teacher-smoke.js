import { Selector } from 'testcafe';

fixture `TMS Teacher Portal`.page `http://localhost:5173/login`;

const teacherEmail = process.env.TMS_TEACHER_EMAIL;
const teacherPassword = process.env.TMS_TEACHER_PASSWORD;

test('Teacher workspace enforces mobile attendance and privacy states', async t => {
  if (!teacherEmail || !teacherPassword) {
    await t.expect(Selector('#login-email').value).eql('');
    return;
  }
  await t.typeText('#login-email', teacherEmail).typeText('#login-password', teacherPassword).click('.auth-submit-btn')
    .expect(Selector('h1').withText("Today's teaching").exists).ok({ timeout: 15000 });
  await t.navigateTo('http://localhost:5173/teacher/attendance')
    .expect(Selector('.teacher-roster').withText('Fee blocked').exists).ok()
    .expect(Selector('.teacher-roster input:disabled').count).gt(0)
    .expect(Selector('.teacher-roster').withText('Absent (Excused)').exists).ok();
  await t.navigateTo('http://localhost:5173/teacher/profile')
    .expect(Selector('.teacher-stamps').withText('AUTO-OUT').exists).ok()
    .expect(Selector('.teacher-stamps').withText('RE-IN').exists).ok();
});
