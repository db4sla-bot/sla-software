import { useState, useCallback, useEffect } from 'react';
import { DoorOpen, Plus, Download, X, Loader, Trash2, Eye, Edit, Printer } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import html2pdf from 'html2pdf.js';
import '../CSS/MosquitoMeshDoors.css';

// Definition section component (outside main component to prevent recreation)
function DefinitionSection({ title, sectionKey, items, newValue, onInputChange, onAddItem, onDeleteItem }) {
  return (
    <div className="definition-section">
      <div className="section-header">
        <h3>{title}</h3>
      </div>
      
      <div className="section-add">
        <input
          type="text"
          placeholder={`Enter ${title.toLowerCase()}`}
          value={newValue}
          onChange={(e) => onInputChange(sectionKey, e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              onAddItem(sectionKey);
            }
          }}
          className="input"
        />
        <button 
          className="btn btn-primary btn-sm"
          onClick={() => onAddItem(sectionKey)}
        >
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="section-list">
        {items.length === 0 ? (
          <p className="empty-message">No items added yet</p>
        ) : (
          <ul>
            {items.map((item, index) => (
              <li key={`${sectionKey}-${index}`} className="list-item">
                <span>{item}</span>
                <button 
                  className="btn-delete"
                  onClick={() => onDeleteItem(sectionKey, index)}
                  title="Delete"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function MosquitoMeshDoors() {
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'view', 'edit'
  const [orders, setOrders] = useState([]);

  // Menu items for door types
  const doorMenuItems = ['Main Door', 'Hall Door', 'Balcony Door'];
  
  // Definition sections state
  const [definitions, setDefinitions] = useState({
    productName: [],
    quality: [],
    series: [],
    doors: [],
    thickness: [],
    frameColor: [],
    meshColor: []
  });

  // Debug effect to log definitions changes
  useEffect(() => {
    console.log('Definitions state updated:', definitions);
  }, [definitions]);

  const [inputValues, setInputValues] = useState({
    productName: '',
    quality: '',
    series: '',
    doors: '',
    thickness: '',
    frameColor: '',
    meshColor: ''
  });

  // Current order form state
  const [currentOrder, setCurrentOrder] = useState({
    orderId: '',
    doorEntries: []
  });

  // Load data from Firestore on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load definitions
        const defDocRef = doc(db, 'mosquitoMeshDoors', 'definitions');
        const defDocSnap = await getDoc(defDocRef);
        if (defDocSnap.exists()) {
          const defData = defDocSnap.data();
          console.log('Loaded definitions from Firestore:', defData);
          
          // Ensure all expected fields exist
          const completeDefinitions = {
            productName: defData.productName || [],
            quality: defData.quality || [],
            series: defData.series || [],
            doors: defData.doors || [],
            thickness: defData.thickness || [],
            frameColor: defData.frameColor || [],
            meshColor: defData.meshColor || []
          };
          
          console.log('Processed definitions:', completeDefinitions);
          setDefinitions(completeDefinitions);
        } else {
          console.log('No definitions document found in Firestore');
        }

        // Load orders
        const ordersRef = collection(db, 'mosquitoMeshDoors', 'orders', 'list');
        const q = query(ordersRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const loadedOrders = [];
        querySnapshot.forEach((doc) => {
          loadedOrders.push({ id: doc.id, ...doc.data() });
        });
        setOrders(loadedOrders);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Generate unique Order ID
  const generateOrderId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  };

  // Open modal and initialize new order
  const handleAddOrderClick = () => {
    const newOrderId = generateOrderId();
    setCurrentOrder({
      orderId: newOrderId,
      doorEntries: [
        {
          doorType: 'SLA Nellore 1',
          productName: '',
          quality: '',
          series: '',
          doors: '',
          thickness: '',
          frameColor: '',
          meshColor: '',
          width: '',
          height: '',
          notes: ''
        }
      ]
    });
    setModalMode('add');
    setShowModal(true);
  };

  // Add new door entry
  const handleAddDoorEntry = () => {
    const nextDoorNum = currentOrder.doorEntries.length + 1;
    setCurrentOrder({
      ...currentOrder,
      doorEntries: [
        ...currentOrder.doorEntries,
        {
          doorType: `SLA Nellore ${nextDoorNum}`,
          productName: '',
          quality: '',
          series: '',
          doors: '',
          thickness: '',
          frameColor: '',
          meshColor: '',
          width: '',
          height: '',
          notes: ''
        }
      ]
    });
  };

  // Update door entry field
  const handleDoorEntryChange = (entryIndex, field, value) => {
    setCurrentOrder({
      ...currentOrder,
      doorEntries: currentOrder.doorEntries.map((entry, idx) => 
        idx === entryIndex ? { ...entry, [field]: value } : entry
      )
    });
  };

  // Remove door entry
  const handleRemoveDoorEntry = (entryIndex) => {
    setCurrentOrder({
      ...currentOrder,
      doorEntries: currentOrder.doorEntries.filter((_, idx) => idx !== entryIndex)
    });
  };

  // Save order to Firestore
  const handleSaveOrder = async () => {
    if (currentOrder.doorEntries.length === 0) {
      alert('Please add at least one door entry');
      return;
    }

    try {
      setSaving(true);
      
      const now = new Date();
      const existingOrder = orders.find(o => o.id === currentOrder.orderId);
      
      const orderData = {
        orderId: currentOrder.orderId,
        doorEntries: currentOrder.doorEntries,
        createdAt: modalMode === 'add' ? now : (existingOrder?.createdAt || now),
        updatedAt: now
      };

      const orderDocRef = doc(db, 'mosquitoMeshDoors', 'orders', 'list', currentOrder.orderId);
      await setDoc(orderDocRef, orderData);

      // Reload orders
      const ordersRef = collection(db, 'mosquitoMeshDoors', 'orders', 'list');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const loadedOrders = [];
      querySnapshot.forEach((doc) => {
        loadedOrders.push({ id: doc.id, ...doc.data() });
      });
      setOrders(loadedOrders);

      setShowModal(false);
      alert(modalMode === 'add' ? 'Order saved successfully!' : 'Order updated successfully!');
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Error saving order');
    } finally {
      setSaving(false);
    }
  };

  // Edit order
  const handleEditOrder = (order) => {
    setCurrentOrder(order);
    setModalMode('edit');
    setShowModal(true);
  };

  // View order
  const handleViewOrder = (order) => {
    setCurrentOrder(order);
    setModalMode('view');
    setShowModal(true);
  };

  // Delete order
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
      setSaving(true);
      const orderDocRef = doc(db, 'mosquitoMeshDoors', 'orders', 'list', orderId);
      await deleteDoc(orderDocRef);

      // Reload orders
      const ordersRef = collection(db, 'mosquitoMeshDoors', 'orders', 'list');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const loadedOrders = [];
      querySnapshot.forEach((doc) => {
        loadedOrders.push({ id: doc.id, ...doc.data() });
      });
      setOrders(loadedOrders);

      alert('Order deleted successfully');
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error deleting order');
    } finally {
      setSaving(false);
    }
  };

  // Print order as PDF
  const handlePrintOrder = (order) => {
    const element = document.createElement('div');
    
    // Define the labels and their corresponding keys in the door entry
    const labels = [
      { label: 'SLA Nellore', key: 'doorType' },
      { label: 'Product Name', key: 'productName' },
      { label: 'Quality', key: 'quality' },
      { label: 'Series', key: 'series' },
      { label: 'Doors', key: 'doors' },
      { label: 'Thickness', key: 'thickness' },
      { label: 'Frame Color', key: 'frameColor' },
      { label: 'Mesh Color', key: 'meshColor' },
      { label: 'Width (mm)', key: 'width' },
      { label: 'Height (mm)', key: 'height' },
      { label: 'Notes', key: 'notes' }
    ];

    element.innerHTML = `
      <div style="padding: 30px; font-family: Arial, sans-serif;">
        <h1 style="text-align: center; margin-bottom: 10px;">Order ${order.orderId}</h1>
        <p style="text-align: center; color: #666; margin-bottom: 30px;">
          ${new Date(order.createdAt?.toDate?.()).toLocaleDateString()}
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed;">
          <tbody>
            ${labels.map(l => `
              <tr style="border-bottom: 1px solid #ddd;">
                <th style="background-color: #f3f4f6; border: 1px solid #ddd; padding: 12px; text-align: left; width: 140px;">${l.label}</th>
                ${order.doorEntries?.map(entry => `
                  <td style="border: 1px solid #ddd; padding: 12px; text-align: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${entry[l.key] || '-'}</td>
                `).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    const opt = {
      margin: 10,
      filename: `Order-${order.orderId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
  };

  // Save definitions to Firestore
  const saveToFirestore = async (updatedDefinitions) => {
    try {
      setSaving(true);
      const docRef = doc(db, 'mosquitoMeshDoors', 'definitions');
      await setDoc(docRef, updatedDefinitions, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      alert('Error saving to database');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Add item to a section
  const handleAddItem = useCallback((section) => {
    const value = inputValues[section]?.trim();
    
    if (!value) {
      alert(`Please enter a ${section.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      return;
    }

    // Check for duplicates
    if (definitions[section].includes(value)) {
      alert('This item already exists!');
      return;
    }

    const updatedDefinitions = {
      ...definitions,
      [section]: [...definitions[section], value]
    };

    setDefinitions(updatedDefinitions);

    setInputValues((prev) => ({
      ...prev,
      [section]: ''
    }));

    // Save to Firestore
    saveToFirestore(updatedDefinitions);
  }, [inputValues, definitions]);

  // Handle input change
  const handleInputChange = useCallback((section, value) => {
    setInputValues((prev) => ({
      ...prev,
      [section]: value
    }));
  }, []);

  // Delete item from a section
  const handleDeleteItem = useCallback((section, index) => {
    const updatedDefinitions = {
      ...definitions,
      [section]: definitions[section].filter((_, i) => i !== index)
    };

    setDefinitions(updatedDefinitions);

    // Save to Firestore
    saveToFirestore(updatedDefinitions);
  }, [definitions]);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Mosquito Mesh Doors</h1>
          <p className="page-subtitle">Manage mosquito mesh door orders and installations</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" disabled={saving}>
            <Download size={16} /> Export
          </button>
          {activeTab === 'orders' && (
            <button className="btn btn-primary" disabled={saving} onClick={handleAddOrderClick}>
              <Plus size={16} /> Add Order
            </button>
          )}
          {saving && (
            <div className="saving-indicator">
              <Loader size={16} className="spinner" />
              <span>Saving...</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <Loader size={40} className="spinner" />
          <p>Loading definitions...</p>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="tabs-container">
            <div className="tabs-nav">
              <button 
                className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                Orders
              </button>
              <button 
                className={`tab-btn ${activeTab === 'definitions' ? 'active' : ''}`}
                onClick={() => setActiveTab('definitions')}
              >
                Definitions
              </button>
            </div>

            {/* Tab Content */}
            <div className="tabs-content">
          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="tab-pane active">
              <div className="orders-section">
                {orders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <DoorOpen size={36} />
                    </div>
                    <h3>No orders yet</h3>
                    <p>Click "Add Order" to create your first order.</p>
                  </div>
                ) : (
                  <div className="orders-cards">
                    {orders.map((order) => (
                      <div key={order.id} className="order-card">
                        <div className="order-card-header">
                          <div>
                            <h4>{order.orderId}</h4>
                            <span className="order-date">
                              {new Date(order.createdAt?.toDate?.()).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="order-actions">
                            <button
                              className="order-action-btn"
                              onClick={() => handleViewOrder(order)}
                              title="View"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              className="order-action-btn"
                              onClick={() => handleEditOrder(order)}
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              className="order-action-btn"
                              onClick={() => handlePrintOrder(order)}
                              title="Print"
                            >
                              <Printer size={18} />
                            </button>
                            <button
                              className="order-action-btn delete"
                              onClick={() => handleDeleteOrder(order.id)}
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="order-entries">
                          {order.doorEntries?.length === 0 ? (
                            <p className="no-entries">No door entries</p>
                          ) : (
                            order.doorEntries?.map((entry, idx) => (
                              <div key={idx} className="entry-item">
                                <strong>{entry.doorType || 'No SLA Nellore'}</strong>
                                <p>{entry.productName && entry.quality ? `${entry.productName} - ${entry.quality}` : '-'}</p>
                                {(entry.width || entry.height) && (
                                  <p>{entry.width}mm × {entry.height}mm</p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Definitions Tab */}
          {activeTab === 'definitions' && (
            <div className="tab-pane active">
              <div className="definitions-grid">
                <DefinitionSection 
                  title="Product Name" 
                  sectionKey="productName"
                  items={definitions.productName}
                  newValue={inputValues.productName}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
                <DefinitionSection 
                  title="Quality" 
                  sectionKey="quality"
                  items={definitions.quality}
                  newValue={inputValues.quality}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
                <DefinitionSection 
                  title="Series" 
                  sectionKey="series"
                  items={definitions.series}
                  newValue={inputValues.series}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
                <DefinitionSection 
                  title="Doors" 
                  sectionKey="doors"
                  items={definitions.doors}
                  newValue={inputValues.doors}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
                <DefinitionSection 
                  title="Thickness" 
                  sectionKey="thickness"
                  items={definitions.thickness}
                  newValue={inputValues.thickness}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
                <DefinitionSection 
                  title="Frame Color" 
                  sectionKey="frameColor"
                  items={definitions.frameColor}
                  newValue={inputValues.frameColor}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
                <DefinitionSection 
                  title="Mesh Color" 
                  sectionKey="meshColor"
                  items={definitions.meshColor}
                  newValue={inputValues.meshColor}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
              </div>
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* Add/Edit/View Order Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{modalMode === 'add' ? 'Add New Order' : modalMode === 'edit' ? 'Edit Order' : 'View Order'}</h2>
              </div>
              <div className="order-id-display">{currentOrder.orderId}</div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body-table">
              <div className="table-wrapper">
                <div className="table-left">
                  {/* Left side - Static menu rows */}
                  <div className="table-row-labels">
                    <div className="row-label">SLA Nellore</div>
                    <div className="row-label">Product Name</div>
                    <div className="row-label">Quality</div>
                    <div className="row-label">Series</div>
                    <div className="row-label">Doors</div>
                    <div className="row-label">Thickness</div>
                    <div className="row-label">Frame Color</div>
                    <div className="row-label">Mesh Color</div>
                    <div className="row-label">Width (mm)</div>
                    <div className="row-label">Height (mm)</div>
                    <div className="row-label">Notes</div>
                  </div>
                </div>

                <div className="table-right">
                  <div className="columns-container">
                    {/* Door entry columns */}
                    {currentOrder.doorEntries.map((entry, entryIndex) => (
                      <div key={entryIndex} className="column-wrapper">
                        <div className="column-header">
                          <div className="column-num">
                            <input
                              type="text"
                              value={entry.doorType || `SLA Nellore ${entryIndex + 1}`}
                              onChange={(e) => handleDoorEntryChange(entryIndex, 'doorType', e.target.value)}
                              disabled={modalMode === 'view'}
                              className="door-name-input"
                              placeholder="SLA Nellore"
                            />
                          </div>
                          {modalMode !== 'view' && (
                            <button
                              className="column-remove"
                              onClick={() => handleRemoveDoorEntry(entryIndex)}
                              title="Remove"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        <div className="column-fields">
                          {/* Door Type / Name */}
                          {/* (Already in header, but keeping field alignment) */}
                          <div className="table-cell-spacer"></div>

                          {/* Product Name */}
                          <select
                            value={entry.productName}
                            onChange={(e) => handleDoorEntryChange(entryIndex, 'productName', e.target.value)}
                            disabled={modalMode === 'view'}
                            className="table-cell-input"
                          >
                            <option value="">Select</option>
                            {definitions.productName?.map((item, idx) => (
                              <option key={idx} value={item}>{item}</option>
                            ))}
                          </select>

                          {/* Quality */}
                          <select
                            value={entry.quality}
                            onChange={(e) => handleDoorEntryChange(entryIndex, 'quality', e.target.value)}
                            disabled={modalMode === 'view'}
                            className="table-cell-input"
                          >
                            <option value="">Select</option>
                            {definitions.quality?.map((item, idx) => (
                              <option key={idx} value={item}>{item}</option>
                            ))}
                          </select>

                          {/* Series */}
                          <select
                            value={entry.series}
                            onChange={(e) => handleDoorEntryChange(entryIndex, 'series', e.target.value)}
                            disabled={modalMode === 'view'}
                            className="table-cell-input"
                          >
                            <option value="">Select</option>
                            {definitions.series?.map((item, idx) => (
                              <option key={idx} value={item}>{item}</option>
                            ))}
                          </select>

                          {/* Doors */}
                          <select
                            value={entry.doors}
                            onChange={(e) => handleDoorEntryChange(entryIndex, 'doors', e.target.value)}
                            disabled={modalMode === 'view'}
                            className="table-cell-input"
                          >
                            <option value="">Select</option>
                            {definitions.doors?.map((item, idx) => (
                              <option key={idx} value={item}>{item}</option>
                            ))}
                          </select>

                          {/* Thickness */}
                          <select
                            value={entry.thickness}
                            onChange={(e) => handleDoorEntryChange(entryIndex, 'thickness', e.target.value)}
                            disabled={modalMode === 'view'}
                            className="table-cell-input"
                          >
                            <option value="">Select</option>
                            {definitions.thickness?.map((item, idx) => (
                              <option key={idx} value={item}>{item}</option>
                            ))}
                          </select>

                          {/* Frame Color */}
                          <select
                            value={entry.frameColor}
                            onChange={(e) => handleDoorEntryChange(entryIndex, 'frameColor', e.target.value)}
                            disabled={modalMode === 'view'}
                            className="table-cell-input"
                          >
                            <option value="">Select</option>
                            {definitions.frameColor?.map((item, idx) => (
                              <option key={idx} value={item}>{item}</option>
                            ))}
                          </select>

                          {/* Mesh Color */}
                          <select
                            value={entry.meshColor}
                            onChange={(e) => handleDoorEntryChange(entryIndex, 'meshColor', e.target.value)}
                            disabled={modalMode === 'view'}
                            className="table-cell-input"
                          >
                            <option value="">Select</option>
                            {definitions.meshColor?.map((item, idx) => (
                              <option key={idx} value={item}>{item}</option>
                            ))}
                          </select>

                          {/* Width */}
                          <input
                            type="number"
                            placeholder="mm"
                            value={entry.width}
                            onChange={(e) => handleDoorEntryChange(entryIndex, 'width', e.target.value)}
                            disabled={modalMode === 'view'}
                            className="table-cell-input"
                          />

                          {/* Height */}
                          <input
                            type="number"
                            placeholder="mm"
                            value={entry.height}
                            onChange={(e) => handleDoorEntryChange(entryIndex, 'height', e.target.value)}
                            disabled={modalMode === 'view'}
                            className="table-cell-input"
                          />

                          {/* Notes */}
                          <textarea
                            placeholder="Notes"
                            value={entry.notes}
                            onChange={(e) => handleDoorEntryChange(entryIndex, 'notes', e.target.value)}
                            disabled={modalMode === 'view'}
                            className="table-cell-input"
                            style={{ minHeight: '60px' }}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Add Column Button */}
                    {modalMode !== 'view' && (
                      <button
                        className="add-column-btn"
                        onClick={() => handleAddDoorEntry()}
                      >
                        <Plus size={24} />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {modalMode !== 'view' && (
              <div className="modal-footer">
                <button
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveOrder}
                  disabled={saving || currentOrder.doorEntries.length === 0}
                >
                  {saving ? <Loader size={16} className="spinner" /> : <Plus size={16} />}
                  {modalMode === 'edit' ? 'Update Order' : 'Save Order'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
