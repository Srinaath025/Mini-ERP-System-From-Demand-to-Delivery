import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Edit2, Trash2, X, PlusCircle, MinusCircle, Eye } from 'lucide-react';

interface Product {
  sku: string;
  name: string;
  price: number;
  reorder_point?: number;
}

interface PurchaseOrderItem {
  id?: number;
  product_sku: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
}

interface PurchaseOrder {
  po_number: string;
  supplier_name: string;
  order_date: string;
  status: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  notes?: string;
  items: PurchaseOrderItem[];
}

export const PurchaseOrders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Form View State
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [poNumber, setPoNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Draft');
  const [taxRate, setTaxRate] = useState(0.05); // Default 5% procurement tax
  const [shipping, setShipping] = useState(30.00); // Default $30 freight shipping
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseOrderItem[]>([
    { product_sku: '', quantity: 1, unit_price: 0 }
  ]);

  const isAdmin = user?.role === 'Admin';
  const isModalReadOnly = isEdit ? !isAdmin : false;

  const fetchData = async () => {
    setLoading(true);
    try {
      const ordersRes = await axios.get('/api/purchases');
      const productsRes = await axios.get('/api/products');
      setOrders(ordersRes.data);
      setFilteredOrders(ordersRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching purchase data:', error);
      // Placeholders
      const mockProds = [
        { sku: 'PROD-001', name: 'Intel Core i9 Processor', price: 450.00 },
        { sku: 'PROD-003', name: 'DDR5 32GB RAM Kit', price: 95.00 },
      ];
      setProducts(mockProds);
      const mockOrders: PurchaseOrder[] = [
        {
          po_number: 'PO-2026-001',
          supplier_name: 'Crucial Distribution',
          order_date: '2026-06-15',
          status: 'Received',
          subtotal: 1900.00,
          tax: 95.00,
          shipping: 40.00,
          total: 2035.00,
          notes: 'Received in good condition.',
          items: [
            { product_sku: 'PROD-003', quantity: 20, unit_price: 95.00 }
          ]
        }
      ];
      setOrders(mockOrders);
      setFilteredOrders(mockOrders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let result = orders;

    if (search.trim() !== '') {
      result = result.filter(
        o => o.supplier_name.toLowerCase().includes(search.toLowerCase()) || 
             o.po_number.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter !== '') {
      result = result.filter(o => o.status === statusFilter);
    }

    setFilteredOrders(result);
  }, [search, statusFilter, orders]);

  // Handlers for dynamic line items
  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const updated = [...items];
    
    if (field === 'quantity') {
      const prod = products.find(p => p.sku === updated[index].product_sku);
      const val = parseInt(value) || 0;
      const reorderLimit = prod?.reorder_point ?? 10;
      if (prod && val > reorderLimit) {
        alert(`Warning: Ordered quantity of ${val} exceeds the automated reorder point of ${reorderLimit} for product ${prod.name}!`);
      }
      updated[index] = {
        ...updated[index],
        quantity: val
      };
    } else if (field === 'product_sku') {
      const prod = products.find(p => p.sku === value);
      updated[index] = {
        ...updated[index],
        product_sku: value,
        // For purchase, we might buy at standard catalogue price or cheaper
        unit_price: prod ? prod.price : 0
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
    }
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, { product_sku: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const calculatedSubtotal = items.reduce((acc, item) => {
    return acc + (item.unit_price * item.quantity);
  }, 0);

  const calculatedTaxAmount = calculatedSubtotal * taxRate;
  const calculatedTotal = calculatedSubtotal + calculatedTaxAmount + shipping;

  const handleOpenCreate = () => {
    setIsEdit(false);
    setPoNumber('');
    setSupplierName('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setStatus('Draft');
    setTaxRate(0.05);
    setShipping(30.00);
    setNotes('');
    setItems([{ product_sku: '', quantity: 1, unit_price: 0 }]);
    setShowModal(true);
  };

  const handleOpenEdit = (order: PurchaseOrder) => {
    setIsEdit(true);
    setPoNumber(order.po_number);
    setSupplierName(order.supplier_name);
    setOrderDate(order.order_date);
    setStatus(order.status);
    setTaxRate(order.subtotal > 0 ? (parseFloat(order.tax as any) / parseFloat(order.subtotal as any)) : 0.05);
    setShipping(parseFloat(order.shipping as any));
    setNotes(order.notes || '');
    setItems(order.items.map(item => ({
      product_sku: item.product_sku,
      quantity: item.quantity,
      unit_price: parseFloat(item.unit_price as any)
    })));
    setShowModal(true);
  };

  const handleDelete = async (num: string) => {
    if (!window.confirm(`Are you sure you want to delete Purchase Order: ${num}?`)) return;
    try {
      await axios.delete(`/api/purchases/${num}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete Purchase Order.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const invalidItem = items.some(item => !item.product_sku || item.quantity <= 0);
    if (invalidItem) {
      alert('Please select a valid product and quantity for all items.');
      return;
    }

    const payload = {
      po_number: poNumber,
      supplier_name: supplierName,
      order_date: orderDate,
      status,
      subtotal: calculatedSubtotal,
      tax: taxRate,
      shipping,
      total: calculatedTotal,
      notes,
      items: items.map(item => ({
        product_sku: item.product_sku,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    };

    try {
      if (isEdit) {
        await axios.put(`/api/purchases/${poNumber}`, payload);
      } else {
        await axios.post('/api/purchases', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save purchase order.');
    }
  };

  const getStatusClass = (st: string) => {
    switch (st) {
      case 'Received': return 'status-received';
      case 'Confirmed': return 'status-confirmed';
      case 'Cancelled': return 'status-cancelled';
      default: return 'status-draft';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Log supplier procurement contracts, record freight costs, and receive warehouse components.</p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} />
          Create Purchase Order
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexGrow: 1, maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search by PO number or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label>Status Filter:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="">All Orders</option>
            <option value="Draft">Draft</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Received">Received</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--primary)', padding: '3rem' }}>
          Loading procurement list...
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier Name</th>
                <th>Order Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Sub Total</th>
                <th style={{ textAlign: 'right' }}>Tax Rate</th>
                <th style={{ textAlign: 'right' }}>Shipping Fee</th>
                <th style={{ textAlign: 'right' }}>Grand Total</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => {
                const derivedTaxRate = o.subtotal > 0 ? (o.tax / o.subtotal) * 100 : 5;
                return (
                  <tr key={o.po_number}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{o.po_number}</td>
                    <td style={{ fontWeight: 600 }}>{o.supplier_name}</td>
                    <td>{o.order_date}</td>
                    <td>
                      <span className={`status-pill ${getStatusClass(o.status)}`}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>₹{parseFloat(o.subtotal as any).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{derivedTaxRate.toFixed(0)}%</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>₹{parseFloat(o.shipping as any).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{parseFloat(o.total as any).toFixed(2)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button onClick={() => handleOpenEdit(o)} className="btn btn-secondary btn-icon" title={isAdmin ? "View / Edit Purchase Order" : "View Purchase Order Details"}>
                                {isAdmin ? <Edit2 size={14} /> : <Eye size={14} />}
                              </button>
                              {isAdmin && (
                                <button onClick={() => handleDelete(o.po_number)} className="btn btn-secondary btn-icon" style={{ color: 'var(--danger-text)' }} title="Delete Purchase Order">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No procurement transactions logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE/EDIT PURCHASE ORDER MODAL OVERLAY */}
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
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ✏️ {isEdit ? 'Edit Purchase Order' : 'Create Purchase Order'}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-icon" title="Close">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ fontSize: '1.2rem', fontWeight: 700, padding: '0.2rem 0.5rem', border: '1px dashed var(--border-color)', borderRadius: '4px', width: 'fit-content', backgroundColor: 'var(--bg-tertiary)' }}>
              {poNumber || '[New Purchase Order]'}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <fieldset disabled={isModalReadOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="form-row">
                {isEdit && (
                  <div className="form-group">
                    <label htmlFor="modal-po-num">Purchase Order Number</label>
                    <input
                      id="modal-po-num"
                      type="text"
                      required
                      disabled
                      value={poNumber}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="modal-supplier">Supplier Name</label>
                  <input
                    id="modal-supplier"
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. Intel Distribution"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="modal-date">Order Date</label>
                  <input
                    id="modal-date"
                    type="date"
                    required
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-status">Order Status</label>
                  <select
                    id="modal-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={!isAdmin}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Received">Received</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.95rem' }}>Purchase Order Items</h3>
                  <button type="button" onClick={handleAddItem} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <PlusCircle size={14} /> Add Row
                  </button>
                </div>

                <div className="table-container" style={{ margin: 0, border: 'none', boxShadow: 'none' }}>
                  <table className="items-editor-table">
                    <thead>
                      <tr>
                        <th>Received Products</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Qty</th>
                        <th style={{ width: '120px', textAlign: 'right' }}>Unit Price (₹)</th>
                        <th style={{ width: '120px', textAlign: 'right' }}>Total (₹)</th>
                        <th style={{ width: '60px', textAlign: 'center' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <select
                              value={item.product_sku}
                              onChange={(e) => handleItemChange(index, 'product_sku', e.target.value)}
                              style={{ width: '100%', padding: '0.4rem' }}
                            >
                              <option value="">-- Choose Product --</option>
                              {products.map(p => (
                                <option key={p.sku} value={p.sku}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                              style={{ width: '100%', padding: '0.4rem', textAlign: 'right' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              style={{ width: '100%', padding: '0.4rem', textAlign: 'right' }}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, paddingRight: '0.75rem' }}>
                            ₹{(item.unit_price * item.quantity).toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              disabled={items.length === 1}
                              className="btn btn-secondary btn-icon"
                              style={{ color: 'var(--danger-text)' }}
                            >
                              <MinusCircle size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoicing Adjustments */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ width: '110px' }}>
                    <label htmlFor="tax-rate">Tax Rate (%)</label>
                    <input
                      id="tax-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={taxRate * 100}
                      onChange={(e) => setTaxRate((parseFloat(e.target.value) || 0) / 100)}
                    />
                  </div>

                  <div className="form-group" style={{ width: '110px' }}>
                    <label htmlFor="shipping-fee">Shipping (₹)</label>
                    <input
                      id="shipping-fee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={shipping}
                      onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Subtotal: <strong>₹{calculatedSubtotal.toFixed(2)}</strong>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Tax: <strong>₹{calculatedTaxAmount.toFixed(2)}</strong>
                  </div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 800, marginTop: '0.25rem' }}>
                    Grand Total: <strong>₹{calculatedTotal.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-notes">Order Notes</label>
                <textarea
                  id="modal-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Terms of delivery, payment receipts..."
                />
              </div>
            </fieldset>

              {!isModalReadOnly && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isModalReadOnly}>
                    {isEdit ? 'Save Changes' : 'Record Purchase'}
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
