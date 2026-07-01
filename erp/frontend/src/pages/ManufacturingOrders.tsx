import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Edit2, Trash2, X, PlusCircle, MinusCircle, Eye } from 'lucide-react';

interface Product {
  sku: string;
  name: string;
  stock_level: number;
  reorder_point?: number;
}

interface MOComponent {
  id?: number;
  component_sku: string;
  required_qty: number;
  unit: string;
  status?: string;
}

interface ManufacturingOrder {
  mo_number: string;
  product_sku: string;
  quantity: number;
  start_date: string;
  end_date?: string;
  status: string;
  notes?: string;
  components: MOComponent[];
}

export const ManufacturingOrders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ManufacturingOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [moNumber, setMoNumber] = useState('');
  const [productSku, setProductSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Draft');
  const [useBom, setUseBom] = useState(true);
  const [notes, setNotes] = useState('');
  const [components, setComponents] = useState<MOComponent[]>([
    { component_sku: '', required_qty: 1, unit: 'units' }
  ]);

  const isAdmin = user?.role === 'Admin';
  const isModalReadOnly = isEdit ? !isAdmin : false;

  const fetchData = async () => {
    setLoading(true);
    try {
      const ordersRes = await axios.get('/api/manufacturing');
      const productsRes = await axios.get('/api/products');
      setOrders(ordersRes.data);
      setFilteredOrders(ordersRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching manufacturing data:', error);
      const mockProds = [
        { sku: 'PROD-001', name: 'Intel Core i9 Processor', stock_level: 12 },
        { sku: 'PROD-002', name: 'Nvidia RTX 5080 GPU', stock_level: 3 },
        { sku: 'COMP-001', name: 'Silicon Wafer Grade A', stock_level: 100 },
        { sku: 'COMP-002', name: 'Copper Heat Pipe 8mm', stock_level: 50 }
      ];
      setProducts(mockProds);
      const mockOrders: ManufacturingOrder[] = [
        {
          mo_number: 'MO-2026-001',
          product_sku: 'PROD-001',
          quantity: 10,
          start_date: '2026-06-19',
          end_date: '2026-06-20',
          status: 'Completed',
          notes: 'Completed without defects.',
          components: [
            { component_sku: 'COMP-001', required_qty: 10, unit: 'units', status: 'Issued' },
            { component_sku: 'COMP-002', required_qty: 20, unit: 'units', status: 'Issued' }
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
        o => (products.find(p => p.sku === o.product_sku)?.name || o.product_sku).toLowerCase().includes(search.toLowerCase()) ||
             o.mo_number.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter !== '') {
      result = result.filter(o => o.status === statusFilter);
    }
    setFilteredOrders(result);
  }, [search, statusFilter, orders, products]);

  useEffect(() => {
    if (!isEdit && productSku && useBom) {
      const fetchBom = async () => {
        try {
          const res = await axios.get(`/api/bom/product/${productSku}`);
          if (res.data && res.data.components && res.data.components.length > 0) {
            const newComps = res.data.components.map((c: any) => ({
              component_sku: c.component_sku,
              required_qty: parseFloat(c.quantity) * quantity,
              unit: 'units',
              status: 'Pending'
            }));
            setComponents(newComps);
          }
        } catch (e) {
          console.log('No BOM configuration found for product', productSku);
        }
      };
      fetchBom();
    }
  }, [productSku, quantity, isEdit, useBom]);

  const handleComponentChange = (index: number, field: keyof MOComponent, value: any) => {
    const updated = [...components];
    if (field === 'required_qty') {
      const prod = products.find(p => p.sku === updated[index].component_sku);
      const val = parseFloat(value) || 0;
      const reorderLimit = prod?.reorder_point ?? 10;
      if (prod && val > reorderLimit) {
        alert(`Warning: Component quantity of ${val} exceeds the automated reorder point of ${reorderLimit} for product ${prod.name}!`);
      }
      updated[index] = { ...updated[index], required_qty: val };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setComponents(updated);
  };

  const handleAddComponent = () => {
    setComponents([...components, { component_sku: '', required_qty: 1, unit: 'units', status: 'Pending' }]);
  };

  const handleRemoveComponent = (index: number) => {
    if (components.length === 1) return;
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleOpenCreate = () => {
    setIsEdit(false);
    setMoNumber('');
    setProductSku('');
    setQuantity(1);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setStatus('Draft');
    setUseBom(true);
    setNotes('');
    setComponents([{ component_sku: '', required_qty: 1, unit: 'units', status: 'Pending' }]);
    setShowModal(true);
  };

  const handleOpenEdit = (order: ManufacturingOrder) => {
    setIsEdit(true);
    setMoNumber(order.mo_number);
    setProductSku(order.product_sku);
    setQuantity(order.quantity);
    setStartDate(order.start_date);
    setEndDate(order.end_date || '');
    setStatus(order.status);
    setNotes(order.notes || '');
    setComponents(order.components.map(comp => ({
      component_sku: comp.component_sku,
      required_qty: parseFloat(comp.required_qty as any),
      unit: comp.unit,
      status: comp.status || 'Pending'
    })));
    setShowModal(true);
  };

  const handleDelete = async (num: string) => {
    if (!window.confirm(`Are you sure you want to delete Manufacturing Order: ${num}?`)) return;
    try {
      await axios.delete(`/api/manufacturing/${num}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete Manufacturing Order.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalidComp = components.some(c => !c.component_sku || c.required_qty <= 0);
    if (invalidComp) {
        alert('Please select a valid component and quantity for all items.');
      return;
    }

    const payload = {
      mo_number: moNumber,
      product_sku: productSku,
      quantity,
      start_date: startDate,
      end_date: endDate || null,
      status,
      notes,
      components: components.map(comp => ({
        component_sku: comp.component_sku,
        required_qty: comp.required_qty,
        unit: comp.unit,
        status: comp.status || 'Pending'
      }))
    };

    try {
      if (isEdit) {
        await axios.put(`/api/manufacturing/${moNumber}`, payload);
      } else {
        await axios.post('/api/manufacturing', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save manufacturing order.');
    }
  };

  const getStatusClass = (st: string) => {
    switch (st) {
      case 'Completed': return 'status-completed';
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
          <h1 className="page-title">Manufacturing Orders</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Log factory schedule assemblies, manage bills of materials (BOM), and issue items.</p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} />
          Create Manufacturing Order
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexGrow: 1, maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search by product or MO number..."
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
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* List Table */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--primary)', padding: '3rem' }}>
          Querying manufacturing logs...
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>MO Number</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                 <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => (
                <tr key={o.mo_number}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{o.mo_number}</td>
                  <td style={{ fontWeight: 600 }}>{products.find(p => p.sku === o.product_sku)?.name || o.product_sku}</td>
                  <td style={{ fontWeight: 700 }}>{o.quantity} units</td>
                  <td>{o.start_date}</td>
                  <td>{o.end_date || '-'}</td>
                  <td>
                    <span className={`status-pill ${getStatusClass(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button onClick={() => handleOpenEdit(o)} className="btn btn-secondary btn-icon" title={isAdmin ? "View / Edit Manufacturing Order" : "View Manufacturing Order Details"}>
                          {isAdmin ? <Edit2 size={14} /> : <Eye size={14} />}
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(o.mo_number)} className="btn btn-secondary btn-icon" style={{ color: 'var(--danger-text)' }} title="Delete Manufacturing Order">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No manufacturing orders scheduled.
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
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: '1.4rem' }}>
                {isEdit ? '✏️ Edit Assembly Order' : '🏭 Schedule Manufacturing'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-icon" title="Close">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <fieldset disabled={isModalReadOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              <div className="form-row">
                {isEdit && (
                  <div className="form-group">
                    <label htmlFor="modal-mo-num">Manufacturing Order Number</label>
                    <input
                      id="modal-mo-num"
                      type="text"
                      required
                      disabled
                      value={moNumber}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="modal-target-sku">Finished Product</label>
                  <select
                    id="modal-target-sku"
                    required
                    value={productSku}
                    onChange={(e) => setProductSku(e.target.value)}
                  >
                    <option value="">-- Choose Output Product --</option>
                    {products.map(p => (
                      <option key={p.sku} value={p.sku}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="modal-qty">Target Assembly Qty</label>
                  <input
                    id="modal-qty"
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setQuantity(val);
                      const prod = products.find(p => p.sku === productSku);
                      const reorderLimit = prod?.reorder_point ?? 10;
                      if (prod && val > reorderLimit) {
                        alert(`Warning: Manufacturing quantity of ${val} exceeds the automated reorder point of ${reorderLimit} for product ${prod.name}!`);
                      }
                    }}
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
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="modal-start-date">Start Date</label>
                  <input
                    id="modal-start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-end-date">End Date</label>
                  <input
                    id="modal-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <label className="checkbox-group" style={{ marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={useBom}
                  onChange={(e) => setUseBom(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                With BOM
              </label>

              {/* BOM Components */}
              <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.95rem' }}>Bill of Materials (BOM) Components</h3>
                  <button type="button" onClick={handleAddComponent} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <PlusCircle size={14} /> Add Row
                  </button>
                </div>

                <div className="table-container" style={{ margin: 0, border: 'none', boxShadow: 'none' }}>
                  <table className="items-editor-table">
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Component Name</th>
                        <th style={{ width: '120px', textAlign: 'right' }}>Qty Required</th>
                        <th style={{ width: '120px' }}>Unit</th>
                        <th style={{ width: '140px' }}>Component Status</th>
                        <th style={{ width: '60px', textAlign: 'center' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {components.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <select
                              value={item.component_sku}
                              onChange={(e) => handleComponentChange(index, 'component_sku', e.target.value)}
                              style={{ width: '100%', padding: '0.4rem' }}
                            >
                              <option value="">-- Choose Component --</option>
                              {products.map(p => (
                                <option key={p.sku} value={p.sku}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ verticalAlign: 'middle', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {products.find(p => p.sku === item.component_sku)?.name || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>None selected</span>}
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={item.required_qty}
                              onChange={(e) => handleComponentChange(index, 'required_qty', parseFloat(e.target.value) || 0)}
                              style={{ width: '100%', padding: '0.4rem', textAlign: 'right' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleComponentChange(index, 'unit', e.target.value)}
                              style={{ width: '100%', padding: '0.4rem' }}
                            />
                          </td>
                          <td>
                            <select
                              value={item.status || 'Pending'}
                              onChange={(e) => handleComponentChange(index, 'status', e.target.value)}
                              style={{ width: '100%', padding: '0.4rem' }}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Allocated">Allocated</option>
                              <option value="Issued">Issued</option>
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveComponent(index)}
                              disabled={components.length === 1}
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

              <div className="form-group">
                <label htmlFor="modal-notes">Assembly Notes</label>
                <textarea
                  id="modal-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Defect comments, manufacturing facility guidelines, testing criteria..."
                />
              </div>
            </fieldset>

              {!isModalReadOnly && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isModalReadOnly}>
                    {isEdit ? 'Save Changes' : 'Schedule Assembly'}
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
