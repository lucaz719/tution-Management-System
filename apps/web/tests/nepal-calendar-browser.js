import { ClientFunction, RequestLogger, RequestMock, Selector } from 'testcafe';

fixture('Shared Nepal calendar').page('http://localhost:5187');
const readerEvents = RequestMock().onRequestTo(/\/api\/academic-events\?studentId=/).respond((req, res) => {
  const child = new URL(req.url).searchParams.get('studentId');
  res.headers['content-type'] = 'application/json';
  res.setBody({ events: [{ id: child, title: `Child ${child} assembly`, eventType: 'EVENT', startDate: '2026-09-05', endDate: '2026-09-05', branch: { name: `Branch ${child}` }, class: { name: `Class ${child}` } }] });
});
let failClassOptions = false;
const controlApi = RequestMock().onRequestTo(/\/api\//).respond((req, res) => {
  const path = new URL(req.url).pathname;
  res.headers['content-type'] = 'application/json';
  if (failClassOptions && path.endsWith('/academic-events/options')) { res.statusCode = 403; res.setBody({ error: 'Forbidden' }); return; }
  res.setBody(path.endsWith('/petty-cash') ? [] : path.endsWith('/academic-events/options') ? { classes: [] } : path.endsWith('/academic-events') ? { events: [], event: { id: 'new' } } : path.endsWith('/alerts') ? { expiringDocs: [] } : { vatRate: 13, gracePeriod: 15, pettyCashCap: 20000 });
});
const publication = RequestLogger((req) => req.method === 'post' && req.url.endsWith('/api/academic-events'), { logRequestBody: true, stringifyRequestBody: true });
const selected = Selector('.nepal-calendar__cell button[data-selected]');
const overflow = ClientFunction(() => document.documentElement.scrollWidth > window.innerWidth);
const setTheme = ClientFunction((theme) => document.documentElement.setAttribute('data-theme', theme));
const advanceClock = ClientFunction((iso) => { window.__clockTime = new Date(iso).getTime(); window.dispatchEvent(new Event('focus')); });

test('dual dates, month navigation, keyboard selection and event details', async (t) => {
  await t.expect(Selector('.nepal-date-time').count).eql(1);
  await t.expect(Selector('.nepal-calendar__today-strip').exists).notOk();
  await t.expect(Selector('.nepal-date-time__nepali').nth(0).innerText).eql('२० भदौ २०८३, शनिबार');
  await t.expect(selected.getAttribute('data-date')).eql('2026-09-05');
  await t.expect(Selector('.nepal-calendar__event').count).eql(3);
  await t.expect(selected.innerText).contains('+1 more');
  await t.click(selected).pressKey('right');
  await t.expect(selected.getAttribute('data-date')).eql('2026-09-06');
  await t.expect(Selector('.nepal-calendar__event').count).eql(1);
  await t.click(Selector('.calendar-system-toggle button').withText('AD'));
  await t.expect(selected.getAttribute('data-date')).eql('2026-09-06');
  await t.click(Selector('.calendar-system-toggle button').withText('BS'));
  await t.click(Selector('button').withAttribute('aria-label', 'Next month'));
  await t.expect(Selector('.nepal-calendar__month-button').innerText).contains('असोज');
  await t.click(Selector('.nepal-calendar__today-button'));
  await t.expect(selected.getAttribute('data-date')).eql('2026-09-05');
  await t.click(Selector('.nepal-calendar__month-button'));
  await t.expect(Selector('.nepal-calendar__picker').exists).ok();
  await t.click(Selector('.nepal-calendar__picker select').nth(0)).pressKey('down enter');
  await t.expect(Selector('.nepal-calendar__month-button').innerText).contains('असोज');
  await t.pressKey('tab esc').expect(Selector('.nepal-calendar__picker').exists).notOk();
});

test('responsive light/dark views and midnight clock rollover', async (t) => {
  for (const width of [360, 375, 768, 1280]) {
    await t.resizeWindow(width, 1000);
    await t.expect(overflow()).notOk(`Page overflow at ${width}px`);
    await t.takeScreenshot({ path: `calendar-${width}-light.png`, fullPage: true });
  }
  await setTheme('dark');
  await t.takeScreenshot({ path: 'calendar-1280-dark.png', fullPage: true });
  await advanceClock('2026-09-05T18:14:59Z');
  await t.expect(Selector('.nepal-date-time__clock time').nth(0).innerText).eql('11:59:59 PM');
  await advanceClock('2026-09-05T18:15:00Z');
  await t.expect(Selector('.nepal-date-time__nepali').nth(0).innerText).eql('२१ भदौ २०८३, आइतबार');
  await t.expect(Selector('.nepal-calendar__cell button[data-today]').getAttribute('data-date')).eql('2026-09-06');
});

test('selected-day action and Nepali date picker retain the canonical date and Nepal time', async (t) => {
  await t.click(Selector('[data-date="2026-09-06"]'));
  await t.click(Selector('.nepal-calendar__create'));
  await t.expect(Selector('output').innerText).eql('2026-09-06T09:00');
  await t.click(Selector('.nepali-date-picker__trigger'));
  const dialog = Selector('.nepali-date-picker__dialog');
  await t.expect(dialog.visible).ok();
  await t.expect(dialog.find('.nepal-calendar__month-button').innerText).contains('भदौ');
  await t.click(dialog.find('[aria-label="Next month"]'));
  await t.expect(dialog.visible).ok();
  await t.click(dialog.find('[aria-label="Previous month"]'));
  await t.click(dialog.find('[data-date="2026-09-08"]'));
  await t.expect(dialog.visible).notOk();
  await t.expect(Selector('output').innerText).eql('2026-09-08T09:00');
  await t.expect(Selector('.nepali-date-picker__trigger').focused).ok();
  await t.resizeWindow(360, 1000).click(Selector('.nepali-date-picker__trigger'));
  await t.expect(overflow()).notOk();
  await t.takeScreenshot({ path: 'nepali-date-picker-mobile.png', fullPage: true });
  await t.pressKey('esc').expect(dialog.visible).notOk();
});

test.requestHooks(readerEvents)('read-only calendar and upcoming links follow the selected child', async (t) => {
  await t.navigateTo('http://localhost:5187/?reader');
  await t.expect(Selector('.nepal-calendar__event h5').innerText).eql('Child one assembly');
  await t.expect(Selector('.nepal-calendar__create').exists).notOk();
  await t.expect(Selector('.event-target-field').exists).notOk();
  await t.expect(Selector('.academic-upcoming a').getAttribute('href')).eql('/parent/calendar?child=one');
  await t.click(Selector('button').withText('Switch child'));
  await t.expect(Selector('.nepal-calendar__event h5').innerText).eql('Child two assembly');
  await t.expect(Selector('.nepal-calendar__event').innerText).contains('Branch two / Class two');
  await t.expect(Selector('.academic-upcoming a').getAttribute('href')).eql('/parent/calendar?child=two');
  await t.expect(Selector('body').innerText).notContains('Child one assembly');
});

test.requestHooks(controlApi, publication)('Control Center publishes an explicit audience and Nepal timestamps', async (t) => {
  publication.clear();
  await t.navigateTo('http://localhost:5187/?control');
  await t.click(Selector('button').withText('Calendar'));
  await t.expect(Selector('input[type="datetime-local"]').exists).notOk();
  await t.expect(Selector('.event-target-field select').nth(0).value).eql('ALL');
  await t.typeText(Selector('label').withText('Title').find('input'), 'Institution holiday');
  for (const [index, date] of [[0, '2026-09-05'], [1, '2026-09-06']]) {
    await t.click(Selector('.nepali-date-picker__trigger').nth(index));
    await t.click(Selector('dialog[open]').find(`[data-date="${date}"]`));
  }
  await t.click(Selector('button[type="submit"]').withText('Publish event'));
  await t.expect(publication.contains((record) => {
    const body = JSON.parse(record.request.body);
    return body.audience === 'ALL' && body.eventType === 'HOLIDAY' && body.classId === null && body.startDate === '2026-09-05T03:15:00.000Z' && body.endDate === '2026-09-06T03:15:00.000Z';
  })).ok();
});

test.requestHooks(controlApi)('Publishing stays blocked after class loading fails and recovers after retry', async (t) => {
  failClassOptions = true;
  try {
    await t.navigateTo('http://localhost:5187/?control');
    await t.click(Selector('button').withText('Calendar'));
    await t.expect(Selector('[role="alert"]').withText('Publishing is blocked').exists).ok();
    const submit = Selector('button[type="submit"]').withText('Publish event');
    await t.expect(submit.hasAttribute('disabled')).ok();
    failClassOptions = false;
    await t.click(Selector('button').withText('Retry'));
    await t.expect(submit.hasAttribute('disabled')).notOk();
  } finally { failClassOptions = false; }
});

const accountantEvents = RequestMock().onRequestTo(/\/api\/academic-events\?viewerRole=Accountant$/).respond({ events: [{ id: 'fee-deadline', title: 'Branch fee deadline', eventType: 'FEE_DUE', audience: 'STAFF', startDate: '2026-09-05', endDate: '2026-09-06', branch: { name: 'Assigned branch' } }] }, 200, { 'content-type': 'application/json' });
test.requestHooks(accountantEvents)('Accountant calendar uses its explicit role and read-only upcoming link', async (t) => {
  await t.navigateTo('http://localhost:5187/?accountant');
  await t.expect(Selector('.academic-upcoming').withText('Branch fee deadline').exists).ok();
  await t.expect(Selector('.academic-upcoming a').getAttribute('href')).eql('/staff/finance#calendar');
  await t.expect(Selector('.event-target-field').exists).notOk();
  await t.expect(Selector('button').withText('Add event').exists).notOk();
});
