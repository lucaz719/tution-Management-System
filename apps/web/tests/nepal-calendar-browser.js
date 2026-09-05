import { ClientFunction, Selector } from 'testcafe';

fixture('Shared Nepal calendar').page('http://localhost:5187');
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
