import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Edit2, Trash2, X, PlusCircle, MinusCircle, FileText, Eye } from 'lucide-react';

interface Product {
  sku: string;
  name: string;
}

interface BOMComponent {
  id?: number;
  component_sku: string;
  quantity: number;
}

interface BOMOperation {
  id?: number;
  operation_name: string;
  duration_mins: number;
  work_center?: string;
}

interface BOM {
  id?: number;
  product_sku: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  reference?: string;
  components: BOMComponent[];
  operations: BOMOperation[];
}

export const Boms: React.FC = () => {
  const { user } = useAuth();
  const [boms, setBoms] = useState<BOM[]>([]);
  const [filteredBoms, setFilteredBoms] = useState<BOM[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [activeBomId, setActiveBomId] = useState<number | null>(null);

  const [productSku, setProductSku] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1.0);
  const [unit, setUnit] = useState('units');
  const [reference, setReference] = useState('');
  const [activeTab, setActiveTab] = useState<'components' | 'operations'>('components');

  const [components, setComponents] = useState<BOMComponent[]>([
    { component_sku: '', quantity: 1 }
  ]);
  const [operations, setOperations] = useState<BOMOperation[]>([
    { operation_name: '', duration_mins: 15, work_center: '' }
  ]);

  const isReadOnly = user?.role !== 'Admin';
  const canCreateDelete = user?.role === 'Admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const bomsRes = await axios.get('/api/bom');
      const productsRes = await axios.get('/api/products');
      setBoms(bomsRes.data);
      setFilteredBoms(bomsRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching BOM data:', error);
      const mockProds = [
        { sku: 'PROD-001', name: 'Wooden Table' },
        { sku: 'COMP-001', name: 'Wooden Legs' },
        { sku: 'COMP-002', name: 'Wooden Top' },
        { sku: 'COMP-003', name: 'Screws Pack' }
      ];
      setProducts(mockProds);
      const mockBoms: BOM[] = [
        {
          id: 1,
          product_sku: 'PROD-001',
          name: 'Standard Wooden Table Recipe',
          description: 'Default recipe for compiling classic wooden tables.',
          quantity: 1.0,
          unit: 'Units',
          reference: 'BOM00001',
          components: [
            { component_sku: 'COMP-001', quantity: 4 },
            { component_sku: 'COMP-002', quantity: 1 },
            { component_sku: 'COMP-003', quantity: 12 }
          ],
          operations: [
            { operation_name: 'Assembly', duration_mins: 60, work_center: 'Assembly Line A' },
            { operation_name: 'Painting', duration_mins: 30, work_center: 'Painting Floor' },
            { operation_name: 'Packing', duration_mins: 15, work_center: 'Packaging Unit' }
          ]
        }
      ];
      setBoms(mockBoms);
      setFilteredBoms(mockBoms);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let result = boms;
    if (search.trim() !== '') {
      result = result.filter(
        b => (products.find(p => p.sku === b.product_sku)?.name || b.product_sku).toLowerCase().includes(search.toLowerCase()) ||
             (b.reference && b.reference.toLowerCase().includes(search.toLowerCase()))
      );
    }
    setFilteredBoms(result);
  }, [search, boms, products]);

  const handleComponentChange = (index: number, field: keyof BOMComponent, value: any) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };
    setComponents(updated);
  };

  const handleAddComponent = () => {
    setComponents([...components, { component_sku: '', quantity: 1 }]);
  };

  const handleRemoveComponent = (index: number) => {
    if (components.length === 1) return;
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleOperationChange = (index: number, field: keyof BOMOperation, value: any) => {
    const updated = [...operations];
    updated[index] = { ...updated[index], [field]: value };
    setOperations(updated);
  };

  const handleAddOperation = () => {
    setOperations([...operations, { operation_name: '', duration_mins: 15, work_center: '' }]);
  };

  const handleRemoveOperation = (index: number) => {
    if (operations.length === 1) return;
    setOperations(operations.filter((_, i) => i !== index));
  };

  const handleOpenCreate = () => {
    setIsEdit(false);
    setActiveBomId(null);
    setProductSku('');
    setDescription('');
    setQuantity(1.0);
    setUnit('units');
    setReference('');
    setActiveTab('components');
    setComponents([{ component_sku: '', quantity: 1 }]);
    setOperations([{ operation_name: '', duration_mins: 15, work_center: '' }]);
    setShowModal(true);
  };

  const handleOpenEdit = (bom: BOM) => {
    setIsEdit(true);
    setActiveBomId(bom.id || null);
    setProductSku(bom.product_sku);
    setDescription(bom.description || '');
    setQuantity(parseFloat(bom.quantity as any) || 1.0);
    setUnit(bom.unit || 'units');
    setReference(bom.reference || '');
    setActiveTab('components');
    setComponents(bom.components.map(c => ({
      component_sku: c.component_sku,
      quantity: parseFloat(c.quantity as any)
    })));
    setOperations(bom.operations.map(op => ({
      operation_name: op.operation_name,
      duration_mins: op.duration_mins,
      work_center: op.work_center || ''
    })));
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this Bill of Materials recipe?')) return;
    try {
      await axios.delete(`/api/bom/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete BOM.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productSku) {
      alert('Please select a target finished product.');
      return;
    }
    if (reference && reference.length > 8) {
      alert('Reference must not exceed 8 characters.');
      return;
    }
    const invalidComp = components.some(c => !c.component_sku || c.quantity <= 0);
    if (invalidComp) {
      alert('Please specify a valid component and positive quantity.');
      return;
    }
    const invalidOp = operations.some(op => !op.operation_name || op.duration_mins <= 0);
    if (invalidOp) {
      alert('Please specify a valid operation name and positive duration.');
      return;
    }

    const payload = {
      product_sku: productSku,
      name: `${products.find(p => p.sku === productSku)?.name || productSku} BOM`,
      description,
      quantity,
      unit,
      reference: reference || null,
      components: components.map(c => ({
        component_sku: c.component_sku,
        quantity: c.quantity
      })),
      operations: operations.map(op => ({
        operation_name: op.operation_name,
        duration_mins: op.duration_mins,
        work_center: op.work_center || null
      }))
    };

    try {
      if (isEdit && activeBomId) {
        await axios.put(`/api/bom/${activeBomId}`, payload);
      } else {
        await axios.post('/api/bom', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save BOM recipe.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bills of Materials (BoM)</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configure output recipes, add required raw materials, and document production run durations.</p>
        </div>
        {canCreateDelete && (
          <button onClick={handleOpenCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} />
            Create BOM
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexGrow: 1, maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search BOM by product or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* BOMs Table */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--primary)', padding: '3rem' }}>
          Loading bills of materials...
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {canCreateDelete && <th style={{ width: '40px' }}></th>}
                <th>Reference</th>
                <th>Finished Product</th>
                <th>Components</th>
                <th>Total Mfg Qty</th>
                <th>Unit</th>
                <th>Total Mfg Time</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBoms.map(bom => {
                const totalTime = bom.operations.reduce((acc, curr) => acc + curr.duration_mins, 0);
                const componentTypesList = bom.components.map(c => {
                  const prod = products.find(p => p.sku === c.component_sku);
                  const name = prod ? prod.name : c.component_sku;
                  return `${parseFloat(c.quantity as any)}x ${name}`;
                }).filter(Boolean).join(', ');
                const displayRef = bom.reference || `BOM-${String(bom.id).padStart(6, '0')}`;
                return (
                  <tr key={bom.id}>
                    {canCreateDelete && (
                      <td>
                        <input type="checkbox" readOnly checked={activeBomId === bom.id} style={{ cursor: 'pointer' }} />
                      </td>
                    )}
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{displayRef}</td>
                    <td style={{ fontWeight: 600 }}>{products.find(p => p.sku === bom.product_sku)?.name || bom.product_sku}</td>
                    <td style={{ color: 'var(--text-primary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={componentTypesList}>
                      {componentTypesList || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>None</span>}
                    </td>
                    <td>{parseFloat(bom.quantity as any || 1.0).toFixed(2)}</td>
                    <td>{bom.unit || 'units'}</td>
                    <td style={{ fontWeight: 600 }}>{totalTime} mins</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button onClick={() => handleOpenEdit(bom)} className="btn btn-secondary btn-icon" title={canCreateDelete ? "Edit BOM Recipe" : "View BOM Recipe"}>
                          {canCreateDelete ? <Edit2 size={14} /> : <Eye size={14} />}
                        </button>
                        {canCreateDelete && (
                          <button onClick={() => handleDelete(bom.id!)} className="btn btn-secondary btn-icon" style={{ color: 'var(--danger-text)' }} title="Delete BOM">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredBoms.length === 0 && (
                <tr>
                  <td colSpan={canCreateDelete ? 8 : 7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No bills of materials defined.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE/EDIT BOM MODAL OVERLAY */}
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
                <FileText size={22} color="var(--primary)" />
                {isEdit ? '✏️ Edit Bill of Materials' : '📝 Create Bill of Materials'}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => window.location.href = '/audit-logs'}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', fontWeight: 600 }}
                >
                  Logs
                </button>
                <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-icon" title="Close">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ fontSize: '1.2rem', fontWeight: 700, padding: '0.2rem 0.5rem', border: '1px dashed var(--border-color)', borderRadius: '4px', width: 'fit-content', backgroundColor: 'var(--bg-tertiary)' }}>
              {reference || activeBomId ? reference || `BOM-${String(activeBomId).padStart(6, '0')}` : '[New BOM]'}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <fieldset disabled={isReadOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="modal-product-sku">Finished Product</label>
                  <select
                    id="modal-product-sku"
                    required
                    disabled={isEdit}
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
                  <label htmlFor="modal-bom-qty">Total Mfg Qty</label>
                  <input
                    id="modal-bom-qty"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 1.0)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-bom-unit">Unit</label>
                  <input
                    id="modal-bom-unit"
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. Units, Liters"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-bom-ref">Reference</label>
                  <input
                    id="modal-bom-ref"
                    type="text"
                    maxLength={8}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Max 8 chars"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-description">BOM Description</label>
                <textarea
                  id="modal-description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write detailed assembly recipe guidelines..."
                />
              </div>

              {/* Tab Switcher */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('components')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    background: 'none',
                    borderBottom: activeTab === 'components' ? '3px solid var(--primary)' : 'none',
                    color: activeTab === 'components' ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Components
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('operations')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    background: 'none',
                    borderBottom: activeTab === 'operations' ? '3px solid var(--primary)' : 'none',
                    color: activeTab === 'operations' ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Work Orders
                </button>
              </div>

              {/* Tab 1: Components */}
              {activeTab === 'components' && (
                <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>BOM Components Required</h3>
                    {canCreateDelete && (
                      <button type="button" onClick={handleAddComponent} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <PlusCircle size={14} /> Add Product
                      </button>
                    )}
                  </div>

                  <div className="table-container" style={{ margin: 0, border: 'none', boxShadow: 'none' }}>
                    <table className="items-editor-table">
                      <thead>
                        <tr>
                          <th>Component</th>
                          <th>Component Name</th>
                          <th style={{ width: '120px', textAlign: 'right' }}>Qty Required</th>
                          {canCreateDelete && <th style={{ width: '60px', textAlign: 'center' }}>Remove</th>}
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
                                value={item.quantity}
                                onChange={(e) => handleComponentChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                style={{ width: '100%', padding: '0.4rem', textAlign: 'right' }}
                              />
                            </td>
                            {canCreateDelete && (
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
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Operations */}
              {activeTab === 'operations' && (
                <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Work Orders / Operations List</h3>
                    {canCreateDelete && (
                      <button type="button" onClick={handleAddOperation} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <PlusCircle size={14} /> Add Line
                      </button>
                    )}
                  </div>

                  <div className="table-container" style={{ margin: 0, border: 'none', boxShadow: 'none' }}>
                    <table className="items-editor-table">
                      <thead>
                        <tr>
                          <th>Operation Name</th>
                          <th>Work Center</th>
                          <th style={{ width: '160px', textAlign: 'right' }}>Expected Duration (mins)</th>
                          {canCreateDelete && <th style={{ width: '60px', textAlign: 'center' }}>Remove</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {operations.map((op, index) => (
                          <tr key={index}>
                            <td>
                              <input
                                type="text"
                                value={op.operation_name}
                                onChange={(e) => handleOperationChange(index, 'operation_name', e.target.value)}
                                placeholder="e.g. Painting, Cutting"
                                required
                                style={{ width: '100%', padding: '0.4rem' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={op.work_center}
                                onChange={(e) => handleOperationChange(index, 'work_center', e.target.value)}
                                placeholder="e.g. Assembly Line A"
                                style={{ width: '100%', padding: '0.4rem' }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                value={op.duration_mins}
                                onChange={(e) => handleOperationChange(index, 'duration_mins', parseInt(e.target.value) || 0)}
                                style={{ width: '100%', padding: '0.4rem', textAlign: 'right' }}
                              />
                            </td>
                            {canCreateDelete && (
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOperation(index)}
                                  disabled={operations.length === 1}
                                  className="btn btn-secondary btn-icon"
                                  style={{ color: 'var(--danger-text)' }}
                                >
                                  <MinusCircle size={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              </fieldset>

              {!isReadOnly && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isReadOnly}>
                    {isEdit ? 'Save Changes' : 'Record BOM'}
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
