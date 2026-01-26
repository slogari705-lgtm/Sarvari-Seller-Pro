import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package,
  X,
  Image as ImageIcon,
  ChevronDown,
  Printer,
  Barcode,
  LayoutGrid,
  List,
  FileDown,
  RefreshCw,
  Tag,
  DollarSign,
  Layers,
  Hash,
  Sparkles,
  Percent,
  TrendingUp,
  TrendingDown,
  Ban,
  Wand2,
  CheckCircle2,
  Wallet,
  Zap,
  Eye,
  MoreHorizontal,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { AppState, Product, ProductVariation, ProductOption } from '../types';
import { translations } from '../translations';
import ConfirmDialog from './ConfirmDialog';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [viewingBarcodeProduct, setViewingBarcodeProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({ key: 'name', order: 'asc' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isExportingLabel, setIsExportingLabel] = useState(false);

  // Bulk Discount UI State
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountScope, setDiscountScope] = useState<'all' | 'category'>('all');
  const [targetCategory, setTargetCategory] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<number | ''>('');

  // Variations UI State
  const [showVariations, setShowVariations] = useState(false);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [variations, setVariations] = useState<ProductVariation[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerBarcodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const t = translations[state.settings.language || 'en'];

  const categories = useMemo(() => {
    const set = new Set(state.products.map(p => p.category));
    return Array.from(set).filter(Boolean).sort();
  }, [state.products]);

  const [productForm, setProductForm] = useState<Partial<Product>>({
    category: 'General', price: 0, costPrice: 0, stock: 0, sku: '', isFavorite: false, lowStockThreshold: state.settings.lowStockThreshold
  });

  const generateSKU = () => {
    const prefix = "SKU";
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
  };

  // Auto-generate SKU for new products
  useEffect(() => {
    if (isModalOpen && !editingProduct && !productForm.sku) {
      setProductForm(prev => ({ ...prev, sku: generateSKU() }));
    }
  }, [isModalOpen, editingProduct]);

  // Barcode Generation for Viewer
  useEffect(() => {
    if (viewingBarcodeProduct && viewerBarcodeCanvasRef.current) {
      try {
        JsBarcode(viewerBarcodeCanvasRef.current, viewingBarcodeProduct.sku, {
          format: "CODE128",
          width: 2.5,
          height: 100,
          displayValue: true,
          fontSize: 16,
          font: "monospace",
          textMargin: 8,
          background: "#ffffff",
          lineColor: "#000000"
        });
      } catch (e) {
        console.warn("Barcode generation failed", e);
      }
    }
  }, [viewingBarcodeProduct]);

  const handleDownloadLabel = async (product: Product) => {
    if (isExportingLabel || !product.sku) return;
    setIsExportingLabel(true);
    
    const container = document.getElementById('pdf-render-container');
    if (!container) return setIsExportingLabel(false);

    const labelHtml = `
      <div style="width: 80mm; padding: 10mm; background: white; text-align: center; border-radius: 2mm; border: 1px solid #e2e8f0;">
        <div style="font-size: 16px; font-weight: 900; color: #1e293b; margin-bottom: 4px; text-transform: uppercase;">${product.name}</div>
        <div style="font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 12px;">${product.category} | ${state.settings.currency}${product.price.toLocaleString()}</div>
        <canvas id="jsbarcode-export-active"></canvas>
        <div style="margin-top: 10px; font-size: 8px; color: #94a3b8; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">Sarvari Seller Pro POS Asset</div>
      </div>
    `;
    
    container.style.width = '80mm';
    container.innerHTML = labelHtml;
    
    const exportCanvas = document.getElementById('jsbarcode-export-active') as HTMLCanvasElement;
    JsBarcode(exportCanvas, product.sku, {
      format: "CODE128",
      width: 3,
      height: 120,
      displayValue: true,
      fontSize: 20,
      margin: 10
    });

    await new Promise(r => setTimeout(r, 400));
    
    try {
      const canvas = await html2canvas(container, { scale: 3, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: [80, 50] });
      pdf.addImage(imgData, 'PNG', 0, 0, 80, 50);
      pdf.save(`LABEL_${product.sku}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      container.innerHTML = '';
      setIsExportingLabel(false);
    }
  };

  const handlePrintLabel = (product: Product) => {
    const holder = document.getElementById('print-holder');
    if (!holder || !product.sku) return;

    holder.innerHTML = `
      <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center;">
        <h1 style="font-family: sans-serif; font-size: 28px; margin-bottom: 10px; text-transform: uppercase; font-weight: 900;">${product.name}</h1>
        <p style="font-family: sans-serif; font-size: 20px; font-weight: bold; margin-bottom: 30px;">PRICE: ${state.settings.currency}${product.price.toLocaleString()}</p>
        <svg id="barcode-print-svg"></svg>
        <p style="font-family: monospace; font-size: 14px; margin-top: 25px; color: #64748b; font-weight: 800;">OFFICIAL PRODUCT KEY: ${product.sku}</p>
      </div>
    `;

    JsBarcode("#barcode-print-svg", product.sku, {
      format: "CODE128",
      width: 3,
      height: 140,
      displayValue: true,
      fontSize: 24,
      font: "monospace"
    });

    window.print();
    holder.innerHTML = '';
  };

  const handleSaveProduct = () => {
    if (!productForm.name) return;
    const finalPrice = showVariations && variations.length > 0 ? Math.min(...variations.map(v => v.price)) : (Number(productForm.price) || 0);
    const totalStock = showVariations && variations.length > 0 ? variations.reduce((acc, v) => acc + v.stock, 0) : (Number(productForm.stock) || 0);
    const finalSku = productForm.sku?.trim() || generateSKU();

    const productData: Partial<Product> = {
      ...productForm,
      price: finalPrice,
      stock: totalStock,
      sku: finalSku,
      image: imagePreview || undefined,
      options: showVariations ? options : undefined,
      variations: showVariations ? variations : undefined
    };

    if (editingProduct) {
      updateState('products', state.products.map(p => p.id === editingProduct.id ? { ...p, ...productData } as Product : p));
    } else {
      const product: Product = { 
        id: Math.random().toString(36).substr(2, 9), 
        name: productForm.name!, 
        category: productForm.category || 'General', 
        price: finalPrice, 
        costPrice: Number(productForm.costPrice) || 0, 
        stock: totalStock, 
        sku: finalSku, 
        image: imagePreview || undefined, 
        isFavorite: productForm.isFavorite || false, 
        lowStockThreshold: productForm.lowStockThreshold ?? state.settings.lowStockThreshold,
        isDeleted: false,
        options: showVariations ? options : undefined,
        variations: showVariations ? variations : undefined
      };
      updateState('products', [...state.products, product]);
    }
    resetForm();
  };

  const resetForm = () => {
    setEditingProduct(null);
    setProductForm({ category: 'General', price: 0, costPrice: 0, stock: 0, sku: '', isFavorite: false, lowStockThreshold: state.settings.lowStockThreshold });
    setImagePreview(null); setOptions([]); setVariations([]); setShowVariations(false); setIsModalOpen(false);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setProductForm({ ...p });
    setImagePreview(p.image || null);
    if (p.options && p.variations) {
      setOptions(p.options);
      setVariations(p.variations);
      setShowVariations(true);
    } else {
      setOptions([]); setVariations([]); setShowVariations(false);
    }
    setIsModalOpen(true);
  };

  const activeProducts = useMemo(() => state.products.filter(p => !p.isDeleted), [state.products]);

  const lowStockItems = useMemo(() => {
    return activeProducts.filter(p => {
      const threshold = p.lowStockThreshold !== undefined ? p.lowStockThreshold : state.settings.lowStockThreshold;
      return p.stock <= threshold;
    });
  }, [activeProducts, state.settings.lowStockThreshold]);

  const processedProducts = useMemo(() => {
    let result = activeProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const threshold = p.lowStockThreshold !== undefined ? p.lowStockThreshold : state.settings.lowStockThreshold;
      const isLowOrOut = p.stock <= threshold;
      if (showOnlyLowStock) return matchesSearch && isLowOrOut;
      return matchesSearch;
    });
    result.sort((a, b) => {
      const aVal = a[sortConfig.key], bVal = b[sortConfig.key];
      if (typeof aVal === 'string' && typeof bVal === 'string') return sortConfig.order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortConfig.order === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [activeProducts, searchTerm, sortConfig, showOnlyLowStock, state.settings.lowStockThreshold]);

  const applyBulkDiscount = (isClearing: boolean = false) => {
    const updatedProducts = state.products.map(p => {
      const isTarget = discountScope === 'all' || p.category === targetCategory;
      if (!isTarget) return p;
      if (isClearing) {
        const cleanedProduct = { ...p, salePrice: undefined };
        if (cleanedProduct.variations) {
          cleanedProduct.variations = cleanedProduct.variations.map(v => ({ ...v, salePrice: undefined }));
        }
        return cleanedProduct;
      }
      const val = Number(discountValue);
      if (isNaN(val) || val <= 0) return p;
      const calcSale = (base: number) => {
        if (discountType === 'percent') return Math.max(0, base * (1 - val / 100));
        return Math.max(0, base - val);
      };
      const newSalePrice = calcSale(p.price);
      const updatedVariations = p.variations?.map(v => ({ ...v, salePrice: calcSale(v.price) }));
      return { ...p, salePrice: newSalePrice, variations: updatedVariations };
    });
    updateState('products', updatedProducts);
    setIsDiscountModalOpen(false);
    setDiscountValue('');
  };

  const generateVariations = () => {
    if (options.length === 0) return;
    const combinations = (opts: ProductOption[]): string[][] => {
      if (opts.length === 0) return [[]];
      const result: string[][] = [];
      const rest = combinations(opts.slice(1));
      for (const val of opts[0].values) {
        for (const r of rest) { result.push([val, ...r]); }
      }
      return result;
    };
    const combined = combinations(options);
    const newVariations: ProductVariation[] = combined.map(c => {
      const name = c.join(' / ');
      const existing = variations.find(v => v.name === name);
      return existing || {
        id: Math.random().toString(36).substr(2, 9),
        sku: `${productForm.sku || 'SKU'}-${c.join('-').toUpperCase()}`,
        name,
        price: productForm.price || 0,
        costPrice: productForm.costPrice || 0,
        stock: 0
      };
    });
    setVariations(newVariations);
  };

  return (
    <div className="space-y-6 pb-20 relative animate-in fade-in duration-500">
      <ConfirmDialog 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        onConfirm={() => deleteConfirm && updateState('products', state.products.map(p => p.id === deleteConfirm ? { ...p, isDeleted: true } : p))} 
        title="Move to Recycle Bin?" 
        message="This item will be hidden from the terminal but can be restored from the Recycle Bin if needed." 
        confirmText="Move to Trash" 
        type="warning" 
      />

      {/* Low Stock Alert Banner */}
      {!showOnlyLowStock && lowStockItems.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 rounded-[32px] p-6 flex items-center justify-between animate-in slide-in-from-top-4">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-rose-100 dark:bg-rose-500/20 text-rose-600 rounded-2xl flex items-center justify-center animate-pulse"><AlertTriangle size={28} /></div>
              <div>
                 <h4 className="text-lg font-black text-rose-600 dark:text-rose-400 uppercase tracking-tighter">Inventory Criticality Detected</h4>
                 <p className="text-xs font-bold text-rose-500/70 uppercase tracking-widest">{lowStockItems.length} products have fallen below threshold limits.</p>
              </div>
           </div>
           <button 
             onClick={() => setShowOnlyLowStock(true)}
             className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-rose-700 transition-all flex items-center gap-2"
           >
              Review Alerts <ArrowRight size={14} />
           </button>
        </div>
      )}

      {showOnlyLowStock && (
        <div className="bg-indigo-600 p-8 rounded-[40px] text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                 <AlertTriangle size={20} className="text-amber-400" />
                 <h3 className="text-2xl font-black uppercase tracking-tighter">Priority Restock Queue</h3>
              </div>
              <p className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em] opacity-80">Displaying restricted view of assets requiring procurement</p>
           </div>
           <button 
             onClick={() => setShowOnlyLowStock(false)}
             className="relative z-10 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all"
           >
              Exit Restricted View <X size={16}/>
           </button>
           <Package size={140} className="absolute -bottom-6 -right-6 text-white/10 rotate-12" />
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-3 flex-1 max-w-5xl w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Query catalog..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold dark:text-white transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all shadow-sm ${showOnlyLowStock ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-200'}`}
            >
              <AlertTriangle size={14} />
              <span>{showOnlyLowStock ? 'Show All' : 'Low Stock Only'}</span>
              {lowStockItems.length > 0 && !showOnlyLowStock && (
                <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">{lowStockItems.length}</span>
              )}
            </button>
            <button 
              onClick={() => setIsDiscountModalOpen(true)}
              className="group flex items-center gap-3 px-5 py-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl text-[11px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-100 transition-all shadow-sm"
            >
              <Sparkles size={14} />
              <span>Bulk Discounts</span>
            </button>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}><LayoutGrid size={18} /></button>
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}><List size={18} /></button>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {processedProducts.map((p) => {
            const hasSale = p.salePrice !== undefined;
            const discountPercent = hasSale ? Math.round((1 - p.salePrice! / p.price) * 100) : 0;
            const threshold = p.lowStockThreshold !== undefined ? p.lowStockThreshold : state.settings.lowStockThreshold;
            const isLow = p.stock <= threshold;

            return (
              <div 
                key={p.id} 
                className={`group relative bg-white dark:bg-slate-900 rounded-[36px] overflow-hidden border shadow-sm transition-all hover:shadow-2xl flex flex-col ${isLow ? 'ring-2 ring-rose-500 border-rose-500 shadow-rose-100 dark:shadow-none' : 'border-slate-100 dark:border-slate-800'}`}
              >
                  <div className="relative aspect-square w-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-200">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <Package size={64} strokeWidth={1} />
                    )}
                    
                    {p.variations && p.variations.length > 0 && (
                      <div className="absolute top-4 right-4 bg-indigo-600 text-white p-2 rounded-xl shadow-lg z-10">
                        <Layers size={16} />
                      </div>
                    )}

                    {hasSale && (
                      <div className="absolute top-4 left-4 bg-rose-600 text-white px-3 py-1.5 rounded-xl shadow-lg font-black text-[10px] animate-bounce z-10">
                        -{discountPercent}% OFF
                      </div>
                    )}

                    {isLow && (
                       <div className="absolute inset-0 border-[6px] border-rose-500/20 pointer-events-none rounded-[36px]" />
                    )}

                    {/* Action Overlay */}
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3 z-20">
                       <button 
                        onClick={() => setViewingBarcodeProduct(p)} 
                        className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-2xl hover:scale-110 active:scale-90 transition-all" 
                        title="View Barcode"
                       >
                          <Barcode size={28} />
                       </button>
                       <button 
                        onClick={() => openEditModal(p)} 
                        className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-600 shadow-2xl hover:scale-110 active:scale-90 transition-all" 
                        title="Edit Details"
                       >
                          <Edit2 size={24} />
                       </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{p.category}</p>
                      <p className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter">ID: {p.sku.split('-').pop()}</p>
                    </div>
                    <h4 className="font-black text-slate-800 dark:text-white truncate text-[17px] uppercase leading-tight mb-2">{p.name}</h4>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50 dark:border-slate-800">
                      <div>
                        {hasSale ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 line-through font-bold">{state.settings.currency}{p.price.toLocaleString()}</span>
                            <span className="text-xl font-black text-rose-600">{state.settings.currency}{p.salePrice?.toLocaleString()}</span>
                          </div>
                        ) : (
                          <p className="text-xl font-black text-indigo-600">{state.settings.currency}{p.price.toLocaleString()}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                         <span className={`block text-[10px] font-black uppercase ${isLow ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`}>{p.stock} Units</span>
                         <button 
                           onClick={() => setViewingBarcodeProduct(p)}
                           className="mt-1 flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                         >
                           <Barcode size={14} />
                           <span className="text-[8px] font-black uppercase tracking-widest">Barcode</span>
                         </button>
                      </div>
                    </div>
                    {isLow && (
                       <div className="mt-3 px-3 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 text-[8px] font-black uppercase rounded-lg text-center border border-rose-100 flex items-center justify-center gap-1">
                          <AlertTriangle size={10} /> Restock Required
                       </div>
                    )}
                  </div>
              </div>
            );
          })}
      </div>

      {/* Barcode Viewer Modal */}
      {viewingBarcodeProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col border border-white/10">
              <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Barcode size={24}/></div>
                    <div>
                       <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Asset Identifier</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase truncate max-w-[200px]">{viewingBarcodeProduct.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setViewingBarcodeProduct(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
              </header>
              <div className="p-12 space-y-10 flex flex-col items-center">
                 <div className="p-10 bg-white rounded-[32px] shadow-inner border border-slate-100 flex flex-col items-center group overflow-hidden">
                    <canvas ref={viewerBarcodeCanvasRef}></canvas>
                 </div>
                 <div className="text-center space-y-1">
                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Serial SKU</p>
                    <p className="text-3xl font-black dark:text-white font-mono tracking-[0.2em] uppercase">{viewingBarcodeProduct.sku}</p>
                 </div>
              </div>
              <footer className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
                 <button 
                  onClick={() => handlePrintLabel(viewingBarcodeProduct)} 
                  className="flex-1 py-5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                 >
                   <Printer size={16}/> Print
                 </button>
                 <button 
                  onClick={() => handleDownloadLabel(viewingBarcodeProduct)} 
                  disabled={isExportingLabel}
                  className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95"
                 >
                   {isExportingLabel ? <RefreshCw size={16} className="animate-spin"/> : <FileDown size={16}/>}
                   Download PDF Label
                 </button>
              </footer>
           </div>
        </div>
      )}

      {/* Bulk Discount Modal */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col">
              <header className="p-8 border-b flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-lg"><Percent size={24}/></div>
                    <div>
                       <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Promotional Studio</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase">Apply mass inventory discounts</p>
                    </div>
                 </div>
                 <button onClick={() => setIsDiscountModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400"><X size={24}/></button>
              </header>
              <div className="p-10 space-y-8">
                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Inventory Scope</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => setDiscountScope('all')} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${discountScope === 'all' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}>All Products</button>
                       <button onClick={() => setDiscountScope('category')} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${discountScope === 'category' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}>Specific Category</button>
                    </div>
                    {discountScope === 'category' && (
                       <select value={targetCategory} onChange={e => setTargetCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-4 px-6 font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-500">
                          <option value="">Select Category...</option>
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    )}
                 </div>
                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discount Magnitude</label>
                    <div className="flex gap-4">
                       <div className="flex-1 relative">
                          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                             {discountType === 'percent' ? <Percent size={20}/> : <DollarSign size={20}/>}
                          </div>
                          <input 
                            type="number" 
                            value={discountValue}
                            onChange={e => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-800 rounded-3xl py-5 pl-14 pr-6 font-black text-3xl outline-none border-2 border-transparent focus:border-amber-500"
                            placeholder="0"
                          />
                       </div>
                       <div className="flex flex-col gap-2">
                          <button onClick={() => setDiscountType('percent')} className={`px-6 flex-1 rounded-xl font-black text-xs border-2 ${discountType === 'percent' ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-100 text-slate-400'}`}>%</button>
                          <button onClick={() => setDiscountType('fixed')} className={`px-6 flex-1 rounded-xl font-black text-xs border-2 ${discountType === 'fixed' ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-100 text-slate-400'}`}>{state.settings.currency}</button>
                       </div>
                    </div>
                 </div>
                 <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm"><TrendingDown size={20}/></div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">This will calculate and set a "Sale Price" for every item in scope. Original prices remain unchanged for reversal.</p>
                 </div>
              </div>
              <footer className="p-8 border-t bg-slate-50 dark:bg-slate-900 flex gap-4">
                 <button onClick={() => applyBulkDiscount(true)} className="flex-1 py-5 bg-white dark:bg-slate-800 text-rose-500 border border-rose-100 dark:border-rose-900/30 rounded-[32px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"><Ban size={14}/> Reset All</button>
                 <button onClick={() => applyBulkDiscount(false)} className="flex-[2] py-5 bg-indigo-600 text-white rounded-[32px] font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"><RefreshCw size={14}/> Execute Campaign</button>
              </footer>
           </div>
        </div>
      )}

      {/* PRODUCT ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-6xl h-full max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-500">
              
              <header className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-30 shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-[26px] flex items-center justify-center shadow-2xl shadow-indigo-200 dark:shadow-none animate-pulse">
                      <Zap size={32} fill="white" />
                    </div>
                    <div>
                       <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter leading-none">{editingProduct ? 'Re-Engineer Asset' : 'Blueprint New Product'}</h3>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Sarvari Seller Pro Catalog Core</p>
                    </div>
                 </div>
                 <button onClick={resetForm} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-3xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-90"><X size={28}/></button>
              </header>

              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12">
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    
                    {/* Visual & Identity Column */}
                    <div className="lg:col-span-4 space-y-10">
                       <div className="space-y-4">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Visual Asset</label>
                          <div 
                            onClick={() => fileInputRef.current?.click()} 
                            className="aspect-square w-full rounded-[48px] bg-slate-50 dark:bg-slate-950 border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer group overflow-hidden relative shadow-inner transition-all hover:border-indigo-400"
                          >
                             {imagePreview ? (
                               <img src={imagePreview} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                             ) : (
                               <div className="text-slate-300 text-center flex flex-col items-center gap-4">
                                 <ImageIcon size={64} strokeWidth={1} className="group-hover:text-indigo-400 transition-colors" />
                                 <p className="text-[10px] font-black uppercase tracking-[0.2em]">Capture Product Photo</p>
                               </div>
                             )}
                             <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => {
                               const file = e.target.files?.[0];
                               if (file) {
                                   const reader = new FileReader();
                                   reader.onloadend = () => setImagePreview(reader.result as string);
                                   reader.readAsDataURL(file);
                               }
                             }} />
                          </div>
                       </div>

                       <div className="p-10 bg-slate-50 dark:bg-slate-950 rounded-[48px] border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-6">
                          <div className="flex items-center gap-3 w-full">
                             <Hash size={16} className="text-indigo-600" />
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Serial Identifier</p>
                          </div>
                          <div className="bg-white p-10 rounded-[36px] shadow-2xl border border-slate-100 group-hover:scale-105 transition-transform duration-500 w-full text-center">
                             <p className="text-2xl font-black text-indigo-600 font-mono tracking-[0.2em] uppercase">{productForm.sku}</p>
                          </div>
                          <div className="text-center">
                             <button onClick={() => setProductForm({...productForm, sku: generateSKU()})} className="px-6 py-3 bg-white dark:bg-slate-800 rounded-2xl text-[10px] font-black text-indigo-600 uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center gap-3 mx-auto">
                                <RefreshCw size={14} /> Re-Generate ID
                             </button>
                             <p className="text-[9px] text-slate-400 font-bold uppercase mt-4">Barcodes are available in the catalog</p>
                          </div>
                       </div>
                    </div>

                    {/* Specification Column */}
                    <div className="lg:col-span-8 space-y-10">
                       <section className="space-y-6">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600"><Tag size={16}/></div>
                             <h4 className="text-sm font-black dark:text-white uppercase tracking-widest">Identity Spec</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Commercial Label</label>
                                <input 
                                  type="text" 
                                  value={productForm.name || ''} 
                                  onChange={e => setProductForm({...productForm, name: e.target.value})} 
                                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-[28px] py-5 px-8 font-black text-lg dark:text-white outline-none shadow-sm transition-all" 
                                  placeholder="e.g. ULTRA-TECH WIRELESS HUB" 
                                />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Catalog Segment</label>
                                <div className="relative">
                                  <input 
                                    type="text" 
                                    value={productForm.category || ''} 
                                    onChange={e => setProductForm({...productForm, category: e.target.value})} 
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-[24px] py-4 px-6 font-bold text-sm dark:text-white outline-none" 
                                    placeholder="Electronics" 
                                  />
                                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                                </div>
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Stock Inventory</label>
                                <div className="relative">
                                   <input 
                                     type="number" 
                                     value={productForm.stock || ''} 
                                     onChange={e => setProductForm({...productForm, stock: Number(e.target.value)})} 
                                     className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-[24px] py-4 px-6 font-black text-lg dark:text-white outline-none" 
                                   />
                                   <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px] uppercase">Units</div>
                                </div>
                             </div>
                          </div>
                       </section>

                       <section className="p-10 bg-slate-50 dark:bg-slate-950 rounded-[56px] border border-slate-100 dark:border-slate-800 space-y-8">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600"><Wallet size={16}/></div>
                                <h4 className="text-sm font-black dark:text-white uppercase tracking-widest">Fiscal Engineering</h4>
                             </div>
                             <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Enable Multi-Var</span>
                                <button onClick={() => setShowVariations(!showVariations)} className={`w-12 h-6 rounded-full relative transition-all ${showVariations ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showVariations ? 'left-7' : 'left-1'}`} /></button>
                             </div>
                          </div>
                          
                          {!showVariations ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-4">
                                <div className="group">
                                   <label className="block text-[10px] font-black text-rose-500 uppercase mb-3 ml-2 flex items-center gap-2">
                                      <TrendingDown size={14}/> Buy Price (Net Cost)
                                   </label>
                                   <div className="relative">
                                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-slate-300">{state.settings.currency}</span>
                                      <input 
                                        type="number" 
                                        value={productForm.costPrice || ''} 
                                        onChange={e => setProductForm({...productForm, costPrice: Number(e.target.value)})} 
                                        className="w-full bg-white dark:bg-slate-900 border-4 border-transparent focus:border-rose-500 rounded-[32px] py-6 pl-14 pr-8 font-black text-4xl text-rose-600 outline-none shadow-2xl transition-all" 
                                        placeholder="0.00"
                                      />
                                   </div>
                                </div>
                                <div className="group">
                                   <label className="block text-[10px] font-black text-emerald-500 uppercase mb-3 ml-2 flex items-center gap-2">
                                      <TrendingUp size={14}/> Sell Price (Retail)
                                   </label>
                                   <div className="relative">
                                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-slate-300">{state.settings.currency}</span>
                                      <input 
                                        type="number" 
                                        value={productForm.price || ''} 
                                        onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} 
                                        className="w-full bg-white dark:bg-slate-900 border-4 border-transparent focus:border-emerald-500 rounded-[32px] py-6 pl-14 pr-8 font-black text-4xl text-emerald-600 outline-none shadow-2xl transition-all" 
                                        placeholder="0.00"
                                      />
                                   </div>
                                </div>
                             </div>
                          ) : (
                             <div className="space-y-8 animate-in slide-in-from-right">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                   {options.length < 3 && (
                                     <button onClick={() => setOptions([...options, { name: '', values: [] }])} className="py-5 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[28px] text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center justify-center gap-3"><Plus size={18}/> Add Attribute Group</button>
                                   )}
                                   {options.length > 0 && (
                                     <button onClick={generateVariations} className="py-5 bg-indigo-600 text-white rounded-[28px] font-black text-[10px] uppercase shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-3 transition-all hover:bg-indigo-700 active:scale-95"><Wand2 size={18}/> Synthesize Matrix</button>
                                   )}
                                </div>
                                <div className="space-y-4">
                                   {options.map((opt, i) => (
                                     <div key={i} className="p-6 bg-white dark:bg-slate-900 rounded-[32px] border flex items-center gap-6 relative group animate-in slide-in-from-left">
                                        <button onClick={() => setOptions(options.filter((_, idx) => idx !== i))} className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-rose-600 transition-all"><X size={16}/></button>
                                        <div className="w-1/3">
                                          <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-2">Property Name</label>
                                          <input type="text" value={opt.name} onChange={e => setOptions(options.map((o, idx) => idx === i ? {...o, name: e.target.value} : o))} placeholder="e.g. Size" className="w-full bg-slate-50 dark:bg-slate-950 rounded-xl py-3 px-4 font-black text-[11px] uppercase dark:text-white outline-none" />
                                        </div>
                                        <div className="flex-1">
                                          <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-2">Attribute Values (Comma Delimited)</label>
                                          <input type="text" value={opt.values.join(', ')} onChange={e => setOptions(options.map((o, idx) => idx === i ? {...o, values: e.target.value.split(',').map(v => v.trim())} : o))} placeholder="Small, Medium, Large..." className="w-full bg-slate-50 dark:bg-slate-950 rounded-xl py-3 px-4 text-xs font-bold dark:text-white outline-none" />
                                        </div>
                                     </div>
                                   ))}
                                </div>
                                {variations.length > 0 && (
                                  <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Variation Ledger ({variations.length} Items)</p>
                                     {variations.map((v, i) => (
                                        <div key={i} className="p-6 bg-white dark:bg-slate-900 border rounded-[32px] grid grid-cols-12 gap-4 items-center hover:border-indigo-300 transition-all shadow-sm">
                                           <div className="col-span-3">
                                              <p className="text-[11px] font-black dark:text-white truncate uppercase">{v.name}</p>
                                              <p className="text-[8px] font-bold text-slate-400 truncate uppercase mt-1">{v.sku}</p>
                                           </div>
                                           <div className="col-span-3">
                                              <p className="text-[7px] font-black text-rose-400 uppercase mb-1 ml-1">Buy</p>
                                              <input type="number" value={v.costPrice} onChange={e => setVariations(variations.map((val, idx) => idx === i ? {...val, costPrice: Number(e.target.value)} : val))} className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl py-2 px-3 text-[11px] font-black text-rose-500" />
                                           </div>
                                           <div className="col-span-3">
                                              <p className="text-[7px] font-black text-emerald-400 uppercase mb-1 ml-1">Sell</p>
                                              <input type="number" value={v.price} onChange={e => setVariations(variations.map((val, idx) => idx === i ? {...val, price: Number(e.target.value)} : val))} className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl py-2 px-3 text-[11px] font-black text-emerald-500" />
                                           </div>
                                           <div className="col-span-3">
                                              <p className="text-[7px] font-black text-indigo-400 uppercase mb-1 ml-1">Stock</p>
                                              <input type="number" value={v.stock} onChange={e => setVariations(variations.map((val, idx) => idx === i ? {...val, stock: Number(e.target.value)} : val))} className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl py-2 px-3 text-[11px] font-black dark:text-white" />
                                           </div>
                                        </div>
                                     ))}
                                  </div>
                                )}
                             </div>
                          )}
                       </section>
                    </div>
                 </div>
              </div>

              <footer className="p-10 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-30 shrink-0 flex gap-6">
                 <button onClick={resetForm} className="flex-1 py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-slate-200 active:scale-95">Discard Blueprint</button>
                 <button onClick={handleSaveProduct} className="flex-[2] py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-4 transition-all hover:bg-indigo-700 active:scale-95">
                    <CheckCircle2 size={24}/> {editingProduct ? 'Commit Changes' : 'Initialize Asset'}
                 </button>
              </footer>
           </div>
        </div>
      )}
    </div>
  );
};

export default Products;
