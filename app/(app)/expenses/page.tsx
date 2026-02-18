'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const sym = (c: string) => ({ USD: '$', EUR: '€', GBP: '£', INR: '₹' }[c] || c + ' ');

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchExpenses();
  }, [page]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?page=${page}&limit=10`);
      const data = await res.json();
      setExpenses(data.expenses || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const emojis: Record<string,string> = {
    travel:'✈️', accommodation:'🏨', food:'🍽️', transport:'🚗', conference:'📊',
    supplies:'🛒', utilities:'💡', entertainment:'🎮', health:'🏥', other:'💼'
  };

  const filteredExpenses = filter === 'all' ? expenses :
    filter === 'recurring' ? expenses.filter(e => e.isRecurring) : expenses;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-t1">Expenses</h1>
          <p className="text-sm text-t2 mt-0.5">Track and manage all expenses</p>
        </div>
        <Link href="/expenses/new" className="btn btn-primary">
          <span>＋</span> Add Expense
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['all', 'recurring'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`pill-tab ${filter === f ? 'on' : ''}`}
          >
            {f === 'all' ? 'All Expenses' : '🔄 Recurring'}
          </button>
        ))}
      </div>

      {/* Expenses list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="card card-p animate-pulse h-16"></div>
          ))}
        </div>
      ) : filteredExpenses.length > 0 ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-t3 uppercase tracking-wider">Description</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-t3 uppercase tracking-wider">Category</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-t3 uppercase tracking-wider">Paid By</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-t3 uppercase tracking-wider">Group</th>
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-t3 uppercase tracking-wider">Date</th>
                  <th className="text-right py-3 px-4 text-[11px] font-bold text-t3 uppercase tracking-wider">Amount</th>
                  <th className="text-center py-3 px-4 text-[11px] font-bold text-t3 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp: any) => (
                  <tr key={exp._id} className="border-b border-border/50 hover:bg-c2/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-base">{emojis[exp.category] || '💼'}</span>
                        <span className="text-sm font-semibold text-t1">{exp.description}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge b-gray text-[10px] capitalize">{exp.category}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="av av-xs av-accent">
                          {exp.paidBy?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                        </div>
                        <span className="text-sm text-t2">{exp.paidBy?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {exp.groupId ? (
                        <Link href={`/groups/${exp.groupId._id || exp.groupId}`} className="text-sm text-accent hover:underline">
                          {exp.groupId.emoji} {exp.groupId.name || 'Group'}
                        </Link>
                      ) : (
                        <span className="text-sm text-t3">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-t2">
                      {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-bold text-t1">
                        {sym(exp.currency)}{exp.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link href={`/expenses/${exp._id}/edit`} className="text-xs text-accent hover:underline font-semibold">✏️ Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {filteredExpenses.map((exp: any) => (
              <div key={exp._id} className="card card-p">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-c3 flex items-center justify-center text-lg flex-shrink-0">
                    {emojis[exp.category] || '💼'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-t1 truncate">{exp.description}</p>
                      <span className="text-sm font-bold text-t1 flex-shrink-0">
                        {sym(exp.currency)}{exp.amount.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[11px] text-t3 mt-1">
                      {exp.paidBy?.name} • {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {exp.groupId?.name && ` • ${exp.groupId.emoji} ${exp.groupId.name}`}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="badge b-gray text-[10px] capitalize">{exp.category}</span>
                      <span className="badge b-blue text-[10px]">{exp.splitMethod}</span>
                      <Link href={`/expenses/${exp._id}/edit`} className="ml-auto text-[11px] text-accent font-semibold hover:underline">✏️ Edit</Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn btn-secondary text-xs disabled:opacity-30"
              >← Prev</button>
              <span className="text-sm text-t2">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary text-xs disabled:opacity-30"
              >Next →</button>
            </div>
          )}
        </>
      ) : (
        <div className="card card-p text-center py-12">
          <p className="text-4xl mb-3">💸</p>
          <p className="text-t1 font-semibold mb-1">No expenses yet</p>
          <p className="text-sm text-t3 mb-4">Start tracking your team expenses</p>
          <Link href="/expenses/new" className="btn btn-primary inline-flex">＋ Add First Expense</Link>
        </div>
      )}
    </div>
  );
}
