import { ClientFunction, RequestMock, Selector } from 'testcafe';

const sessionMock = RequestMock()
  .onRequestTo(/\/api\/auth\/get-session/)
  .respond({
    session: { id: 'session-1', userId: 'branch-admin-1', expiresAt: '2099-01-01T00:00:00.000Z' },
    user: {
      id: 'branch-admin-1',
      email: 'branch@example.test',
      name: 'Branch Admin',
      roles: [{ roleName: 'Branch Admin', branchId: 'branch-1' }],
    },
  }, 200, { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true' });

fixture`Input focus regression`
  .page`http://localhost:5173/branch/personalized-classes`
  .requestHooks(sessionMock);

const activeElementIdentity = ClientFunction(() => {
  const active = document.activeElement;
  return active instanceof HTMLElement ? active.id || active.tagName : '';
});

test('controlled workspace inputs retain focus while typing', async (t) => {
  const input = Selector('input').nth(0);
  await t.expect(input.exists).ok({ timeout: 15000 }).click(input);

  for (const character of 'branch-123') {
    await t.typeText(input, character);
    await t.expect(activeElementIdentity()).eql('INPUT');
  }

  await t.expect(input.value).eql('branch-123');
});

test.page('http://localhost:5173/staff/finance')('petty cash modal retains focus while typing', async (t) => {
  await t
    .click(Selector('button').withText('Petty cash'))
    .click(Selector('button').withText('New petty cash request'));

  const purpose = Selector('#cash-purpose');
  await t.click(purpose);

  for (const character of 'Printer paper') {
    await t.typeText(purpose, character);
    await t.expect(activeElementIdentity()).eql('cash-purpose');
  }

  await t.expect(purpose.value).eql('Printer paper');
});
