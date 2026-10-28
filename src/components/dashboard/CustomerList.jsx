'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { subscribeShopCustomers } from '@/lib/firebase/db';
import { formatDistanceToNow } from 'date-fns';

const PAGE_SIZE = 15;

export default function CustomerList({ topDebtors = [], onAddCustomerClick }) {
  const { currentShop } = useShop();
  const [rawCustomers, setRawCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'UDHAAR', 'ADVANCE', 'SETTLED'
  const [sortType, setSortType] = useState('updated_desc'); // 'updated_desc', 'name_asc', 'name_desc', 'balance_desc', 'balance_asc'
  const [toastMessage, setToastMessage] = useState(null);

  const searchTimeoutRef = useRef(null);

  // Real-time listener for customer updates from Firebase Realtime Database
  useEffect(() => {
    if (!currentShop?.id) {
      setRawCustomers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeShopCustomers(currentShop.id, (customersList) => {
      setRawCustomers(customersList || []);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentShop?.id]);

  // Debounce search input (300ms)
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
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

  // Filtered & Sorted Customer Pipeline
  const filteredCustomers = useMemo(() => {
    let result = [...rawCustomers];

    // Search query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
      );
    }

    // Financial category filter
    if (filterType === 'UDHAAR') {
      result = result.filter((c) => Number(c.balance) > 0);
    } else if (filterType === 'ADVANCE') {
      result = result.filter((c) => Number(c.balance) < 0);
    } else if (filterType === 'SETTLED') {
      result = result.filter((c) => Number(c.balance) === 0);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortType === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortType === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortType === 'balance_desc') {
        return Number(b.balance || 0) - Number(a.balance || 0);
      }
      if (sortType === 'balance_asc') {
        return Number(a.balance || 0) - Number(b.balance || 0);
      }
      // default: updated_desc
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    });

    return result;
  }, [rawCustomers, debouncedSearch, filterType, sortType]);

  const visibleCustomers = useMemo(() => {
    return filteredCustomers.slice(0, page * PAGE_SIZE);
  }, [filteredCustomers, page]);

  const hasMore = visibleCustomers.length < filteredCustomers.length;

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
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
          {/* Search, Filter & Top Action Header */}
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
                  All ({rawCustomers.length})
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
                  Advance (Jama)
                </button>
                <button
                  onClick={() => handleFilterChange('SETTLED')}
                  className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition ${
                    filterType === 'SETTLED'
                      ? 'bg-slate-700 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Barabar
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1 text-xs text-slate-500 self-end sm:self-auto">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortType}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="updated_desc">Recent Activity</option>
                  <option value="balance_desc">Highest Udhaar</option>
                  <option value="balance_asc">Highest Advance</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Rows Content */}
          <div className="flex-1 min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-emerald-600" />
                <p className="text-xs">Loading realtime ledger records...</p>
              </div>
            ) : visibleCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                  <UserPlus className="w-8 h-8" />
                </div>
                {rawCustomers.length === 0 ? (
                  <>
                    <h3 className="font-bold text-base text-slate-800 mb-1">Abhi koi customer nahi hai</h3>
                    <p className="text-xs text-slate-500 max-w-xs mb-4">
                      Apni dukan ke pehle customer ko jodein aur hisab-kitab shuru karein.
                    </p>
                    <button
                      onClick={onAddCustomerClick}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition"
                    >
                      + Pehla Customer Jodein
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-sm text-slate-700 mb-1">Koi customer match nahi hua</h3>
                    <p className="text-xs text-slate-400 mb-3">
                      Search query ya filter change karke dekhein.
                    </p>
                    <button
                      onClick={handleClearSearch}
                      className="text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      Clear Filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleCustomers.map((customer) => {
                  const balanceInfo = getBalanceInfo(customer.balance);
                  const formattedPhone = formatIndianPhoneNumber(customer.phone);

                  return (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-50/80 transition group cursor-pointer"
                    >
                      {/* Customer Info */}
                      <Link
                        href={`/dashboard/customer/${customer.id}`}
                        className="flex items-center gap-3 min-w-0 flex-1 pr-3"
                      >
                        <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-base shrink-0 overflow-hidden shadow-2xs">
                          {customer.photo_url ? (
                            <img
                              src={customer.photo_url}
                              alt={customer.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{customer.name?.charAt(0)?.toUpperCase() || '?'}</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition truncate">
                            {customer.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            {formattedPhone && (
                              <span className="text-xs text-slate-500 font-medium">
                                {formattedPhone}
                              </span>
                            )}
                            {customer.updated_at && (
                              <span className="text-[10px] text-slate-400 hidden sm:inline">
                                • {formatDistanceToNow(new Date(customer.updated_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Balance Badge & Actions */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <Link
                          href={`/dashboard/customer/${customer.id}`}
                          className="text-right"
                        >
                          <span
                            className={`text-sm font-extrabold block ${
                              balanceInfo.badgeColor === 'red'
                                ? 'text-rose-600'
                                : balanceInfo.badgeColor === 'green'
                                ? 'text-emerald-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {formatINR(balanceInfo.formattedAbsolute)}
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            {balanceInfo.statusLabel}
                          </span>
                        </Link>

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

            {/* Pagination Load More Bar */}
            {!loading && visibleCustomers.length > 0 && (
              <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">
                  Showing <strong className="text-slate-700">{visibleCustomers.length}</strong> of{' '}
                  <strong className="text-slate-700">{filteredCustomers.length}</strong> customers
                </span>

                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-emerald-700 font-bold rounded-xl shadow-2xs transition active:scale-98 flex items-center gap-1.5"
                  >
                    <span>Load More</span>
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
            <h3 className="font-bold text-base mb-1">Realtime Udhar Khata</h3>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Powered by Firebase Realtime Database. All balance updates sync instantly across multiple devices without reloading.
            </p>
          </div>

          {/* Top Outstanding Due Customers */}
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
