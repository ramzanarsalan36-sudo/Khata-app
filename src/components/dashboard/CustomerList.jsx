'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Phone,
  ChevronRight,
  UserPlus,
  Filter,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
  Loader2,
  ArrowUpDown,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { getBalanceInfo, formatINR } from '@/lib/utils/currency';
import { formatIndianPhoneNumber, normalizeIndianPhoneNumber } from '@/lib/utils/phone';
import { buildCustomerBalanceWhatsAppMessage, generateWhatsAppUrl } from '@/lib/utils/whatsapp';
import { useShop } from '@/lib/context/ShopContext';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

const PAGE_SIZE = 10;

export default function CustomerList({ topDebtors = [], onAddCustomerClick }) {
  const { currentShop } = useShop();
  const [customers, setCustomers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'UDHAAR', 'ADVANCE', 'SETTLED'
  const [sortType, setSortType] = useState('updated_desc'); // 'updated_desc', 'name_asc', 'balance_desc', 'balance_asc'
  const [toastMessage, setToastMessage] = useState(null);

  const supabase = createClient();
  const searchTimeoutRef = useRef(null);

  // Debounce search input (350ms) to avoid spamming the database
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
  };

  const handleFilterChange = (type) => {
    if (filterType === type) return;
    setFilterType(type);
    setPage(1);
  };

  const handleSortChange = (sort) => {
    if (sortType === sort) return;
    setSortType(sort);
    setPage(1);
  };

  // Server-side customer data loader
  const fetchCustomers = useCallback(async (targetPage = 1, isLoadMore = false) => {
    if (!currentShop?.id) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // 1. Try fetching via RPC get_customers_paginated
      let rpcResult = null;
      try {
        const { data, error } = await supabase.rpc('get_customers_paginated', {
          p_shop_id: currentShop.id,
          p_page: targetPage,
          p_page_size: PAGE_SIZE,
          p_search: debouncedSearch.trim() || null,
          p_filter: filterType,
          p_sort: sortType,
        });

        if (!error && data) {
          rpcResult = data;
        }
      } catch (rpcErr) {
        console.warn('RPC get_customers_paginated fallback:', rpcErr);
      }

      if (rpcResult) {
        const list = rpcResult.data || [];
        setTotalCount(rpcResult.filtered_count ?? rpcResult.total_count ?? 0);
        setHasMore(rpcResult.has_more ?? false);
        setCustomers((prev) => (isLoadMore ? [...prev, ...list] : list));
      } else {
        // Fallback: Direct PostgreSQL filtered, sorted, paginated query with precise projection
        const from = (targetPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from('customers')
          .select('id, name, phone, photo_url, notes, balance, created_at, updated_at', { count: 'exact' })
          .eq('shop_id', currentShop.id)
          .is('deleted_at', null);

        // Search filter
        if (debouncedSearch.trim()) {
          const clean = debouncedSearch.trim();
          query = query.or(`name.ilike.%${clean}%,phone.ilike.%${clean}%`);
        }

        // Financial filter
        if (filterType === 'UDHAAR') {
          query = query.gt('balance', 0);
        } else if (filterType === 'ADVANCE') {
          query = query.lt('balance', 0);
        } else if (filterType === 'SETTLED') {
          query = query.eq('balance', 0);
        }

        // Sorting
        if (sortType === 'updated_desc') {
          query = query.order('updated_at', { ascending: false });
        } else if (sortType === 'name_asc') {
          query = query.order('name', { ascending: true });
        } else if (sortType === 'name_desc') {
          query = query.order('name', { ascending: false });
        } else if (sortType === 'balance_desc') {
          query = query.order('balance', { ascending: false });
        } else if (sortType === 'balance_asc') {
          query = query.order('balance', { ascending: true });
        }

        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        const list = data || [];
        setTotalCount(count || 0);
        setHasMore(list.length === PAGE_SIZE && from + list.length < (count || 0));
        setCustomers((prev) => (isLoadMore ? [...prev, ...list] : list));
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentShop?.id, debouncedSearch, filterType, sortType, supabase]);

  // Refetch on filter, search, sort changes
  useEffect(() => {
    fetchCustomers(1, false);
  }, [fetchCustomers]);

  // Load More handler (appends next page)
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCustomers(nextPage, true);
  };

  const handleWhatsAppQuickClick = (e, customer) => {
    e.stopPropagation();
    const normalized = normalizeIndianPhoneNumber(customer.phone);
    if (!normalized) {
      setToastMessage(`Customer ${customer.name} ka valid WhatsApp number available nahi hai.`);
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    const message = buildCustomerBalanceWhatsAppMessage({
      shopName: currentShop?.shop_name || 'Apki Dukan',
      balance: customer.balance,
    });

    const url = generateWhatsAppUrl({ phone: customer.phone, message });
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="mb-4 p-3 bg-rose-600 text-white text-xs font-semibold rounded-2xl flex items-center gap-2 shadow-lg animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Desktop 2-Column Grid (>= 1024px) / Single column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Customer List Section (8 Cols on Desktop) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          {/* Search, Filter & Desktop Top Action Header */}
          <div className="p-4 border-b border-slate-200 bg-white sticky top-0 lg:static z-20 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={searchInput}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-12 py-2 text-sm bg-slate-100/90 border border-transparent focus:border-emerald-500 focus:bg-white rounded-xl focus:outline-none transition"
                />
                {searchInput && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 px-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills & Sort Selector */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-medium">
                <button
                  onClick={() => handleFilterChange('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${
                    filterType === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({filterType === 'ALL' ? totalCount : 'All'})
                </button>
                <button
                  onClick={() => handleFilterChange('UDHAAR')}
                  className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${
                    filterType === 'UDHAAR'
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'bg-rose-50 text-rose-700 border border-rose-200/60 hover:bg-rose-100'
                  }`}
                >
                  Baki (Udhaar)
                </button>
                <button
                  onClick={() => handleFilterChange('ADVANCE')}
                  className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${
                    filterType === 'ADVANCE'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100'
                  }`}
                >
                  Jama (Advance)
                </button>
                <button
                  onClick={() => handleFilterChange('SETTLED')}
                  className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${
                    filterType === 'SETTLED'
                      ? 'bg-slate-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Settled
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 ml-auto text-xs text-slate-500">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortType}
                  onChange={(e) => handleSortChange(e.target.value)}
                  aria-label="Sort customer list"
                  className="bg-slate-100 hover:bg-slate-200 border-none text-xs font-semibold text-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="updated_desc">Recently Active</option>
                  <option value="balance_desc">Highest Udhaar</option>
                  <option value="balance_asc">Highest Advance</option>
                  <option value="name_asc">Name (A to Z)</option>
                  <option value="name_desc">Name (Z to A)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Cards List */}
          <div className="divide-y divide-slate-100 min-h-[260px] flex flex-col justify-between">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-xs font-medium">Fetching matching customers...</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center text-slate-500 flex-1">
                {debouncedSearch || filterType !== 'ALL' ? (
                  <>
                    <Filter className="w-12 h-12 text-slate-300 mb-2 stroke-1" />
                    <p className="font-bold text-slate-700 text-sm">No customers matched your filter</p>
                    <p className="text-xs text-slate-400 mt-1">Try changing your search keywords or filter tab</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                      <UserPlus className="w-8 h-8" />
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-base">No Customers Yet</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                      Start maintaining your digital khata ledger. Tap the green <span className="font-bold text-emerald-700">(+)</span> button in the bottom corner to add your first customer.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div>
                {customers.map((customer) => {
                  const balanceInfo = getBalanceInfo(customer.balance);
                  let timeAgo = '';
                  try {
                    timeAgo = formatDistanceToNow(new Date(customer.updated_at || customer.created_at), {
                      addSuffix: true,
                    });
                  } catch {
                    timeAgo = '';
                  }

                  return (
                    <div
                      key={customer.id}
                      className="p-3.5 sm:p-4 border-b border-slate-100 hover:bg-slate-50/80 transition flex items-center justify-between gap-3 group"
                    >
                      <Link
                        href={`/dashboard/customer/${customer.id}`}
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        {/* Avatar */}
                        {customer.photo_url ? (
                          <img
                            src={customer.photo_url}
                            alt={customer.name}
                            className="w-11 h-11 rounded-full object-cover shrink-0 border border-slate-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0 uppercase border border-emerald-200">
                            {customer.name.charAt(0)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-emerald-700 transition">
                            {customer.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            {customer.phone ? (
                              <span className="text-xs text-slate-400 font-medium">
                                {formatIndianPhoneNumber(customer.phone)}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No phone</span>
                            )}
                            {timeAgo && (
                              <span className="text-[10px] text-slate-400 hidden sm:inline">
                                • {timeAgo}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Right: Net Balance & Quick WhatsApp */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className={`text-sm sm:text-base font-extrabold ${balanceInfo.colorClass}`}>
                            {balanceInfo.formattedAmount}
                          </p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${balanceInfo.bgColor} ${balanceInfo.colorClass}`}
                          >
                            {balanceInfo.label}
                          </span>
                        </div>

                        {/* WhatsApp Quick Reminder button if customer has debt */}
                        {customer.phone && Number(customer.balance) > 0 && (
                          <button
                            onClick={(e) => handleWhatsAppQuickClick(e, customer)}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition hidden sm:flex items-center justify-center"
                            title="Send WhatsApp Balance Statement"
                            aria-label={`Send WhatsApp statement to ${customer.name}`}
                          >
                            <FaWhatsapp className="w-4 h-4" />
                          </button>
                        )}

                        <Link
                          href={`/dashboard/customer/${customer.id}`}
                          className="p-1 text-slate-300 group-hover:text-slate-600 transition"
                          aria-label={`Open ledger for ${customer.name}`}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Server-Side Pagination Load More Bar */}
            {!loading && customers.length > 0 && (
              <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">
                  Showing <strong className="text-slate-700">{customers.length}</strong> of{' '}
                  <strong className="text-slate-700">{totalCount}</strong> customers
                </span>

                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-emerald-700 font-bold rounded-xl shadow-2xs transition active:scale-98 flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading more...</span>
                      </>
                    ) : (
                      <span>Load Next 10 Customers</span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Sidebar Panel (4 Cols on Desktop >= 1024px) */}
        <div className="hidden lg:flex flex-col gap-4 lg:col-span-4">
          {/* Quick Action Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl p-5 shadow-md">
            <h3 className="font-bold text-base mb-1">Manage Your Ledger</h3>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Add new customer accounts, track daily credit & debit, and send instant WhatsApp receipts. Use the floating (+) button anytime.
            </p>
          </div>

          {/* Top Outstanding Due Customers (Fetched server-side) */}
          {topDebtors && topDebtors.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Top Outstanding (Udhaar)
                </h4>
              </div>

              <div className="space-y-2.5">
                {topDebtors.map((deb) => (
                  <Link
                    key={deb.id}
                    href={`/dashboard/customer/${deb.id}`}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700">
                        {deb.name}
                      </p>
                      {deb.phone && (
                        <p className="text-[10px] text-slate-400">
                          {formatIndianPhoneNumber(deb.phone)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-extrabold text-rose-600 shrink-0">
                      {formatINR(deb.balance)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick Export Shortcut */}
          <Link
            href="/settings"
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-slate-300 transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Export Full Ledger</p>
                <p className="text-[10px] text-slate-400">Download Excel / CSV statements</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition" />
          </Link>
        </div>
      </div>
    </div>
  );
}
