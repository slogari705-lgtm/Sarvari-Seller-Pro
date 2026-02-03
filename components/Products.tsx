import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package,
  X,
  Image as ImageIcon,
  Printer,
  Barcode,
  LayoutGrid,
  List,
  FileDown,
  RefreshCw,
  TrendingDown,
  CheckCircle2,
  PackagePlus,
  ArrowUpDown,
  Layers,
  Tag
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

  useEffect(() => {
    if (isModalOpen && !editingProduct && !productForm.sku) {
      setProductForm(prev => ({ ...prev, sku: generateSKU() }));
    }
  }, [isModalOpen, editingProduct]);

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
    JsBarcode(exportCanvas, product.sku, { format: "CODE128", width: 3, height: 120, displayValue: true, fontSize: 20, margin: 10 });
    
    await new Promise(r => setTimeout(r, 400));
    try {
      const canvas = await html2canvas(container, { scale: 3, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: [80, 50] });
      pdf.addImage(imgData, 'PNG', 0, 0, 80, 50);
      pdf.save(`LABEL_${product.sku}.pdf`);
    } catch (e) { console.error(e); } finally { container.innerHTML = ''; setIsExportingLabel(false); }
  };

  const handleSaveProduct = () => {
    if (!productForm.name) return;
    const finalPrice = Number(productForm.price) || 0;
    const totalStock = Number(productForm.stock) || 0;
    const finalSku = productForm.sku?.trim() || generateSKU();
    
    if (editingProduct) {
      updateState('products', state.products.map(p => p.id === editingProduct.id ? { ...p, ...productForm, price: finalPrice, stock: totalStock, sku: finalSku, image: imagePreview || undefined } as Product : p));
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
        isDeleted: false 
      };
      updateState('products', [...state.products, product]);
    }
    resetForm();
  };

  const resetForm = () => {
    setEditingProduct(null);
    setProductForm({ category: 'General', price: 0, costPrice: 0, stock: 0, sku: '', isFavorite: false, lowStockThreshold: state.settings.lowStockThreshold });
    setImagePreview(null); setIsModalOpen(false);
  };

  const activeProducts = useMemo(() => state.products.filter(p => !p.isDeleted), [state.products]);

  const processedProducts = useMemo(() => {
    let result = activeProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const isLow = p.stock <= (p.lowStockThreshold ?? state.settings.lowStockThreshold);
      return showOnlyLowStock ? (matchesSearch && isLow) : matchesSearch;
    });

    result.sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      const modifier = sortConfig.order === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return modifier * aVal.localeCompare(bVal);
      }
      return modifier * ((aVal as number) - (bVal as number));
    });
    return result;
  }, [activeProducts, searchTerm, showOnlyLowStock, sortConfig, state.settings.lowStockThreshold]);

  const toggleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <ConfirmDialog 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        onConfirm={() => deleteConfirm && updateState('products', state.products.map(p => p.id === deleteConfirm ? { ...p, isDeleted: true } : p))} 
        title="Move to Trash?" 
        message="Product will be hidden from the terminal but can be restored later." 
        confirmText="Confirm Delete" 
        type="warning" 
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search inventory..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-6 outline-none text-sm dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowOnlyLowStock(!showOnlyLowStock)} 
            className={`px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase border transition-all flex items-center gap-2 ${showOnlyLowStock ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white dark:bg-slate-900 text-slate-400'}`}
          >
            <TrendingDown size={14}/> Low Stock
          </button>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus size={18}/> New Product
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex gap-4">
           {['name', 'price', 'stock'].map(key => (
             <button 
               key={key} 
               onClick={() => toggleSort(key as SortKey)} 
               className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${sortConfig.key === key ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
             >
               {key} <ArrowUpDown size={10} />
             </button>
           ))}
        </div>
        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border dark:border-slate-800">
           <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><LayoutGrid size={18}/></button>
           <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><List size={18}/></button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {processedProducts.map(p => (
            <div key={p.id} className="group bg-white dark:bg-slate-900 p-4 rounded-[40px] border border-slate-100 dark:border-slate-800 hover:border-indigo-400 transition-all shadow-sm hover:shadow-xl relative flex flex-col">
              <div className="w-full aspect-square rounded-[32px] bg-slate-50 dark:bg-slate-800 mb-4 overflow-hidden flex items-center justify-center text-slate-200 relative">
                {p.image ? <img src={p.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <Package size={48} strokeWidth={1}/>}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                   <button onClick={() => { setEditingProduct(p); setProductForm(p); setImagePreview(p.image || null); setIsModalOpen(true); }} className="p-3 bg-white text-indigo-600 rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all"><Edit2 size={18}/></button>
                   <button onClick={() => setViewingBarcodeProduct(p)} className="p-3 bg-white text-slate-800 rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all"><Barcode size={18}/></button>
                   <button onClick={() => setDeleteConfirm(p.id)} className="p-3 bg-white text-rose-600 rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all"><Trash2 size={18}/></button>
                </div>
                {p.stock <= (p.lowStockThreshold ?? state.settings.lowStockThreshold) && (
                  <div className="absolute top-4 left-4 bg-rose-600 text-white px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-tighter shadow-lg animate-pulse">Low Stock</div>
                )}
              </div>
              <div className="px-1 flex-1 flex flex-col">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{p.category}</p>
                <h5 className="font-black text-sm dark:text-white uppercase truncate tracking-tight mb-3">{p.name}</h5>
                <div className="flex items-center justify-between mt-auto">
                  <p className="text-indigo-600 font-black text-lg">{state.settings.currency}{p.price.toLocaleString()}</p>
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${p.stock < 5 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    {p.stock} <span className="text-[7px] uppercase">Qty</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">SKU</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Stock</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {processedProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                          {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package size={18} className="text-slate-300" />}
                       </div>
                       <span className="font-black text-xs dark:text-white uppercase truncate max-w-[200px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4"><span className="text-[10px] font-bold text-slate-400 uppercase">{p.category}</span></td>
                  <td className="px-8 py-4 text-center"><span className="font-mono text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">{p.sku}</span></td>
                  <td className="px-8 py-4 text-center">
                    <span className={`text-[10px] font-black ${p.stock <= (p.lowStockThreshold ?? state.settings.lowStockThreshold) ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}>{p.stock}</span>
                  </td>
                  <td className="px-8 py-4 text-right font-black text-indigo-600">{state.settings.currency}{p.price.toLocaleString()}</td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={() => { setEditingProduct(p); setProductForm(p); setImagePreview(p.image || null); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                       <button onClick={() => setDeleteConfirm(p.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
              <header className="p-10 border-b flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-[28px] flex items-center justify-center shadow-2xl shadow-indigo-200 dark:shadow-none"><PackagePlus size={32}/></div>
                    <div>
                       <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">{editingProduct ? 'Modify Record' : 'Enroll Product'}</h3>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">Registry node at {state.settings.shopName}</p>
                    </div>
                 </div>
                 <button onClick={resetForm} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-all active:scale-90"><X size={28}/></button>
              </header>

              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12">
                 <div className="flex flex-col xl:flex-row gap-12">
                    <div className="xl:w-1/3 flex flex-col items-center">
                       <div 
                         onClick={() => fileInputRef.current?.click()} 
                         className="w-full aspect-square max-w-[280px] rounded-[48px] bg-slate-50 dark:bg-slate-950 border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden group shadow-inner relative transition-all hover:border-indigo-400"
                       >
                          {imagePreview ? (
                            <img src={imagePreview} className="w-full h-full object-cover p-2 rounded-[40px]" />
                          ) : (
                            <div className="flex flex-col items-center text-slate-300">
                              <ImageIcon size={64} strokeWidth={1} />
                              <p className="text-[10px] font-black uppercase mt-4 tracking-widest text-center px-6">Upload Asset Visualization</p>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                       </div>
                    </div>

                    <div className="xl:w-2/3 space-y-10">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="md:col-span-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Label Designation</label>
                             <input type="text" value={productForm.name || ''} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-3xl py-4 px-8 font-black text-xl dark:text-white outline-none shadow-sm" placeholder="Enter product name..." />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Classification</label>
                             <select value={productForm.category || 'General'} onChange={e => setProductForm({...productForm, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-black text-[10px] uppercase dark:text-white outline-none">
                                <option value="General">General</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="New Category">+ New Category</option>
                             </select>
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2">Unique UID / SKU</label>
                             <div className="flex gap-2">
                               <input type="text" value={productForm.sku || ''} onChange={e => setProductForm({...productForm, sku: e.target.value})} className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-6 font-bold text-sm dark:text-white outline-none shadow-inner" placeholder="SKU-XXXX" />
                               <button onClick={() => setProductForm({...productForm, sku: generateSKU()})} className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl hover:text-indigo-600 transition-all"><RefreshCw size={18}/></button>
                             </div>
                          </div>
                          <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[40px] border border-slate-100 dark:border-slate-800 md:col-span-2 grid grid-cols-3 gap-8">
                             <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Buy Price</label>
                                <input type="number" value={productForm.costPrice || ''} onChange={e => setProductForm({...productForm, costPrice: Number(e.target.value)})} className="w-full bg-transparent border-none font-black text-xl text-slate-400 dark:text-slate-500 outline-none" placeholder="0.00" />
                             </div>
                             <div>
                                <label className="block text-[9px] font-black text-indigo-600 uppercase mb-2">Sell Price</label>
                                <input type="number" value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} className="w-full bg-transparent border-none font-black text-2xl text-indigo-600 outline-none" placeholder="0.00" />
                             </div>
                             <div>
                                <label className="block text-[9px] font-black text-emerald-600 uppercase mb-2">Stock Level</label>
                                <input type="number" value={productForm.stock || ''} onChange={e => setProductForm({...productForm, stock: Number(e.target.value)})} className="w-full bg-transparent border-none font-black text-2xl text-emerald-600 outline-none" placeholder="0" />
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <footer className="p-10 border-t bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row gap-4 shrink-0">
                 <button onClick={resetForm} className="flex-1 py-6 bg-white dark:bg-slate-800 text-slate-500 rounded-[32px] font-black text-xs uppercase tracking-widest border border-slate-100 dark:border-slate-700">Discard</button>
                 <button onClick={handleSaveProduct} className="flex-[2] py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-4"><CheckCircle2 size={24}/> {editingProduct ? 'Commit Modification' : 'Finalize Enrollment'}</button>
              </footer>
           </div>
        </div>
      )}

      {viewingBarcodeProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[64px] w-full max-w-lg shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-in zoom-in-95">
              <header className="p-10 pb-6 text-center">
                 <div className="w-20 h-20 bg-indigo-600 text-white rounded-[32px] flex items-center justify-center mx-auto shadow-2xl mb-6"><Barcode size={40} /></div>
                 <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Product Asset Key</h2>
                 <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">SKU Logic: {viewingBarcodeProduct.sku}</p>
              </header>
              <div className="p-10 pt-0 flex flex-col items-center">
                 <div className="bg-white p-10 rounded-[48px] border-4 border-slate-50 shadow-inner w-full flex justify-center">
                    <canvas ref={viewerBarcodeCanvasRef}></canvas>
                 </div>
                 <div className="mt-8 text-center">
                    <h4 className="font-black text-xl uppercase dark:text-white tracking-tight">{viewingBarcodeProduct.name}</h4>
                    <p className="text-indigo-600 font-black text-lg mt-1">{state.settings.currency}{viewingBarcodeProduct.price.toLocaleString()}</p>
                 </div>
              </div>
              <footer className="p-10 border-t bg-slate-50 dark:bg-slate-950 flex flex-col gap-4">
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleDownloadLabel(viewingBarcodeProduct)} disabled={isExportingLabel} className="py-5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-2 rounded-[28px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all">
                       {isExportingLabel ? <RefreshCw size={18} className="animate-spin" /> : <FileDown size={18} />} Export PDF
                    </button>
                    <button onClick={() => window.print()} className="py-5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-2 rounded-[28px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all">
                       <Printer size={18} /> Physical Print
                    </button>
                 </div>
                 <button onClick={() => setViewingBarcodeProduct(null)} className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[32px] font-black text-xs uppercase tracking-[0.3em] active:scale-95 transition-all">Close Viewer</button>
              </footer>
           </div>
        </div>
      )}
    </div>
  );
};

export default Products;