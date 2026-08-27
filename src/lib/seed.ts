// Sample data written on the first run of a private store so the app is not an
// empty page. Never seeded into a shared space (other members own that data).
import { saveChore, saveSheet } from './repo';
import { addDays, shortDate, todayIso } from './rota';
import { newId } from './store';

export async function seedSample(root: string, me: string): Promise<void> {
  const now = new Date().toISOString();
  const today = todayIso();
  // Start weekly chores on the most recent Monday so "this week" reads naturally.
  const dow = new Date().getDay();
  const monday = addDays(today, -((dow + 6) % 7));
  const others = ['Sam', 'Alex', 'Robin'].filter((n) => n.toLowerCase() !== me.toLowerCase());

  await saveChore(root, {
    id: newId(),
    name: 'Take out the trash',
    cadence: 'weekly',
    start: monday,
    roster: [me, ...others.slice(0, 2)],
    createdBy: me,
    createdAt: now,
  });
  await saveChore(root, {
    id: newId(),
    name: 'Water the plants',
    cadence: 'daily',
    start: today,
    roster: [others[0], me],
    createdBy: me,
    createdAt: new Date(Date.now() + 1).toISOString(),
  });
  await saveSheet(root, {
    id: newId(),
    title: 'Bake sale',
    when: `Sat ${shortDate(addDays(today, (6 - dow + 7) % 7 || 7))}, 10:00`,
    slots: [
      { id: newId(), label: 'Cookies (1 of 2)' },
      { id: newId(), label: 'Cookies (2 of 2)' },
      { id: newId(), label: 'Drinks' },
      { id: newId(), label: 'Paper plates and napkins' },
    ],
    createdBy: me,
    createdAt: now,
  });
}
