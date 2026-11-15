import { monthlyPaidRevenue } from '../monthlyRevenue';
test('groups paid dates in Malaysia time across year boundaries and fills missing months', () => {
  const months=monthlyPaidRevenue([
    {amount:100,paid_at:new Date('2026-12-31T16:30:00Z')},
    {amount:50,paid_at:new Date('2026-12-31T15:30:00Z')},
    {amount:900,paid_at:new Date('2026-01-01T00:00:00Z')},
    {amount:700,paid_at:null},
    {amount:800,paid_at:new Date('2027-01-20T00:00:00Z')},
  ],new Date('2027-01-10T00:00:00Z'));
  expect(months).toEqual([
    {month:'2026-08',amount:0},{month:'2026-09',amount:0},{month:'2026-10',amount:0},
    {month:'2026-11',amount:0},{month:'2026-12',amount:50},{month:'2027-01',amount:100},
  ]);
});
test('returns six empty months and rounds collected amounts to cents',()=>{
  expect(monthlyPaidRevenue([],new Date('2026-11-16T00:00:00Z'))).toHaveLength(6);
  expect(monthlyPaidRevenue([{amount:0.1,paid_at:new Date('2026-11-01')},{amount:0.2,paid_at:new Date('2026-11-02')}],new Date('2026-11-16'))[5]).toEqual({month:'2026-11',amount:0.3});
});
