import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, Eye } from 'lucide-react';

interface Product {
  sku: string;
  name: string;
  vendor?: string;
  category: string;
  description: string;
  price: number;
  cost_price: number;
  stock_level: number;
  reorder_point: number;
  reserved_qty?: number;
  free_to_use_qty?: number;
  procure_on_demand?: boolean;
  procurement_type?: string;
  procurement_strategy?: string;
  bom_id?: number;
  bom_name?: string;
}

const STANDARD_CATEGORIES = ['Electronics', 'Memory', 'Chassis', 'Raw Materials', 'Components', 'Finished Goods'];

export const Products: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [stockLevel, setStockLevel] = useState(0);
  const [reorderPoint, setReorderPoint] = useState(10);
  const [procureOnDemand, setProcureOnDemand] = useState(false);
  const [procurementType, setProcurementType] = useState('Vendor');
  const [procurementStrategy, setProcurementStrategy] = useState('MTS');
  const [boms, setBoms] = useState<any[]>([]);
  const [bomId, setBomId] = useState<number | ''>('');

  const handleStrategyChange = (strategy: string) => {
    setProcurementStrategy(strategy);
    if (strategy === 'MTS') {
      setProcureOnDemand(false);
      setProcurementType('Vendor');
      setVendor('');
      setBomId('');
    } else {
      setProcureOnDemand(true);
    }
  };

  const handleProcurementTypeChange = (type: string) => {
    setProcurementType(type);
    if (type === 'Vendor') {
      setBomId('');
    } else if (type === 'BOM') {
      setVendor('');
    }
  };

  const isAdmin = user?.role === 'Admin';
  const isModalReadOnly = isEdit ? !isAdmin : false;

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
      setFilteredProducts(response.data);
      // Extract unique categories
      const cats: string[] = Array.from(new Set(response.data.map((p: Product) => p.category || 'Uncategorized')));
      setCategories(cats);

      try {
        const bomsRes = await axios.get('/api/bom');
        setBoms(bomsRes.data);
      } catch (err) {
        console.error('Error fetching BOMs:', err);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // Populate placeholder mock products for preview
      const mock: Product[] = [
        { sku: 'PROD-001', name: 'Executive Office Desk', vendor: 'UrbanWood Vendors', category: 'Finished Goods', description: 'Demo finished item', price: 18500, cost_price: 11200, stock_level: 8, reorder_point: 10, procurement_type: 'BOM', procure_on_demand: true },
        { sku: 'PROD-002', name: 'Modular Bookshelf', vendor: 'UrbanWood Vendors', category: 'Finished Goods', description: 'Demo finished item', price: 12200, cost_price: 7600, stock_level: 0, reorder_point: 10, procurement_type: 'BOM', procure_on_demand: true },
        { sku: 'COMP-001', name: 'Teak Wood Panel', vendor: 'Kaveri Timber Depot', category: 'Raw Materials', description: 'Demo component', price: 2400, cost_price: 1700, stock_level: 34, reorder_point: 10, procurement_type: 'Vendor' },
        { sku: 'COMP-002', name: 'Steel Bracket Set', vendor: 'Metro Hardware', category: 'Components', description: 'Demo component', price: 420, cost_price: 260, stock_level: 55, reorder_point: 10, procurement_type: 'Vendor' },
      ];
      setProducts(mock);
      setFilteredProducts(mock);
      setCategories(['Electronics', 'Memory', 'Chassis']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    let result = products;

    if (search.trim() !== '') {
      result = result.filter(
        p => p.name.toLowerCase().includes(search.toLowerCase()) || 
             (p.vendor || '').toLowerCase().includes(search.toLowerCase())
      );
    }

    if (categoryFilter !== '') {
      result = result.filter(p => (p.category || 'Uncategorized') === categoryFilter);
    }

    setFilteredProducts(result);
  }, [search, categoryFilter, products]);

  const handleOpenCreate = () => {
    setIsEdit(false);
    // Autogenerate a stable internal product code.
    let generatedSku = '';
    const existingSkus = new Set(products.map(p => p.sku));
    do {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      generatedSku = `PROD-${randNum}`;
    } while (existingSkus.has(generatedSku));

    setSku(generatedSku);
    setName('');
    setCategory('');
    setVendor('');
    setDescription('');
    setPrice(0);
    setCostPrice(0);
    setStockLevel(0);
    setReorderPoint(10); // Automated default value
    setProcurementStrategy('MTS');
    setProcureOnDemand(false);
    setProcurementType('Vendor');
    setBomId('');
    setShowModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setIsEdit(true);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category || '');
    setVendor(p.vendor || '');
    setDescription(p.description || '');
    setPrice(p.price);
    setCostPrice(p.cost_price || 0);
    setStockLevel(p.stock_level);
    setReorderPoint(p.reorder_point);
    setProcurementStrategy(p.procurement_strategy || (p.procure_on_demand ? 'MTO' : 'MTS'));
    setProcureOnDemand(p.procure_on_demand || false);
    setProcurementType(p.procurement_type === 'Purchase' ? 'Vendor' : p.procurement_type === 'Manufacturing' ? 'BOM' : (p.procurement_type || 'Vendor'));
    setBomId(p.bom_id || '');
    setShowModal(true);
  };

  const handleDelete = async (targetSku: string) => {
    if (!window.confirm(`Are you sure you want to delete product ${targetSku}?`)) return;
    try {
      await axios.delete(`/api/products/${targetSku}`);
      fetchProducts();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete product.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (procurementStrategy === 'MTO') {
      if (procurementType === 'Vendor' && !vendor.trim()) {
        alert('Vendor is required for MTO Purchase strategy.');
        return;
      }
      if (procurementType === 'BOM' && !bomId) {
        alert('Bill of Materials (BoM) is required for MTO Manufacturing strategy.');
        return;
      }
    }

    const payload = {
      sku,
      name,
      category,
      description,
      price,
      cost_price: costPrice,
      stock_level: stockLevel,
      reorder_point: reorderPoint,
      procurement_strategy: procurementStrategy,
      procure_on_demand: procurementStrategy === 'MTO' ? procureOnDemand : false,
      procurement_type: procurementStrategy === 'MTO' ? (procurementType === 'Vendor' ? 'Purchase' : 'Manufacturing') : null,
      vendor: procurementStrategy === 'MTO' && procurementType === 'Vendor' ? vendor : null,
      bom_id: procurementStrategy === 'MTO' && procurementType === 'BOM' ? (bomId || null) : null
    };

    try {
      if (isEdit) {
        await axios.put(`/api/products/${sku}`, payload);
      } else {
        await axios.post('/api/products', payload);
      }
      setShowModal(false);
      fetchProducts();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save product details.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Catalog</h1>
          <p style={{ color: 'var(--text-secondary)' }}>View and manage warehouse product specifications and inventory stocks.</p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} />
          Create Product
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexGrow: 1, maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search by product or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label>Category Filter:</label>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ minWidth: '160px' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--primary)', padding: '3rem' }}>
          Querying product catalog...
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Vendor / BOM</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Sales Price</th>
                <th style={{ textAlign: 'right' }}>Cost Price</th>
                <th style={{ textAlign: 'right' }}>On Hand</th>
                <th style={{ textAlign: 'right' }}>Reserved Demand</th>
                <th style={{ textAlign: 'right' }}>Free to Use</th>
                <th style={{ textAlign: 'center' }}>MTO Auto</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const isLowStock = p.stock_level <= p.reorder_point;
                return (
                  <tr key={p.sku}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.procurement_type === 'BOM' || p.procurement_type === 'Manufacturing' ? <span className="badge badge-production">BOM</span> : (p.vendor || <span style={{ color: 'var(--text-tertiary)' }}>Vendor pending</span>)}</td>
                    <td><span className="badge badge-viewer">{p.category || 'Uncategorized'}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{parseFloat(p.price as any).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>₹{parseFloat(p.cost_price as any || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      <span style={{ 
                        color: isLowStock ? 'var(--danger-text)' : 'inherit',
                        backgroundColor: isLowStock ? 'var(--danger-bg)' : 'transparent',
                        padding: isLowStock ? '0.2rem 0.5rem' : '0',
                        borderRadius: isLowStock ? '4px' : '0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {isLowStock && <AlertTriangle size={14} />}
                        {p.stock_level <= 0 ? 'Out of Stock' : p.stock_level}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{p.reserved_qty || 0}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{p.free_to_use_qty ?? p.stock_level}</td>
                    <td style={{ textAlign: 'center' }}>
                      {p.procure_on_demand ? (
                        <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                          MTO ({p.procurement_type === 'Manufacturing' ? 'BOM' : p.procurement_type === 'Purchase' ? 'Vendor' : p.procurement_type})
                        </span>
                      ) : (
                        <span className="badge badge-viewer" style={{ fontSize: '0.75rem' }}>
                          Stock
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button onClick={() => handleOpenEdit(p)} className="btn btn-secondary btn-icon" title={isAdmin ? "Edit product information" : "View product information"}>
                          {isAdmin ? <Edit2 size={14} /> : <Eye size={14} />}
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(p.sku)} className="btn btn-secondary btn-icon" style={{ color: 'var(--danger-text)' }} title="Delete product">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No products matching search parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE/EDIT MODAL OVERLAY */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: '1.4rem' }}>
                {isEdit ? 'Edit Product Details' : 'Create Product'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-icon">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <fieldset disabled={isModalReadOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="modal-sku">Product Code</label>
                    <input
                      id="modal-sku"
                      type="text"
                      required
                      disabled
                      value={sku}
                      style={{ background: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                      placeholder="Autogenerated code"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="modal-name">Product Name</label>
                    <input
                      id="modal-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Copper Wire spool"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="modal-category">Category</label>
                    <select
                      id="modal-category"
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">-- Choose Category --</option>
                      {STANDARD_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="modal-price">Sales Price (₹)</label>
                    <input
                      id="modal-price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="modal-cost-price">Cost Price (₹)</label>
                    <input
                      id="modal-cost-price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={costPrice}
                      onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Procurement Strategy Radio Buttons */}
                <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--primary)' }}>Procurement Strategy</label>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="procure_strategy"
                        checked={procurementStrategy === 'MTS'}
                        onChange={() => handleStrategyChange('MTS')}
                      />
                      Make to Stock (MTS)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="procure_strategy"
                        checked={procurementStrategy === 'MTO'}
                        onChange={() => handleStrategyChange('MTO')}
                      />
                      Make to Order (MTO)
                    </label>
                  </div>
                </div>

                {/* MTS Specific Fields */}
                {procurementStrategy === 'MTS' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="modal-stock">Current Stock Level</label>
                      <input
                        id="modal-stock"
                        type="number"
                        min="0"
                        required
                        value={stockLevel}
                        onChange={(e) => setStockLevel(parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="modal-reorder">Minimum Stock Level</label>
                      <input
                        id="modal-reorder"
                        type="number"
                        min="0"
                        required
                        value={reorderPoint}
                        onChange={(e) => setReorderPoint(parseInt(e.target.value) || 0)}
                        placeholder="10"
                      />
                    </div>
                  </div>
                )}

                {/* MTO Specific Fields */}
                {procurementStrategy === 'MTO' && (
                  <>
                    <div className="form-row" style={{ alignItems: 'center' }}>
                      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <input
                          id="modal-mto"
                          type="checkbox"
                          checked={procureOnDemand}
                          onChange={(e) => setProcureOnDemand(e.target.checked)}
                          style={{ width: 'auto', cursor: 'pointer' }}
                        />
                        <label htmlFor="modal-mto" style={{ cursor: 'pointer', margin: 0 }}>Procure on Demand</label>
                      </div>

                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label htmlFor="modal-procurement-type">Procurement Type</label>
                        <select
                          id="modal-procurement-type"
                          required
                          value={procurementType}
                          onChange={(e) => handleProcurementTypeChange(e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="Vendor">Purchase</option>
                          <option value="BOM">Manufacturing</option>
                        </select>
                      </div>
                    </div>

                    {procurementType === 'Vendor' && (
                      <div className="form-group">
                        <label htmlFor="modal-vendor">Vendor</label>
                        <input
                          id="modal-vendor"
                          type="text"
                          required
                          value={vendor}
                          onChange={(e) => setVendor(e.target.value)}
                          placeholder="e.g. Crucial Distribution"
                        />
                      </div>
                    )}

                    {procurementType === 'BOM' && (
                      <div className="form-group">
                        <label htmlFor="modal-bom">Bill of Materials (BoM)</label>
                        <select
                          id="modal-bom"
                          required
                          value={bomId}
                          onChange={(e) => setBomId(parseInt(e.target.value) || '')}
                          style={{ width: '100%' }}
                        >
                          <option value="">-- Choose BOM --</option>
                          {boms.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.product_sku})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="modal-desc">Description</label>
                  <textarea
                    id="modal-desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Details about product characteristics..."
                  />
                </div>
              </fieldset>

              {!isModalReadOnly && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isModalReadOnly}>
                    {isEdit ? 'Save Changes' : 'Add Product'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
