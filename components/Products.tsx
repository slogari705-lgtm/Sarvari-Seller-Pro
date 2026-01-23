
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package,
  X,
  Image as ImageIcon,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  ChevronDown,
  Printer,
  CheckSquare,
  Square,
  Barcode,
  Star,
  BellRing,
  LayoutGrid,
  List,
  Eye,
  ShoppingCart,
  AlertCircle,
  Filter,
  TrendingUp
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { AppState, Product } from '../types';
import { translations } from '../translations';

interface Props {
  state: AppState;
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

type SortKey = 'name' | 'price' | 'stock' | 'category';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'table';

const Products: React.FC<Props> = ({ state, updateState }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({ key: 'name', order: 'asc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);

  const [rapidName, setRapidName] = useState('');
  const [rapidPrice, setRapidPrice] = useState('');
  const [rapidCost, setRapidCost] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const t = translations[state.settings.language || 'en'];

  const [productForm, setProductForm] = useState<Partial<Product>>({
    category: 'General',
    price: 0,
    costPrice: 0,
    stock: 0,
    sku: '',
    isFavorite: false,
    lowStockThreshold: state.settings.lowStockThreshold
  });

  useEffect(() => {
    if (barcodeModalProduct && barcodeRef.current) {
      JsBarcode(barcodeRef.current, barcodeModalProduct.sku, {
        format: "CODE128",
        lineColor: "#000",
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 16,
        margin: 10
      });
    }
  }, [barcodeModalProduct]);

  const generateSKU = () => `SKU-${Math.floor(1000 + Math.random() * 9000)}`;

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({ key, order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc' }));
    setShowSortMenu(false);
  };

  const processedProducts = useMemo(() => {
    let result = state.products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const threshold = p.lowStockThreshold !== undefined ? p.lowStockThreshold : state.settings.lowStockThreshold;
      const isLowOrOut = p.stock <= threshold;
      
      if (showOnlyLowStock) return matchesSearch && isLowOrOut;
      return matchesSearch;
    });

    result.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortConfig.order === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return result;
  }, [state.products, searchTerm, sortConfig, showOnlyLowStock, state.settings.lowStockThreshold]);

  const lowStockCount = useMemo(() => {
    return state.products.filter(p => {
      const threshold = p.lowStockThreshold !== undefined ? p.lowStockThreshold : state.settings.lowStockThreshold;
      return p.stock <= threshold;
    }).length;
  }, [state.products, state.settings.lowStockThreshold]);

  const toggleSelectAll = () => {
    if (selectedIds.size === processedProducts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(processedProducts.map(p => p.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleFavorite = (productId: string) => {
    const updatedProducts = state.products.map(p => 
      p.id === productId ? { ...p, isFavorite: !p.isFavorite } : p
    );
    updateState('products', updatedProducts);
  };

  const handleRapidAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rapidName || !rapidPrice) return;
    const product: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: rapidName,
      category: 'General',
      price: Number(rapidPrice),
      costPrice: Number(rapidCost) || 0,
      stock: 0,
      sku: generateSKU(),
      isFavorite: false,
      lowStockThreshold: state.settings.lowStockThreshold
    };
    updateState('products', [...state.products, product]);
    setRapidName('');
    setRapidPrice('');
    setRapidCost('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = () => {
    if (!productForm.name || productForm.price === undefined) return;
    const finalSku = productForm.sku?.trim() || generateSKU();

    if (editingProduct) {
      const updatedProducts = state.products.map(p => 
        p.id === editingProduct.id 
          ? { ...p, ...productForm, sku: finalSku, image: imagePreview || p.image } as Product
          : p
      );
      updateState('products', updatedProducts);
    } else {
      const product: Product = {
        id: Math.random().toString(36).substr(2, 9),
        name: productForm.name,
        category: productForm.category || 'General',
        price: Number(productForm.price),
        costPrice: Number(productForm.costPrice) || 0,
        stock: Number(productForm.stock),
        sku: finalSku,
        image: imagePreview || undefined,
        isFavorite: productForm.isFavorite || false,
        lowStockThreshold: productForm.lowStockThreshold ?? state.settings.lowStockThreshold
      };
      updateState('products', [...state.products, product]);
    }
    resetForm();
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      costPrice: product.costPrice || 0,
      stock: product.stock,
      isFavorite: product.isFavorite,
      lowStockThreshold: product.lowStockThreshold ?? state.settings.lowStockThreshold
    });
    setImagePreview(product.image || null);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setProductForm({ category: 'General', price: 0, costPrice: 0, stock: 0, sku: '', isFavorite: false, lowStockThreshold: state.settings.lowStockThreshold });
    setImagePreview(null);
  };

  const deleteProduct = (id: string) => {
    if (confirm(t.delete + '?')) {
      updateState('products', state.products.filter(p => p.id !== id));
      if (selectedIds.has(id)) {
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
      }
    }
  };

  const printBarcodes = (productsToPrint: Product[]) => {
    const printSection = document.getElementById('print-section');
    if (!printSection) return;
    printSection.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'grid grid-cols-3 gap-4 p-8 bg-white';
    productsToPrint.forEach(p => {
      const label = document.createElement('div');
      label.className = 'border border-slate-300 p-4 rounded text-center flex flex-col items-center justify-center space-y-2';
      label.innerHTML = `
        <div style="font-weight: bold; font-size: 12px; margin-bottom: 2px;">${state.settings.shopName}</div>
        <div style="font-size: 10px; margin-bottom: 4px;">${p.name}</div>
        <svg id="barcode-${p.id}"></svg>
        <div style="font-weight: bold; font-size: 14px;">${state.settings.currency}${p.price.toFixed(2)}</div>
      `;
      container.appendChild(label);
    });
    printSection.appendChild(container);
    
    // Toggle special print mode class
    document.body.classList.add('printing-special');

    productsToPrint.forEach(p => {
      try {
        JsBarcode(`#barcode-${p.id}`, p.sku, {
          format: "CODE128",
          width: 1.5,
          height: 50,
          fontSize: 12,
          displayValue: true
        });
      } catch (e) { console.error('Barcode Error', e); }
    });

    setTimeout(() => { 
        window.print(); 
        document.body.classList.remove('printing-special');
        printSection.innerHTML = ''; 
    }, 500);
  };

  const calculateMargin = (price: number, cost: number) => {
    if (!price || !cost) return 0;
    return ((price - cost) / price) * 100;
  };

  return (
    <div className="space-y-6 pb-20 relative animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* ... Search and Filters ... */}
        <div className="flex flex-col md:flex-row gap-3 flex-1 max-w-3xl w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t.search} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all shadow-sm dark:text-white"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm border ${
                showOnlyLowStock 
                ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <AlertCircle size={18} className={showOnlyLowStock ? 'text-rose-600' : 'text-slate-400'} />
              {t.lowStock}
              {lowStockCount > 0 && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${showOnlyLowStock ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  {lowStockCount}
                </span>
              )}
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-sm ${showSortMenu ? 'ring-2 ring-indigo-500' : ''}`}
              >
                <ArrowUpDown size={18} />
                <span className="hidden sm:inline">Sort:</span> <span className="text-indigo-600 capitalize">{sortConfig.key}</span>
                <ChevronDown size={14} className={`transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
              </button>
              {showSortMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-30 animate-in fade-in slide-in-from-top-2">
                  {['name', 'price', 'stock', 'category'].map(key => (
                    <button
                      key={key}
                      onClick={() => handleSort(key as SortKey)}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 ${sortConfig.key === key ? 'text-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                      <span className="capitalize">{key}</span>
                      {sortConfig.key === key && (sortConfig.order === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={18} />
          {t.newProduct}
        </button>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600">
                      {selectedIds.size === processedProducts.length && processedProducts.length > 0 ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                    </button>
                  </th>
                  <th className="px-2 py-4 w-8 text-center"><Star size={14} className="mx-auto text-slate-400" /></th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.displayName}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.category}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Buy Price</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.price}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Margin</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.stock}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Rapid Add Row */}
                <tr className="bg-indigo-50/20 dark:bg-indigo-500/5">
                   <td colSpan={2}></td>
                   <td className="px-6 py-3">
                     <form onSubmit={handleRapidAdd} className="flex gap-2">
                       <input value={rapidName} onChange={e => setRapidName(e.target.value)} placeholder="Quick name..." className="flex-1 bg-transparent border-b-2 border-indigo-200 dark:border-indigo-800 outline-none font-bold text-sm dark:text-white py-1 focus:border-indigo-500" />
                     </form>
                   </td>
                   <td className="px-6 py-3"><span className="text-[10px] font-black uppercase text-slate-400">General</span></td>
                   <td className="px-6 py-3">
                     <div className="flex items-center gap-1 border-b-2 border-indigo-200 dark:border-indigo-800 max-w-[80px]">
                        <span className="text-xs font-black text-indigo-400">{state.settings.currency}</span>
                        <input value={rapidCost} onChange={e => setRapidCost(e.target.value)} placeholder="Buy" type="number" className="bg-transparent outline-none font-black text-sm dark:text-white py-1 w-full" />
                     </div>
                   </td>
                   <td className="px-6 py-3">
                     <div className="flex items-center gap-1 border-b-2 border-indigo-200 dark:border-indigo-800 max-w-[80px]">
                        <span className="text-xs font-black text-indigo-400">{state.settings.currency}</span>
                        <input value={rapidPrice} onChange={e => setRapidPrice(e.target.value)} placeholder="Sell" type="number" className="bg-transparent outline-none font-black text-sm dark:text-white py-1 w-full" />
                     </div>
                   </td>
                   <td colSpan={1}></td>
                   <td colSpan={1}></td>
                   <td className="px-6 py-3 text-right">
                     <button onClick={handleRapidAdd} disabled={!rapidName || !rapidPrice} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:bg-slate-200 transition-all shadow-md active:scale-95"><Plus size={16}/></button>
                   </td>
                </tr>

                {processedProducts.map((p) => {
                  const threshold = p.lowStockThreshold !== undefined ? p.lowStockThreshold : state.settings.lowStockThreshold;
                  const isLow = p.stock <= threshold && p.stock > 0;
                  const isOut = p.stock === 0;
                  const isSelected = selectedIds.has(p.id);
                  const margin = calculateMargin(p.price, p.costPrice || 0);

                  return (
                    <tr key={p.id} className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-colors group ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => toggleSelect(p.id)} className={`${isSelected ? 'text-indigo-600' : 'text-slate-300'} hover:text-indigo-600`}>
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </td>
                      <td className="px-2 py-4 text-center">
                        <button onClick={() => toggleFavorite(p.id)} className={`transition-all hover:scale-110 ${p.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}>
                          <Star size={18} />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform shrink-0">
                            {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package size={20} />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-white text-sm truncate leading-tight">{p.name}</span>
                              {(isLow || isOut) && <AlertCircle size={14} className={`animate-bounce shrink-0 ${isOut ? 'text-rose-600' : 'text-amber-500'}`} />}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium uppercase">#{p.id.substring(0,6)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{p.category}</td>
                      <td className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 text-xs">{state.settings.currency}{(p.costPrice || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 font-black text-slate-800 dark:text-white text-sm">{state.settings.currency}{p.price.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${margin > 20 ? 'bg-emerald-50 text-emerald-600' : margin > 0 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                           {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                          <span className={`text-xs font-black ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600'}`}>{p.stock}</span>
                          {(isLow || isOut) && (
                            <span className={`animate-pulse px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${isOut ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}>
                              {isOut ? t.outOfStock : t.lowStock}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setBarcodeModalProduct(p)} className="p-2 text-slate-400 hover:text-indigo-600" title={t.generateBarcode}><Barcode size={16} /></button>
                          <button onClick={() => openEditModal(p)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                          <button onClick={() => deleteProduct(p.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // ... Grid view remains mostly same but could display margin if needed ...
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {processedProducts.map((p) => {
            const threshold = p.lowStockThreshold !== undefined ? p.lowStockThreshold : state.settings.lowStockThreshold;
            const isLow = p.stock <= threshold && p.stock > 0;
            const isOut = p.stock === 0;

            return (
              <div 
                key={p.id} 
                className={`group relative bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden border shadow-sm transition-all hover:shadow-xl animate-in zoom-in-95 duration-200 ${
                  (isLow || isOut) ? 'border-rose-200 dark:border-rose-900/50' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Visual Image Section */}
                <div className="relative aspect-square w-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                  ) : (
                    <Package size={64} strokeWidth={1.5} />
                  )}

                  {/* Stock Tag */}
                  <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm z-10 flex items-center gap-1.5 ${
                    isOut ? 'bg-rose-600 text-white' : isLow ? 'bg-amber-500 text-white' : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300'
                  }`}>
                    {(isLow || isOut) && <AlertCircle size={12} className="animate-pulse" />}
                    {isOut ? t.outOfStock : `${p.stock} Units`}
                  </div>

                  {/* Hover Overlay Actions */}
                  <div className="absolute inset-0 bg-indigo-600/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 z-20">
                    {/* Actions buttons */}
                    <button onClick={() => toggleFavorite(p.id)} className={`p-4 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all translate-y-4 group-hover:translate-y-0 duration-300 ${p.isFavorite ? 'bg-amber-50 text-white' : 'bg-white text-slate-600'}`}>
                      <Star size={24} strokeWidth={2.5} fill={p.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={() => openEditModal(p)} className="p-4 bg-white text-indigo-600 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all translate-y-4 group-hover:translate-y-0 duration-300 delay-[50ms]">
                      <Edit2 size={24} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className={`font-black truncate leading-tight transition-colors ${
                        (isLow || isOut) ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white group-hover:text-indigo-600'
                      }`}>{p.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{p.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-tight">
                        {state.settings.currency}{p.price.toFixed(2)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">Buy: {state.settings.currency}{(p.costPrice || 0).toFixed(0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      <Barcode size={14} className="text-slate-300" />
                      {p.sku}
                    </div>
                    <div className="flex gap-1">
                       <button onClick={() => setBarcodeModalProduct(p)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Barcode size={16}/></button>
                       <button onClick={() => deleteProduct(p.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Barcode Modal */}
      {barcodeModalProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in duration-200 border border-white/10 text-center">
            <button onClick={() => setBarcodeModalProduct(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            <h3 className="text-xl font-black mb-2 dark:text-white uppercase tracking-tighter">{t.generateBarcode}</h3>
            <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest">{barcodeModalProduct.name}</p>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 mb-8 flex items-center justify-center overflow-hidden">
              <svg ref={barcodeRef} className="max-w-full h-auto"></svg>
            </div>
            <button 
              onClick={() => { printBarcodes([barcodeModalProduct]); setBarcodeModalProduct(null); }}
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Printer size={18} />
              {t.printLabel}
            </button>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-3xl p-0 shadow-2xl relative animate-in zoom-in duration-200 flex flex-col max-h-[90vh] overflow-hidden">
            <header className="p-8 lg:p-12 pb-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{editingProduct ? t.editProduct : t.newProduct}</h3>
              <button onClick={resetForm} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400"><X size={24} /></button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
                <div className="md:col-span-1 space-y-6">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.visualImage}</label>
                  <div onClick={() => fileInputRef.current?.click()} className="aspect-square w-full rounded-[32px] border-4 border-dashed border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-all overflow-hidden relative group">
                    {imagePreview ? (
                      <img src={imagePreview} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-300"><ImageIcon size={48} strokeWidth={1} /><span className="text-[10px] font-black mt-3 uppercase tracking-widest">{t.selectFile}</span></div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                  </div>
                  
                  {/* Margin Display */}
                  <div className={`p-4 rounded-2xl border-2 text-center ${
                    calculateMargin(Number(productForm.price), Number(productForm.costPrice)) > 0 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">Profit Margin</p>
                    <p className="text-2xl font-black">{calculateMargin(Number(productForm.price), Number(productForm.costPrice)).toFixed(1)}%</p>
                  </div>

                  <button onClick={() => setProductForm({...productForm, isFavorite: !productForm.isFavorite})} className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${productForm.isFavorite ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}>
                    <Star size={18} className={productForm.isFavorite ? 'fill-amber-500' : ''} /> {t.favorites}
                  </button>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.displayName}</label>
                    <input type="text" value={productForm.name || ''} onChange={(e) => setProductForm({...productForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none font-bold text-base dark:text-white shadow-inner" placeholder="e.g. Premium Item Name" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.productSKU}</label>
                    <input type="text" value={productForm.sku || ''} onChange={(e) => setProductForm({...productForm, sku: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none font-mono text-sm tracking-widest uppercase dark:text-white" placeholder="AUTO-GEN" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.category}</label>
                    <input type="text" value={productForm.category || ''} onChange={(e) => setProductForm({...productForm, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none font-bold text-base dark:text-white" placeholder="General" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Buy Price (Cost)</label>
                    <input type="number" value={productForm.costPrice || ''} onChange={(e) => setProductForm({...productForm, costPrice: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none font-black text-base dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.price} (Sell)</label>
                    <input type="number" value={productForm.price || ''} onChange={(e) => setProductForm({...productForm, price: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none font-black text-base dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t.stock}</label>
                    <input type="number" value={productForm.stock || ''} onChange={(e) => setProductForm({...productForm, stock: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none font-black text-sm dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2"><BellRing size={12} className="text-rose-500"/> {t.lowStock} {t.total}</label>
                    <input type="number" value={productForm.lowStockThreshold ?? ''} onChange={(e) => setProductForm({...productForm, lowStockThreshold: e.target.value === '' ? undefined : Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 outline-none font-black text-sm dark:text-white shadow-inner" placeholder={state.settings.lowStockThreshold.toString()} />
                  </div>
                </div>
              </div>
            </div>

            <footer className="p-8 lg:p-12 pt-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0 z-10 flex gap-6">
              <button onClick={resetForm} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-3xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">{t.discard}</button>
              <button onClick={handleSaveProduct} className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 transition-all shadow-xl uppercase tracking-widest text-xs active:scale-[0.98]">{editingProduct ? t.editProduct : t.createProduct}</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
