const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');

// Exercise the page's real date and price logic without a browser or live API.
const html = readFileSync(join(__dirname, '../index.html'), 'utf8');
const context = vm.createContext({Intl, Date});
vm.runInContext(html.split('<script>')[1].split('// UI')[0], context);
function evaluate(code, rows) {
  context.rows = rows;
  return vm.runInContext(code, context);
}
function day(start, quarters = 96, price = 0.05) {
  return Array.from({length: quarters}, (_, i) => ({
    DateTime: new Date(Date.parse(start) + i * 900000).toISOString(),
    PriceWithTax: price, PriceNoTax: price / 1.255, Rank: i + 1
  }));
}
const today = day('2026-10-13T21:00:00Z');
const tomorrow = day('2026-10-14T21:00:00Z', 96, -0.02);
const now = "new Date('2026-10-14T09:00:00Z')";

test('combined data keeps separate daily averages and cheapest hours', () => {
  assert.equal(evaluate(`buildDays(rows, ${now}).models.get('2026-10-14').hours[0].price`, [...today, ...tomorrow]), 5);
  assert.equal(evaluate(`buildDays(rows, ${now}).models.get('2026-10-15').hours[0].price`, [...today, ...tomorrow]), -2);
  assert.equal(evaluate(`buildDays(rows, ${now}).models.get('2026-10-15').cheap.size`, [...today, ...tomorrow]), 12);
});
test('unpublished tomorrow leaves today available', () => {
  assert.equal(evaluate(`buildDays(rows, ${now}).models.size`, today), 1);
  assert.equal(evaluate(`buildDays(rows, ${now}).errors.size`, today), 0);
});
test('incomplete tomorrow does not discard today or rank partial prices', () => {
  const rows = [...today, ...tomorrow.slice(0, 92)];
  assert.equal(evaluate(`buildDays(rows, ${now}).models.has('2026-10-14')`, rows), true);
  assert.equal(evaluate(`buildDays(rows, ${now}).models.has('2026-10-15')`, rows), false);
  assert.equal(evaluate(`buildDays(rows, ${now}).errors.has('2026-10-15')`, rows), true);
});
test('next date uses Helsinki calendar across DST and year boundaries', () => {
  for (const [instant, expected] of [
    ['2026-03-28T22:30:00Z', '2026-03-30'],
    ['2026-10-24T21:30:00Z', '2026-10-26'],
    ['2026-12-31T21:30:00Z', '2027-01-01']
  ]) assert.equal(evaluate(`nextDayKey(new Date('${instant}'))`), expected);
});
test('tomorrow supports the 23-hour spring day and 25-hour autumn day', () => {
  assert.equal(evaluate("buildDays(rows, new Date('2026-03-28T10:00:00Z')).models.get('2026-03-29').hours.length", day('2026-03-28T22:00:00Z', 92)), 23);
  assert.equal(evaluate("buildDays(rows, new Date('2026-10-24T10:00:00Z')).models.get('2026-10-25').hours.length", day('2026-10-24T21:00:00Z', 100)), 25);
});
test('cached tomorrow becomes today at midnight and expired dates are excluded', () => {
  assert.equal(evaluate("buildDays(rows, new Date('2026-10-14T21:01:00Z')).models.get('2026-10-15').hours[0].price", [...today, ...tomorrow]), -2);
  assert.equal(evaluate("buildDays(rows, new Date('2026-10-14T21:01:00Z')).models.has('2026-10-14')", [...today, ...tomorrow]), false);
});
test('invalid responses and invalid prices cannot produce rankings', () => {
  assert.throws(() => evaluate(`buildDays(rows, ${now})`, {}), /Invalid price response/);
  assert.equal(evaluate(`buildDays(rows, ${now}).models.has('2026-10-15')`, tomorrow.map((r, i) => i ? r : {...r, PriceWithTax: null})), false);
});
