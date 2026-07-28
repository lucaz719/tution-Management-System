export function submitConnectIpsForm(gatewayUrl: string, fields: Record<string, string>): void {
  const url = new URL(gatewayUrl);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error('Unsafe connectIPS gateway URL.');
  }
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url.toString();
  form.style.display = 'none';
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
}
