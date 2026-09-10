import MainLayout from '@/Layouts/MainLayout';
import ActiveShopBanner from '@/Modules/Shops/Components/ActiveShopBanner';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  ChevronDown,
  FileDown,
  FileText,
  LayoutGrid,
  LayoutList,
  List,
  Package,
  Plus,
  Rows3,
  Search,
  Table,
  X,
} from 'lucide-react';
import { Fragment, useState, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Modal from '@/Components/Modal';

// ─────────────────────────────────────────────
// StockModal Component
// Reusable slide-in modal for recording Stock IN or Stock OUT.
// Renders a form with variant info, quantity, reason, and date fields.
// Submits via Inertia POST to the appropriate inventory route.
// ─────────────────────────────────────────────
function StockModal({ type, variant, onClose }) {
  const isIn = type === 'IN';

  const { data, setData, post, processing, errors, reset } = useForm({
    variant_id: variant?.id ?? '',
    quantity: '',
    reason: isIn ? 'Purchase' : 'Sale',
    date: new Date().toISOString().split('T')[0],
    purchase_cost: '',
    shipping_cost: '',
    other_cost: '',
    notes: '',
  });

  const handleSubmit = e => {
    e.preventDefault();
    const url = isIn ? route('inventory.stockIn') : route('inventory.stockOut');
    post(url, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${isIn
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
                }`}
            >
              {isIn ? (
                <ArrowUpCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowDownCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">
                Stock {isIn ? 'IN' : 'OUT'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {variant?.product?.name} —{' '}
                {[variant?.size, variant?.grade_type]
                  .filter(Boolean)
                  .join(' / ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Current stock badge */}
        <div className="mb-5 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Current stock
          </span>
          <span className="font-bold text-gray-900 dark:text-white">
            {variant?.inventory?.current_stock ?? 0}{' '}
            {variant?.product?.uom ?? 'units'}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Quantity *
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              value={data.quantity}
              onChange={e => setData('quantity', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter quantity"
              required
            />
            {errors.quantity && (
              <p className="mt-1 text-xs text-red-500">{errors.quantity}</p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Reason
            </label>
            <select
              value={data.reason}
              onChange={e => setData('reason', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {isIn ? (
                <>
                  <option>Purchase</option>
                  <option>Return from Customer</option>
                  <option>Opening Balance</option>
                  <option>Adjustment</option>
                </>
              ) : (
                <>
                  <option>Sale</option>
                  <option>Damage</option>
                  <option>Photography Session Usage</option>
                  <option>Waste</option>
                  <option>Adjustment</option>
                </>
              )}
            </select>
          </div>

          {/* Optional Costs (Only for IN) */}
          {isIn && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Unit Cost
                  <span className="block font-normal text-gray-400 text-[10px] mt-0.5 whitespace-normal">Optional</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={data.purchase_cost}
                  onChange={e => setData('purchase_cost', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Shipping
                  <span className="block font-normal text-gray-400 text-[10px] mt-0.5 whitespace-normal">Optional</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={data.shipping_cost}
                  onChange={e => setData('shipping_cost', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Other
                  <span className="block font-normal text-gray-400 text-[10px] mt-0.5 whitespace-normal">Optional</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={data.other_cost}
                  onChange={e => setData('other_cost', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Brief Explanation <span className="font-normal text-gray-400 text-xs">(Optional)</span>
            </label>
            <textarea
              value={data.notes}
              onChange={e => setData('notes', e.target.value)}
              rows="2"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none"
              placeholder="e.g. Broken frame replaced by supplier..."
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Date *
            </label>
            <input
              type="date"
              value={data.date}
              onChange={e => setData('date', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors ${isIn
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-red-500 hover:bg-red-600'
                } disabled:opacity-50`}
            >
              {processing ? 'Saving...' : isIn ? 'Record IN' : 'Record OUT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VariantRow — used in General Stock list view
// ─────────────────────────────────────────────
function VariantRow({ variant, onStockIn, onStockOut, onShipment }) {
  const stock = variant.inventory?.current_stock ?? 0;
  const threshold = variant.inventory?.low_stock_threshold ?? 10;
  const isLow = stock < threshold;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
      {/* Product name + SKU */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Product thumbnail — shows image if available, Package icon as fallback */}
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
            {variant.product?.image_url ? (
              <img
                src={variant.product.image_url}
                alt={variant.product?.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {variant.product?.name}
            </p>
            <p className="text-xs text-gray-400 font-mono">{variant.sku}</p>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
        {variant.product?.category?.name}
      </td>

      {/* Size */}
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
        {variant.size || "—"}
      </td>

      {/* Location (Box) */}
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
        {variant.product?.location || "—"}
      </td>

      {/* Stock with low-stock badge */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`font-bold ${isLow ? 'text-red-500' : 'text-gray-900 dark:text-white'
              }`}
          >
            {stock}
          </span>
          <span className="text-xs text-gray-400">{variant.product?.uom}</span>
          {isLow && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3 h-3" />
              Low
            </span>
          )}
        </div>
      </td>

      {/* Selling price */}
      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
        LKR {Number(variant.selling_price).toLocaleString()}
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onStockIn(variant)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            IN
          </button>
          <button
            onClick={() => onStockOut(variant)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            OUT
          </button>
          <button
            onClick={() => onShipment(variant)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Shipment
          </button>

          <button
            onClick={() => router.get(route('inventory.logs', variant.id))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
          >
            History
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// FrameCard — used in Frame Grid view
// Displays a product with all its size/grade variants in a card
// ─────────────────────────────────────────────
function FrameCard({ variants, onStockIn, onStockOut, onShipment }) {
  // Group by parent product (all variants here belong to same product usually)
  const productName = variants[0]?.product?.name ?? 'Unknown';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* Card Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Product image in FrameCard header */}
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
            {variants[0]?.product?.image_url ? (
              <img
                src={variants[0].product.image_url}
                alt={productName}
                className="w-full h-full object-cover"
              />
            ) : (
              <Boxes className="w-4 h-4 text-indigo-500" />
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            {productName}
          </h3>
          {variants[0]?.product?.location && (
            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-[#03AED2]/10 text-[#03AED2]">
              Box: {variants[0].product.location}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {variants.length} variant{variants.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Variants table inside card */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700/40">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Size
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Grade
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                SKU
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Stock
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Price
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {variants.map(variant => {
              const stock = variant.inventory?.current_stock ?? 0;
              const threshold = variant.inventory?.low_stock_threshold ?? 10;
              const isLow = stock < threshold;

              return (
                <tr
                  key={variant.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                    {variant.size ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                    {variant.grade_type ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                    {variant.sku || '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold ${isLow
                          ? 'text-red-500'
                          : 'text-gray-900 dark:text-white'
                          }`}
                      >
                        {stock}
                      </span>
                      {isLow && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          Low
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">
                    LKR {Number(variant.selling_price).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onStockIn(variant)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                      >
                        <ArrowUpCircle className="w-3 h-3" />
                        IN
                      </button>

                      <button
                        onClick={() => onShipment(variant)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Shipment
                      </button>
                      <button
                        onClick={() =>
                          router.get(route('inventory.logs', variant.id))
                        }
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                      >
                        Log
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FrameCompactRow — used in Frame view when density === 'compact'
// One row per product. All variants are shown as small chip badges
// (e.g. "4x6/A · 12") with red tint for low stock. The row exposes a
// chevron to expand a fly-out menu of per-variant Stock IN/OUT/Log
// actions, so the compact mode never hides functionality.
// ─────────────────────────────────────────────
function FrameCompactRow({ variants, onStockIn, onStockOut, onShipment }) {
  const [expanded, setExpanded] = useState(false);
  const product = variants[0]?.product;
  const productName = product?.name ?? 'Unknown';

  const totalStock = variants.reduce(
    (sum, v) => sum + Number(v.inventory?.current_stock ?? 0),
    0,
  );
  const lowCount = variants.filter(v => {
    const stock = v.inventory?.current_stock ?? 0;
    const threshold = v.inventory?.low_stock_threshold ?? 10;
    return stock < threshold;
  }).length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* Single-line header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Product image */}
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
          {product?.image_url ? (
            <img
              src={product.image_url}
              alt={productName}
              className="w-full h-full object-cover"
            />
          ) : (
            <Boxes className="w-4 h-4 text-indigo-500" />
          )}
        </div>

        {/* Name + variant chip badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {productName}
            </h3>
            {product?.location && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#03AED2]/10 text-[#03AED2]">
                Box: {product.location}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {variants.length} variant{variants.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {variants.map(variant => {
              const stock = variant.inventory?.current_stock ?? 0;
              const threshold = variant.inventory?.low_stock_threshold ?? 10;
              const isLow = stock < threshold;
              const label = [variant.size, variant.grade_type]
                .filter(Boolean)
                .join('/') || variant.sku || '—';

              return (
                <span
                  key={variant.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${isLow
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900/40'
                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    }`}
                  title={`${variant.sku} — ${stock} in stock`}
                >
                  {label}
                  <span className="font-bold">{stock}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Stats column */}
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
            {totalStock}
          </p>
          {lowCount > 0 && (
            <p className="text-xs text-red-500 font-medium">
              {lowCount} low
            </p>
          )}
        </div>

        {/* Expand button — reveals per-variant action rows */}
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 dark:hover:text-gray-200 transition-colors"
          title={expanded ? 'Hide actions' : 'Manage variants'}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''
              }`}
          />
        </button>
      </div>

      {/* Expandable per-variant action panel */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/30 px-5 py-3 space-y-2">
          {variants.map(variant => {
            const stock = variant.inventory?.current_stock ?? 0;
            const threshold = variant.inventory?.low_stock_threshold ?? 10;
            const isLow = stock < threshold;
            const label = [variant.size, variant.grade_type]
              .filter(Boolean)
              .join(' / ') || '—';

            return (
              <div
                key={variant.id}
                className="flex items-center gap-3 text-sm"
              >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {label}
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    {variant.sku}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold ${isLow
                      ? 'text-red-500'
                      : 'text-gray-900 dark:text-white'
                      }`}
                  >
                    {stock}
                  </span>
                  <span className="text-xs text-gray-400">
                    LKR {Number(variant.selling_price).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onStockIn(variant)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                  >
                    <ArrowUpCircle className="w-3 h-3" />
                    IN
                  </button>

                  <button
                    onClick={() => onShipment(variant)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Shipment
                  </button>
                  <button
                    onClick={() =>
                      router.get(route('inventory.logs', variant.id))
                    }
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                  >
                    Log
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Inventory/Index Page
// ─────────────────────────────────────────────
export default function InventoryIndex({
  frameVariants = [],
  generalVariants = [],
  lowStockCount = 0,
}) {
  // Active shop is needed by every export so the generated PDF / Excel
  // file clearly identifies which shop's inventory it represents and the
  // file itself is named after that shop's slug.
  //
  // We read it from the Inertia shared props (set up by HandleInertiaRequests)
  // rather than calling useActiveShop(), because the hook depends on
  // <ShopProvider> being mounted *above* this component — but at the page
  // level, MainLayout (which mounts the provider) is rendered as a *child*
  // of this component, not a parent. Using the prop avoids that ordering
  // pitfall and means we don't need to split the page into a shell + inner
  // component just to read the shop name.
  const { activeShop, auth } = usePage().props;
  const canExport = Boolean(
    auth?.access?.is_super_admin ||
    auth?.access?.page_lookup?.['inventory.export'] ||
    auth?.access?.page_lookup?.['inventory']
  );

  // Toggle: 'frame' | 'general'
  const [activeView, setActiveView] = useState('frame');
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Density toggle for the Frame view: 'detailed' (default — full table per
  // product) | 'compact' (single row per product with chip badges).
  // Persisted to localStorage so the user's preference survives navigation.
  const [frameDensity, setFrameDensity] = useState('detailed');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('inventoryIndexViewMode');
      if (savedMode) {
        setActiveView(savedMode);
      }
      const savedDensity = localStorage.getItem('inventoryFrameDensity');
      if (savedDensity === 'detailed' || savedDensity === 'compact') {
        setFrameDensity(savedDensity);
      }
    }
  }, []);

  const changeFrameDensity = mode => {
    setFrameDensity(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('inventoryFrameDensity', mode);
    }
  };

  const changeActiveView = (mode) => {
    setActiveView(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('inventoryIndexViewMode', mode);
    }
  };

  // Stock modal state
  const [modal, setModal] = useState(null); // { type: 'IN'|'OUT', variant }

  // Search query
  const [search, setSearch] = useState('');

  const openStockIn = variant => setModal({ type: 'IN', variant });
  const openStockOut = variant => setModal({ type: 'OUT', variant });
  const closeModal = () => setModal(null);

  // Shipment modal state
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [selectedItemForShipment, setSelectedItemForShipment] = useState(null);

  const { data: shipmentData, setData: setShipmentData, post: postShipment, processing: shipmentProcessing, errors: shipmentErrors, reset: resetShipment } = useForm({
      product_id: '',
      cost_price: '',
      selling_price: '',
      quantity: '',
      size: '',
      grade_type: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
  });

  const openShipmentModal = (variant) => {
      setSelectedItemForShipment(variant);
      setShipmentData({
          product_id: variant.product_id,
          cost_price: variant.cost_price || '',
          selling_price: variant.selling_price || '',
          quantity: '',
          size: variant.size || '',
          grade_type: variant.grade_type || '',
          date: new Date().toISOString().split('T')[0],
          notes: 'New shipment',
      });
      setIsShipmentModalOpen(true);
  };

  const submitShipment = (e) => {
      e.preventDefault();
      postShipment(route('inventory.shipment.store'), {
          preserveScroll: true,
          onSuccess: () => {
              setIsShipmentModalOpen(false);
              resetShipment();
          },
      });
  };

  // ── Functions for Exporting Reports ──
  const formatDataForExport = () => {
    // Combine all variants for the full report
    const allVariants = [...frameVariants, ...generalVariants];

    return allVariants.map(v => {
      const stock = v.inventory?.current_stock ?? 0;
      const threshold = v.inventory?.low_stock_threshold ?? 10;

      let status = 'Healthy';
      if (stock === 0) status = 'Out of Stock';
      else if (stock < threshold) status = 'Low Stock';

      const costPrice = v.cost_price ? Number(v.cost_price) : 0;
      const sellPrice = v.selling_price ? Number(v.selling_price) : 0;
      const totalVal = costPrice * stock;

      return {
        'Product Name': v.product?.name ?? 'Unknown',
        'Category': v.product?.category?.name ?? 'Uncategorized',
        'Location': v.product?.location || '—',
        'SKU': v.sku ?? '—',
        'Barcode': v.barcode || '—',
        'Size': v.size || '—',
        'Grade / Type': v.grade_type || '—',
        'UOM': v.product?.uom ?? 'unit',
        'Cost (LKR)': costPrice.toLocaleString(),
        'Price (LKR)': sellPrice.toLocaleString(),
        'Stock': stock,
        'Reorder Lvl': threshold,
        'Value (LKR)': totalVal.toLocaleString(),
        'Status': status
      };
    });
  };

  // Build a filesystem-safe slug from a free-form string, falling back to
  // a sensible default if the input is empty. Used to embed the shop slug
  // in the export filename so users can tell shops apart at a glance.
  const slugifyForFilename = value =>
    (value || 'all-shops')
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'all-shops';

  const exportToExcel = () => {
    const rawData = formatDataForExport();
    if (rawData.length === 0) {
      alert("No data available to export.");
      return;
    }

    const shopName = activeShop?.name ?? 'All shops';
    const shopSlug = activeShop?.slug ?? null;
    const shopAddress = activeShop?.address ?? '';

    // Modern Excel formatting with Title and Dates manually placed in AoA (Array of Arrays)
    const headerRows = [
      ["PHOTOGRAPHY SHOP MANAGEMENT SYSTEM"],
      ["Full Inventory Report"],
      [`Shop: ${shopName}${shopSlug ? ` (${shopSlug})` : ''}`],
      ...(shopAddress ? [[`Address: ${shopAddress}`]] : []),
      [`Generated On: ${new Date().toLocaleString()}`],
      [`Total Tracked Variants: ${rawData.length}  |  Low Stock Items: ${lowStockCount}`],
      [], // blank row spacer
    ];

    const keys = Object.keys(rawData[0]);
    const titleRowCount = headerRows.length; // number of metadata rows BEFORE the table headers
    headerRows.push(keys); // Table Headers

    // Add Data
    rawData.forEach(item => {
      headerRows.push(Object.values(item));
    });

    const worksheet = XLSX.utils.aoa_to_sheet(headerRows);

    // Merge cells for every metadata row so the title block stretches nicely
    worksheet['!merges'] = Array.from(
      { length: titleRowCount },
      (_, r) => ({ s: { r, c: 0 }, e: { r, c: keys.length - 1 } })
    );

    // Auto-adjust column widths based on expected lengths
    worksheet['!cols'] = [
      { wch: 30 }, // Product Name
      { wch: 20 }, // Category
      { wch: 15 }, // Location
      { wch: 25 }, // SKU
      { wch: 20 }, // Barcode
      { wch: 10 }, // Size
      { wch: 15 }, // Grade
      { wch: 10 }, // UOM
      { wch: 15 }, // Cost
      { wch: 15 }, // Price
      { wch: 10 }, // Stock
      { wch: 12 }, // Reorder
      { wch: 18 }, // Value
      { wch: 18 }, // Status
    ];

    const workbook = XLSX.utils.book_new();
    // Embed the shop name into the workbook's properties so it shows up in
    // Excel's File → Info panel even after the file is renamed by the user.
    workbook.Props = {
      Title: `Inventory Report — ${shopName}`,
      Subject: 'Inventory',
      Company: shopName,
      CreatedDate: new Date(),
    };
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Report');

    const datePart = new Date().toISOString().split('T')[0];
    const slugPart = slugifyForFilename(activeShop?.slug ?? activeShop?.name);
    XLSX.writeFile(
      workbook,
      `Inventory_Report_${slugPart}_${datePart}.xlsx`,
    );
  };

  const exportToPDF = () => {
    const rawData = formatDataForExport();
    const doc = new jsPDF('landscape');

    const shopName = activeShop?.name ?? 'All shops';
    const shopSlug = activeShop?.slug ?? null;
    const shopAddress = activeShop?.address ?? '';

    const datePart = new Date().toISOString().split('T')[0];
    const slugPart = slugifyForFilename(activeShop?.slug ?? activeShop?.name);
    const filename = `Inventory_Report_${slugPart}_${datePart}.pdf`;

    // Embed the shop name in the PDF's metadata so it surfaces in Acrobat's
    // "Document Properties" panel — useful when archiving / emailing reports.
    doc.setProperties({
      title: `Inventory Report — ${shopName}`,
      subject: 'Inventory',
      author: shopName,
      creator: 'Photography Shop Management System',
    });

    if (rawData.length === 0) {
      doc.text(`No inventory data found for ${shopName}.`, 14, 20);
      doc.save(filename);
      return;
    }

    // ── Header block ───────────────────────────────────────────────
    // Brand title
    doc.setFontSize(22);
    doc.setTextColor(3, 174, 210); // Brand primary
    doc.text('PHOTOGRAPHY SHOP', 14, 22);

    // Report title
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text('Full Inventory Report', 14, 30);

    // Highlighted shop banner — pill on the right of the brand title so the
    // reader cannot miss which shop this report belongs to.
    doc.setFillColor(238, 249, 252); // soft brand tint
    doc.setDrawColor(3, 174, 210);
    doc.roundedRect(190, 14, 90, 16, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(3, 174, 210);
    doc.text('SHOP', 195, 19);
    doc.setFontSize(11);
    doc.setTextColor(20, 30, 40);
    doc.text(shopName, 195, 25, { maxWidth: 80 });

    // Metadata lines under the report title
    let metaY = 36;
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Shop: ${shopName}${shopSlug ? `  (${shopSlug})` : ''}`,
      14,
      metaY,
    );
    metaY += 5;
    if (shopAddress) {
      doc.text(`Address: ${shopAddress}`, 14, metaY);
      metaY += 5;
    }
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, metaY);
    metaY += 5;
    doc.text(
      `Total Tracked Variants: ${rawData.length} | Low Stock Items: ${lowStockCount}`,
      14,
      metaY,
    );

    const tableColumn = Object.keys(rawData[0]);
    const tableRows = rawData.map(item => Object.values(item));

    // Call autoTable as a separate imported function to fix previous plugin parsing issues
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: metaY + 6,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      headStyles: { fillColor: [3, 174, 210], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      // Print the shop name in the footer of every page so a printed copy is
      // never ambiguous about which shop the rows belong to.
      didDrawPage: data => {
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `${shopName}${shopSlug ? ` (${shopSlug})` : ''}`,
          14,
          pageHeight - 8,
        );
        doc.text(
          `Page ${data.pageNumber}`,
          pageWidth - 22,
          pageHeight - 8,
        );
      },
      columnStyles: {
        8: { halign: 'right' },  // Cost
        9: { halign: 'right' },  // Price
        10: { halign: 'center' }, // Stock
        11: { halign: 'center' }, // Threshold
        12: { halign: 'right' }, // Value
        13: { fontStyle: 'bold' } // Status
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 13) { // Status column
          if (data.cell.raw === 'Out of Stock' || data.cell.raw === 'Low Stock' || data.cell.raw === 'Low/Critical') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
          } else {
            data.cell.styles.textColor = [5, 150, 105]; // Green
          }
        }
      }
    });

    doc.save(filename);
  };

  // Filter variants by search term (product name, SKU, size, grade, location)
  const filterVariants = variants =>
    variants.filter(v => {
      const q = search.toLowerCase();
      return (
        v.product?.name?.toLowerCase().includes(q) ||
        v.sku?.toLowerCase().includes(q) ||
        v.size?.toLowerCase().includes(q) ||
        v.grade_type?.toLowerCase().includes(q) ||
        v.product?.location?.toLowerCase().includes(q)
      );
    });

  const filteredFrames = filterVariants(frameVariants);
  const filteredGeneral = filterVariants(generalVariants);

  // Group frame variants by product_id for the card view
  const frameGroups = filteredFrames.reduce((acc, v) => {
    const pid = v.product_id;
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(v);
    return acc;
  }, {});

  const totalTracked = frameVariants.length + generalVariants.length;

  return (
    <MainLayout pageTitle="Inventory">
      <Head title="Inventory Management" />

      <div className="mb-4">
        <ActiveShopBanner />
      </div>

      {/* Stock IN/OUT Modal */}
      {modal && (
        <StockModal
          type={modal.type}
          variant={modal.variant}
          onClose={closeModal}
        />
      )}

      <div className="space-y-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Inventory Management
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track frames, inks, paper, and all consumables with full IN/OUT
              history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export Dropdown */}
            {canExport && (
              <Menu as="div" className="relative inline-block text-left z-20">
                <div>
                  <Menu.Button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors shadow-sm">
                    <FileDown className="w-4 h-4" />
                    Export
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </Menu.Button>
                </div>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 dark:divide-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 focus:outline-none">
                    <div className="p-1.5">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={exportToExcel}
                            className={`${active ? 'bg-emerald-50 dark:bg-slate-700 text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
                              } group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors`}
                          >
                            <Table className="w-4 h-4 text-emerald-500" />
                            Export as Excel
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={exportToPDF}
                            className={`${active ? 'bg-red-50 dark:bg-slate-700 text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
                              } group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium mt-1 transition-colors`}
                          >
                            <FileText className="w-4 h-4 text-red-500" />
                            Export as PDF
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            )}

            <button
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-650 bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-450 font-medium hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            >
              <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
              Import Excel
            </button>

            <button
              onClick={() => router.get(route('products.index'))}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors shadow-sm"
            >
              <Package className="w-4 h-4" />
              All Products
            </button>
          </div>
        </div>

        {/* Products Import Modal */}
        {importModalOpen && (
          <ProductsImportModal onClose={() => setImportModalOpen(false)} />
        )}

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Variants
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {totalTracked}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Frame Variants
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {frameVariants.length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              General Items
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {generalVariants.length}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 border border-red-100 dark:border-red-900/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Low Stock
              </p>
            </div>
            <p className="mt-2 text-3xl font-bold text-red-500">
              {lowStockCount}
            </p>
          </div>
        </div>

        {/* ── Toggle + Search Row ── */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* View Toggle */}
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-slate-700 p-1">
            <button
              onClick={() => changeActiveView('frame')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'frame'
                ? 'bg-[#03AED2]/10 text-[#03AED2] shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Frames
            </button>
            <button
              onClick={() => changeActiveView('general')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'general'
                ? 'bg-[#03AED2]/10 text-[#03AED2] shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
            >
              <List className="w-4 h-4" />
              General Stock
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product, SKU, size or grade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Density toggle — only relevant for the Frame view */}
          {activeView === 'frame' && (
            <div
              className="inline-flex rounded-xl bg-gray-100 dark:bg-slate-700 p-1"
              role="group"
              aria-label="Frame density"
            >
              <button
                onClick={() => changeFrameDensity('detailed')}
                title="Detailed view — show full table per product"
                aria-pressed={frameDensity === 'detailed'}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${frameDensity === 'detailed'
                  ? 'bg-white dark:bg-slate-800 text-[#03AED2] shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
              >
                <Rows3 className="w-4 h-4" />
                <span className="hidden sm:inline">Detailed</span>
              </button>
              <button
                onClick={() => changeFrameDensity('compact')}
                title="Compact view — one row per product with variant chips"
                aria-pressed={frameDensity === 'compact'}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${frameDensity === 'compact'
                  ? 'bg-white dark:bg-slate-800 text-[#03AED2] shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
              >
                <LayoutList className="w-4 h-4" />
                <span className="hidden sm:inline">Compact</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Frame Grid View ── */}
        {activeView === 'frame' && (
          <div className="space-y-4">
            {Object.keys(frameGroups).length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                No frame variants found.
              </div>
            ) : (
              Object.values(frameGroups).map(variants =>
                frameDensity === 'compact' ? (
                  <FrameCompactRow
                    key={variants[0].product_id}
                    variants={variants}
                    onStockIn={openStockIn}
                    onStockOut={openStockOut}
                    onShipment={openShipmentModal}
                  />
                ) : (
                  <FrameCard
                    key={variants[0].product_id}
                    variants={variants}
                    onStockIn={openStockIn}
                    onStockOut={openStockOut}
                    onShipment={openShipmentModal}
                  />
                ),
              )
            )}
          </div>
        )}

        {/* ── General Stock List View ── */}
        {activeView === 'general' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
            {filteredGeneral.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                No general stock items found.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/40">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Item
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Size
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Location (Box)
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Price
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {filteredGeneral.map(variant => (
                    <VariantRow
                      key={variant.id}
                      variant={variant}
                      onStockIn={openStockIn}
                      onStockOut={openStockOut}
                      onShipment={openShipmentModal}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        
        {/* New Shipment Modal */}
        <Modal show={isShipmentModalOpen} onClose={() => setIsShipmentModalOpen(false)} maxWidth="md">
            <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Add New Shipment
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    {selectedItemForShipment?.product?.name || selectedItemForShipment?.name}
                </p>

                <form onSubmit={submitShipment} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost Price *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={shipmentData.cost_price}
                                onChange={e => setShipmentData('cost_price', e.target.value)}
                                className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 p-2"
                                required
                            />
                            {shipmentErrors.cost_price && <span className="text-xs text-red-500">{shipmentErrors.cost_price}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selling Price *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={shipmentData.selling_price}
                                onChange={e => setShipmentData('selling_price', e.target.value)}
                                className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 p-2"
                                required
                            />
                            {shipmentErrors.selling_price && <span className="text-xs text-red-500">{shipmentErrors.selling_price}</span>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity Arrived *</label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={shipmentData.quantity}
                            onChange={e => setShipmentData('quantity', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 p-2"
                            required
                        />
                        {shipmentErrors.quantity && <span className="text-xs text-red-500">{shipmentErrors.quantity}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Size (Optional)</label>
                            <input
                                type="text"
                                value={shipmentData.size}
                                onChange={e => setShipmentData('size', e.target.value)}
                                className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade/Type (Optional)</label>
                            <input
                                type="text"
                                value={shipmentData.grade_type}
                                onChange={e => setShipmentData('grade_type', e.target.value)}
                                className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                        <input
                            type="date"
                            value={shipmentData.date}
                            onChange={e => setShipmentData('date', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white p-2"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={() => setIsShipmentModalOpen(false)}
                            className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={shipmentProcessing}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50"
                        >
                            {shipmentProcessing ? 'Saving...' : 'Add Shipment'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
      </div>
    </MainLayout>
  );
}

// ─────────────────────────────────────────────
// ProductsImportModal Component
// ─────────────────────────────────────────────
function ProductsImportModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null); // { updates: [], creates: [], errors: [] }
  const [selectedCreates, setSelectedCreates] = useState([]); // Array of creation line numbers selected to import
  const [activeTab, setActiveTab] = useState('updates'); // 'updates' | 'creates' | 'errors'
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', text: '' }

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const downloadTemplate = () => {
    const headers = [
      ["SKU", "Name", "Category", "Stock", "Cost Price", "Selling Price", "Size", "Grade / Type", "UOM"],
      ["FRM-4X6-GRA-A", "Photo Frame 4x6 Grade A", "Frames", "50", "250", "450", "4x6", "Grade A", "pcs"],
      ["FRM-5X7-GRA-B", "Photo Frame 5x7 Grade B", "Frames", "30", "300", "500", "5X7", "Grade B", "pcs"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Inventory_Import_Template.xlsx");
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        if (rows.length === 0) {
          showToast("error", "The Excel file is empty.");
          setLoading(false);
          return;
        }

        // Post rows to backend preview API
        axios.post(route('products.import.preview'), { rows })
          .then(res => {
            setPreviewData(res.data);
            setSelectedCreates(res.data.creates.map(c => c.line)); // Check all by default
            if (res.data.updates.length > 0) setActiveTab('updates');
            else if (res.data.creates.length > 0) setActiveTab('creates');
            else setActiveTab('errors');
          })
          .catch(err => {
            console.error(err);
            showToast("error", "Error parsing file inside validator.");
          })
          .finally(() => {
            setLoading(false);
          });
      } catch (err) {
        console.error(err);
        showToast("error", "Failed to read the Excel file.");
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const toggleCreateSelection = (line) => {
    setSelectedCreates(prev =>
      prev.includes(line)
        ? prev.filter(l => l !== line)
        : [...prev, line]
    );
  };

  const allCreatesSelected = previewData ? (selectedCreates.length === previewData.creates.length && previewData.creates.length > 0) : false;
  const toggleAllCreates = () => {
    if (allCreatesSelected) {
      setSelectedCreates([]);
    } else {
      setSelectedCreates(previewData.creates.map(c => c.line));
    }
  };

  const handleSubmit = () => {
    if (!previewData) return;
    setSubmitting(true);

    const filteredCreates = previewData.creates.filter(c => selectedCreates.includes(c.line));

    axios.post(route('products.import.submit'), {
      updates: previewData.updates,
      creates: filteredCreates
    })
      .then(() => {
        showToast("success", "Inventory updated successfully!");
        setTimeout(() => {
          router.reload({
            onSuccess: () => {
              onClose();
            }
          });
        }, 1500);
      })
      .catch(err => {
        console.error(err);
        showToast("error", "Failed to submit import. Check database constraints.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white bg-slate-900 border border-slate-700 animate-bounce">
          {toast.type === 'success' ? (
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-xs">✓</div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center font-bold text-xs">!</div>
          )}
          <span className="text-xs font-semibold">{toast.text}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Import Inventory from Excel</h3>
              <p className="text-xs text-gray-500">Update existing SKU stock (additive) or auto-create missing products.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-250 dark:hover:bg-slate-700 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!previewData ? (
            <div className="space-y-4">
              {/* Drop area */}
              <div className="border-2 border-dashed border-gray-350 dark:border-slate-650 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-gray-50/50 dark:bg-slate-900/10 hover:border-indigo-400 transition duration-150">
                <FileDown className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Drag your Excel (.xlsx, .xls) or CSV file here</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Or browse manually from your local directory</p>

                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  id="excel-file-upload"
                  className="hidden"
                  disabled={loading}
                />
                <label
                  htmlFor="excel-file-upload"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-sm"
                >
                  {loading ? "Reading File..." : "Browse Spreadsheet"}
                </label>
              </div>

              {/* Download template */}
              <div className="flex items-center justify-between p-4 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex gap-3 items-center">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <Table className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-xs text-gray-900 dark:text-white">Need a spreadsheet format?</h5>
                    <p className="text-[11px] text-gray-500">Download our formatted template to avoid column mismatches.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition"
                >
                  Download Template
                </button>
              </div>
            </div>
          ) : (
            // Preview dashboard with tabs
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('updates')}
                  className={`p-4 rounded-xl text-left border transition relative cursor-pointer ${activeTab === 'updates'
                    ? 'bg-amber-50/50 dark:bg-amber-950/15 border-amber-500 shadow-sm'
                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                >
                  <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Updates</span>
                  <div className="flex items-end justify-between mt-1">
                    <span className="text-2xl font-black text-amber-500">{previewData.updates.length}</span>
                    <span className="text-[10px] text-gray-400 bg-amber-100/50 dark:bg-amber-900/20 px-2 py-0.5 rounded text-amber-600 dark:text-amber-400">Exist variants</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('creates')}
                  className={`p-4 rounded-xl text-left border transition relative cursor-pointer ${activeTab === 'creates'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-500 shadow-sm'
                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                >
                  <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Creates</span>
                  <div className="flex items-end justify-between mt-1">
                    <span className="text-2xl font-black text-emerald-500">
                      {previewData.creates.length > 0 ? `${selectedCreates.length}/${previewData.creates.length}` : '0'}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-emerald-100/50 dark:bg-emerald-900/20 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400">New products</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('errors')}
                  className={`p-4 rounded-xl text-left border transition relative cursor-pointer ${activeTab === 'errors'
                    ? 'bg-red-50/50 dark:bg-red-950/15 border-red-500 shadow-sm'
                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                >
                  <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Errors (Skipped)</span>
                  <div className="flex items-end justify-between mt-1">
                    <span className="text-2xl font-black text-red-500">{previewData.errors.length}</span>
                    <span className="text-[10px] text-gray-400 bg-red-100/50 dark:bg-red-900/20 px-2 py-0.5 rounded text-red-500">Faulty rows</span>
                  </div>
                </button>
              </div>

              {/* Data Table */}
              <div className="border border-gray-150 dark:border-slate-700 rounded-xl overflow-hidden max-h-[40vh] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-gray-450 sticky top-0">
                    {activeTab === 'updates' && (
                      <tr>
                        <th className="px-4 py-2.5 text-left font-bold text-gray-500">Line</th>
                        <th className="px-4 py-2.5 text-left font-bold text-gray-500">SKU</th>
                        <th className="px-4 py-2.5 text-left font-bold text-gray-500">Product Name</th>
                        <th className="px-4 py-2.5 text-center font-bold text-gray-500">Stock Change</th>
                        <th className="px-4 py-2.5 text-right font-bold text-gray-500">Cost (LKR)</th>
                        <th className="px-4 py-2.5 text-right font-bold text-gray-500">Selling (LKR)</th>
                      </tr>
                    )}
                    {activeTab === 'creates' && (
                      <tr>
                        <th className="px-4 py-2.5 text-center font-bold text-gray-500 w-10">
                          <input
                            type="checkbox"
                            checked={allCreatesSelected}
                            onChange={toggleAllCreates}
                            className="rounded border-gray-300 dark:border-slate-650 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-750 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-2.5 text-left font-bold text-gray-500">Line</th>
                        <th className="px-4 py-2.5 text-left font-bold text-gray-500">Name</th>
                        <th className="px-4 py-2.5 text-left font-bold text-gray-500">Category</th>
                        <th className="px-4 py-2.5 text-left font-bold text-gray-500">SKU</th>
                        <th className="px-4 py-2.5 text-center font-bold text-gray-500">Stock</th>
                        <th className="px-4 py-2.5 text-right font-bold text-gray-500">Cost</th>
                        <th className="px-4 py-2.5 text-right font-bold text-gray-500">Selling</th>
                      </tr>
                    )}
                    {activeTab === 'errors' && (
                      <tr>
                        <th className="px-4 py-2.5 text-left font-bold text-gray-500">Line</th>
                        <th className="px-4 py-2.5 text-left font-bold text-gray-500">SKU</th>
                        <th className="px-4 py-2.5 text-left font-bold text-gray-500">Product Name</th>
                        <th className="px-4 py-2.5 text-left font-bold text-gray-500">Error Info</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-slate-750">
                    {activeTab === 'updates' && (
                      previewData.updates.length === 0 ? (
                        <tr><td colSpan="6" className="text-center py-8 text-gray-400">No update rows found.</td></tr>
                      ) : (
                        previewData.updates.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-750/30">
                            <td className="px-4 py-2.5 font-medium text-gray-400">#{item.line}</td>
                            <td className="px-4 py-2.5 font-mono">{item.sku}</td>
                            <td className="px-4 py-2.5 font-medium">
                              {item.name}
                              {item.size || item.grade ? (
                                <span className="block text-[10px] text-gray-400 font-normal">
                                  {[item.size, item.grade].filter(Boolean).join(' · ')}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold text-gray-900 dark:text-white">
                              {item.current_stock} &rarr;{' '}
                              <span className={item.stock_change >= 0 ? "text-emerald-500 font-extrabold" : "text-red-500 font-extrabold"}>
                                {item.new_stock} ({item.stock_change >= 0 ? `+${item.stock_change}` : item.stock_change})
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-400">
                              LKR {item.current_cost} &rarr; <span className="text-gray-900 dark:text-white font-bold">{item.new_cost}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-400">
                              LKR {item.current_selling} &rarr; <span className="text-gray-900 dark:text-white font-bold">{item.new_selling}</span>
                            </td>
                          </tr>
                        ))
                      )
                    )}

                    {activeTab === 'creates' && (
                      previewData.creates.length === 0 ? (
                        <tr><td colSpan="8" className="text-center py-8 text-gray-400">No creation rows found.</td></tr>
                      ) : (
                        previewData.creates.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-755/35">
                            <td className="px-4 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={selectedCreates.includes(item.line)}
                                onChange={() => toggleCreateSelection(item.line)}
                                className="rounded border-gray-300 dark:border-slate-650 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-750 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-2.5 font-medium text-gray-400">#{item.line}</td>
                            <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-450">
                              {item.name}
                              {!item.creates_new_product && (
                                <span className="ml-2 inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded">
                                  New Variant
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">{item.category_name}</td>
                            <td className="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400">
                              {item.sku || <span className="italic text-gray-400">(Auto-generated)</span>}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono">{item.stock} {item.uom}</td>
                            <td className="px-4 py-2.5 text-right font-medium">LKR {item.cost.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-bold">LKR {item.selling.toLocaleString()}</td>
                          </tr>
                        ))
                      )
                    )}

                    {activeTab === 'errors' && (
                      previewData.errors.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-8 text-gray-400">No error rows detected.</td></tr>
                      ) : (
                        previewData.errors.map((item, idx) => (
                          <tr key={idx} className="hover:bg-red-50/20 dark:hover:bg-red-950/20">
                            <td className="px-4 py-2.5 font-extrabold text-red-500">#{item.line}</td>
                            <td className="px-4 py-2.5 text-red-400 font-mono">{item.sku}</td>
                            <td className="px-4 py-2.5 text-red-400 font-medium">{item.name}</td>
                            <td className="px-4 py-2.5 text-red-650 dark:text-red-450 font-bold">{item.error}</td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-150 dark:border-slate-750 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
          {previewData ? (
            <button
              type="button"
              onClick={() => {
                setPreviewData(null);
                setFile(null);
              }}
              className="px-4 py-2.5 text-sm font-semibold text-gray-500 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            >
              Change File
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              disabled={submitting}
            >
              Cancel
            </button>
            {previewData && (previewData.updates.length > 0 || previewData.creates.length > 0) && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow disabled:opacity-50"
              >
                {submitting ? "Uploading Data..." : "Confirm & Import"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

