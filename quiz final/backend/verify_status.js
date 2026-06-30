const { getDatabase, queryGet, queryRun } = require('./database');

(async () => {
  await getDatabase();
  const eventId = 1;
  const event = queryGet('SELECT * FROM events WHERE id = ?', [eventId]);
  const remaining = queryGet('SELECT COUNT(*) as count FROM questions WHERE event_id = ? AND used = 0', [eventId]);
  console.log('status before reconcile', event.status);
  console.log('remaining unused', remaining.count);
  if (remaining.count === 0 && event.status !== 'completed') {
    queryRun("UPDATE events SET status = 'completed' WHERE id = ?", [eventId]);
  }
  const updated = queryGet('SELECT * FROM events WHERE id = ?', [eventId]);
  console.log('status after reconcile', updated.status);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
